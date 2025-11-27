# Fuel Ledger System

Sistem buku besar stok BBM untuk tim Bosowa Fuel. Backend (NestJS + TypeORM) menyediakan API terautentikasi dengan JWT/refresh token; frontend (Vue 3 + PrimeVue) menampilkan dashboard real-time dan form transaksi. Alur dipisah untuk admin (stok masuk) dan operasional (pemakaian) dengan kontrol akses role-based.

## Ringkasan fitur
- **Ledger stok**: kartu stok harian, tren IN/OUT, riwayat transaksi, ekspor Excel.
- **Role & security**: JWT access + refresh, guard role (`admin`, `operasional`), endpoint `auth/me`, logout, revoke token.
- **Manajemen user**: CRUD user, reset password, dan seeding akun default.
- **Migrasi DB**: skema disimpan di TypeORM migrations (tidak bergantung `synchronize`).
- **UI**: dashboard Vue 3 + PrimeVue, Pinia store, polling ringkasan hanya saat user terautentikasi.

## Arsitektur & teknologi
- **Frontend** (`frontend/`)
  - Framework: Vue 3 (Vite).
  - UI: PrimeVue + PrimeIcons.
  - Routing: Vue Router (history mode) dengan guard auth; rute dipisah per role (admin vs operasional) untuk dashboard, stok in/out, dan manajemen user.
  - State: Pinia; auth token disimpan di `localStorage` dengan refresh otomatis.
  - HTTP: Axios dengan interceptor token.
  - Utilitas: dayjs untuk tanggal, SheetJS/xlsx untuk ekspor Excel.
- **Backend** (`backend/`)
  - Framework: NestJS (REST + Swagger opsional).
  - ORM: TypeORM (PostgreSQL dan MySQL kompatibel) dengan migrations.
  - Auth: JWT access/refresh, guard role, endpoint `auth/me`, logout/revoke token.
  - Validasi: class-validator + class-transformer pada DTO.
  - Logging/env: @nestjs/config, pino logger (jika diaktifkan).
- **Infra & Dev**
  - Node.js 18+, npm.
  - PM2 untuk daemon di produksi; Nginx reverse proxy/serving static frontend.
  - Testing backend dengan Jest (`npm run test`).

## Struktur direktori
```
backend/   # API NestJS + TypeORM
frontend/  # Client Vue 3 + Vite
```

## Persiapan environment
1. Salin file contoh `.env`:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```
2. Edit `backend/.env` sesuai DB Anda (Postgres via `DATABASE_URL` atau host/port; MySQL juga didukung). Set `JWT_SECRET`, `JWT_ACCESS_TTL_SECONDS`, `JWT_REFRESH_TTL_SECONDS`, dan `SEED_DEFAULT_USERS` bila ingin seeding akun default.
3. Edit `frontend/.env` dan set `VITE_API_URL` (mis. `http://localhost:3000/api`).

## Cara jalanin backend
```bash
cd backend
npm install
npm run db:migration:run
npm run start:dev
```

### Migrasi schema
- Generate: `npm run db:migration:generate --name=AddNewTable`
- Jalankan: `npm run db:migration:run`
- Revert: `npm run db:migration:revert`

> Catatan: `npm install` bisa gagal di host tanpa WSL2; gunakan environment Node.js biasa bila perlu update `node_modules`.

## Cara jalanin frontend
```bash
cd frontend
npm install
npm run dev
```
Klien membutuhkan access token untuk memanggil `/stock/...`. Setelah login, token disimpan di localStorage dan otomatis direfresh sebelum kedaluwarsa.

## Routing (Vue Router)
- Mode history dengan base default Vite.
- Guard auth pada router global: memblokir rute bertanda `requiresAuth` bila belum ada access token; jika token ada tetapi role tidak cocok, diarahkan ke halaman sesuai rolenya.
- Rute publik: `/login` (guest only, redirect ke dashboard jika sudah login).
- Rute admin: dashboard admin, stok masuk, manajemen user, riwayat dan tren. Biasanya prefiks `/admin`.
- Rute operasional: dashboard operasional, pemakaian stok/keluar, riwayat. Biasanya prefiks `/op`.
- Not-found fallback (`/:pathMatch(.*)*`) mengarahkan ke halaman 404.

## Cara kerja aplikasi (alur end-to-end)
- **Autentikasi**: User login di frontend (`/login`) → backend `POST /auth/login` mengembalikan access + refresh token. Token disimpan di `localStorage`. Axios interceptor menambahkan `Authorization: Bearer <accessToken>` untuk tiap request dan otomatis memanggil `/auth/refresh` jika access token kedaluwarsa.
- **Otorisasi & role guard**: Vue Router guard memeriksa token + role; NestJS guard memeriksa JWT + role metadata pada controller. Admin punya akses penuh (stok masuk, user, laporan), operasional hanya pemakaian/keluar stok dan dashboardnya.
- **Dashboard & polling**: Setelah login, frontend memuat ringkasan stok, tren, dan riwayat lewat endpoint `/stock/summary`, `/stock/trend`, dan `/stock/history`. Polling ringkasan diaktifkan hanya jika user terautentikasi agar beban API terkendali.
- **Transaksi stok**: 
  - Admin mencatat stok masuk (IN) via form → `POST /stock/in` menyimpan transaksi melalui service TypeORM dan memperbarui ledger.
  - Operasional mencatat pemakaian (OUT) via `POST /stock/out`. Semua transaksi terekam untuk histori dan perhitungan saldo.
- **Ledger & perhitungan**: Backend menghitung saldo berdasarkan transaksi IN/OUT tersimpan di database. Query summary/trend menggunakan TypeORM repo untuk agregasi harian/bulanan dan menyediakan data untuk chart di frontend.
- **Ekspor**: Frontend memakai SheetJS/xlsx untuk ekspor data transaksi/summary ke Excel dari data yang sudah diambil via API.
- **Swagger & observability**: Dokumentasi API opsional di `/api/docs` dengan `ENABLE_SWAGGER=true`. PM2 menangani proses backend; log dapat diakses via PM2/Nginx.

## Deployment (aaPanel Ubuntu VPS)
Ringkasan alur deploy backend + frontend pada VPS Ubuntu via aaPanel:

1. **Persiapan VPS**
   - Install Node.js 18+ dan npm (`aaPanel App Store` > Node.js Manager atau nvm).
   - Tambahkan PM2 dari App Store untuk menjalankan servis Node sebagai daemon.
   - Install Nginx (atau gunakan Reverse Proxy di panel) untuk API/frontend.

2. **Clone & konfigurasi**
   - Clone/upload repo ke `/www/wwwroot/fuel-ledger-system`.
   - Salin env contoh:
     ```bash
     cp backend/.env.example backend/.env
     cp frontend/.env.example frontend/.env
     ```
   - Sesuaikan `backend/.env` (DATABASE_URL/DB_HOST, JWT_SECRET, dll) dan `frontend/.env` (`VITE_API_URL` mengarah ke domain API, mis. `https://api.domainanda.com/api`).

3. **Backend**
   ```bash
   cd backend
   npm install
   npm run build
   npm run db:migration:run
   pm2 start dist/main.js --name fuel-ledger-api
   pm2 save
   ```
   Arahkan Nginx reverse proxy dari `https://api.domainanda.com` ke `localhost:3000`.

4. **Frontend**
   ```bash
   cd ../frontend
   npm install
   npm run build
   ```
   Serve `frontend/dist` via Nginx sebagai static site. Pastikan `VITE_API_URL` menunjuk ke domain API produksi.

5. **SSL & keamanan**
   - Gunakan Let's Encrypt via aaPanel untuk domain API & frontend.
   - Firewall hanya buka port 80/443; database sebaiknya hanya akses internal.

6. **Monitoring & update**
   - PM2 restart otomatis jika crash. Untuk update: `git pull`, `npm install`, `npm run build`, lalu `pm2 restart fuel-ledger-api`.

## Testing
Backend:
```bash
cd backend
npm run test
```
Menjalankan unit test (`auth.service`, `RolesGuard`). Tambahkan test untuk logika stok/endpoint lainnya sebelum produksi.

## API ringkas
- `POST /auth/login` – login, balikan `{ accessToken, refreshToken, user }`.
- `POST /auth/refresh` – tukar refresh token dengan pasangan token baru.
- `POST /auth/logout` – revoke semua refresh token user (perlu Authorization).
- `GET /auth/me` – profil user aktif.
- `CRUD /users` – hanya admin (JWT + role guard).
- `/stock/*` – wajib JWT (summary, tren, history, in/out).

Swagger tersedia di `/api/docs` jika `ENABLE_SWAGGER=true`.

### Endpoint utama (role)
| Endpoint | Method | Deskripsi | Role |
| --- | --- | --- | --- |
| `/auth/login` | POST | Login, balikan access + refresh token | Publik |
| `/auth/refresh` | POST | Tukar refresh token untuk pasangan baru | Auth |
| `/auth/logout` | POST | Revoke semua refresh token user | Auth |
| `/auth/me` | GET | Profil user aktif | Auth |
| `/users` | CRUD | Kelola user (create/update/delete/list) | Admin |
| `/stock/summary` | GET | Ringkasan stok (saldo, total IN/OUT) | Admin, Operasional |
| `/stock/trend` | GET | Tren stok/IN/OUT per periode | Admin, Operasional |
| `/stock/history` | GET | Riwayat transaksi stok | Admin, Operasional |
| `/stock/in` | POST | Catat stok masuk | Admin |
| `/stock/out` | POST | Catat pemakaian/keluar | Operasional |
| `/stock/export` | GET | Ekspor data ke Excel (jika diaktifkan) | Admin, Operasional |

## Konfigurasi environment
- **Backend (`backend/.env`)**
  - `DATABASE_URL` atau `DB_HOST`/`DB_PORT`/`DB_USERNAME`/`DB_PASSWORD`/`DB_NAME`: koneksi Postgres/MySQL.
  - `JWT_SECRET`: secret signing JWT.
  - `JWT_ACCESS_TTL_SECONDS`: umur access token (detik).
  - `JWT_REFRESH_TTL_SECONDS`: umur refresh token (detik).
  - `SEED_DEFAULT_USERS`: `true`/`false` untuk seeding akun default (admin & operasional).
  - `ENABLE_SWAGGER`: `true` untuk membuka `/api/docs`.
  - `PORT`: port server (default 3000).
  - Opsional: `LOG_LEVEL`, `NODE_ENV`, konfigurasi CORS jika disiapkan.
- **Frontend (`frontend/.env`)**
  - `VITE_API_URL`: base URL API, contoh `http://localhost:3000/api` atau `https://api.domainanda.com/api`.
  - Opsional: `VITE_APP_NAME` atau branding lain jika tersedia.

## Diagram arsitektur
```mermaid
flowchart LR
    subgraph Client
        U[User Browser]
        FE[Vue 3 + Vite<br/>PrimeVue UI<br/>Pinia + Axios]
    end

    subgraph Server
        API[NestJS REST API<br/>Auth + Stock Modules]
        AUTH[JWT/Refresh Service<br/>Role Guard]
        STOCK[Stock Service<br/>TypeORM Repos]
    end

    DB[(PostgreSQL/MySQL)]
    Redis[(Optional: cache/token blacklist)]

    U --> FE
    FE -->|HTTPS JSON| API
    API --> AUTH
    API --> STOCK
    STOCK --> DB
    AUTH --> DB
    AUTH -->|issue/refresh| FE
    API -->|logs/metrics| PM2[(PM2/Nginx)]
    PM2 -->|serve static| FE
    API -. optional .-> Redis
    Nginx[(Nginx Reverse Proxy)] --> API
    FE --> Nginx
```***
