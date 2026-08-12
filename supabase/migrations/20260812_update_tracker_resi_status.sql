DO $$ 
BEGIN
  -- Add new enum values if the enum still exists
  -- This is safe to run even if the values already exist
  BEGIN
    ALTER TYPE status_operasional_enum ADD VALUE 'Sudah Dipaketkan';
  EXCEPTION WHEN duplicate_object THEN null; END;
  BEGIN
    ALTER TYPE status_operasional_enum ADD VALUE 'Di Finance';
  EXCEPTION WHEN duplicate_object THEN null; END;
  BEGIN
    ALTER TYPE status_operasional_enum ADD VALUE 'Belum Kembali / Belum Dipaketkan';
  EXCEPTION WHEN duplicate_object THEN null; END;
  BEGIN
    ALTER TYPE status_operasional_enum ADD VALUE 'Doc Di CAM BEKASI';
  EXCEPTION WHEN duplicate_object THEN null; END;
  BEGIN
    ALTER TYPE status_operasional_enum ADD VALUE 'Doc Bermasalah';
  EXCEPTION WHEN duplicate_object THEN null; END;
  BEGIN
    ALTER TYPE status_operasional_enum ADD VALUE 'Doc Di CAM SMG';
  EXCEPTION WHEN duplicate_object THEN null; END;

  -- Drop existing constraint
  ALTER TABLE shipments DROP CONSTRAINT IF EXISTS chk_status_pengiriman_valid;

  -- Create new constraint
  ALTER TABLE shipments ADD CONSTRAINT chk_status_pengiriman_valid
    CHECK (
      status_pengiriman IS NULL
      OR status_pengiriman::text IN (
        'Di Lokasi Muat', 'Di Perjalanan', 'Sudah Dipaketkan',
        'Di Finance', 'Bongkar', 'Belum Kembali / Belum Dipaketkan',
        'Doc Di CAM BEKASI', 'Doc Bermasalah', 'Doc Di CAM SMG', 'Custom'
      )
    );
END $$;
