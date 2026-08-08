import os
import pandas as pd
from supabase import create_client, Client
from datetime import datetime
import math
import uuid

# 1. Initialize Supabase
url = "https://iclxnatzodcjyuskdrvk.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljbHhuYXR6b2Rjanl1c2tkcnZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDc5MzM0MCwiZXhwIjoyMTAwMzY5MzQwfQ.lnCuqgKm7WfkwodV88tTX28aHiMXV0j8ks8NB571X4g"
supabase: Client = create_client(url, key)

# 2. Hard Reset (Delete all shipments)
print("WIPING DATA: Deleting all existing shipments...")
try:
    # We use a dummy filter that will match all rows to satisfy the REST API requirements
    del_res = supabase.table('shipments').delete().neq('no_stt', 'impossible_stt_value_to_match').execute()
    print("Database wiped successfully. Ready for clean import.")
except Exception as e:
    print(f"Failed to wipe database: {e}")
    # If the neq filter fails due to some supabase-py quirk, we can fallback, but this should work.

# 3. Load Excel File
file_path = r"c:\Users\IT CAM\Documents\pos_cam\src\data_aktual_juli.xlsx"
print(f"Loading data from {file_path}...")
df = pd.read_excel(file_path)
print(f"Loaded {len(df)} rows.")

# 4. Clean Data & Sync master_customers
customers = df['CUSTOMER'].dropna().unique().tolist()
print(f"Found {len(customers)} unique customers. Syncing to master_customers...")

customer_mapping = {}
for cust in customers:
    cust_name = str(cust).strip()
    if not cust_name: continue
    
    res = supabase.table('master_customers').select('id').eq('nama_customer', cust_name).execute()
    if res.data:
        customer_mapping[cust_name] = res.data[0]['id']
    else:
        try:
            insert_res = supabase.table('master_customers').insert({'nama_customer': cust_name}).execute()
            if insert_res.data:
                customer_mapping[cust_name] = insert_res.data[0]['id']
        except Exception as e:
            print(f"Failed to insert customer '{cust_name}': {e}")
            
print(f"Synced {len(customer_mapping)} customers successfully.")

allowed_statuses = [
    'Di Lokasi Muat', 'Selesai Muat', 'Di Perjalanan', 
    'Bongkar', 'Selesai Bongkar', 'Dokumen Kembali', 
    'Bermasalah', 'Custom'
]
allowed_services = ['FTL', 'LTL', 'LCL']

def clean_nan(val, default):
    if pd.isna(val): return default
    if isinstance(val, datetime): return default
    return val

# 5. Prepare payload for shipments
payloads = []
seen_stts = {}
sequence_counter = 1

for index, row in df.iterrows():
    # Skip completely empty rows
    if row.dropna().empty:
        continue

    try:
        raw_stt = clean_nan(row.get('STT'), None)
        
        alamat_muat = str(clean_nan(row.get('Alamat Pengirim'), clean_nan(row.get('Origin'), '-')))
        cabang = str(clean_nan(row.get('Origin'), 'UNK')).strip()[:3].upper()
        
        if not raw_stt or str(raw_stt).lower() == 'nan':
            # Non-STT Auto-Generate
            stt = f"Non-STT-{cabang}-{sequence_counter}"
            sequence_counter += 1
        else:
            stt = str(raw_stt).strip()
            
        # Handle STT duplicates (suffixing)
        if stt in seen_stts:
            seen_stts[stt] += 1
            final_stt = f"{stt}-{seen_stts[stt]}"
        else:
            seen_stts[stt] = 1
            final_stt = stt

        tgl_masuk = row.get('Tanggal')
        if pd.isna(tgl_masuk) or str(tgl_masuk).strip().lower() == 'tgl ':
            tgl_masuk_str = datetime.now().strftime('%Y-%m-%d')
        elif hasattr(tgl_masuk, 'strftime'):
            tgl_masuk_str = tgl_masuk.strftime('%Y-%m-%d')
        else:
            tgl_str = str(tgl_masuk)[:10]
            if tgl_str.endswith('/0226'):
                tgl_str = tgl_str.replace('/0226', '/2026')
            try:
                # Validate it's a real date format
                parsed_dt = pd.to_datetime(tgl_str, dayfirst=True)
                tgl_masuk_str = parsed_dt.strftime('%Y-%m-%d')
            except:
                tgl_masuk_str = datetime.now().strftime('%Y-%m-%d')
            
        jenis_layanan = str(clean_nan(row.get('Service'), 'LTL')).strip().upper()
        if jenis_layanan not in allowed_services:
            jenis_layanan = 'LTL'
            
        cust_name = str(clean_nan(row.get('CUSTOMER'), '')).strip()
        customer_id = customer_mapping.get(cust_name)
        
        alamat_tujuan = str(clean_nan(row.get('Alamat Tujuan '), clean_nan(row.get('Tujuan'), '-')))
        
        try:
            qty_koli = int(clean_nan(row.get('Qty'), 0))
        except ValueError:
            qty_koli = 0
            
        try:
            berat_kg = float(clean_nan(row.get('Berat'), 0.0))
        except ValueError:
            berat_kg = 0.0
            
        try:
            volume_m3 = float(clean_nan(row.get('Volume'), 0.0))
        except ValueError:
            volume_m3 = 0.0
            
        try:
            omset = float(clean_nan(row.get('Omset'), 0.0))
        except ValueError:
            omset = 0.0
        
        raw_status = str(clean_nan(row.get('Status pengiriman'), 'Di Lokasi Muat')).strip()
        keterangan = str(clean_nan(row.get('Keterangan'), '')).strip()
        
        if raw_status in allowed_statuses:
            status_pengiriman = raw_status
        else:
            status_pengiriman = 'Custom'
            if keterangan and keterangan.lower() != 'nan':
                keterangan = f"Status Asli: {raw_status} | {keterangan}"
            else:
                keterangan = f"Status Asli: {raw_status}"

        payload = {
            'no_stt': final_stt,
            'tgl_masuk': tgl_masuk_str,
            'jenis_layanan': jenis_layanan,
            'nama_customer_teks': cust_name,
            'alamat_muat': alamat_muat,
            'alamat_tujuan': alamat_tujuan,
            'qty_koli': qty_koli,
            'berat_kg': berat_kg,
            'volume_m3': volume_m3,
            'omset': omset,
            'status_pengiriman': status_pengiriman,
            'keterangan_custom': keterangan if keterangan else None,
            'import_batch_id': 'import_juli_2026'
        }
        payloads.append(payload)
    except Exception as e:
        print(f"Error preparing row {index}: {e}")

print(f"Prepared {len(payloads)} rows for insert (Zero-Deduplication + Suffixing applied).")

# 6. Bulk Insert (No Upsert)
batch_size = 100
success_count = 0
for i in range(0, len(payloads), batch_size):
    batch = payloads[i:i+batch_size]
    try:
        res = supabase.table('shipments').insert(batch).execute()
        success_count += len(res.data) if res.data else 0
        print(f"Inserted batch {i//batch_size + 1} ({min(i+batch_size, len(payloads))}/{len(payloads)})")
    except Exception as e:
        print(f"Failed to insert batch {i//batch_size + 1}: {e}")

print(f"Finished! Successfully inserted {success_count} shipments.")
