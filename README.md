# Revenue Monitoring System - Bosowa Transport

Sistem monitoring pendapatan untuk grup perusahaan Bosowa Transport. Backend (NestJS + TypeORM) menyediakan API terautentikasi dengan JWT/refresh token; frontend (Vue 3 + PrimeVue) menampilkan dashboard real-time, input realisasi, dan perbandingan target vs realisasi.

## Ringkasan Fitur
- **Dashboard Revenue**: ringkasan harian & bulanan, tren realisasi, perbandingan tahunan.
- **Input Realisasi**: form input pendapatan harian per perusahaan.
- **Target Management**: set target bulanan per perusahaan.
- **Multi-Company**: mendukung beberapa perusahaan (BBI, BBA, JAPELIN).
- **Auth & Security**: JWT access + refresh token, manajemen user.
- **Export**: ekspor data ke Excel.

## Perusahaan Default
| ID | Nama | Kode |
|----|------|------|
| 1 | Bosowa Bandar Indonesia | BBI |
| 2 | Bosowa Bandar Agensi | BBA |
| 3 | Jasa Pelabuhan Indonesia | JAPELIN |

## Teknologi
- **Frontend**: Vue 3, Vite, PrimeVue, Pinia, Axios, Chart.js
- **Backend**: NestJS, TypeORM, MySQL/MariaDB, JWT
- **Infra**: Node.js 18+, PM2, Nginx

## Struktur Direktori
```
backend/   # API NestJS + TypeORM
frontend/  # Client Vue 3 + Vite
```

## Quick Start (Development)

### 1. Database (Podman/Docker)
```bash
# MariaDB
podman run -d --name mariadb-revenue \
  -e MYSQL_ROOT_PASSWORD=rootpassword \
  -e MYSQL_DATABASE=revenue \
  -e MYSQL_USER=revenue_user \
  -e MYSQL_PASSWORD=yourpassword \
  -p 3307:3306 \
  mariadb:latest
```

### 2. Backend
```bash
cd backend
cp .env.example .env
# Edit .env sesuai konfigurasi database
npm install
npm run db:migration:run
npm run start:dev
```

### 3. Frontend
```bash
cd frontend
cp .env.example .env
# Edit VITE_API_URL=http://localhost:3000/api
npm install
npm run dev
```

### 4. Seed Data
```bash
# Seed companies (via API)
curl -X POST http://localhost:3000/api/revenue/companies/seed
```

### Default Login
- **Email**: `admin@example.com`
- **Password**: `password123`

## Konfigurasi Environment

### Backend (`backend/.env`)
```env
APP_PORT=3000
APP_TIMEZONE=Asia/Makassar
ENABLE_SWAGGER=true
ENABLE_CORS=true
CORS_ORIGINS=http://localhost:5173

DB_TYPE=mariadb
DB_HOST=127.0.0.1
DB_PORT=3307
DB_USERNAME=revenue_user
DB_PASSWORD=yourpassword
DB_NAME=revenue
DB_SSL=false
DB_SYNCHRONIZE=false
DB_LOGGING=false

JWT_SECRET=your-super-secret-key
JWT_ACCESS_TTL_SECONDS=86400
JWT_REFRESH_TTL_SECONDS=604800

SEED_DEFAULT_USERS=true
DB_TIMEZONE="+08:00"
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL=http://localhost:3000/api
```

## Deployment (aaPanel Ubuntu VPS)

### 1. Install Software via aaPanel App Store
- **Node.js** v18+ (Node.js Manager)
- **PM2** (Process Manager)
- **MariaDB** atau **MySQL**
- **Nginx**

### 2. Buat Database
Di aaPanel > Database > Add Database:
- **Name**: `revenue`
- **Username**: `revenue_user`
- **Password**: (generate password kuat)
- **Access**: Local only

### 3. Clone Repository
```bash
cd /www/wwwroot
git clone https://github.com/[username]/revenue-bosowa-transport.git
cd revenue-bosowa-transport
```

### 4. Setup Backend
```bash
cd backend
cp .env.example .env
nano .env
```

Edit `.env` untuk production:
```env
APP_PORT=3000
APP_TIMEZONE=Asia/Makassar
ENABLE_SWAGGER=false
ENABLE_CORS=true
CORS_ORIGINS=https://revenue.domain.com

DB_TYPE=mariadb
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USERNAME=revenue_user
DB_PASSWORD=[password_dari_aapanel]
DB_NAME=revenue
DB_SSL=false
DB_SYNCHRONIZE=false
DB_LOGGING=false

JWT_SECRET=[generate_random_string_64_char]
JWT_ACCESS_TTL_SECONDS=86400
JWT_REFRESH_TTL_SECONDS=604800

SEED_DEFAULT_USERS=true
DB_TIMEZONE="+08:00"
```

Install & Build:
```bash
npm install
npm run build
npm run db:migration:run
```

Start dengan PM2:
```bash
pm2 start dist/main.js --name revenue-api
pm2 save
pm2 startup
```

Seed companies:
```bash
curl -X POST http://localhost:3000/api/revenue/companies/seed
```

### 5. Setup Frontend
```bash
cd ../frontend
cp .env.example .env
nano .env
```

Edit `.env`:
```env
VITE_API_URL=https://api.revenue.domain.com/api
```

Build:
```bash
npm install
npm run build
```

### 6. Setup Website di aaPanel

#### Website Frontend (Static)
1. aaPanel > Website > Add Site
2. **Domain**: `revenue.domain.com`
3. **Root Directory**: `/www/wwwroot/revenue-bosowa-transport/frontend/dist`
4. **PHP**: Pure Static

Tambah konfigurasi Nginx untuk SPA (Site > Config):
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

#### Website API (Reverse Proxy)
1. aaPanel > Website > Add Site
2. **Domain**: `api.revenue.domain.com`
3. **PHP**: Pure Static
4. Site > Reverse Proxy > Add:
   - **Target URL**: `http://127.0.0.1:3000`
   - **Send Domain**: `$host`

### 7. SSL Certificate
1. Site > SSL > Let's Encrypt
2. Aktifkan untuk kedua domain
3. Force HTTPS: Enable

### 8. Firewall
- Buka port: 80, 443
- Database: local access only (jangan expose)

## Update Production

```bash
cd /www/wwwroot/revenue-bosowa-transport

# Pull latest
git pull origin main

# Update backend
cd backend
npm install
npm run build
npm run db:migration:run
pm2 restart revenue-api

# Update frontend
cd ../frontend
npm install
npm run build
```

## API Endpoints

| Endpoint | Method | Deskripsi |
|----------|--------|-----------|
| `/api/auth/login` | POST | Login user |
| `/api/auth/refresh` | POST | Refresh token |
| `/api/auth/logout` | POST | Logout user |
| `/api/auth/me` | GET | Get current user |
| `/api/users` | GET/POST | List/Create users |
| `/api/users/:id` | GET/PATCH/DELETE | Get/Update/Delete user |
| `/api/revenue/companies` | GET | List companies |
| `/api/revenue/companies/seed` | POST | Seed default companies |
| `/api/revenue/targets` | GET/POST | List/Create targets |
| `/api/revenue/realizations` | GET/POST | List/Create realizations |
| `/api/revenue/summary` | GET | Dashboard summary |
| `/api/revenue/trend` | GET | Monthly trend data |
| `/api/revenue/yearly-comparison` | GET | Yearly comparison |

## Database Migrations

```bash
# Generate migration baru
npm run db:migration:generate --name=NamaMigration

# Jalankan migration
npm run db:migration:run

# Revert migration terakhir
npm run db:migration:revert
```

## Troubleshooting

### Error: Unknown column
Jalankan migration:
```bash
npm run db:migration:run
```

### Error: CORS
Pastikan `CORS_ORIGINS` di backend `.env` sesuai dengan domain frontend.

### PM2 tidak start
```bash
pm2 logs revenue-api  # Cek error
pm2 delete revenue-api
pm2 start dist/main.js --name revenue-api
```

### Frontend 404 on refresh
Tambahkan config Nginx:
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

## License
MIT
