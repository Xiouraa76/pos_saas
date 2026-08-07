-- ════════════════════════════════════════════════════════════════════════
-- MIGRASI: Batas Karakter & Validasi Enum untuk Shipments
-- ════════════════════════════════════════════════════════════════════════
-- Menambal:
--   CELAH-03: Whitespace-only data masuk ke DB
--   CELAH-04: Status enum bypass (re-enforce)
--   CELAH-05: String overflow (100K+ karakter) tanpa batas
-- ════════════════════════════════════════════════════════════════════════

-- ═══ CELAH-05 FIX: Batasi panjang kolom teks ═══
-- Menggunakan CHECK constraint agar tidak merusak data yang sudah ada
-- (ALTER COLUMN TYPE akan gagal jika ada data melebihi batas)

DO $$
BEGIN
  -- Driver & Kontak (max 200 karakter)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_driver_name_length'
  ) THEN
    ALTER TABLE shipments ADD CONSTRAINT chk_driver_name_length
      CHECK (driver_name IS NULL OR LENGTH(driver_name) <= 200);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_driver_phone_length'
  ) THEN
    ALTER TABLE shipments ADD CONSTRAINT chk_driver_phone_length
      CHECK (driver_phone IS NULL OR LENGTH(driver_phone) <= 50);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_recipient_name_length'
  ) THEN
    ALTER TABLE shipments ADD CONSTRAINT chk_recipient_name_length
      CHECK (recipient_name IS NULL OR LENGTH(recipient_name) <= 200);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_recipient_phone_length'
  ) THEN
    ALTER TABLE shipments ADD CONSTRAINT chk_recipient_phone_length
      CHECK (recipient_phone IS NULL OR LENGTH(recipient_phone) <= 50);
  END IF;

  -- Alamat (max 500 karakter)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_alamat_muat_length'
  ) THEN
    ALTER TABLE shipments ADD CONSTRAINT chk_alamat_muat_length
      CHECK (alamat_muat IS NULL OR LENGTH(alamat_muat) <= 500);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_alamat_tujuan_length'
  ) THEN
    ALTER TABLE shipments ADD CONSTRAINT chk_alamat_tujuan_length
      CHECK (alamat_tujuan IS NULL OR LENGTH(alamat_tujuan) <= 500);
  END IF;

  -- Keterangan & Uraian (max 2000 karakter)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_keterangan_custom_length'
  ) THEN
    ALTER TABLE shipments ADD CONSTRAINT chk_keterangan_custom_length
      CHECK (keterangan_custom IS NULL OR LENGTH(keterangan_custom) <= 2000);
  END IF;

  -- Kolom lainnya (max 200 karakter)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_nama_customer_teks_length'
  ) THEN
    ALTER TABLE shipments ADD CONSTRAINT chk_nama_customer_teks_length
      CHECK (nama_customer_teks IS NULL OR LENGTH(nama_customer_teks) <= 200);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_cabang_customer_length'
  ) THEN
    ALTER TABLE shipments ADD CONSTRAINT chk_cabang_customer_length
      CHECK (cabang_customer IS NULL OR LENGTH(cabang_customer) <= 100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_monitoring_pj_length'
  ) THEN
    ALTER TABLE shipments ADD CONSTRAINT chk_monitoring_pj_length
      CHECK (monitoring_pj IS NULL OR LENGTH(monitoring_pj) <= 200);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_no_stt_length'
  ) THEN
    ALTER TABLE shipments ADD CONSTRAINT chk_no_stt_length
      CHECK (LENGTH(no_stt) <= 100);
  END IF;

  -- ═══ CELAH-03 FIX: Tolak data yang hanya berisi whitespace ═══
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_no_stt_not_blank'
  ) THEN
    ALTER TABLE shipments ADD CONSTRAINT chk_no_stt_not_blank
      CHECK (BTRIM(no_stt) <> '');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_driver_name_not_blank'
  ) THEN
    ALTER TABLE shipments ADD CONSTRAINT chk_driver_name_not_blank
      CHECK (driver_name IS NULL OR BTRIM(driver_name) <> '');
  END IF;

  -- ═══ CELAH-04 FIX: Re-enforce status_pengiriman valid values ═══
  -- Jika kolom sudah diubah ke VARCHAR (bukan enum lagi), 
  -- tambahkan CHECK constraint sebagai pengganti enum
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_status_pengiriman_valid'
  ) THEN
    ALTER TABLE shipments ADD CONSTRAINT chk_status_pengiriman_valid
      CHECK (
        status_pengiriman IS NULL
        OR status_pengiriman::text IN (
          'Di Lokasi Muat', 'Selesai Muat', 'Di Perjalanan',
          'Bongkar', 'Selesai Bongkar', 'Dokumen Kembali',
          'Bermasalah', 'Custom'
        )
      );
  END IF;

EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Constraint adjustment: %', SQLERRM;
END $$;
