-- Patch: Memperbolehkan No STT kosong (NULL)
-- Ini berguna jika STT baru akan diinput nanti pada saat pengeditan.

DO $$ 
BEGIN
  -- Hapus aturan NOT NULL dari kolom no_stt
  ALTER TABLE shipments ALTER COLUMN no_stt DROP NOT NULL;
EXCEPTION
  WHEN others THEN 
    RAISE NOTICE 'Terjadi kesalahan: %', SQLERRM;
END $$;
