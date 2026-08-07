# System Architecture

## 1. Tech Stack
- **Frontend**: Next.js (App Router), React, TypeScript.
- **Data Parsing (Import)**: PapaParse (untuk membaca CSV di klien sebelum dikirim).
- **Backend & DB**: Supabase (PostgreSQL, Auth, RPC Functions).

## 2. Bulk Import & Migration Flow (The 38k Rule)
Mengunggah 38.000 data sekaligus dari Excel akan membuat server *crash*. Arsitektur import wajib menggunakan metode **Chunking**:
1. Frontend membaca file CSV menggunakan `PapaParse`.
2. **Layar Pratinjau (Preview):** Sebelum proses chunking dimulai, sistem menampilkan tabel pratinjau berisi **5 baris pertama** dari CSV. Admin memverifikasi bahwa kolom Excel (seperti Nopol, Qty, Nama Customer) sudah terpetakan ke kolom database yang tepat. Admin menekan "Mulai Import" setelah konfirmasi.
3. Data dipecah (*chunk*) menjadi 1.000 baris per antrean (batch).
4. Frontend mengirim antrean per 1.000 baris ke API Next.js / Supabase.
5. **Auto-Mapping Master Data (dengan Sanitasi):** Jika di dalam CSV terdapat nama pelanggan yang belum ada di `master_customers`, fungsi backend harus:
   - Menjalankan sanitasi teks terlebih dahulu: `TRIM(UPPER(nama_customer))` — menghapus spasi berlebih dan menyeragamkan huruf besar/kecil agar "CAM BKS", "cam bks", dan "CAM BKS " dianggap sebagai entitas yang sama.
   - Melakukan pengecekan duplikasi terhadap hasil sanitasi tersebut.
   - Jika benar-benar belum ada, otomatis membuatkan (*insert*) entitas baru di tabel master, lalu mengambil ID-nya untuk dimasukkan ke tabel `shipments`.

## 3. Data Flow Aggregation
- Perhitungan Dasbor Analitik dilarang keras dilakukan di Frontend. Wajib memanggil fungsi *Remote Procedure Call* (RPC) Supabase yang menghitung langsung di dalam PostgreSQL.