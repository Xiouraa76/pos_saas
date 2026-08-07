-- RPC FUNCTION: Dashboard Stats v2 (Full Service Filter + Date Range)
-- Replaces get_dashboard_stats with comprehensive per-service filtering

CREATE OR REPLACE FUNCTION get_dashboard_stats_v2(
  p_service_filter TEXT DEFAULT NULL,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  -- Summary
  v_total_transaksi INT;
  v_stt_count INT;
  v_total_koli BIGINT;
  v_omset_total DECIMAL;

  -- Per service breakdown
  v_count_ltl INT;
  v_count_lcl INT;
  v_count_ftl INT;
  v_koli_ltl BIGINT;
  v_koli_lcl BIGINT;
  v_koli_ftl BIGINT;

  -- DO / POD
  v_do_selesai INT;
  v_pod_selesai INT;

  -- SLA
  v_sla_total INT;
  v_sla_sesuai INT;
  v_sla_konfirm INT;
  v_sla_gagal INT;

  -- KUD
  v_kud_total INT;
  v_kud_tepat INT;
  v_kud_lewat INT;

  -- Komplain
  v_komplain_total INT;
  v_komplain_aman INT;
  v_komplain_teratasi INT;
  v_komplain_berat INT;

  -- Dokumen Kembali
  v_doc_total INT;
  v_doc_cepat INT;
  v_doc_lambat INT;
  v_doc_gagal INT;

  -- Vendor FTL
  v_vendor_std INT;
  v_vendor_mahal INT;
  v_vendor_momen INT;
  v_vendor_cam INT;

  -- Cabang
  v_cabang JSONB;

  -- Internal
  v_service layanan_enum;
BEGIN
  -- =============================================
  -- Cast service filter
  -- =============================================
  IF p_service_filter IS NOT NULL AND p_service_filter <> '' THEN
    BEGIN
      v_service := p_service_filter::layanan_enum;
    EXCEPTION WHEN OTHERS THEN
      v_service := NULL;
    END;
  END IF;

  -- =============================================
  -- RINGKASAN TRANSAKSI
  -- =============================================
  SELECT
    COUNT(*),
    COUNT(CASE WHEN no_stt IS NOT NULL AND BTRIM(no_stt) <> '' THEN 1 END),
    COALESCE(SUM(qty_koli), 0),
    COALESCE(SUM(omset), 0)
  INTO v_total_transaksi, v_stt_count, v_total_koli, v_omset_total
  FROM shipments
  WHERE (v_service IS NULL OR jenis_layanan = v_service)
    AND (p_date_from IS NULL OR tgl_masuk >= p_date_from)
    AND (p_date_to IS NULL OR tgl_masuk <= p_date_to);

  -- =============================================
  -- DISTRIBUSI PER LAYANAN
  -- =============================================
  SELECT
    COUNT(CASE WHEN jenis_layanan = 'LTL' THEN 1 END),
    COUNT(CASE WHEN jenis_layanan = 'LCL' THEN 1 END),
    COUNT(CASE WHEN jenis_layanan = 'FTL' THEN 1 END),
    COALESCE(SUM(CASE WHEN jenis_layanan = 'LTL' THEN qty_koli END), 0),
    COALESCE(SUM(CASE WHEN jenis_layanan = 'LCL' THEN qty_koli END), 0),
    COALESCE(SUM(CASE WHEN jenis_layanan = 'FTL' THEN qty_koli END), 0)
  INTO v_count_ltl, v_count_lcl, v_count_ftl, v_koli_ltl, v_koli_lcl, v_koli_ftl
  FROM shipments
  WHERE (v_service IS NULL OR jenis_layanan = v_service)
    AND (p_date_from IS NULL OR tgl_masuk >= p_date_from)
    AND (p_date_to IS NULL OR tgl_masuk <= p_date_to);

  -- =============================================
  -- DO SELESAI FISIK / POD SELESAI ADMIN
  -- Text-based matching on status_detail_text
  -- =============================================
  SELECT
    COUNT(CASE
      WHEN jenis_layanan = 'FTL' AND (
        LOWER(COALESCE(status_detail_text,'')) LIKE '%sudah dipaketkan%' OR
        LOWER(COALESCE(status_detail_text,'')) LIKE '%belum kembali%' OR
        LOWER(COALESCE(status_detail_text,'')) LIKE '%belum dipaketkan%'
      ) THEN 1
      WHEN jenis_layanan IN ('LCL','LTL') AND
        LOWER(COALESCE(status_detail_text,'')) LIKE '%delivered%' THEN 1
    END),
    COUNT(CASE
      WHEN jenis_layanan = 'FTL' AND
        LOWER(COALESCE(status_detail_text,'')) LIKE '%di finance%' THEN 1
      WHEN jenis_layanan IN ('LCL','LTL') AND (
        LOWER(COALESCE(status_detail_text,'')) LIKE '%pod di terima admin%' OR
        LOWER(COALESCE(status_detail_text,'')) LIKE '%pod di terima finance%' OR
        LOWER(COALESCE(status_detail_text,'')) LIKE '%valided team accounting%'
      ) THEN 1
    END)
  INTO v_do_selesai, v_pod_selesai
  FROM shipments
  WHERE (v_service IS NULL OR jenis_layanan = v_service)
    AND (p_date_from IS NULL OR tgl_masuk >= p_date_from)
    AND (p_date_to IS NULL OR tgl_masuk <= p_date_to);

  -- =============================================
  -- SLA PERFORMA
  -- Sesuai = within SLA, Konfirm = exactly at SLA limit, Gagal = over SLA
  -- =============================================
  SELECT
    COUNT(CASE WHEN tgl_diterima IS NOT NULL THEN 1 END),
    COUNT(CASE WHEN tgl_diterima IS NOT NULL
      AND EXTRACT(DAY FROM (tgl_diterima::timestamp - tgl_masuk::timestamp)) < COALESCE(rule_sla_hari, 3) THEN 1 END),
    COUNT(CASE WHEN tgl_diterima IS NOT NULL
      AND EXTRACT(DAY FROM (tgl_diterima::timestamp - tgl_masuk::timestamp)) = COALESCE(rule_sla_hari, 3) THEN 1 END),
    COUNT(CASE WHEN tgl_diterima IS NOT NULL
      AND EXTRACT(DAY FROM (tgl_diterima::timestamp - tgl_masuk::timestamp)) > COALESCE(rule_sla_hari, 3) THEN 1 END)
  INTO v_sla_total, v_sla_sesuai, v_sla_konfirm, v_sla_gagal
  FROM shipments
  WHERE (v_service IS NULL OR jenis_layanan = v_service)
    AND (p_date_from IS NULL OR tgl_masuk >= p_date_from)
    AND (p_date_to IS NULL OR tgl_masuk <= p_date_to);

  -- =============================================
  -- RATE KUD (from rate_kud column — real CSV data)
  -- =============================================
  SELECT
    COUNT(*),
    COUNT(CASE WHEN LOWER(COALESCE(rate_kud,''))
      SIMILAR TO '%(tepat|ok|ya|sudah|sesuai|v)%' THEN 1 END),
    COUNT(CASE WHEN LOWER(COALESCE(rate_kud,''))
      SIMILAR TO '%(lewat|late|terlambat|belum)%' THEN 1 END)
  INTO v_kud_total, v_kud_tepat, v_kud_lewat
  FROM shipments
  WHERE (v_service IS NULL OR jenis_layanan = v_service)
    AND (p_date_from IS NULL OR tgl_masuk >= p_date_from)
    AND (p_date_to IS NULL OR tgl_masuk <= p_date_to)
    AND rate_kud IS NOT NULL AND BTRIM(rate_kud) <> '';

  -- =============================================
  -- RATE KOMPLAIN (from rate_komplain column — real CSV data)
  -- =============================================
  SELECT
    COUNT(*),
    COUNT(CASE WHEN LOWER(COALESCE(rate_komplain,''))
      SIMILAR TO '%(aman|tidak ada|no|baik|ok)%' THEN 1 END),
    COUNT(CASE WHEN LOWER(COALESCE(rate_komplain,''))
      SIMILAR TO '%(teratasi|solve|diselesaikan)%' THEN 1 END),
    COUNT(CASE WHEN LOWER(COALESCE(rate_komplain,''))
      SIMILAR TO '%(berat|escala|parah|serius)%' THEN 1 END)
  INTO v_komplain_total, v_komplain_aman, v_komplain_teratasi, v_komplain_berat
  FROM shipments
  WHERE (v_service IS NULL OR jenis_layanan = v_service)
    AND (p_date_from IS NULL OR tgl_masuk >= p_date_from)
    AND (p_date_to IS NULL OR tgl_masuk <= p_date_to)
    AND rate_komplain IS NOT NULL AND BTRIM(rate_komplain) <> '';

  -- =============================================
  -- KECEPATAN DOKUMEN KEMBALI
  -- Cepat = within SLA, Lambat = SLA+1 to SLA+2, Gagal = beyond SLA+2
  -- =============================================
  SELECT
    COUNT(CASE WHEN tgl_diterima IS NOT NULL THEN 1 END),
    COUNT(CASE WHEN tgl_diterima IS NOT NULL
      AND EXTRACT(DAY FROM (tgl_diterima::timestamp - tgl_masuk::timestamp)) <= COALESCE(rule_sla_hari, 3) THEN 1 END),
    COUNT(CASE WHEN tgl_diterima IS NOT NULL
      AND EXTRACT(DAY FROM (tgl_diterima::timestamp - tgl_masuk::timestamp)) > COALESCE(rule_sla_hari, 3)
      AND EXTRACT(DAY FROM (tgl_diterima::timestamp - tgl_masuk::timestamp)) <= COALESCE(rule_sla_hari, 3) + 2 THEN 1 END),
    COUNT(CASE WHEN tgl_diterima IS NOT NULL
      AND EXTRACT(DAY FROM (tgl_diterima::timestamp - tgl_masuk::timestamp)) > COALESCE(rule_sla_hari, 3) + 2 THEN 1 END)
  INTO v_doc_total, v_doc_cepat, v_doc_lambat, v_doc_gagal
  FROM shipments
  WHERE (v_service IS NULL OR jenis_layanan = v_service)
    AND (p_date_from IS NULL OR tgl_masuk >= p_date_from)
    AND (p_date_to IS NULL OR tgl_masuk <= p_date_to);

  -- =============================================
  -- DISTRIBUSI HARGA VENDOR (FTL only)
  -- =============================================
  SELECT
    COUNT(CASE WHEN vendor_price = 'Harga Standar' THEN 1 END),
    COUNT(CASE WHEN vendor_price = 'Harga Mahal' THEN 1 END),
    COUNT(CASE WHEN vendor_price = 'Harga Mahal Momen' THEN 1 END),
    COUNT(CASE WHEN vendor_price = 'Memakai Unit CAM' THEN 1 END)
  INTO v_vendor_std, v_vendor_mahal, v_vendor_momen, v_vendor_cam
  FROM shipments
  WHERE jenis_layanan = 'FTL'
    AND (v_service IS NULL OR jenis_layanan = v_service)
    AND (p_date_from IS NULL OR tgl_masuk >= p_date_from)
    AND (p_date_to IS NULL OR tgl_masuk <= p_date_to);

  -- =============================================
  -- DISTRIBUSI CABANG
  -- =============================================
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object('cabang', fd.cabang, 'count', fd.cnt)
  ), '[]'::jsonb)
  INTO v_cabang
  FROM (
    SELECT
      b.cabang,
      COALESCE(s.cnt, 0) AS cnt
    FROM (
      SELECT unnest(ARRAY['CAM BKS','CAM SUB','CAM SMG','SPP SUB','SPP BKS','SPP SMG','TETRA','Lainnya']) AS cabang,
             unnest(ARRAY[1,2,3,4,5,6,7,8]) AS sort_order
    ) b
    LEFT JOIN (
      SELECT
        CASE
          WHEN TRIM(UPPER(cabang_customer)) IN ('CAM BKS','CAM SUB','CAM SMG','SPP SUB','SPP BKS','SPP SMG','TETRA')
            THEN TRIM(UPPER(cabang_customer))
          ELSE 'Lainnya'
        END AS cabang,
        COUNT(*) as cnt
      FROM shipments
      WHERE (v_service IS NULL OR jenis_layanan = v_service)
        AND (p_date_from IS NULL OR tgl_masuk >= p_date_from)
        AND (p_date_to IS NULL OR tgl_masuk <= p_date_to)
      GROUP BY 1
    ) s ON b.cabang = s.cabang
    ORDER BY b.sort_order
  ) fd;

  -- =============================================
  -- RETURN ALL DATA
  -- =============================================
  RETURN jsonb_build_object(
    'total_transaksi', v_total_transaksi,
    'stt_count', v_stt_count,
    'non_stt_count', v_total_transaksi - v_stt_count,
    'total_koli', v_total_koli,
    'omset_total', v_omset_total,
    'count_ltl', v_count_ltl,
    'count_lcl', v_count_lcl,
    'count_ftl', v_count_ftl,
    'koli_ltl', v_koli_ltl,
    'koli_lcl', v_koli_lcl,
    'koli_ftl', v_koli_ftl,
    'do_selesai_fisik', v_do_selesai,
    'pod_selesai_admin', v_pod_selesai,
    'sla_total', v_sla_total,
    'sla_sesuai', v_sla_sesuai,
    'sla_konfirm', v_sla_konfirm,
    'sla_gagal', v_sla_gagal,
    'kud_total', v_kud_total,
    'kud_tepat', v_kud_tepat,
    'kud_lewat', v_kud_lewat,
    'kud_missing', GREATEST(v_kud_total - v_kud_tepat - v_kud_lewat, 0),
    'komplain_total', v_komplain_total,
    'komplain_aman', v_komplain_aman,
    'komplain_teratasi', v_komplain_teratasi,
    'komplain_berat', v_komplain_berat,
    'doc_total', v_doc_total,
    'doc_cepat', v_doc_cepat,
    'doc_lambat', v_doc_lambat,
    'doc_gagal', v_doc_gagal,
    'vendor_standart', v_vendor_std,
    'vendor_mahal', v_vendor_mahal,
    'vendor_mahal_momen', v_vendor_momen,
    'vendor_unit_cam', v_vendor_cam,
    'cabang_distribution', v_cabang
  );
END;
$$;
