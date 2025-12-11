import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { google, drive_v3 } from 'googleapis';
import * as XLSX from 'xlsx';
import { CompanyEntity } from '../revenue/entities/company.entity';
import { RevenueTargetEntity } from '../revenue/entities/revenue-target.entity';
import { RevenueRealizationEntity } from '../revenue/entities/revenue-realization.entity';

export interface SyncResult {
  success: boolean;
  message: string;
  realisasiCount?: number;
  targetCount?: number;
  errors?: string[];
}

export interface SyncStatus {
  enabled: boolean;
  lastSync: Date | null;
  lastSyncStatus: string;
  nextSync: Date | null;
  spreadsheetId: string | null;
}

@Injectable()
export class SheetsService implements OnModuleInit {
  private readonly logger = new Logger(SheetsService.name);
  private drive: drive_v3.Drive;
  private enabled: boolean = false;
  private fileId: string = '';
  private lastSync: Date | null = null;
  private lastSyncStatus: string = 'never';
  private companyCodeMap: Map<string, number> = new Map();

  constructor(
    private configService: ConfigService,
    @InjectRepository(CompanyEntity)
    private companyRepo: Repository<CompanyEntity>,
    @InjectRepository(RevenueTargetEntity)
    private targetRepo: Repository<RevenueTargetEntity>,
    @InjectRepository(RevenueRealizationEntity)
    private realizationRepo: Repository<RevenueRealizationEntity>,
  ) {}

  async onModuleInit() {
    this.enabled = this.configService.get<string>('GOOGLE_SHEETS_ENABLED') === 'true';
    
    if (!this.enabled) {
      this.logger.log('Google Sheets integration is disabled');
      return;
    }

    this.fileId = this.configService.get<string>('GOOGLE_SPREADSHEET_ID') || '';
    
    if (!this.fileId) {
      this.logger.warn('GOOGLE_SPREADSHEET_ID not configured, disabling integration');
      this.enabled = false;
      return;
    }

    try {
      await this.initializeGoogleAuth();
      await this.loadCompanyMapping();
      this.logger.log('Google Sheets integration initialized successfully');
      
      // Initial sync on startup
      await this.syncFromSheets();
    } catch (error) {
      this.logger.error('Failed to initialize Google Sheets integration', error);
      this.enabled = false;
    }
  }

  private async initializeGoogleAuth() {
    const credentialsFile = this.configService.get<string>('GOOGLE_SHEETS_CREDENTIALS_FILE');
    const clientEmail = this.configService.get<string>('GOOGLE_SHEETS_CLIENT_EMAIL');
    const privateKey = this.configService.get<string>('GOOGLE_SHEETS_PRIVATE_KEY');

    let auth;

    if (credentialsFile) {
      // Use credentials file
      auth = new google.auth.GoogleAuth({
        keyFile: credentialsFile,
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
      });
    } else if (clientEmail && privateKey) {
      // Use inline credentials
      auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: clientEmail,
          private_key: privateKey.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
      });
    } else {
      throw new Error('No Google credentials configured');
    }

    this.drive = google.drive({ version: 'v3', auth });
  }

  private async loadCompanyMapping() {
    const companies = await this.companyRepo.find({ where: { isActive: true } });
    companies.forEach(company => {
      this.companyCodeMap.set(company.code.toUpperCase(), company.id);
    });
    this.logger.log(`Loaded ${companies.length} companies for mapping`);
  }

  getStatus(): SyncStatus {
    const syncInterval = parseInt(this.configService.get<string>('GOOGLE_SHEETS_SYNC_INTERVAL') || '60');
    const nextSync = this.lastSync 
      ? new Date(this.lastSync.getTime() + syncInterval * 1000)
      : null;

    return {
      enabled: this.enabled,
      lastSync: this.lastSync,
      lastSyncStatus: this.lastSyncStatus,
      nextSync,
      spreadsheetId: this.enabled ? this.fileId : null,
    };
  }

  // Scheduled sync - runs every minute by default
  @Cron(CronExpression.EVERY_MINUTE)
  async scheduledSync() {
    if (!this.enabled) return;

    const syncInterval = parseInt(this.configService.get<string>('GOOGLE_SHEETS_SYNC_INTERVAL') || '60');
    
    // Check if enough time has passed since last sync
    if (this.lastSync) {
      const secondsSinceLastSync = (Date.now() - this.lastSync.getTime()) / 1000;
      if (secondsSinceLastSync < syncInterval) {
        return;
      }
    }

    this.logger.log('Running scheduled sync from Google Sheets');
    await this.syncFromSheets();
  }

  async syncFromSheets(): Promise<SyncResult> {
    if (!this.enabled) {
      return {
        success: false,
        message: 'Google Sheets integration is disabled',
      };
    }

    const errors: string[] = [];
    let realisasiCount = 0;
    let targetCount = 0;

    try {
      // Sync Realisasi
      const realisasiResult = await this.syncRealisasi();
      realisasiCount = realisasiResult.count;
      if (realisasiResult.errors.length > 0) {
        errors.push(...realisasiResult.errors);
      }

      // Target is managed manually via web, skip sync
      // const targetResult = await this.syncTarget();
      // targetCount = targetResult.count;

      this.lastSync = new Date();
      this.lastSyncStatus = errors.length > 0 ? 'partial' : 'success';

      this.logger.log(`Sync completed: ${realisasiCount} realisasi, ${targetCount} targets`);

      return {
        success: true,
        message: `Synced ${realisasiCount} realisasi and ${targetCount} targets`,
        realisasiCount,
        targetCount,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      this.lastSync = new Date();
      this.lastSyncStatus = 'failed';
      this.logger.error('Sync failed', error);

      return {
        success: false,
        message: error.message || 'Sync failed',
        errors: [error.message],
      };
    }
  }

  private async syncRealisasi(): Promise<{ count: number; errors: string[] }> {
    const errors: string[] = [];
    let count = 0;

    try {
      // Download Excel file from Google Drive
      this.logger.log('Downloading Excel file from Google Drive...');
      const response = await this.drive.files.get({
        fileId: this.fileId,
        alt: 'media',
      }, { responseType: 'arraybuffer' });

      const buffer = Buffer.from(response.data as ArrayBuffer);
      const workbook = XLSX.read(buffer, { type: 'buffer' });

      // Find REVENUE sheet
      const sheetName = workbook.SheetNames.find(name => 
        name.toUpperCase().includes('REVENUE')
      );
      
      if (!sheetName) {
        this.logger.warn(`REVENUE sheet not found. Available sheets: ${workbook.SheetNames.join(', ')}`);
        errors.push(`REVENUE sheet not found. Available: ${workbook.SheetNames.join(', ')}`);
        return { count: 0, errors };
      }

      const worksheet = workbook.Sheets[sheetName];
      const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (!rows || rows.length < 5) {
        this.logger.warn('No data found in REVENUE sheet');
        return { count: 0, errors: [] };
      }

      this.logger.log(`REVENUE sheet returned ${rows.length} rows`);

      // Find month header row (contains JAN, FEB, etc. or NOV, DEC)
      // Support both Indonesian (MEI, AGU, OKT, DES) and English (MAY, AUG, OCT, DEC) short names
      const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];
      const monthNamesEng = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      const monthNamesAlt = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
      
      let monthHeaderRow = -1;
      let columnHeaderRow = -1;
      
      // Find the row with month names and the row with REALISASI headers
      for (let i = 0; i < Math.min(10, rows.length); i++) {
        const row = rows[i];
        if (!row) continue;
        
        const rowStr = row.join(' ').toUpperCase();
        
        // Check if this row contains month names
        if (monthNames.some(m => rowStr.includes(m)) || monthNamesEng.some(m => rowStr.includes(m)) || monthNamesAlt.some(m => rowStr.includes(m))) {
          monthHeaderRow = i;
          this.logger.log(`Found month header at row ${i + 1}: ${row.slice(0, 10).join(', ')}`);
        }
        
        // Check if this row contains REALISASI
        if (rowStr.includes('REALISASI')) {
          columnHeaderRow = i;
          this.logger.log(`Found column header at row ${i + 1}`);
        }
      }

      if (monthHeaderRow === -1 || columnHeaderRow === -1) {
        errors.push('Could not find month/column headers in REVENUE sheet');
        return { count: 0, errors };
      }

      // Map months to their REALISASI column indices
      const monthRow = rows[monthHeaderRow];
      const colHeaderRow = rows[columnHeaderRow];
      
      // monthColumns: { month: number (1-12), year: number, colIndex: number }[]
      const monthColumns: { month: number; year: number; colIndex: number }[] = [];
      const monthsAlreadyMapped = new Set<number>(); // Track which months we've already mapped
      const currentYear = new Date().getFullYear();
      
      for (let col = 0; col < colHeaderRow.length; col++) {
        const colHeader = String(colHeaderRow[col] || '').toUpperCase().trim();
        if (colHeader === 'REALISASI') {
          // Find which month this REALISASI belongs to by looking at monthRow
          // Months might span multiple columns, so we look backwards
          let monthFound = '';
          let monthNum = -1;
          for (let searchCol = col; searchCol >= 0; searchCol--) {
            const cell = String(monthRow[searchCol] || '').toUpperCase().trim();
            // Check Indonesian short names
            const monthIdx = monthNames.findIndex(m => cell.includes(m));
            if (monthIdx !== -1) {
              monthFound = monthNames[monthIdx];
              monthNum = monthIdx + 1;
              break;
            }
            // Check English short names (MAY, AUG, OCT, DEC)
            const monthIdxEng = monthNamesEng.findIndex(m => cell.includes(m));
            if (monthIdxEng !== -1) {
              monthFound = monthNamesEng[monthIdxEng];
              monthNum = monthIdxEng + 1;
              break;
            }
            // Check English full names
            const monthIdxAlt = monthNamesAlt.findIndex(m => cell.includes(m));
            if (monthIdxAlt !== -1) {
              monthFound = monthNamesAlt[monthIdxAlt];
              monthNum = monthIdxAlt + 1;
              break;
            }
          }
          
          if (monthFound && monthNum > 0) {
            // Only use the FIRST REALISASI column for each month to avoid double-counting
            if (!monthsAlreadyMapped.has(monthNum)) {
              monthColumns.push({ month: monthNum, year: currentYear, colIndex: col });
              monthsAlreadyMapped.add(monthNum);
              this.logger.log(`Mapped REALISASI column ${col} to month ${monthFound} (${monthNum})`);
            } else {
              this.logger.log(`Skipping duplicate REALISASI column ${col} for month ${monthFound} (${monthNum})`);
            }
          }
        }
      }

      if (monthColumns.length === 0) {
        errors.push('Could not map REALISASI columns to months');
        return { count: 0, errors };
      }

      // Find "Rupiah" section start
      let rupiahStartRow = -1;
      for (let i = columnHeaderRow + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row) continue;
        const firstCell = String(row[0] || '').toLowerCase();
        if (firstCell.includes('rupiah')) {
          rupiahStartRow = i + 1; // Data starts after "Rupiah" row
          this.logger.log(`Found Rupiah section at row ${i + 1}`);
          break;
        }
      }

      if (rupiahStartRow === -1) {
        // If no "Rupiah" marker, start from row after column headers
        rupiahStartRow = columnHeaderRow + 1;
        this.logger.log(`No Rupiah marker, starting from row ${rupiahStartRow + 1}`);
      }

      // Clear old Google Sheets synced data before importing new data
      // Only delete data from months that exist in the spreadsheet
      const monthsToSync = monthColumns.map(mc => mc.month);
      this.logger.log(`Months found in spreadsheet: ${monthsToSync.join(', ')}`);
      
      // Delete ALL old Google Sheets data for this year to ensure clean sync
      const deleteResult = await this.realizationRepo
        .createQueryBuilder()
        .delete()
        .where('YEAR(date) = :year', { year: currentYear })
        .andWhere('description = :desc', { desc: 'Monthly Total (Google Sheets)' })
        .execute();
      this.logger.log(`Cleared ${deleteResult.affected} old Google Sheets entries for year ${currentYear}`);

      // Aggregate realisasi by company and month
      // Map: "companyCode-year-month" -> total amount
      const aggregated = new Map<string, number>();

      for (let i = rupiahStartRow; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row[0]) continue;
        
        const itemName = String(row[0]).toUpperCase().trim();
        
        // Skip total rows
        if (itemName.includes('TOTAL')) continue;
        
        // Identify company from suffix
        let companyCode: string | null = null;
        if (itemName.includes('BBI')) {
          companyCode = 'BBI';
        } else if (itemName.includes('BBA')) {
          companyCode = 'BBA';
        } else if (itemName.includes('JAPELIN')) {
          companyCode = 'JAPELIN';
        }
        
        if (!companyCode) continue;

        // Sum amounts for each month
        for (const mc of monthColumns) {
          const cellValue = row[mc.colIndex];
          const amount = this.parseAmount(cellValue);
          if (amount === null || amount === 0) continue;

          const key = `${companyCode}-${mc.year}-${mc.month}`;
          const current = aggregated.get(key) || 0;
          aggregated.set(key, current + amount);
          
          // Debug logging for first few items
          if (aggregated.size <= 20) {
            this.logger.debug(`Row ${i}: "${itemName}" -> ${companyCode}, month=${mc.month}, colIdx=${mc.colIndex}, raw="${cellValue}", parsed=${amount}`);
          }
        }
      }

      this.logger.log(`Aggregated ${aggregated.size} company-month combinations`);

      // Save aggregated data
      for (const [key, totalAmount] of aggregated) {
        const [companyCode, yearStr, monthStr] = key.split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr);
        
        const companyId = this.companyCodeMap.get(companyCode);
        if (!companyId) {
          errors.push(`Company ${companyCode} not found in database`);
          continue;
        }

        // Use first day of the month for monthly realization
        const date = new Date(year, month - 1, 1);
        await this.upsertMonthlyRealisasi(companyId, year, month, totalAmount);
        count++;
      }

    } catch (error) {
      this.logger.error(`Failed to read REVENUE sheet: ${error.message}`, error.stack);
      errors.push(`Failed to read REVENUE sheet: ${error.message}`);
    }

    return { count, errors };
  }

  private async upsertMonthlyRealisasi(
    companyId: number,
    year: number,
    month: number,
    amount: number,
  ): Promise<void> {
    // Use first day of month as the date for monthly aggregation
    const startDate = new Date(year, month - 1, 1);

    // Since we clear all old data before sync, just insert new data
    const realization = this.realizationRepo.create({
      companyId,
      date: startDate,
      amount,
      description: 'Monthly Total (Google Sheets)',
    });
    await this.realizationRepo.save(realization);
    this.logger.log(`Saved realization: companyId=${companyId}, month=${month}, amount=${amount}`);
  }

  // Target is managed manually via web - syncTarget removed

  private parseDate(value: string): Date | null {
    if (!value) return null;

    // Try various date formats
    const formats = [
      // YYYY-MM-DD
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
      // DD/MM/YYYY
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      // DD-MM-YYYY
      /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
    ];

    for (const format of formats) {
      const match = value.match(format);
      if (match) {
        let year, month, day;
        
        if (format === formats[0]) {
          [, year, month, day] = match;
        } else {
          [, day, month, year] = match;
        }

        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }

    // Try parsing as Google Sheets serial date
    const serialDate = parseFloat(value);
    if (!isNaN(serialDate) && serialDate > 0) {
      // Google Sheets dates are days since Dec 30, 1899
      const date = new Date((serialDate - 25569) * 86400 * 1000);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    return null;
  }

  private parseAmount(value: string | number): number | null {
    if (value === undefined || value === null || value === '') return null;

    // If already a number from XLSX, return it directly (rounded to avoid floating point issues)
    if (typeof value === 'number') {
      return isNaN(value) ? null : Math.round(value);
    }

    const strValue = String(value).trim();
    
    // Check if it looks like Indonesian format (dots as thousand separators)
    // Indonesian: "1.234.567" or "1.234.567,89"
    // International: "1,234,567" or "1,234,567.89" or "1234567.89"
    
    // If string contains both dots and comma, it's likely Indonesian format
    // If string has dots but no comma, check pattern
    const hasDot = strValue.includes('.');
    const hasComma = strValue.includes(',');
    
    let cleaned: string;
    
    if (hasDot && hasComma) {
      // Indonesian format: 1.234.567,89 -> dots are thousands, comma is decimal
      cleaned = strValue.replace(/[Rp\s.]/g, '').replace(/,/g, '.');
    } else if (hasDot && !hasComma) {
      // Could be "1.234.567" (Indo thousands) or "1234567.89" (decimal)
      // Check if dots appear in thousand-separator pattern (every 3 digits from right)
      const parts = strValue.replace(/[Rp\s]/g, '').split('.');
      if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
        // Multiple dots or last part is 3 digits = thousand separators
        cleaned = strValue.replace(/[Rp\s.]/g, '');
      } else {
        // Single dot with non-3-digit decimal = decimal point
        cleaned = strValue.replace(/[Rp\s]/g, '');
      }
    } else if (hasComma && !hasDot) {
      // Comma only: could be "1,234,567" (thousands) or "1234567,89" (Indo decimal)
      const parts = strValue.replace(/[Rp\s]/g, '').split(',');
      if (parts.length === 2 && parts[1].length <= 2) {
        // Single comma with 1-2 digits after = Indonesian decimal
        cleaned = strValue.replace(/[Rp\s]/g, '').replace(/,/g, '.');
      } else {
        // Multiple commas or 3+ digits after = thousand separators
        cleaned = strValue.replace(/[Rp\s,]/g, '');
      }
    } else {
      // No dots or commas, just remove currency symbols and spaces
      cleaned = strValue.replace(/[Rp\s]/g, '');
    }

    const amount = parseFloat(cleaned);
    return isNaN(amount) ? null : Math.round(amount);
  }

  private async upsertRealisasi(
    companyId: number,
    date: Date,
    amount: number,
    description: string | null,
  ): Promise<void> {
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const existing = await this.realizationRepo
      .createQueryBuilder('r')
      .where('r.company_id = :companyId', { companyId })
      .andWhere('DATE(r.date) = :date', { date: dateOnly.toISOString().split('T')[0] })
      .getOne();

    if (existing) {
      existing.amount = amount;
      if (description) existing.description = description;
      await this.realizationRepo.save(existing);
    } else {
      const realization = this.realizationRepo.create({
        companyId,
        date: dateOnly,
        amount,
        description: description || undefined,
      });
      await this.realizationRepo.save(realization);
    }
  }

  private async upsertTarget(
    companyId: number,
    year: number,
    month: number,
    targetAmount: number,
  ): Promise<void> {
    const existing = await this.targetRepo.findOne({
      where: { companyId, year, month },
    });

    if (existing) {
      existing.targetAmount = targetAmount;
      await this.targetRepo.save(existing);
    } else {
      const target = this.targetRepo.create({
        companyId,
        year,
        month,
        targetAmount,
      });
      await this.targetRepo.save(target);
    }
  }

  // Handle webhook from Google Apps Script
  async handleWebhook(payload: {
    spreadsheetId: string;
    sheetName: string;
    range: string;
    timestamp: string;
  }): Promise<SyncResult> {
    if (!this.enabled) {
      return {
        success: false,
        message: 'Google Sheets integration is disabled',
      };
    }

    if (payload.spreadsheetId !== this.fileId) {
      return {
        success: false,
        message: 'Invalid spreadsheet ID',
      };
    }

    this.logger.log(`Webhook received: Sheet "${payload.sheetName}" updated at ${payload.range}`);
    
    // Trigger sync
    return await this.syncFromSheets();
  }
}
