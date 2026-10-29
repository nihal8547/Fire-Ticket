"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Flame, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", { email, password, redirect: false });

    if (result?.error) {
      setError("Invalid email or password. Please try again.");
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 sm:p-6"
      style={{
        background: "linear-gradient(135deg, hsl(222 47% 9%) 0%, hsl(0 40% 14%) 50%, hsl(222 47% 9%) 100%)",
      }}
    >
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, hsl(0 72% 51%) 0%, transparent 70%)" }}
        />
      </div>

      <div className="relative w-full max-w-[420px] animate-in">
        {/* Logo */}
        <div className="text-center mb-6 sm:mb-8">
          <div
            className="inline-flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl mb-3 sm:mb-4 shadow-2xl"
            style={{
              background: "linear-gradient(135deg, hsl(0 80% 55%) 0%, hsl(0 72% 42%) 100%)",
              boxShadow: "0 8px 32px hsl(0 72% 51% / .40)",
            }}
          >
            <Flame className="h-7 w-7 sm:h-8 sm:w-8 text-white drop-shadow" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">FireTicket</h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: "hsl(222 20% 58%)" }}>
            Fire Protection Management System
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-5 sm:p-8"
          style={{
            background: "hsl(0 0% 100%)",
            boxShadow: "0 24px 48px -12px hsl(222 47% 5% / .60)",
          }}
        >
          <div className="mb-5 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-semibold text-tx">Welcome back</h2>
            <p className="text-xs sm:text-sm text-tx-3 mt-0.5">Sign in to your account to continue</p>
          </div>

          {error && (
            <div className="mb-5 flex items-center gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-xs sm:text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="mb-1.5 block text-xs sm:text-sm">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <Label htmlFor="password" className="mb-1.5 block text-xs sm:text-sm">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-tx-3 hover:text-tx-2 transition-colors"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full mt-2"
              disabled={loading}
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          {/* Demo credentials hint */}
          <div
            className="mt-6 rounded-xl p-3.5 text-xs border"
            style={{
              background: "hsl(var(--surface-2))",
              borderColor: "hsl(var(--border))",
              color: "hsl(var(--text-2))",
            }}
          >
            <p className="font-semibold text-tx mb-1">Demo Credentials:</p>
            <div className="space-y-0.5 font-mono text-[11px] text-tx-3">
              <p>Admin: admin@fireticket.com / admin123</p>
              <p>Manager: manager@fireticket.com / manager123</p>
              <p>Technician: tech@fireticket.com / tech123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
