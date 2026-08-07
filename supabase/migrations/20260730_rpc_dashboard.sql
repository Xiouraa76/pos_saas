-- RPC FUNCTION: Dashboard Statistics (v2 - Full Redesign)
-- Returns comprehensive KPI, financial, vendor, and distribution data.

CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    -- Ringkasan Transaksi
    v_total_stt INT;
    v_stt_with_no INT;
    v_stt_without_no INT;
    v_total_koli BIGINT;
    
    -- Finansial
    v_omset_ltl DECIMAL;
    v_omset_lcl DECIMAL;
    
    -- Vendor FTL
    v_vendor_standart INT;
    v_vendor_mahal INT;
    v_vendor_mahal_momen INT;
    v_vendor_unit_cam INT;
    
    -- Distribusi Cabang
    v_cabang_dist JSONB;
    
    -- Bulan ini
    v_month_total INT;
    
    -- SLA (derivasi dari data yang ada)
    v_sla_total INT;
    v_sla_sesuai INT;
    v_sla_gagal INT;
BEGIN
    -- =============================================
    -- RINGKASAN TRANSAKSI
    -- =============================================
    SELECT COUNT(*) INTO v_total_stt FROM shipments;
    
    SELECT COUNT(*) INTO v_stt_with_no 
    FROM shipments WHERE no_stt IS NOT NULL AND BTRIM(no_stt) <> '';
    
    v_stt_without_no := v_total_stt - v_stt_with_no;
    
    SELECT COALESCE(SUM(qty_koli), 0) INTO v_total_koli FROM shipments;

    -- =============================================
    -- FINANSIAL (Omset per Layanan)
    -- =============================================
    SELECT COALESCE(SUM(omset), 0) INTO v_omset_ltl
    FROM shipments WHERE jenis_layanan = 'LTL';
    
    SELECT COALESCE(SUM(omset), 0) INTO v_omset_lcl
    FROM shipments WHERE jenis_layanan = 'LCL';

    -- =============================================
    -- HARGA VENDOR FTL (Count per kategori dropdown)
    -- =============================================
    SELECT COUNT(*) INTO v_vendor_standart
    FROM shipments WHERE jenis_layanan = 'FTL' AND vendor_price = 'Harga Standar';
    
    SELECT COUNT(*) INTO v_vendor_mahal
    FROM shipments WHERE jenis_layanan = 'FTL' AND vendor_price = 'Harga Mahal';
    
    SELECT COUNT(*) INTO v_vendor_mahal_momen
    FROM shipments WHERE jenis_layanan = 'FTL' AND vendor_price = 'Harga Mahal Momen';
    
    SELECT COUNT(*) INTO v_vendor_unit_cam
    FROM shipments WHERE jenis_layanan = 'FTL' AND vendor_price = 'Memakai Unit CAM';

    -- =============================================
    -- DISTRIBUSI CABANG
    -- =============================================
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object('cabang', final_dist.cabang, 'count', final_dist.cnt)
    ), '[]'::jsonb)
    INTO v_cabang_dist
    FROM (
        WITH branches AS (
            SELECT unnest(ARRAY['CAM BKS', 'CAM SUB', 'CAM SMG', 'SPP SUB', 'SPP BKS', 'SPP SMG', 'TETRA', 'Lainnya']) AS cabang,
                   unnest(ARRAY[1, 2, 3, 4, 5, 6, 7, 8]) AS sort_order
        ),
        shipment_counts AS (
            SELECT 
                CASE 
                    WHEN TRIM(UPPER(cabang_customer)) IN ('CAM BKS', 'CAM SUB', 'CAM SMG', 'SPP SUB', 'SPP BKS', 'SPP SMG', 'TETRA') THEN TRIM(UPPER(cabang_customer))
                    ELSE 'Lainnya'
                END AS cabang,
                COUNT(*) as cnt
            FROM shipments
            GROUP BY 1
        )
        SELECT 
            b.cabang,
            COALESCE(s.cnt, 0) AS cnt
        FROM branches b
        LEFT JOIN shipment_counts s ON b.cabang = s.cabang
        ORDER BY b.sort_order
    ) final_dist;

    -- =============================================
    -- DATA BULAN INI
    -- =============================================
    SELECT COUNT(*) INTO v_month_total
    FROM shipments
    WHERE tgl_masuk >= date_trunc('month', CURRENT_DATE);

    -- =============================================
    -- SLA DERIVASI (dari rule_sla_hari vs tgl_masuk/tgl_diterima)
    -- =============================================
    SELECT COUNT(*) INTO v_sla_total
    FROM shipments WHERE tgl_diterima IS NOT NULL;
    
    SELECT COUNT(*) INTO v_sla_sesuai
    FROM shipments 
    WHERE tgl_diterima IS NOT NULL 
      AND EXTRACT(DAY FROM (tgl_diterima::timestamp - tgl_masuk::timestamp)) <= COALESCE(rule_sla_hari, 3);
    
    v_sla_gagal := v_sla_total - v_sla_sesuai;

    -- =============================================
    -- RETURN ALL
    -- =============================================
    RETURN jsonb_build_object(
        'total_stt', v_total_stt,
        'stt_with_no', v_stt_with_no,
        'stt_without_no', v_stt_without_no,
        'total_koli', v_total_koli,
        'omset_ltl', v_omset_ltl,
        'omset_lcl', v_omset_lcl,
        'vendor_standart', v_vendor_standart,
        'vendor_mahal', v_vendor_mahal,
        'vendor_mahal_momen', v_vendor_mahal_momen,
        'vendor_unit_cam', v_vendor_unit_cam,
        'cabang_distribution', v_cabang_dist,
        'month_total', v_month_total,
        'sla_total', v_sla_total,
        'sla_sesuai', v_sla_sesuai,
        'sla_gagal', v_sla_gagal
    );
END;
$$;
