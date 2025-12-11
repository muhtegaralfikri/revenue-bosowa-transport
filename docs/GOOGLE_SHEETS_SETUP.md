# Panduan Integrasi Google Sheets

## Langkah 1: Buat Google Cloud Project

1. Buka https://console.cloud.google.com/
2. Login dengan akun Google
3. Klik **Select a project** > **New Project**
4. Isi:
   - Project name: `revenue-bosowa`
   - Klik **Create**

## Langkah 2: Enable Google Sheets API

1. Di Google Cloud Console, buka **APIs & Services** > **Library**
2. Cari **Google Sheets API**
3. Klik **Enable**

## Langkah 3: Buat Service Account

1. Buka **APIs & Services** > **Credentials**
2. Klik **+ CREATE CREDENTIALS** > **Service account**
3. Isi:
   - Service account name: `revenue-sheets-reader`
   - Klik **Create and Continue**
4. Skip role (langsung klik **Continue**)
5. Klik **Done**

## Langkah 4: Download JSON Key

1. Di halaman **Credentials**, klik service account yang baru dibuat
2. Klik tab **Keys**
3. Klik **Add Key** > **Create new key**
4. Pilih **JSON** > **Create**
5. File JSON akan terdownload (simpan dengan aman!)

## Langkah 5: Buat Spreadsheet

1. Buka https://sheets.google.com/
2. Buat spreadsheet baru dengan nama: `Revenue Data - Bosowa Transport`
3. Buat 2 sheet dengan format berikut:

### Sheet 1: "Realisasi" (rename sheet pertama)

| Tanggal | BBI | BBA | JAPELIN | Keterangan |
|---------|-----|-----|---------|------------|
| 2025-12-01 | 50000000 | 30000000 | 20000000 | |
| 2025-12-02 | 45000000 | 35000000 | 25000000 | |
| 2025-12-03 | 55000000 | 40000000 | 22000000 | |

**Aturan:**
- Kolom A (Tanggal): Format `YYYY-MM-DD` atau `DD/MM/YYYY`
- Kolom B, C, D: Angka nominal (tanpa Rp, tanpa titik ribuan)
- Header harus di baris 1

### Sheet 2: "Target" (tambah sheet baru)

| Tahun | Bulan | BBI | BBA | JAPELIN |
|-------|-------|-----|-----|---------|
| 2025 | 1 | 1500000000 | 900000000 | 600000000 |
| 2025 | 2 | 1500000000 | 900000000 | 600000000 |
| 2025 | 12 | 1600000000 | 950000000 | 650000000 |
| 2026 | 1 | 1700000000 | 1000000000 | 700000000 |

**Aturan:**
- Kolom A (Tahun): 4 digit (2025, 2026, dst)
- Kolom B (Bulan): 1-12
- Kolom C, D, E: Angka nominal target bulanan

## Langkah 6: Share Spreadsheet ke Service Account

1. Di spreadsheet, klik tombol **Share** (pojok kanan atas)
2. Tambahkan email service account (dari JSON key, field `client_email`)
   - Contoh: `revenue-sheets-reader@revenue-bosowa.iam.gserviceaccount.com`
3. Set permission: **Viewer** (read only)
4. Klik **Send**

## Langkah 7: Catat Spreadsheet ID

URL spreadsheet: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`

Copy bagian `SPREADSHEET_ID` (string panjang antara `/d/` dan `/edit`)

## Langkah 8: Konfigurasi Backend

Tambahkan ke file `.env` backend:

```env
# Google Sheets Integration
GOOGLE_SHEETS_ENABLED=true
GOOGLE_SHEETS_CREDENTIALS_FILE=./google-credentials.json
GOOGLE_SPREADSHEET_ID=your_spreadsheet_id_here
GOOGLE_SHEETS_SYNC_INTERVAL=60
```

Atau gunakan inline credentials:

```env
GOOGLE_SHEETS_ENABLED=true
GOOGLE_SHEETS_CLIENT_EMAIL=revenue-sheets-reader@revenue-bosowa.iam.gserviceaccount.com
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SPREADSHEET_ID=your_spreadsheet_id_here
GOOGLE_SHEETS_SYNC_INTERVAL=60
```

## Langkah 9: Setup Webhook (Real-time) - Opsional

Untuk sync real-time saat ada perubahan di spreadsheet:

1. Di spreadsheet, buka **Extensions** > **Apps Script**
2. Paste kode berikut:

```javascript
function onEdit(e) {
  // Trigger webhook saat ada edit
  var url = 'https://api.revenue.bosowabandar.com/api/sheets/webhook';
  
  var options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify({
      'spreadsheetId': SpreadsheetApp.getActiveSpreadsheet().getId(),
      'sheetName': e.source.getActiveSheet().getName(),
      'range': e.range.getA1Notation(),
      'timestamp': new Date().toISOString()
    })
  };
  
  try {
    UrlFetchApp.fetch(url, options);
  } catch (error) {
    console.log('Webhook error: ' + error);
  }
}

function setupTrigger() {
  // Jalankan sekali untuk setup trigger
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(trigger) {
    ScriptApp.deleteTrigger(trigger);
  });
  
  ScriptApp.newTrigger('onEdit')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create();
}
```

3. Klik **Run** > pilih `setupTrigger`
4. Berikan permission yang diminta

## Troubleshooting

### Error: "The caller does not have permission"
- Pastikan spreadsheet sudah di-share ke email service account
- Pastikan service account email benar

### Error: "API not enabled"
- Buka Google Cloud Console
- Enable Google Sheets API

### Data tidak sync
- Cek format tanggal di spreadsheet (harus YYYY-MM-DD)
- Cek header sheet harus sesuai
- Cek logs di backend

## Testing

Setelah setup selesai, test dengan:

```bash
# Manual sync
curl -X POST http://localhost:3000/api/sheets/sync

# Check status
curl http://localhost:3000/api/sheets/status
```
