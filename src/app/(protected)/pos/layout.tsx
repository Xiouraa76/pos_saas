import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export default async function PosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: permissions } = await supabase
    .from('user_permissions')
    .select('can_access_pos')
    .eq('user_id', user.id)
    .single();

  if (!permissions || !permissions.can_access_pos) {
    redirect('/unauthorized');
  }

  return <>{children}</>;
}
