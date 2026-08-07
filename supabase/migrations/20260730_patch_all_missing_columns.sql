-- Master Patch: Menambahkan SELURUH kolom yang belum ada
DO $$ 
BEGIN
  -- Info Detail Entitas
  ALTER TABLE shipments ADD COLUMN IF NOT EXISTS cabang_customer VARCHAR;
  ALTER TABLE shipments ADD COLUMN IF NOT EXISTS nama_customer_teks VARCHAR;
  ALTER TABLE shipments ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES master_vehicles(id);
  ALTER TABLE shipments ADD COLUMN IF NOT EXISTS driver_name VARCHAR;
  ALTER TABLE shipments ADD COLUMN IF NOT EXISTS driver_phone VARCHAR;
  ALTER TABLE shipments ADD COLUMN IF NOT EXISTS jenis_unit VARCHAR;
  
  -- Alamat & Kargo
  ALTER TABLE shipments ADD COLUMN IF NOT EXISTS alamat_muat TEXT;
  ALTER TABLE shipments ADD COLUMN IF NOT EXISTS recipient_name VARCHAR;
  ALTER TABLE shipments ADD COLUMN IF NOT EXISTS recipient_phone VARCHAR;
  ALTER TABLE shipments ADD COLUMN IF NOT EXISTS alamat_tujuan TEXT;
  ALTER TABLE shipments ADD COLUMN IF NOT EXISTS qty_koli INT DEFAULT 0;
  ALTER TABLE shipments ADD COLUMN IF NOT EXISTS berat_kg DECIMAL DEFAULT 0;
  ALTER TABLE shipments ADD COLUMN IF NOT EXISTS volume_m3 DECIMAL DEFAULT 0;
  
  -- Biaya & Penyelesaian
  ALTER TABLE shipments ADD COLUMN IF NOT EXISTS vendor_price VARCHAR;
  ALTER TABLE shipments ADD COLUMN IF NOT EXISTS monitoring_pj VARCHAR;
  ALTER TABLE shipments ADD COLUMN IF NOT EXISTS tkbm TEXT;
  ALTER TABLE shipments ADD COLUMN IF NOT EXISTS omset DECIMAL DEFAULT 0;
  ALTER TABLE shipments ADD COLUMN IF NOT EXISTS tgl_diterima DATE;
  
  -- Delivery Tracker & SLA
  ALTER TABLE shipments ADD COLUMN IF NOT EXISTS status_pengiriman status_operasional_enum DEFAULT 'Di Lokasi Muat';
  ALTER TABLE shipments ADD COLUMN IF NOT EXISTS keterangan_custom TEXT;
  ALTER TABLE shipments ADD COLUMN IF NOT EXISTS rule_sla_hari INT DEFAULT 1;
  ALTER TABLE shipments ADD COLUMN IF NOT EXISTS performa_sla VARCHAR; 
  ALTER TABLE shipments ADD COLUMN IF NOT EXISTS import_batch_id VARCHAR;
  
  -- Pastikan tipe datanya VARCHAR (jika sebelumnya ada sebagai decimal)
  ALTER TABLE shipments ALTER COLUMN vendor_price TYPE VARCHAR USING vendor_price::varchar;
EXCEPTION
  WHEN others THEN 
    RAISE NOTICE 'Terjadi penyesuaian: %', SQLERRM;
END $$;
