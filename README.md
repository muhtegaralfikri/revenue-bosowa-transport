# Fuel Ledger System

End-to-end stock ledger for Bosowa Fuel teams. Backend is NestJS + TypeORM with JWT/refresh tokens, frontend is Vue 3 + PrimeVue. The system separates admin (stok masuk) and operasional (pemakaian) flows with real-time dashboards.

## Fitur utama
- **Manajemen stok**: summary harian, riwayat transaksi, ekspor Excel, tren stok/IN-OUT.
- **Role & security**: JWT access token + refresh token, guard role-based (`admin`, `operasional`), endpoint `auth/me`, logout, dan revoke token.
- **Manajemen user**: Admin dapat membuat, mengubah, reset password, dan menghapus user langsung dari API yang baru.
- **Migrasi database**: Skema direkam di TypeORM migrations (tidak lagi bergantung `synchronize`).
- **UI**: Vue 3 + PrimeVue dengan Pinia store, polling ringkasan hanya berjalan bila user terautentikasi.

## Struktur direktori
```
backend/   # NestJS + TypeORM
frontend/  # Vue 3 + Vite client
```

## Persiapan environment
1. Salin file contoh `.env`:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```
2. Edit `backend/.env` sesuai database Anda. Default mendukung Postgres (via `DATABASE_URL` atau host/port) dan MySQL. Set `JWT_SECRET`, `JWT_ACCESS_TTL_SECONDS`, `JWT_REFRESH_TTL_SECONDS`, serta `SEED_DEFAULT_USERS` bila ingin seeding default admin/operasional.
3. Untuk front-end, set `VITE_API_URL` (contoh `http://localhost:3000/api`).

## Backend
```bash
cd backend
npm install        # jika belum
npm run db:migration:run
npm run start:dev
```

### Migrasi schema
- Generate: `npm run db:migration:generate --name=AddNewTable`
- Jalankan: `npm run db:migration:run`
- Revert: `npm run db:migration:revert`

> Catatan: Perintah `npm install` akan gagal di host yang belum mendukung WSL2, jalankan di environment Node.js biasa jika perlu memperbarui `node_modules`.

### Akun bawaan
Dengan `SEED_DEFAULT_USERS=true`, service otomatis membuat:
| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@example.com` | `password123` |
| Operasional | `op@example.com` | `password123` |

Ubah password segera setelah deploy.

## Frontend
```bash
cd frontend
npm install
npm run dev
```
Aplikasi front-end memerlukan akses token agar bisa memanggil `/stock/...`. Setelah login berhasil, klien menyimpan access token & refresh token di localStorage dan otomatis merefresh sebelum kedaluwarsa.

## Deployment (aaPanel Ubuntu VPS)

Berikut alur ringkas untuk mendeploy backend dan frontend pada VPS Ubuntu yang dikelola melalui aaPanel:

1. **Persiapan VPS**
   - Pastikan Node.js 18+ dan npm terinstal (`aaPanel App Store` > Node.js Manager atau manual via nvm).
   - Tambahkan PM2 dari App Store untuk menjalankan servis Node secara daemon.
   - Instal Nginx (atau gunakan panel Reverse Proxy) untuk serving API/frontend.

2. **Clone & konfigurasi**
   - Upload/clone repo ke `/www/wwwroot/fuel-ledger-system`.
   - Salin file env contoh:
     ```bash
     cp backend/.env.example backend/.env
     cp frontend/.env.example frontend/.env
     ```
   - Sesuaikan `backend/.env` (DATABASE_URL/DB_HOST, JWT_SECRET, dsb) dan `frontend/.env` (`VITE_API_URL` mengarah ke domain API anda, mis. `https://api.domainanda.com/api`).

3. **Backend**
   ```bash
   cd backend
   npm install
   npm run build
   npm run db:migration:run
   ```
   Jalankan via PM2 (CLI server atau menu PM2 di aaPanel):
   ```bash
   pm2 start dist/main.js --name fuel-ledger-api
   pm2 save
   ```
   Pada aaPanel > PM2 Manager Anda bisa memantau log. Gunakan Nginx reverse proxy untuk mengarahkan `https://api.domainanda.com` ke `localhost:3000`.

4. **Frontend**
   ```bash
   cd ../frontend
   npm install
   npm run build
   ```
   Hasil build `dist/` bisa disajikan melalui Nginx sebagai static site (set root ke `frontend/dist`). Pastikan `VITE_API_URL` sudah menunjuk ke domain API produk.

5. **SSL & Keamanan**
   - Gunakan aaPanel `Let's Encrypt` untuk domain API & frontend.
   - Pastikan firewall membuka port 80/443 saja, dan database hanya bisa diakses internal.

6. **Monitoring**
   - PM2 otomatis restart jika proses crash. Untuk update, jalankan `git pull`, `npm install`, `npm run build`, lalu `pm2 restart fuel-ledger-api` (via terminal; di aaPanel Anda bisa gunakan tombol restart pada PM2 Manager).

Dengan langkah ini sistem siap dijalankan di lingkungan produksi aaPanel/Ubuntu.

## Testing
Backend:
```bash
cd backend
npm run test
```
Menjalankan unit test baru (`auth.service` dan `RolesGuard`). Tambahkan test tambahan sebelum produksi untuk logika stok/endpoint lain.

## API ringkas
- `POST /auth/login` – login, respon `{ accessToken, refreshToken, user }`.
- `POST /auth/refresh` – tukar refresh token dengan pasangan token baru.
- `POST /auth/logout` – revokasi semua refresh token user (wajib Authorization).
- `GET /auth/me` – profil user aktif.
- `CRUD /users` – hanya admin (JWT + role guard).
- `/stock/*` – kini wajib JWT (summary, tren, history, in/out).

Dokumentasi Swagger tersedia di `/api/docs` jika `ENABLE_SWAGGER=true`.
