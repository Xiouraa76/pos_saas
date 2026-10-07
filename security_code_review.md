# 🔍 Laporan Analisa Arsitektur & Keamanan — `pos_cam`

> **Tanggal**: 7 Oktober 2026 | **Repo**: `c:\Users\IT CAM\Documents\pos_cam`

---

## 📐 Arsitektur Keseluruhan

```
pos_cam/
├── src/
│   ├── app/
│   │   ├── (auth)/          # Login page
│   │   ├── (protected)/     # Route-level access control (layout guards)
│   │   │   ├── dashboard/
│   │   │   ├── pos/
│   │   │   ├── settings/    ✅ Ada layout guard (can_access_settings)
│   │   │   └── sync/
│   │   └── api/
│   │       └── admin/users/ # CRUD user management (service role)
│   ├── components/
│   ├── lib/                 # Zustand store
│   ├── middleware.ts         # Auth gate (redirect ke /login)
│   └── utils/supabase/
│       ├── admin.ts         # Service role client (bypass RLS)
│       ├── client.ts        # Browser anon client
│       ├── middleware.ts     # Session refresh
│       └── server.ts        # Server anon client
├── supabase/migrations/     # 22 migration files
└── tests/                   # RBAC test suite
```

**Stack**: Next.js App Router + Supabase (Postgres + Auth) + Zustand + shadcn/ui

---

## 🚨 Temuan Keamanan (Security Findings)

---

### 🔴 KRITIS — S1: API Admin Tanpa Autentikasi Pemanggil

**File**: [`src/app/api/admin/users/route.ts`](file:///c:/Users/IT%20CAM/Documents/pos_cam/src/app/api/admin/users/route.ts)

**Masalah**: Endpoint `GET`, `POST`, `PUT`, dan `DELETE` di `/api/admin/users` **tidak memverifikasi siapa yang memanggil API tersebut**. Siapapun yang memiliki akses jaringan ke server bisa memanggil endpoint ini — termasuk user yang sudah login tapi bukan admin.

```typescript
// ❌ Tidak ada pemeriksaan identitas/role pemanggil sama sekali
export async function GET() {
  const supabase = createAdminClient(); // Langsung pakai service role!
  // ... return semua data user
}
```

**Dampak**: Staff biasa (yang tahu URL) bisa mengakses daftar semua user, membuat user baru, atau menghapus user — tanpa perlu jadi admin.

**Perbaikan**:
```typescript
export async function GET(req: Request) {
  // 1. Verifikasi session pemanggil
  const serverClient = await createClient();
  const { data: { user } } = await serverClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 2. Cek apakah pemanggil punya hak akses settings
  const { data: perms } = await serverClient
    .from('user_permissions')
    .select('can_access_settings')
    .eq('user_id', user.id)
    .single();
  if (!perms?.can_access_settings) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 3. Baru lanjut dengan admin client
  const supabase = createAdminClient();
  // ...
}
```

---

### 🔴 KRITIS — S2: Hardcoded Credentials di File Test

**File**: [`tests/qa_rbac_audit.mjs`](file:///c:/Users/IT%20CAM/Documents/pos_cam/tests/qa_rbac_audit.mjs), [`tests/rbac.test.js`](file:///c:/Users/IT%20CAM/Documents/pos_cam/tests/rbac.test.js)

**Masalah**: Password dan URL Supabase (termasuk anon key) **di-hardcode langsung** dalam source code test.

```javascript
// ❌ Hardcoded credentials di qa_rbac_audit.mjs
const SUPABASE_URL = 'https://iclxnatzodcjyuskdrvk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_7A56rueTj...[OBFUSCATED]';

// ❌ Password plaintext di rbac.test.js
'Admin LCL': { email: 'lcl@admin', password: 'CAM_lcl0214' },
'Admin LTL': { email: 'ltl@admin', password: 'CAM_ltl0421' },
```

**Catatan positif**: File ini sudah masuk `.gitignore`, namun file ini sudah telanjur ada di working tree dan bisa tidak sengaja ter-commit.

**Perbaikan**:
```javascript
// ✅ Gunakan environment variable
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const TEST_PASSWORD_LCL = process.env.TEST_PASSWORD_LCL;
```

---

### 🔴 KRITIS — S3: `SUPABASE_SERVICE_ROLE_KEY` Bocor di `.env.local`

**File**: [`.env.local`](file:///c:/Users/IT%20CAM/Documents/pos_cam/.env.local)

**Masalah**: File `.env.local` berisi `SUPABASE_SERVICE_ROLE_KEY` yang merupakan **master key** untuk seluruh database — key ini mem-bypass semua RLS. File ini ada di working tree.

```
SUPABASE_SERVICE_ROLE_KEY=sb_secret_wzhV7rVGXTUfW1Er...[OBFUSCATED]
```

**Catatan**: `.gitignore` sudah mengexclude `.env*`, namun:
- Jika ada orang yang akses komputer ini, key ini terekspos.
- Jika pernah ter-commit sebelum `.gitignore` ditambahkan, key ini ada di git history.

**Tindakan segera**: Periksa git log: `git log --all --full-history -- .env.local`  
Jika pernah ter-commit → **rotate key sekarang** di Supabase Dashboard.

---

### 🟠 TINGGI — S4: RLS `shipments` Hanya Berbasis `auth.role()`, Bukan User ID

**File**: [`supabase/migrations/20260812_security_remediations.sql`](file:///c:/Users/IT%20CAM/Documents/pos_cam/supabase/migrations/20260812_security_remediations.sql)

**Masalah**: Policy Write untuk `shipments` mengizinkan **semua** user yang sudah login untuk INSERT/UPDATE/DELETE — tanpa memeriksa permission spesifik dari `user_permissions`.

```sql
-- ❌ Semua authenticated user bisa write ke shipments
CREATE POLICY "Authenticated write access" ON public.shipments
  FOR ALL TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
```

**Dampak**: User dengan role `Operasional` (yang seharusnya read-only) tetap bisa INSERT data baru langsung ke Supabase API, membypass UI.

**Perbaikan** — Tambahkan RLS function helper:
```sql
CREATE OR REPLACE FUNCTION public.has_write_access()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_permissions
    WHERE user_id = auth.uid()
    AND (can_access_pos = true OR can_access_ftl = true OR can_access_ltl = true OR can_access_lcl = true)
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE POLICY "Permission-based write access" ON public.shipments
  FOR ALL TO authenticated
  USING (has_write_access())
  WITH CHECK (has_write_access());
```

---

### 🟠 TINGGI — S5: `SUPER_ADMIN_EMAILS` Hardcoded dalam Source Code

**File**: [`src/app/api/admin/users/route.ts` L4](file:///c:/Users/IT%20CAM/Documents/pos_cam/src/app/api/admin/users/route.ts#L4)

**Masalah**: Daftar Super Admin disimpan sebagai konstanta hardcoded.

```typescript
const SUPER_ADMIN_EMAILS = ['admin@cam.local', 'it@camlogistics.local'];
```

**Dampak**: Menambah/hapus Super Admin butuh perubahan kode dan deploy ulang. Ini juga tidak skalabel.

**Perbaikan**: Simpan di kolom `role = 'super_admin'` di tabel `user_permissions` dan query dari sana.

---

### 🟠 TINGGI — S6: `proxy.ts` — File Duplikat yang Tidak Digunakan

**File**: [`src/proxy.ts`](file:///c:/Users/IT%20CAM/Documents/pos_cam/src/proxy.ts)

**Masalah**: File ini hampir identik dengan `utils/supabase/middleware.ts`, tapi **tidak diimport di mana pun**. Namun ia kehilangan proteksi `/auth` dan `/unauthorized`:

```typescript
// proxy.ts - ❌ Tidak protect /auth dan /unauthorized
if (!user && !request.nextUrl.pathname.startsWith('/login')) { ... }

// middleware.ts - ✅ Lebih lengkap
if (!user &&
  !request.nextUrl.pathname.startsWith('/login') &&
  !request.nextUrl.pathname.startsWith('/auth') &&      // ← ini hilang di proxy.ts
  !request.nextUrl.pathname.startsWith('/unauthorized') // ← ini hilang di proxy.ts
) { ... }
```

**Tindakan**: Hapus `src/proxy.ts` untuk menghindari kebingungan dan risiko digunakan secara tidak sengaja.

---

### 🟡 SEDANG — S7: `PUT /api/admin/users` — Risiko `display_name` Undefined

**File**: [`src/app/api/admin/users/route.ts` L131](file:///c:/Users/IT%20CAM/Documents/pos_cam/src/app/api/admin/users/route.ts#L131)

**Masalah**: Ketika body PUT tidak menyertakan `email` (karena email tidak boleh diubah), ekspresi `email.split('@')[0]` akan crash dengan `TypeError: Cannot read properties of undefined`.

```typescript
// ❌ email bisa undefined pada PUT request
display_name: display_name || email.split('@')[0],
```

**Perbaikan**:
```typescript
display_name: display_name || (email ? email.split('@')[0] : 'user'),
```

---

### 🟡 SEDANG — S8: Tidak Ada Rate Limiting pada API Admin

**File**: `src/app/api/admin/users/route.ts`

**Masalah**: Tidak ada pembatasan jumlah request. Endpoint ini bisa di-spam untuk:
- Brute force (mencoba-coba buat/hapus user)
- DoS ringan pada Supabase Auth quota

**Perbaikan**: Implementasikan rate limiting menggunakan middleware atau library seperti `@upstash/ratelimit`.

---

### 🟡 SEDANG — S9: `bulk_import_stt` RPC — SECURITY DEFINER Tanpa Auth Check

**File**: [`supabase/migrations/20260730_rpc_bulk_import.sql`](file:///c:/Users/IT%20CAM/Documents/pos_cam/supabase/migrations/20260730_rpc_bulk_import.sql)

**Masalah**: Fungsi `bulk_import_stt` menggunakan `SECURITY DEFINER` (berjalan dengan hak owner/postgres) dan sudah di-REVOKE dari `anon` (✅), namun tidak ada pengecekan internal apakah pemanggil punya izin khusus untuk import.

**Dampak**: Semua user yang sudah login (`authenticated`) bisa melakukan bulk import besar-besaran tanpa batasan.

---

## 🐛 Potensi Bug

---

### 🔴 BUG-1: Race Condition di Delete Modal (Belum Ada Konfirmasi Loading)

**File**: [`src/app/(protected)/settings/users/page.tsx` L92-L111](file:///c:/Users/IT%20CAM/Documents/pos_cam/src/app/(protected)/settings/users/page.tsx#L92)

**Masalah**: `handleDelete` tidak mengubah state loading, jadi user bisa mengklik tombol delete beberapa kali berturut-turut sebelum response pertama kembali — mengakibatkan multiple DELETE requests.

```typescript
// ❌ Tidak ada guard untuk mencegah double-click
const handleDelete = async (id: string, email: string) => {
  if (confirm(`...`)) {
    // Tidak ada: setIsSubmitting(true)
    const res = await fetch(`/api/admin/users?id=${id}&email=${email}`, { method: 'DELETE' });
    // Tidak ada: setIsSubmitting(false)
  }
};
```

---

### 🟠 BUG-2: `fetchUsers` Dipanggil Tanpa Error Toast

**File**: [`src/app/(protected)/settings/users/page.tsx` L40-L53](file:///c:/Users/IT%20CAM/Documents/pos_cam/src/app/(protected)/settings/users/page.tsx#L40)

**Masalah**: Jika `fetch('/api/admin/users')` gagal, error hanya di-log ke console — UI tetap menampilkan loading spinner atau daftar kosong tanpa notifikasi ke user.

```typescript
} catch (error) {
  console.error("Failed to fetch users", error); // ❌ Tidak ada user-facing feedback
}
```

---

### 🟠 BUG-3: `settings/users/page.tsx` — Tipe `GenericData` Terlalu Longgar

**File**: [`src/app/(protected)/settings/users/page.tsx` L12-L15](file:///c:/Users/IT%20CAM/Documents/pos_cam/src/app/(protected)/settings/users/page.tsx#L12)

**Masalah**: Penggunaan `[key: string]: any` menghilangkan type safety sepenuhnya untuk data user.

```typescript
// ❌ Tipe terlalu longgar
interface GenericData {
  id?: string;
  [key: string]: any;
}
```

**Perbaikan**: Definisikan interface yang proper:
```typescript
interface UserPermissions {
  display_name: string;
  role: string;
  can_access_dashboard: boolean;
  can_access_pos: boolean;
  can_access_settings: boolean;
  can_access_ftl: boolean;
  can_access_ltl: boolean;
  can_access_lcl: boolean;
}

interface UserData {
  id: string;
  email: string;
  created_at: string;
  permissions: UserPermissions | null;
}
```

---

### 🟠 BUG-4: `safe_to_date` Fallback ke `CURRENT_DATE`

**File**: [`supabase/migrations/20260730_rpc_bulk_import.sql` L34-L40](file:///c:/Users/IT%20CAM/Documents/pos_cam/supabase/migrations/20260730_rpc_bulk_import.sql#L34)

**Masalah**: Jika tanggal tidak valid, fungsi silent-fail dan menggunakan `CURRENT_DATE` sebagai fallback — ini bisa menyebabkan data dengan tanggal salah masuk ke database tanpa error.

```sql
EXCEPTION WHEN OTHERS THEN
    RETURN CURRENT_DATE; -- ❌ Silent fallback ke hari ini
```

---

### 🟡 BUG-5: `PUT` Route — Nomor Langkah Tidak Konsisten

**File**: [`src/app/api/admin/users/route.ts` L126](file:///c:/Users/IT%20CAM/Documents/pos_cam/src/app/api/admin/users/route.ts#L126)

**Masalah**: Komentar langkah ke-2 muncul dua kali (L101 dan L126), dan langkah ke-3 (update auth password) berada di antara keduanya. Ini adalah bukti copy-paste yang tidak bersih dan bisa menyebabkan kebingungan saat maintenance.

---

## ✅ Hal yang Sudah Baik

| Aspek | Status |
|-------|--------|
| Middleware menggunakan `getUser()` bukan `getSession()` | ✅ Aman |
| `admin.ts` mematikan `autoRefreshToken` & `persistSession` | ✅ Benar |
| `settings/layout.tsx` memproteksi route di server-side | ✅ Baik |
| Super Admin lockout protection pada PUT/DELETE | ✅ Ada |
| Migration security remediation (search_path, REVOKE anon) | ✅ Dilakukan |
| `.gitignore` mengexclude `.env*`, test files, log files | ✅ Baik |
| DB constraints (whitespace, enum, length) via CHECK | ✅ Dilakukan |
| Unique index pada `user_permissions.user_id` | ✅ Ada |

---

## 📋 Prioritas Perbaikan

| # | Temuan | Severity | Effort |
|---|--------|----------|--------|
| 1 | **S1**: Tambah auth check di API `/api/admin/users` | 🔴 Kritis | ~30 menit |
| 2 | **S2**: Hapus hardcoded credentials dari test files | 🔴 Kritis | ~10 menit |
| 3 | **S3**: Periksa & rotate service role key jika pernah ter-commit | 🔴 Kritis | ~5 menit |
| 4 | **BUG-1**: Tambah loading guard di `handleDelete` | 🟠 Tinggi | ~5 menit |
| 5 | **S4**: Perbaiki RLS policy agar berbasis `user_permissions` | 🟠 Tinggi | ~1 jam |
| 6 | **S6**: Hapus `proxy.ts` yang tidak dipakai | 🟠 Tinggi | ~1 menit |
| 7 | **S7**: Fix potensi crash `email.split` di PUT | 🟡 Sedang | ~5 menit |
| 8 | **BUG-2**: Tambah error toast di `fetchUsers` | 🟡 Sedang | ~10 menit |
| 9 | **BUG-3**: Ganti `GenericData` dengan typed interface | 🟡 Sedang | ~15 menit |
| 10 | **S5**: Migrasikan Super Admin list ke database | 🟡 Sedang | ~2 jam |
