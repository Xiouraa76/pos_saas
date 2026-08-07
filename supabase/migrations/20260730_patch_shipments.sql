-- Script Patch Komprehensif (Menambahkan semua kolom potensial yang hilang)
DO $$ BEGIN
    CREATE TYPE layanan_enum AS ENUM ('FTL', 'LTL', 'LCL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE status_operasional_enum AS ENUM (
      'Di Lokasi Muat', 'Selesai Muat', 'Di Perjalanan', 
      'Bongkar', 'Selesai Bongkar', 'Dokumen Kembali', 
      'Bermasalah', 'Custom'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE shipments 
  ADD COLUMN IF NOT EXISTS tgl_masuk DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS jenis_layanan layanan_enum DEFAULT 'FTL' NOT NULL,
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES master_customers(id),
  ADD COLUMN IF NOT EXISTS nama_customer_teks VARCHAR,
  ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES master_vehicles(id),
  ADD COLUMN IF NOT EXISTS driver_name VARCHAR,
  ADD COLUMN IF NOT EXISTS driver_phone VARCHAR,
  ADD COLUMN IF NOT EXISTS jenis_unit VARCHAR,
  ADD COLUMN IF NOT EXISTS alamat_muat TEXT,
  ADD COLUMN IF NOT EXISTS recipient_name VARCHAR,
  ADD COLUMN IF NOT EXISTS recipient_phone VARCHAR,
  ADD COLUMN IF NOT EXISTS alamat_tujuan TEXT,
  ADD COLUMN IF NOT EXISTS qty_koli INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS berat_kg DECIMAL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS volume_m3 DECIMAL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vendor_price DECIMAL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monitoring_pj VARCHAR,
  ADD COLUMN IF NOT EXISTS tkbm TEXT,
  ADD COLUMN IF NOT EXISTS omset DECIMAL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tgl_diterima DATE,
  ADD COLUMN IF NOT EXISTS status_pengiriman status_operasional_enum DEFAULT 'Di Lokasi Muat',
  ADD COLUMN IF NOT EXISTS keterangan_custom TEXT,
  ADD COLUMN IF NOT EXISTS rule_sla_hari INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS performa_sla VARCHAR,
  ADD COLUMN IF NOT EXISTS import_batch_id VARCHAR,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
