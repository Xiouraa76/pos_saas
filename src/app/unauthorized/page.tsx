"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ShieldAlert, LogOut } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export default function UnauthorizedPage() {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center max-w-md w-full">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Akses Ditolak</h1>
        <p className="text-slate-600 mb-6">
          Anda tidak memiliki hak akses (permission) untuk membuka halaman ini. Silakan hubungi Administrator.
        </p>
        <div className="space-y-3">
          <Button onClick={() => router.back()} className="w-full">
            Kembali
          </Button>
          <Button variant="outline" onClick={handleSignOut} className="w-full text-red-600 hover:text-red-700 hover:bg-red-50">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
