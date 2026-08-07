-- 1. ENUM TYPES
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

DO $$ BEGIN
    CREATE TYPE user_role_enum AS ENUM ('Super Admin', 'Admin', 'Driver');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. MASTER DATA
CREATE TABLE IF NOT EXISTS master_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_customer VARCHAR NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS master_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nopol VARCHAR NOT NULL UNIQUE,
  jenis_unit VARCHAR
);

-- 3. CORE TABLES
CREATE TABLE IF NOT EXISTS shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tgl_masuk DATE NOT NULL DEFAULT CURRENT_DATE,
  no_stt VARCHAR NOT NULL UNIQUE,
  jenis_layanan layanan_enum NOT NULL,
  
  -- Info Detail Entitas
  cabang_customer VARCHAR,
  nama_customer_teks VARCHAR,
  vehicle_id UUID REFERENCES master_vehicles(id),
  driver_name VARCHAR,
  driver_phone VARCHAR,
  jenis_unit VARCHAR,
  
  -- Alamat & Kargo
  alamat_muat TEXT,
  recipient_name VARCHAR,
  recipient_phone VARCHAR,
  alamat_tujuan TEXT,
  qty_koli INT DEFAULT 0,
  berat_kg DECIMAL DEFAULT 0,
  volume_m3 DECIMAL DEFAULT 0,
  
  -- Biaya & Penyelesaian
  vendor_price VARCHAR,
  monitoring_pj VARCHAR,
  tkbm TEXT,
  omset DECIMAL DEFAULT 0,
  tgl_diterima DATE,
  
  -- Delivery Tracker, SLA & KPI
  status_pengiriman status_operasional_enum DEFAULT 'Di Lokasi Muat',
  keterangan_custom TEXT,
  rule_sla_hari INT DEFAULT 1,
  performa_sla VARCHAR, 
  
  -- Migration Support
  import_batch_id VARCHAR,
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shipment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID REFERENCES shipments(id) ON DELETE CASCADE,
  status_log status_operasional_enum NOT NULL,
  catatan TEXT,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR NOT NULL,
  role user_role_enum DEFAULT 'Driver',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE master_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Base Policy: Authenticated users can read/write
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON master_customers;
CREATE POLICY "Enable read access for all authenticated users" ON master_customers FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON master_customers;
CREATE POLICY "Enable insert access for authenticated users" ON master_customers FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON master_vehicles;
CREATE POLICY "Enable read access for all authenticated users" ON master_vehicles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON master_vehicles;
CREATE POLICY "Enable insert access for authenticated users" ON master_vehicles FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON shipments;
CREATE POLICY "Enable read access for all authenticated users" ON shipments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON shipments;
CREATE POLICY "Enable insert access for authenticated users" ON shipments FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON shipments;
CREATE POLICY "Enable update access for authenticated users" ON shipments FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON shipment_logs;
CREATE POLICY "Enable read access for all authenticated users" ON shipment_logs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON shipment_logs;
CREATE POLICY "Enable insert access for authenticated users" ON shipment_logs FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.user_roles;
CREATE POLICY "Enable read access for all authenticated users" ON public.user_roles FOR SELECT TO authenticated USING (true);
