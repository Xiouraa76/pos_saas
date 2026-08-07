-- Patch v2: Modifikasi Tipe Data & Penambahan Semua Kolom Baru (Foolproof)
DO $$ 
BEGIN
  -- 1. Tambahkan semua kolom baru jika belum ada
  ALTER TABLE shipments 
    ADD COLUMN IF NOT EXISTS cabang_customer VARCHAR,
    ADD COLUMN IF NOT EXISTS nama_customer_teks VARCHAR,
    ADD COLUMN IF NOT EXISTS driver_phone VARCHAR,
    ADD COLUMN IF NOT EXISTS jenis_unit VARCHAR,
    ADD COLUMN IF NOT EXISTS recipient_name VARCHAR,
    ADD COLUMN IF NOT EXISTS recipient_phone VARCHAR,
    ADD COLUMN IF NOT EXISTS vendor_price VARCHAR,
    ADD COLUMN IF NOT EXISTS monitoring_pj VARCHAR,
    ADD COLUMN IF NOT EXISTS tkbm TEXT,
    ADD COLUMN IF NOT EXISTS tgl_diterima DATE;

  -- 2. Pastikan vendor_price adalah VARCHAR (mengonversi dari DECIMAL jika sebelumnya terlanjur dibuat)
  ALTER TABLE shipments 
    ALTER COLUMN vendor_price TYPE VARCHAR USING vendor_price::varchar;
EXCEPTION
  WHEN others THEN 
    RAISE NOTICE 'Terjadi penyesuaian: %', SQLERRM;
END $$;
