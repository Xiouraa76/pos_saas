-- ════════════════════════════════════════════════════════════════════════
-- MIGRASI: Optimasi Performa Database (Indexing)
-- ════════════════════════════════════════════════════════════════════════
-- Tujuan: Mengubah pencarian linear menjadi pencarian logaritmik (B-Tree).
-- Fokus:  Kolom yang sering difilter, dicari (WHERE), dan diurutkan (ORDER BY).
-- ════════════════════════════════════════════════════════════════════════

-- 1. Index untuk fitur pencarian Nomor STT (Sangat sering digunakan di Search Bar)
CREATE INDEX IF NOT EXISTS idx_shipments_no_stt ON shipments (no_stt);

-- 2. Index untuk filter Cabang (Sering digunakan admin cabang untuk melihat data wilayahnya)
CREATE INDEX IF NOT EXISTS idx_shipments_cabang ON shipments (cabang_customer);

-- 3. Index untuk pengurutan dan filter Tanggal Masuk (Descending karena kita biasa mencari data terbaru)
CREATE INDEX IF NOT EXISTS idx_shipments_tgl_masuk ON shipments (tgl_masuk DESC);

-- 4. Index untuk filter Status Pengiriman (Sering digunakan di halaman LTL/FTL untuk membedakan status Selesai/Belum)
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments (status_pengiriman);

-- 5. Index kombinasi (Composite Index) untuk performa ekstrim pada halaman Dashboard (Opsional, tapi sangat disarankan)
-- Digunakan ketika Dasbor menarik data "Total STT per Cabang pada rentang tanggal tertentu"
CREATE INDEX IF NOT EXISTS idx_shipments_cabang_tgl ON shipments (cabang_customer, tgl_masuk DESC);
