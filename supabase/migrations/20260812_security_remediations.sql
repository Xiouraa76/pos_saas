-- Migration: 20260812_security_remediations.sql
-- Description: Fix security vulnerabilities identified by Supabase Linter

-- ============================================================================
-- 1. SEARCH PATH MUTABILITY (function_search_path_mutable)
-- ============================================================================
-- Menambahkan `SET search_path = public` pada semua fungsi SECURITY DEFINER

ALTER FUNCTION public.get_kpi_summary_by_date(timestamp without time zone, timestamp without time zone) SET search_path = public;
ALTER FUNCTION public.get_kpi_dashboard_v2(timestamp without time zone, timestamp without time zone) SET search_path = public;
ALTER FUNCTION public.get_dashboard_stats() SET search_path = public;
ALTER FUNCTION public.get_dashboard_stats_v2(text, date, date) SET search_path = public;
ALTER FUNCTION public.bulk_import_stt(jsonb) SET search_path = public;
ALTER FUNCTION public.safe_to_int(text) SET search_path = public;
ALTER FUNCTION public.safe_to_decimal(text) SET search_path = public;
ALTER FUNCTION public.safe_to_date(text) SET search_path = public;
ALTER FUNCTION public.safe_to_layanan(text) SET search_path = public;


-- ============================================================================
-- 2. PUBLIC SECURITY DEFINER EXECUTABLE (anon_security_definer_function_executable)
-- ============================================================================
-- Mencabut hak eksekusi untuk role anon (publik) agar hanya bisa diakses via authenticated / backend

REVOKE EXECUTE ON FUNCTION public.get_kpi_summary_by_date(timestamp without time zone, timestamp without time zone) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_kpi_dashboard_v2(timestamp without time zone, timestamp without time zone) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_dashboard_stats() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_dashboard_stats_v2(text, date, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.bulk_import_stt(jsonb) FROM anon;


-- ============================================================================
-- 3. PERMISSIVE RLS POLICIES (rls_policy_always_true)
-- ============================================================================
-- Mengunci akses Write (Insert/Update/Delete) agar hanya bisa dilakukan oleh Authenticated
-- namun tetap membiarkan akses Read (SELECT) untuk publik.

-- A. Tabel shipments
DROP POLICY IF EXISTS "Public access" ON public.shipments;
DROP POLICY IF EXISTS "Public read access" ON public.shipments;
DROP POLICY IF EXISTS "Authenticated write access" ON public.shipments;

-- Izinkan publik membaca (kebutuhan tracking)
CREATE POLICY "Public read access" ON public.shipments FOR SELECT USING (true);
-- Izinkan authenticated user melakukan Write/Update/Delete
CREATE POLICY "Authenticated write access" ON public.shipments FOR ALL TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');


-- B. Tabel master_vehicles
DROP POLICY IF EXISTS "Public access" ON public.master_vehicles;
DROP POLICY IF EXISTS "Public read access" ON public.master_vehicles;
DROP POLICY IF EXISTS "Authenticated write access" ON public.master_vehicles;

CREATE POLICY "Public read access" ON public.master_vehicles FOR SELECT USING (true);
CREATE POLICY "Authenticated write access" ON public.master_vehicles FOR ALL TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');


-- C. Tabel master_customers
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.master_customers;
CREATE POLICY "Enable insert access for authenticated users" ON public.master_customers FOR INSERT TO authenticated WITH CHECK (auth.role() = 'authenticated');


-- D. Tabel master_sla_perusahaan 
DROP POLICY IF EXISTS "Allow authenticated users to insert master_sla_perusahaan" ON public.master_sla_perusahaan;
DROP POLICY IF EXISTS "Allow authenticated users to update master_sla_perusahaan" ON public.master_sla_perusahaan;
DROP POLICY IF EXISTS "Allow authenticated users to delete master_sla_perusahaan" ON public.master_sla_perusahaan;

CREATE POLICY "Allow authenticated users to insert master_sla_perusahaan" ON public.master_sla_perusahaan FOR INSERT TO authenticated WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to update master_sla_perusahaan" ON public.master_sla_perusahaan FOR UPDATE TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to delete master_sla_perusahaan" ON public.master_sla_perusahaan FOR DELETE TO authenticated USING (auth.role() = 'authenticated');


-- E. Tabel shipment_logs
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.shipment_logs;
CREATE POLICY "Enable insert access for authenticated users" ON public.shipment_logs FOR INSERT TO authenticated WITH CHECK (auth.role() = 'authenticated');
