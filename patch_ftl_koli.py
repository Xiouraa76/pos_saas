import pandas as pd
from supabase import create_client, Client
import math

url = "https://iclxnatzodcjyuskdrvk.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljbHhuYXR6b2Rjanl1c2tkcnZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDc5MzM0MCwiZXhwIjoyMTAwMzY5MzQwfQ.lnCuqgKm7WfkwodV88tTX28aHiMXV0j8ks8NB571X4g"
supabase: Client = create_client(url, key)

file_path = r"c:\Users\IT CAM\Documents\pos_cam\src\data_aktual_juli.xlsx"
print(f"Loading data from {file_path}...")
df = pd.read_excel(file_path)

# Filter FTL rows (index >= 942 matches row 944 in Excel)
df_ftl = df.loc[942:].copy()
print(f"Found {len(df_ftl)} FTL rows to process.")

updates = []

for index, row in df_ftl.iterrows():
    if row.dropna().empty:
        continue
        
    raw_stt = row.get('STT')
    if pd.isna(raw_stt):
        continue
        
    stt = str(raw_stt).strip()
    
    # Koli is in the 12th column (index 11) because of the shift
    # We try iloc[11] first, or fallback to 'Volume'
    try:
        raw_koli = row.iloc[11]
        if pd.isna(raw_koli):
            raw_koli = row.get('Volume')
    except:
        raw_koli = row.get('Volume')
        
    try:
        if pd.isna(raw_koli):
            qty_koli = 0
        else:
            qty_koli = int(float(raw_koli))
    except ValueError:
        qty_koli = 0
        
    updates.append({
        'no_stt': stt,
        'qty_koli': qty_koli
    })

print(f"Prepared {len(updates)} STT updates for FTL Koli.")

success_count = 0
for u in updates:
    stt = u['no_stt']
    koli = u['qty_koli']
    try:
        res = supabase.table('shipments').update({'qty_koli': koli}).eq('no_stt', stt).execute()
        if res.data:
            success_count += 1
    except Exception as e:
        print(f"Failed to update STT {stt}: {e}")

print(f"Finished! Successfully updated Koli FTL for {success_count} transactions.")
