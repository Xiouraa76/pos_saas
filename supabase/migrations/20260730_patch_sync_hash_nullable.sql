-- Patch: Membuat sync_hash menjadi opsional (Boleh NULL)
-- Ini diperlukan karena data STT yang diinput manual dari form POS tidak memiliki sync_hash.

DO $$ 
BEGIN
  ALTER TABLE shipments ALTER COLUMN sync_hash DROP NOT NULL;
EXCEPTION
  WHEN others THEN 
    RAISE NOTICE 'Terjadi kesalahan: %', SQLERRM;
END $$;
