import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';

// ─── [S8 FIX] In-Memory Rate Limiter ────────────────────────────────
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 menit
const MAX_REQUESTS_PER_WINDOW = 30; // Max 30 request / menit / IP

const ipRequestCounts = new Map<string, { count: number; expiresAt: number }>();

function checkRateLimit(req: Request): NextResponse | null {
  const forwardedFor = req.headers.get('x-forwarded-for');
  const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown-ip';
  
  const now = Date.now();
  const record = ipRequestCounts.get(ip);
  
  if (!record || record.expiresAt < now) {
    ipRequestCounts.set(ip, { count: 1, expiresAt: now + RATE_LIMIT_WINDOW_MS });
  } else {
    record.count += 1;
    if (record.count > MAX_REQUESTS_PER_WINDOW) {
      return NextResponse.json(
        { error: 'Too Many Requests. Silakan coba beberapa saat lagi.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }
  }

  // Simple garbage collection
  if (Math.random() < 0.05) {
    for (const [key, val] of ipRequestCounts.entries()) {
      if (val.expiresAt < now) ipRequestCounts.delete(key);
    }
  }

  return null;
}
// ────────────────────────────────────────────────────────────────────

/**
 * [S1 FIX] Verifikasi bahwa pemanggil API adalah user yang sudah login
 * dan memiliki hak akses Settings (admin).
 * Mengembalikan NextResponse error jika tidak memenuhi syarat,
 * atau null jika lolos sehingga handler bisa melanjutkan.
 */
async function requireAdmin(): Promise<NextResponse | null> {
  const serverClient = await createClient();
  const { data: { user } } = await serverClient.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized: Sesi tidak ditemukan, silakan login kembali.' },
      { status: 401 }
    );
  }

  const { data: perms } = await serverClient
    .from('user_permissions')
    .select('can_access_settings')
    .eq('user_id', user.id)
    .single();

  if (!perms?.can_access_settings) {
    return NextResponse.json(
      { error: 'Forbidden: Anda tidak memiliki hak akses untuk mengelola pengguna.' },
      { status: 403 }
    );
  }

  return null; // Lolos — pemanggil adalah admin
}

export async function GET(req: Request) {
  const rateLimitError = checkRateLimit(req);
  if (rateLimitError) return rateLimitError;

  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const supabase = createAdminClient();
    
    // Fetch auth users
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) throw authError;

    // Fetch permissions
    const { data: permData, error: permError } = await supabase
      .from('user_permissions')
      .select('*');
    if (permError) throw permError;

    const users = authData.users.map(u => {
      const perm = permData.find(p => p.user_id === u.id);
      return {
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        permissions: perm || null
      };
    });

    return NextResponse.json({ users });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 500 });
    }
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const rateLimitError = checkRateLimit(req);
  if (rateLimitError) return rateLimitError;

  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const supabase = createAdminClient();
    const body = await req.json();
    const { email, password, display_name, role, can_access_dashboard, can_access_pos, can_access_settings, can_access_ftl, can_access_ltl, can_access_lcl } = body;

    // 1. Create user in auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) throw authError;

    const userId = authData.user.id;

    // 2. Insert permissions
    const { error: permError } = await supabase
      .from('user_permissions')
      .insert({
        user_id: userId,
        display_name: display_name || email.split('@')[0],
        role: role || 'staff',
        can_access_dashboard: !!can_access_dashboard,
        can_access_pos: !!can_access_pos,
        can_access_settings: !!can_access_settings,
        can_access_ftl: !!can_access_ftl,
        can_access_ltl: !!can_access_ltl,
        can_access_lcl: !!can_access_lcl
      });

    if (permError) throw permError;

    return NextResponse.json({ success: true, user_id: userId });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 500 });
    }
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const rateLimitError = checkRateLimit(req);
  if (rateLimitError) return rateLimitError;

  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const supabase = createAdminClient();
    const body = await req.json();
    const { id, email, password, display_name, role, can_access_dashboard, can_access_pos, can_access_settings, can_access_ftl, can_access_ltl, can_access_lcl } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    // 1. Dapatkan role saat ini dari database untuk mengecek status Super Admin
    const { data: currentPerms } = await supabase
      .from('user_permissions')
      .select('role')
      .eq('user_id', id)
      .single();
    
    const isSuperAdmin = currentPerms?.role === 'super_admin';

    // 2. [SUPER ADMIN LOCKOUT PROTECTION]
    if (isSuperAdmin) {
      if (can_access_settings === false || can_access_dashboard === false) {
        return NextResponse.json(
          { error: "Aksi Ditolak: Hak akses Super Admin tidak dapat dicabut atau dimanipulasi." },
          { status: 403 }
        );
      }
    }

    // 3. Update Auth if password is provided
    if (password && password.trim() !== '') {
      if (isSuperAdmin) {
         return NextResponse.json(
          { error: "Aksi Ditolak: Tidak dapat mereset password Super Admin dari panel ini." },
          { status: 403 }
        );
      }

      const { error: authError } = await supabase.auth.admin.updateUserById(id, {
        password: password
      });
      if (authError) throw authError;
    }

    // 2. Update permissions
    const { error: permError } = await supabase
      .from('user_permissions')
      .upsert({
        user_id: id,
        display_name: display_name || (email ? email.split('@')[0] : 'user'),
        role: role || 'staff',
        can_access_dashboard: !!can_access_dashboard,
        can_access_pos: !!can_access_pos,
        can_access_settings: !!can_access_settings,
        can_access_ftl: !!can_access_ftl,
        can_access_ltl: !!can_access_ltl,
        can_access_lcl: !!can_access_lcl,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (permError) throw permError;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 500 });
    }
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const rateLimitError = checkRateLimit(req);
  if (rateLimitError) return rateLimitError;

  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const supabase = createAdminClient();
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    // [SECURITY PATCH] Dapatkan role saat ini untuk mengecek apakah user adalah Super Admin
    const { data: currentPerms } = await supabase
      .from('user_permissions')
      .select('role')
      .eq('user_id', id)
      .single();

    const isSuperAdmin = currentPerms?.role === 'super_admin';

    // SUPER ADMIN LOCKOUT PROTECTION
    if (isSuperAdmin) {
      return NextResponse.json(
        { error: "Aksi Ditolak: Akun Super Admin tidak boleh dihapus dari sistem." },
        { status: 403 }
      );
    }

    // Deleting from auth.users will cascade delete from user_permissions
    const { error } = await supabase.auth.admin.deleteUser(id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 500 });
    }
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}
