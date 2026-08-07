# UI/UX & Design Guidelines

## 1. Visual Aesthetics (Orange & White Dominance)
- **Background Utama**: Putih murni (`bg-white`) atau *Off-White* (`bg-slate-50`).
- **Warna Aksen**: Oranye terang (`#ea580c` / `orange-600`) khusus untuk tombol aksi utama, Indikator aktif, Bar Chart, dan Progress bar import.
- **Warna Teks**: Abu-abu gelap (`text-slate-800`).

## 2. Component Directives
- **CSV Uploader Dropzone:** Area seret-dan-lepas (*drag & drop*) dengan desain *dashed border* abu-abu. Saat proses import berjalan, tampilkan *Progress Bar* berwarna Oranye beserta teks jumlah baris yang berhasil diproses (misal: "Memproses 2.000 / 38.000 baris...").
- **CSV Preview Table (Layar Pratinjau):** Setelah file CSV diunggah namun sebelum proses import dimulai, tampilkan tabel pratinjau berisi **5 baris pertama** dari CSV. Tabel ini menampilkan kolom-kolom yang terdeteksi (misal: No STT, Customer, Nopol, Qty) agar Admin bisa memverifikasi pemetaan data. Sertakan tombol "Mulai Import" (Oranye) dan "Batal" (Abu-abu).
- **Form Resi & Tracker**: Form Grid 2 kolom. Tracker status menggunakan format *Stepper* horizontal/vertikal (titik oranye yang menyala sesuai status terakhir).
- **Optimistic UI**: Form manual POS wajib menampilkan resi ke dalam tabel secara instan (Optimistic update) tanpa menunggu *reload* server.