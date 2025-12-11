import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SheetsService } from './sheets.service';
import type { SyncResult, SyncStatus } from './sheets.service';

@ApiTags('Google Sheets')
@Controller('sheets')
export class SheetsController {
  constructor(private readonly sheetsService: SheetsService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get Google Sheets sync status' })
  getStatus(): SyncStatus {
    return this.sheetsService.getStatus();
  }

  @Post('sync')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Manually trigger sync from Google Sheets' })
  async sync(): Promise<SyncResult> {
    return await this.sheetsService.syncFromSheets();
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Webhook endpoint for Google Apps Script' })
  async webhook(
    @Body()
    payload: {
      spreadsheetId: string;
      sheetName: string;
      range: string;
      timestamp: string;
    },
  ): Promise<SyncResult> {
    return await this.sheetsService.handleWebhook(payload);
  }
}
