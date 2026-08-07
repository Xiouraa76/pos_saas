# PRD — Project Requirements Document

## 1. Overview
Aplikasi ini bertujuan untuk mendigitalkan manajemen operasional logistik cAm LOGISTICS yang sebelumnya mengandalkan pencatatan manual berbasis spreadsheet. Sistem ini akan menjadi pusat komando (Dashboard Analitik) dan POS Inputing (Delivery Management) untuk >38.000 data pengiriman dengan dukungan multi-layanan (FTL, LTL, LCL).

## 2. Requirements
- **Aksesibilitas:** Platform Web SaaS multi-pengguna.
- **Pengguna:** Custom Login dengan Hak Akses ketat (Super Admin, Admin, Driver).
- **Data Input & Migrasi:** Mampu menambahkan STT secara manual (satuan) maupun **migrasi data massal (Bulk Import CSV)** dari sistem spreadsheet lama.
- **Notifikasi & Analitik:** Peringatan SLA, metrik DO non-STT, dan Live Tracking ditampilkan real-time.

## 3. Core Features
1.  **Dashboard Analitik Utama**
    - Ringkasan transaksi aktif, volume koli, dan omset (FTL/LTL/LCL).
    - Panel KPI dan *Live Tracking SLA*.
2.  **Delivery Management & Data Migration**
    - **POS Input Resi Detail:** Form dinamis penambahan STT baru dengan *dropdown* ke Master Data.
    - **Bulk Import (Migrasi Data):** Fitur khusus Admin untuk mengunggah file CSV. Sistem otomatis memetakan teks di CSV menjadi relasi ID ke Master Data.
    - **Update Tracker Resi:** Opsi mutlak: *Di Lokasi Muat, Selesai Muat, Di Perjalanan, Bongkar, Selesai Bongkar, Dokumen Kembali, Bermasalah, Custom*.
    - **Input SLA & KPI:** Kalkulasi target hari pengiriman (SLA) dan input performa KPI secara terikat pada STT.
3.  **User Management**
    - Custom Login (Email/Password) dan pengaturan *Role Akses*.
