import pandas as pd
from supabase import create_client, Client
import math

# 1. Initialize Supabase
url = "https://iclxnatzodcjyuskdrvk.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljbHhuYXR6b2Rjanl1c2tkcnZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDc5MzM0MCwiZXhwIjoyMTAwMzY5MzQwfQ.lnCuqgKm7WfkwodV88tTX28aHiMXV0j8ks8NB571X4g"
supabase: Client = create_client(url, key)

# 2. Load Excel File
file_path = r"c:\Users\IT CAM\Documents\pos_cam\src\data_aktual_juli.xlsx"
print(f"Loading data from {file_path}...")
df = pd.read_excel(file_path)
print(f"Loaded {len(df)} rows.")

def clean_nan(val, default):
    if pd.isna(val): return default
    return val

def sanitize_kpi(val, mapping_dict):
    val_str = str(val).strip().replace('.', '')
    # Check if string represents an integer 1, 2, or 3
    if val_str in mapping_dict:
        return mapping_dict[val_str]
    return None

sla_map = {'1': 'Sesuai', '2': 'Konfirm', '3': 'Gagal'}
komplain_map = {'1': 'Aman', '2': 'Teratasi', '3': 'Berat'}
doc_map = {'1': 'Cepat', '2': 'Lambat', '3': 'Gagal'}
kud_map = {'1': 'Tepat', '2': 'Lewat', '3': 'Missing'}

# 3. Prepare updates for shipments
updates = []
seen_stts = {}
sequence_counter = 1

for index, row in df.iterrows():
    # Skip completely empty rows
    if row.dropna().empty:
        continue

    # Same logic to identify STT
    raw_stt = clean_nan(row.get('STT'), None)
    cabang = str(clean_nan(row.get('Origin'), 'UNK')).strip()[:3].upper()
    
    if not raw_stt or str(raw_stt).lower() == 'nan':
        stt = f"Non-STT-{cabang}-{sequence_counter}"
        sequence_counter += 1
    else:
        stt = str(raw_stt).strip()
        
    if stt in seen_stts:
        seen_stts[stt] += 1
        final_stt = f"{stt}-{seen_stts[stt]}"
    else:
        seen_stts[stt] = 1
        final_stt = stt

    # --- KPI EXTRACTION LOGIC ---
    # Shift happens around row 946 in Excel which is index 944
    if index < 944:
        # LTL/LCL: Original columns
        raw_sla = row.get('Rate SLA')
        raw_komplain = row.get('Rate Komplain')
        raw_kud = row.get('Rate KUD')
        raw_doc = row.get('Rate Doc Kembali')
    else:
        # FTL: Shifted columns
        raw_sla = row.get('Tgl Resi Diterima')
        raw_komplain = row.get('Keterangan')
        raw_kud = row.get('Status pengiriman')
        raw_doc = row.get('Kode Delivery')

    # Sanitize and map to string
    rate_sla = sanitize_kpi(raw_sla, sla_map)
    rate_komplain = sanitize_kpi(raw_komplain, komplain_map)
    rate_kud = sanitize_kpi(raw_kud, kud_map)
    kecepatan_doc = sanitize_kpi(raw_doc, doc_map)

    # We only want to update if we have at least one KPI value
    if rate_sla or rate_komplain or rate_kud or kecepatan_doc:
        update_payload = {
            'no_stt': final_stt
        }
        if rate_sla: update_payload['rate_sla'] = rate_sla
        if rate_komplain: update_payload['rate_komplain'] = rate_komplain
        if rate_kud: update_payload['rate_kud'] = rate_kud
        if kecepatan_doc: update_payload['kecepatan_doc'] = kecepatan_doc
        
        updates.append(update_payload)

print(f"Prepared {len(updates)} rows for KPI update.")

# 4. Execute Bulk Upsert (Update by Upserting with existing fields omitted except what needs updating)
# Supabase bulk update isn't directly supported via standard update without match, but upsert with on_conflict works perfectly.
# Wait, upsert requires all NOT NULL constraints to be satisfied if the row didn't exist. Since they DO exist, it might work?
# Actually, the safest way for updating many rows if upsert requires all fields is to fetch ID first, but that's slow.
# Let's try upsert since it works for updating existing records if no_stt is unique.
# But shipments has tgl_masuk and jenis_layanan as NOT NULL. If we omit them in upsert, Postgres will error if trying to insert, but since it's an update, it might error anyway if omitted from the upsert payload (Postgres restriction).
# To be completely safe against Postgres constraints on upsert, we can do batch updates.
# For each batch, we can construct an update query, or we can just iterate and update one by one (1300 rows is very fast async or sync).
# Let's use simple batched upsert. If it fails due to NOT NULL, we will iterate and update.

# ACTUALLY, for update, we can just loop over them and update based on no_stt.
success_count = 0
for payload in updates:
    try:
        no_stt = payload.pop('no_stt')
        res = supabase.table('shipments').update(payload).eq('no_stt', no_stt).execute()
        if res.data:
            success_count += 1
        if success_count % 100 == 0 and success_count > 0:
            print(f"Updated {success_count} rows...")
    except Exception as e:
        print(f"Failed to update STT {no_stt}: {e}")

print(f"Finished! Successfully patched KPI for {success_count} shipments.")
