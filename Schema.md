# Database Schema & Definitions

## 1. Master Data (Auto-generated via Import)
```sql
CREATE TABLE master_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_customer VARCHAR NOT NULL UNIQUE -- Unique agar tidak ada duplikasi saat CSV import
);

CREATE TABLE master_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nopol VARCHAR NOT NULL UNIQUE,
  jenis_unit VARCHAR
);
```

## 2. Delivery Management Table (shipments)
Penambahan kolom import_batch_id memungkinkan Admin melakukan "Undo" atau penghapusan massal jika file Excel yang diunggah salah.

```sql
CREATE TYPE layanan_enum AS ENUM ('FTL', 'LTL', 'LCL');
CREATE TYPE status_operasional_enum AS ENUM (
  'Di Lokasi Muat', 'Selesai Muat', 'Di Perjalanan', 
  'Bongkar', 'Selesai Bongkar', 'Dokumen Kembali', 
  'Bermasalah', 'Custom'
);

CREATE TABLE shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tgl_masuk DATE NOT NULL,
  no_stt VARCHAR NOT NULL UNIQUE,
  jenis_layanan layanan_enum NOT NULL,
  
  -- Info Detail Entitas
  customer_id UUID REFERENCES master_customers(id),
  vehicle_id UUID REFERENCES master_vehicles(id),
  driver_name VARCHAR,
  
  -- Alamat & Kargo
  alamat_muat TEXT NOT NULL,
  alamat_tujuan TEXT NOT NULL,
  qty_koli INT DEFAULT 0,
  berat_kg DECIMAL DEFAULT 0,
  volume_m3 DECIMAL DEFAULT 0,
  omset DECIMAL DEFAULT 0,
  
  -- Delivery Tracker, SLA & KPI
  status_pengiriman status_operasional_enum DEFAULT 'Di Lokasi Muat',
  keterangan_custom TEXT,
  rule_sla_hari INT DEFAULT 1,
  performa_sla VARCHAR, 
  
  -- Migration Support
  import_batch_id VARCHAR, -- ID khusus jika data dimasukkan via CSV (misal: 'import_17032024')
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 3. Delivery Log & User Roles
```sql
CREATE TABLE shipment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID REFERENCES shipments(id) ON DELETE CASCADE,
  status_log status_operasional_enum NOT NULL,
  catatan TEXT,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TYPE user_role_enum AS ENUM ('Super Admin', 'Admin', 'Driver');
CREATE TABLE public.user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR NOT NULL,
  role user_role_enum DEFAULT 'Driver',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```