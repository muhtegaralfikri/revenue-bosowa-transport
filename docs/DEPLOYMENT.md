# Panduan Deployment - Revenue Bosowa Transport

## Server Info
- **IP:** 18.142.108.109
- **Path:** `/www/wwwroot/revenue-bosowa-transport`
- **RAM:** 2GB (terlalu kecil untuk build)

---

## Update Deployment

### 1. Pull perubahan di server
```bash
cd /www/wwwroot/revenue-bosowa-transport
git pull origin main
```

### 2. Build di lokal (PC/Laptop)
Server RAM 2GB tidak cukup untuk build NestJS. Build di lokal:

```bash
cd D:\github_project\revenue-bosowa-transport\backend
npm run build
```

### 3. Upload folder `dist/` ke server
Upload dari:
```
D:\github_project\revenue-bosowa-transport\backend\dist
```

Ke server:
```
/www/wwwroot/revenue-bosowa-transport/backend/dist
```

Gunakan **aaPanel File Manager** atau **FileZilla/WinSCP**.

### 4. Install dependencies di server (jika ada package baru)
```bash
cd /www/wwwroot/revenue-bosowa-transport/backend
npm install --production
```

### 5. Restart aplikasi
```bash
pm2 restart all
```

### 6. Cek logs
```bash
pm2 logs
```

---

## Google Sheets Integration

### File yang diperlukan di server:
1. **google-credentials.json** - Service Account key dari Google Cloud Console
   - Upload ke: `/www/wwwroot/revenue-bosowa-transport/backend/google-credentials.json`

### Konfigurasi `.env` backend:
```env
# Google Sheets Integration
GOOGLE_SHEETS_ENABLED=true
GOOGLE_SHEETS_CREDENTIALS_FILE=/www/wwwroot/revenue-bosowa-transport/backend/google-credentials.json
GOOGLE_SPREADSHEET_ID=1Xf9tR8HodZOYhXWkNr41NDEMfCtBfCMi
GOOGLE_SHEETS_SYNC_INTERVAL=60
```

### Edit `.env` di server:
```bash
nano /www/wwwroot/revenue-bosowa-transport/backend/.env
```

---

## Troubleshooting

### Build gagal "JavaScript heap out of memory"
Build di lokal, jangan di server.

### Web tidak bisa diakses setelah deploy
```bash
pm2 status
pm2 logs
pm2 restart all
```

### Sync Google Sheets tidak jalan
1. Cek file `google-credentials.json` ada di server
2. Cek `.env` sudah dikonfigurasi
3. Cek logs: `pm2 logs`
4. Pastikan spreadsheet sudah di-share ke email service account

---

## Struktur Folder Server
```
/www/wwwroot/revenue-bosowa-transport/
├── backend/
│   ├── dist/           # Hasil build (upload dari lokal)
│   ├── node_modules/
│   ├── .env            # Konfigurasi environment
│   └── google-credentials.json  # Google Service Account key
└── frontend/
    └── dist/           # Build frontend
```
