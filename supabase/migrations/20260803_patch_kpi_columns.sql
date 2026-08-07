-- Migration: Add KPI tracking columns and raw status text
-- rate_komplain: Categorical value from CSV (Aman/Teratasi/Berat)
-- rate_kud: Categorical value from CSV (Tepat/Lewat/etc.)
-- status_detail_text: Raw operational status text from spreadsheet for DO/POD matching

ALTER TABLE shipments ADD COLUMN IF NOT EXISTS rate_komplain VARCHAR;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS rate_kud VARCHAR;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS status_detail_text VARCHAR;
