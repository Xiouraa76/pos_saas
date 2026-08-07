-- Patch: Membuka Row Level Security (RLS) untuk akses Anonim/Public
-- Agar semua operasi Insert/Select bisa berjalan tanpa error auth.

DO $$ 
BEGIN
  -- Tabel shipments
  DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON shipments;
  DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON shipments;
  DROP POLICY IF EXISTS "Enable update access for authenticated users" ON shipments;
  DROP POLICY IF EXISTS "Public access" ON shipments;
  CREATE POLICY "Public access" ON shipments FOR ALL USING (true) WITH CHECK (true);

  -- Tabel master_vehicles
  DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON master_vehicles;
  DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON master_vehicles;
  DROP POLICY IF EXISTS "Public access" ON master_vehicles;
  CREATE POLICY "Public access" ON master_vehicles FOR ALL USING (true) WITH CHECK (true);
EXCEPTION
  WHEN others THEN 
    RAISE NOTICE 'Terjadi penyesuaian: %', SQLERRM;
END $$;
