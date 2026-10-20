import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">cAm Logistics</h1>
        <p className="mt-3 text-base text-slate-600">
          Silakan masuk untuk melanjutkan ke dashboard.
        </p>
      </div>
    </main>
  );
}
