-- Migration: 20261007184500_patch_shipments_rls.sql
-- Description: [S4 FIX] Restrict shipments Write access based on user_permissions

-- 1. Buat helper function untuk mengecek apakah user memiliki hak akses operasional (Write)
CREATE OR REPLACE FUNCTION public.has_write_access()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_permissions
    WHERE user_id = auth.uid()
    AND (
      can_access_pos = true OR 
      can_access_ftl = true OR 
      can_access_ltl = true OR 
      can_access_lcl = true
    )
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- 2. Hapus policy lama yang terlalu longgar
DROP POLICY IF EXISTS "Authenticated write access" ON public.shipments;

-- 3. Buat policy baru yang menggunakan helper function di atas
CREATE POLICY "Permission-based write access" 
  ON public.shipments 
  FOR ALL 
  TO authenticated 
  USING (has_write_access()) 
  WITH CHECK (has_write_access());
