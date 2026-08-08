import os
import pandas as pd
from supabase import create_client, Client
from datetime import datetime

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
    if isinstance(val, datetime): return default
    return val

# 3. Generate STT to match existing DB and prepare updates
payloads = []
seen_stts = {}
sequence_counter = 1

for index, row in df.iterrows():
    # Skip completely empty rows
    if row.dropna().empty:
        continue

    try:
        raw_stt = clean_nan(row.get('STT'), None)
        raw_origin = str(clean_nan(row.get('Origin'), 'UNK')).strip()
        cabang = raw_origin[:3].upper()
        
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

        # TUGAS 3: Clean Origin
        cleaned_origin = raw_origin.strip().upper() if raw_origin != 'UNK' else 'UNK'

        # TUGAS 4: Get Dates (tgl_diterima)
        tgl_diterima_val = None
        tgl_diterima_str = None
        
        if index >= 942:
            tgl_diterima_val = row.get('Nama Penerima')
            tgl_pod_val = row.get('Tgl Resi Diterima')
        else:
            tgl_diterima_val = row.get('Tgl Resi Diterima')
            tgl_pod_val = row.get('Tgl Di terima/POD')
        
        def parse_date(date_val):
            if pd.isna(date_val) or str(date_val).strip() == '' or str(date_val).strip().lower() == 'nan':
                return None
            if hasattr(date_val, 'strftime'):
                return date_val.strftime('%Y-%m-%d')
            tgl_str = str(date_val)[:10]
            if tgl_str.endswith('/0226'):
                tgl_str = tgl_str.replace('/0226', '/2026')
            try:
                parsed_dt = pd.to_datetime(tgl_str, dayfirst=True)
                return parsed_dt.strftime('%Y-%m-%d')
            except:
                return None

        final_tgl_diterima = parse_date(tgl_diterima_val) or parse_date(tgl_pod_val)

        payload = {
            'no_stt': final_stt,
            'origin': cleaned_origin,
            'cabang_customer': cleaned_origin,
        }
        if final_tgl_diterima:
            payload['tgl_diterima'] = final_tgl_diterima
            payload['tgl_diterima_pod'] = final_tgl_diterima
            
        payloads.append(payload)

    except Exception as e:
        print(f"Error preparing row {index}: {e}")

print(f"Prepared {len(payloads)} rows for update.")

# Fetch IDs from DB to map STT to ID for bulk upsert
print("Fetching existing shipments for mapping...")
# We need to fetch all rows. Since limit is 1000 by default, we'll fetch in batches if necessary, 
# but supabase python client doesn't auto-paginate. We'll use a loop if count > 1000.
all_data = []
page = 0
page_size = 1000
while True:
    res = supabase.table('shipments').select('id, no_stt').range(page * page_size, (page + 1) * page_size - 1).execute()
    if res.data:
        all_data.extend(res.data)
        if len(res.data) < page_size:
            break
        page += 1
    else:
        break

if all_data:
    stt_to_id = {item['no_stt']: item['id'] for item in all_data}
    print(f"Found {len(stt_to_id)} shipments in DB.")
    
    updates = []
    for p in payloads:
        if p['no_stt'] in stt_to_id:
            update_payload = p.copy()
            update_payload['id'] = stt_to_id[p['no_stt']]
            updates.append(update_payload)
            
    print(f"Ready to apply {len(updates)} updates via bulk upsert.")
    
    batch_size = 100
    success_count = 0
    for i in range(0, len(updates), batch_size):
        batch = updates[i:i+batch_size]
        try:
            res_update = supabase.table('shipments').upsert(batch).execute()
            success_count += len(res_update.data) if res_update.data else 0
            print(f"Updated batch {i//batch_size + 1} ({min(i+batch_size, len(updates))}/{len(updates)})")
        except Exception as e:
            print(f"Failed to update batch {i//batch_size + 1}: {e}")
            
    print(f"Finished! Successfully updated {success_count} shipments.")
else:
    print("No shipments found in DB to update.")
