"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "magic">("login");
  const [magicSent, setMagicSent] = useState(false);
  const searchParams = useSearchParams();

  // Show session expired message
  useEffect(() => {
    if (searchParams.get("session_expired") === "1") {
      setInfo("Your session has expired. Please sign in again.");
    }
  }, [searchParams]);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "magic") {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        setMagicSent(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        window.location.href = "/";
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  if (magicSent) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="text-4xl mb-4">📧</div>
          <h2 className="text-xl font-bold text-white mb-2">Check your email</h2>
          <p className="text-grey text-sm">
            We sent a magic link to <span className="text-gold">{email}</span>.
            Click it to sign in.
          </p>
          <button
            onClick={() => { setMagicSent(false); setMode("login"); }}
            className="mt-6 text-sm text-dark-5 hover:text-gold transition-colors"
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-10">
          <Image
            src="/embedia-logo.png"
            alt="Embedia.io"
            width={180}
            height={180}
            className="mx-auto mb-3"
            priority
          />
          <p className="text-grey text-sm">CEO War Room Cockpit</p>
        </div>

        {/* Login Card */}
        <div className="bg-dark-2 rounded-xl border border-dark-4 p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-[1.5px] text-dark-5 block mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-dark-3 border border-dark-4 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-dark-5 focus:border-gold outline-none transition-colors"
                placeholder="safouen@embedia.io"
              />
            </div>

            {mode === "login" && (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[1.5px] text-dark-5 block mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-dark-3 border border-dark-4 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-dark-5 focus:border-gold outline-none transition-colors"
                  placeholder="Enter password"
                />
              </div>
            )}

            {info && (
              <div className="text-gold text-xs bg-gold/10 border border-gold/20 rounded-lg px-3 py-2">
                {info}
              </div>
            )}

            {error && (
              <div className="text-status-red text-xs bg-status-red/10 border border-status-red/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gold text-dark font-bold py-2.5 rounded-lg hover:bg-gold-deep transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {loading ? "Signing in..." : mode === "magic" ? "Send Magic Link" : "Sign In"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => setMode(mode === "login" ? "magic" : "login")}
              className="text-xs text-dark-5 hover:text-gold transition-colors"
            >
              {mode === "login" ? "Use magic link instead" : "Use password instead"}
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-dark-5 mt-6">
          Authorised personnel only. Access is logged.
        </p>
      </div>
    </div>
  );
}
