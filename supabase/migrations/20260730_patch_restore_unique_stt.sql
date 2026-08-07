-- Patch: Mengembalikan Unique Constraint pada no_stt
-- Jika sebelumnya terhapus, ON CONFLICT pada Bulk Import akan gagal.

DO $$ 
BEGIN
  -- 1. Bersihkan data kosong (string kosong) menjadi NULL agar tidak bentrok
  UPDATE shipments SET no_stt = NULL WHERE btrim(no_stt) = '';

  -- 2. Tambahkan kembali constraint UNIQUE jika belum ada
  IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'shipments_no_stt_key'
  ) THEN
      ALTER TABLE shipments ADD CONSTRAINT shipments_no_stt_key UNIQUE (no_stt);
  END IF;
EXCEPTION
  WHEN others THEN 
    RAISE NOTICE 'Terjadi kesalahan: %', SQLERRM;
END $$;
