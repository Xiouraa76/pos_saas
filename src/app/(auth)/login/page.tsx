"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Loader2, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message === "Invalid login credentials"
        ? "Email atau password salah. Silakan coba lagi."
        : authError.message
      );
      setIsLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="min-h-screen w-full flex">
      {/* Left Panel: Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-orange-600 via-orange-500 to-amber-500 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-[-120px] left-[-80px] w-[400px] h-[400px] rounded-full bg-white/[0.07]" />
        <div className="absolute bottom-[-60px] right-[-100px] w-[500px] h-[500px] rounded-full bg-white/[0.05]" />
        <div className="absolute top-1/2 left-1/2 w-[200px] h-[200px] rounded-full bg-white/[0.04] -translate-x-1/2 -translate-y-1/2" />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-white/20 backdrop-blur-sm text-white flex items-center justify-center shadow-lg border border-white/20">
              <span className="font-mono text-base font-bold tracking-tighter">cA</span>
            </div>
            <span className="text-white text-2xl font-bold tracking-tight">cAm LOGISTICS</span>
          </div>

          {/* Central tagline */}
          <div className="space-y-6">
            <h1 className="text-5xl font-bold text-white leading-tight">
              Command<br />Center
            </h1>
            <p className="text-white/80 text-lg max-w-md leading-relaxed">
              Platform manajemen pengiriman terpadu untuk memantau, melacak, dan mengoptimalkan seluruh operasi logistik Anda.
            </p>
            <div className="flex items-center gap-6 text-white/60 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Sistem Aktif
              </div>
              <div>v1.0 MVP</div>
            </div>
          </div>

          {/* Footer */}
          <p className="text-white/40 text-xs">
            &copy; {new Date().getFullYear()} cAm LOGISTICS. Internal Use Only.
          </p>
        </div>
      </div>

      {/* Right Panel: Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 justify-center mb-4">
            <div className="w-10 h-10 rounded-lg bg-orange-600 text-white flex items-center justify-center shadow-md">
              <span className="font-mono text-sm font-bold tracking-tighter">cA</span>
            </div>
            <span className="text-slate-800 text-xl font-bold tracking-tight">cAm LOGISTICS</span>
          </div>

          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Masuk ke Akun Anda</h2>
            <p className="text-sm text-slate-500">
              Gunakan kredensial yang diberikan oleh administrator.
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm animate-in slide-in-from-top-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="operator@cam-logistics.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="h-11 bg-white border-slate-200 focus-visible:ring-orange-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="h-11 bg-white border-slate-200 focus-visible:ring-orange-500"
              />
            </div>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-orange-600 hover:bg-orange-700 text-white font-medium shadow-sm transition-all duration-200"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="mr-2 h-4 w-4" />
              )}
              {isLoading ? "Memverifikasi..." : "Masuk"}
            </Button>
          </form>

          <p className="text-center text-xs text-slate-400 pt-4">
            Hanya untuk staf internal cAm LOGISTICS.<br />
            Hubungi administrator jika Anda belum memiliki akun.
          </p>
        </div>
      </div>
    </div>
  );
}
