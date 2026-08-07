# Coding Rules & Conventions

## 1. UI/Theme Strict Rule
- **TIDAK BOLEH** menggunakan warna dominan biru, hijau, atau gelap (Dark Mode). Selalu kunci palet warna di ranah *White, Slate, dan Orange*.

## 2. Data Migration & Chunking Rule (Wajib)
- Saat mengimplementasikan fitur Import CSV, AI **WAJIB** menerapkan mekanisme *chunking* (maksimal 500-1000 *records* per *request* API). 
- Dilarang mengeksekusi metode `Promise.all` secara serentak untuk puluhan ribu data. Gunakan iterasi `for...of` agar proses API menunggu balasan (*await*) batch sebelumnya.

## 3. Status Delivery Enum Rule
- Update Status Resi merujuk pada: `['Di Lokasi Muat', 'Selesai Muat', 'Di Perjalanan', 'Bongkar', 'Selesai Bongkar', 'Dokumen Kembali', 'Bermasalah', 'Custom']`.

## 4. Data Sanitization Rule (Wajib)
- Saat Auto-Mapping Master Data dari CSV, fungsi backend **WAJIB** menerapkan sanitasi teks: `TRIM(UPPER(nama_customer))` sebelum melakukan pencarian atau penyisipan ke tabel master.
- Hal ini mencegah duplikasi entitas akibat perbedaan spasi atau huruf besar/kecil (misal: "CAM BKS", "cam bks", "CAM BKS " harus dianggap sebagai satu entitas).
- Sanitasi yang sama berlaku untuk kolom `nopol` pada `master_vehicles`.

## 5. CSV Preview Rule (Wajib)
- Sebelum proses chunking dimulai, AI **WAJIB** menampilkan tabel pratinjau berisi **5 baris pertama** dari file CSV yang diunggah.
- Admin harus mengkonfirmasi pemetaan kolom sebelum tombol "Mulai Import" tersedia.
- Dilarang langsung memproses seluruh file tanpa langkah pratinjau ini.

## 6. RLS & Authentication
- Dilarang bypass RLS di klien. Wajib gunakan integrasi langsung `@supabase/ssr`. 
- Fitur Import CSV HANYA boleh diakses oleh pengguna dengan role `Super Admin`.