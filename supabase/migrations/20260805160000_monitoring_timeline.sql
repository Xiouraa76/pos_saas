-- 1. Tambah kolom hak akses layanan ke user_permissions
ALTER TABLE public.user_permissions
ADD COLUMN IF NOT EXISTS can_access_ftl BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS can_access_ltl BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS can_access_lcl BOOLEAN NOT NULL DEFAULT false;

-- 2. Buat tabel master_sla_perusahaan
CREATE TABLE IF NOT EXISTS public.master_sla_perusahaan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Beri akses RLS ke master_sla_perusahaan (Public bisa baca, authenticated bisa insert/update/delete)
ALTER TABLE public.master_sla_perusahaan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on master_sla_perusahaan" 
ON public.master_sla_perusahaan FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to insert master_sla_perusahaan" 
ON public.master_sla_perusahaan FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update master_sla_perusahaan" 
ON public.master_sla_perusahaan FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete master_sla_perusahaan" 
ON public.master_sla_perusahaan FOR DELETE TO authenticated USING (true);


-- 3. Tambahkan kolom untuk FTL & LTL di shipments
ALTER TABLE public.shipments
ADD COLUMN IF NOT EXISTS sla_perusahaan TEXT,
ADD COLUMN IF NOT EXISTS waktu_start_muat TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS waktu_selesai_tf TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS waktu_tiba_sla TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS waktu_tiba_real TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS uraian_perjalanan TEXT,
ADD COLUMN IF NOT EXISTS timeline_checkpoints JSONB DEFAULT '[]'::jsonb;
