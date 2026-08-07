-- 5. RPC FUNCTION FOR BULK IMPORT (v3 - Fully CSV Compatible)
-- Disesuaikan dengan header CSV: tgl_masuk, no_stt, customer_dropdown, nama_customer_teks,
-- jenis_layanan, rule_sla_hari, alamat_muat, recipient_name, alamat_tujuan, berat_kg,
-- volume_m3, qty_koli, nopol, driver_name, driver_phone, jenis_unit, vendor_price,
-- monitoring_pj, tkbm, tgl_diterima, status_pengiriman, keterangan_custom

-- Helper: Safely parse integer from dirty text like "5+1", "10", "", null
CREATE OR REPLACE FUNCTION safe_to_int(val TEXT) RETURNS INT AS $$
BEGIN
    -- Try direct cast first
    RETURN val::INT;
EXCEPTION WHEN OTHERS THEN
    -- If it fails (e.g., "5+1"), extract only the leading digits
    RETURN COALESCE(
        NULLIF(regexp_replace(val, '[^0-9].*', '', 'g'), '')::INT,
        0
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Helper: Safely parse decimal from dirty text
CREATE OR REPLACE FUNCTION safe_to_decimal(val TEXT) RETURNS DECIMAL AS $$
BEGIN
    RETURN val::DECIMAL;
EXCEPTION WHEN OTHERS THEN
    RETURN COALESCE(
        NULLIF(regexp_replace(val, '[^0-9.].*', '', 'g'), '')::DECIMAL,
        0
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Helper: Safely parse date
CREATE OR REPLACE FUNCTION safe_to_date(val TEXT) RETURNS DATE AS $$
BEGIN
    RETURN val::DATE;
EXCEPTION WHEN OTHERS THEN
    RETURN CURRENT_DATE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Helper: Safely parse layanan enum
CREATE OR REPLACE FUNCTION safe_to_layanan(val TEXT) RETURNS layanan_enum AS $$
BEGIN
    RETURN UPPER(BTRIM(val))::layanan_enum;
EXCEPTION WHEN OTHERS THEN
    RETURN 'FTL'::layanan_enum;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Main RPC Function
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

        -- 4. Insert Shipment with ALL CSV columns mapped
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
                ELSE 'Di Lokasi Muat'::status_operasional_enum -- Default, karena status dari CSV mungkin berbeda
            END,
            NULLIF(BTRIM(COALESCE(row_data->>'keterangan_custom', '')), ''),
            v_batch_id
        )
        ON CONFLICT (no_stt) DO NOTHING;
        
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
