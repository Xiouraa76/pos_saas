-- RPC FUNCTION: Bulk Import v2
-- Updated to map rate_komplain, rate_kud, and status_detail_text columns

-- Preserve existing helpers (safe_to_int, safe_to_decimal, safe_to_date, safe_to_layanan)
-- They are created in the original migration and will not be recreated here.

-- Main RPC Function (CREATE OR REPLACE overwrites v1)
CREATE OR REPLACE FUNCTION bulk_import_stt(
    payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    row_data JSONB;
    v_vehicle_id UUID;
    v_inserted_count INT := 0;
    v_batch_id VARCHAR;
    v_no_stt VARCHAR;
    v_jenis_layanan layanan_enum;
BEGIN
    v_batch_id := 'import_' || to_char(now(), 'YYYYMMDD_HH24MISS');

    FOR row_data IN SELECT * FROM jsonb_array_elements(payload)
    LOOP
        -- 1. Resolve or Insert Vehicle (Nopol)
        v_vehicle_id := NULL;
        IF BTRIM(COALESCE(row_data->>'nopol', '')) <> '' THEN
            SELECT id INTO v_vehicle_id FROM master_vehicles WHERE nopol = BTRIM(row_data->>'nopol');

            IF v_vehicle_id IS NULL THEN
                INSERT INTO master_vehicles (nopol)
                VALUES (BTRIM(row_data->>'nopol'))
                RETURNING id INTO v_vehicle_id;
            END IF;
        END IF;

        -- 2. Prepare no_stt (null if empty)
        v_no_stt := NULLIF(BTRIM(COALESCE(row_data->>'no_stt', '')), '');

        -- 3. Prepare jenis_layanan with safe fallback
        v_jenis_layanan := safe_to_layanan(COALESCE(row_data->>'jenis_layanan', 'FTL'));

        -- 4. Insert Shipment with ALL CSV columns mapped (including new KPI columns)
        INSERT INTO shipments (
            no_stt,
            tgl_masuk,
            jenis_layanan,
            cabang_customer,
            nama_customer_teks,
            vehicle_id,
            rule_sla_hari,
            alamat_muat,
            recipient_name,
            alamat_tujuan,
            berat_kg,
            volume_m3,
            qty_koli,
            driver_name,
            driver_phone,
            jenis_unit,
            vendor_price,
            monitoring_pj,
            tkbm,
            tgl_diterima,
            status_pengiriman,
            keterangan_custom,
            -- NEW columns v2
            rate_komplain,
            rate_kud,
            status_detail_text,
            import_batch_id
        )
        VALUES (
            v_no_stt,
            safe_to_date(COALESCE(row_data->>'tgl_masuk', '')),
            v_jenis_layanan,
            NULLIF(BTRIM(COALESCE(row_data->>'customer_dropdown', '')), ''),
            NULLIF(BTRIM(COALESCE(row_data->>'nama_customer_teks', '')), ''),
            v_vehicle_id,
            COALESCE(safe_to_int(COALESCE(row_data->>'rule_sla_hari', '0')), 1),
            NULLIF(BTRIM(COALESCE(row_data->>'alamat_muat', '')), ''),
            NULLIF(BTRIM(COALESCE(row_data->>'recipient_name', '')), ''),
            NULLIF(BTRIM(COALESCE(row_data->>'alamat_tujuan', '')), ''),
            safe_to_decimal(COALESCE(row_data->>'berat_kg', '0')),
            safe_to_decimal(COALESCE(row_data->>'volume_m3', '0')),
            safe_to_int(COALESCE(row_data->>'qty_koli', '0')),
            NULLIF(BTRIM(COALESCE(row_data->>'driver_name', '')), ''),
            NULLIF(BTRIM(COALESCE(row_data->>'driver_phone', '')), ''),
            NULLIF(BTRIM(COALESCE(row_data->>'jenis_unit', '')), ''),
            NULLIF(BTRIM(COALESCE(row_data->>'vendor_price', '')), ''),
            NULLIF(BTRIM(COALESCE(row_data->>'monitoring_pj', '')), ''),
            NULLIF(BTRIM(COALESCE(row_data->>'tkbm', '')), ''),
            CASE
                WHEN BTRIM(COALESCE(row_data->>'tgl_diterima', '')) = '' THEN NULL
                ELSE safe_to_date(row_data->>'tgl_diterima')
            END,
            CASE
                WHEN BTRIM(COALESCE(row_data->>'status_pengiriman', '')) = '' THEN 'Di Lokasi Muat'::status_operasional_enum
                ELSE 'Di Lokasi Muat'::status_operasional_enum
            END,
            NULLIF(BTRIM(COALESCE(row_data->>'keterangan_custom', '')), ''),
            -- NEW: Map KPI columns from CSV
            NULLIF(BTRIM(COALESCE(row_data->>'rate_komplain', '')), ''),
            NULLIF(BTRIM(COALESCE(row_data->>'rate_kud', '')), ''),
            -- Store raw status text for DO/POD matching
            NULLIF(BTRIM(COALESCE(row_data->>'status_pengiriman', '')), ''),
            v_batch_id
        )
        ON CONFLICT (no_stt) DO UPDATE SET
            -- On conflict, update KPI and status fields that may be newly available
            rate_komplain = COALESCE(NULLIF(BTRIM(COALESCE(EXCLUDED.rate_komplain, '')), ''), shipments.rate_komplain),
            rate_kud = COALESCE(NULLIF(BTRIM(COALESCE(EXCLUDED.rate_kud, '')), ''), shipments.rate_kud),
            status_detail_text = COALESCE(NULLIF(BTRIM(COALESCE(EXCLUDED.status_detail_text, '')), ''), shipments.status_detail_text),
            omset = CASE WHEN EXCLUDED.omset > 0 THEN EXCLUDED.omset ELSE shipments.omset END;

        IF FOUND THEN
            v_inserted_count := v_inserted_count + 1;
        END IF;

    END LOOP;

    RETURN json_build_object(
        'status', 'success',
        'inserted_count', v_inserted_count,
        'batch_id', v_batch_id
    );
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Bulk import failed: %', SQLERRM;
END;
$$;
