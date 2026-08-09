"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Store, Mail, Lock, User, MapPin, Loader2, CheckCircle2 } from "lucide-react";

type Mode = "login" | "signup" | "check-email";

// Set right before redirecting to the dashboard after a real sign-in.
// FatherWelcome.tsx consumes (reads + clears) this flag once, so the
// welcome overlay only ever appears right after an actual login — never
// on a plain page reload of an already-open dashboard tab.
const JUST_LOGGED_IN_KEY = "shopkhata_just_logged_in";
function markJustLoggedIn() {
  try {
    sessionStorage.setItem(JUST_LOGGED_IN_KEY, "1");
  } catch {
    // storage unavailable — harmless, the welcome overlay just won't show
  }
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [fullName, setFullName] = useState("");
  const [shopName, setShopName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    router.prefetch("/dashboard");
  }, [router]);

  function switchMode(next: "login" | "signup") {
    setMode(next);
    setError("");
  }

  async function handleLogin() {
    setError("");
    if (!email.includes("@")) return setError("Enter a valid email address.");
    if (!password) return setError("Enter your password.");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      if (error.message.toLowerCase().includes("invalid login")) {
        return setError("Incorrect email or password. Please try again.");
      }
      return setError(error.message);
    }
    markJustLoggedIn();
    router.push("/dashboard");
    router.refresh();
  }

  async function handleSignup() {
    setError("");
    if (!fullName.trim() || !shopName.trim()) {
      return setError("Please enter your name and your shop's name.");
    }
    if (!email.includes("@")) return setError("Enter a valid email address.");
    if (password.length < 6) return setError("Password should be at least 6 characters.");

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName.trim(), shop_name: shopName.trim() } },
    });
    setLoading(false);

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("already registered") || msg.includes("already exists") || msg.includes("user already")) {
        setError("This email is already registered.");
        return;
      }
      return setError(error.message);
    }

    if (data?.user && data.user.identities && data.user.identities.length === 0) {
      setError("This email is already registered.");
      return;
    }

    if (data.session) {
      markJustLoggedIn();
      router.push("/dashboard");
      router.refresh();
    } else {
      setMode("check-email");
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background px-4 relative overflow-hidden">
      <div
        className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-60 blur-3xl"
        style={{ background: "radial-gradient(closest-side, var(--primary-soft), transparent)" }}
      />
      <div
        className="pointer-events-none absolute bottom-0 right-0 w-[420px] h-[420px] rounded-full opacity-50 blur-3xl"
        style={{ background: "radial-gradient(closest-side, var(--gold-soft), transparent)" }}
      />

      <div className="w-full max-w-sm relative animate-fade-in">
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
            <Store size={22} color="white" strokeWidth={2.25} />
          </div>
          <span className="font-display font-bold text-[20px] tracking-tight">Shop Khata</span>
        </div>

        {mode !== "check-email" && (
          <div className="flex rounded-full border border-border bg-surface p-1 mb-5">
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`flex-1 text-[13.5px] font-semibold py-2.5 rounded-full transition-colors ${
                  mode === m ? "bg-primary text-white shadow-sm" : "text-ink-soft"
                }`}
              >
                {m === "login" ? "Log in" : "Create account"}
              </button>
            ))}
          </div>
        )}

        <div className="card p-6">
          {mode === "check-email" ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-success-soft flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={24} className="text-success" />
              </div>
              <h1 className="text-base font-display font-semibold mb-1.5">Check your email</h1>
              <p className="text-sm text-ink-soft leading-relaxed">
                We sent a confirmation link to <span className="text-ink font-medium">{email}</span>.
                Open it, then come back and log in.
              </p>
              <button
                onClick={() => switchMode("login")}
                className="text-primary text-sm font-semibold mt-5"
              >
                Back to log in
              </button>
            </div>
          ) : mode === "login" ? (
            <>
              <h1 className="text-base font-display font-semibold mb-1">Welcome back</h1>
              <p className="text-sm text-ink-soft mb-5">Log in to your shop&apos;s account.</p>

              <label className="label block mb-1.5">Email</label>
              <div className="relative mb-4">
                <Mail size={20} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft pointer-events-none" />
                <input
                  className="input h-12 pl-11"
                  placeholder="you@example.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
              </div>

              <label className="label block mb-1.5">Password</label>
              <div className="relative mb-5">
                <Lock size={20} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft pointer-events-none" />
                <input
                  className="input h-12 pl-11"
                  placeholder="Your password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
              </div>

              {error && (
                <p className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2 mb-4">{error}</p>
              )}

              <button
                className="btn-primary w-full flex items-center justify-center gap-2"
                onClick={handleLogin}
                disabled={loading}
              >
                {loading && <Loader2 size={15} className="animate-spin" />}
                {loading ? "Logging in…" : "Log in"}
              </button>
            </>
          ) : (
            <>
              <h1 className="text-base font-display font-semibold mb-1">Create your shop&apos;s account</h1>
              <p className="text-sm text-ink-soft mb-5">Takes about 30 seconds. One account per email.</p>

              <label className="label block mb-1.5">Your name</label>
              <div className="relative mb-4">
                <User size={20} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft pointer-events-none" />
                <input
                  className="input h-12 pl-11"
                  placeholder="e.g. Ahmed Khan"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <label className="label block mb-1.5">Shop name</label>
              <div className="relative mb-4">
                <MapPin size={20} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft pointer-events-none" />
                <input
                  className="input h-12 pl-11"
                  placeholder="e.g. Al-Khair General Store"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                />
              </div>

              <label className="label block mb-1.5">Email</label>
              <div className="relative mb-4">
                <Mail size={20} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft pointer-events-none" />
                <input
                  className="input h-12 pl-11"
                  placeholder="you@example.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <label className="label block mb-1.5">Password</label>
              <div className="relative mb-5">
                <Lock size={20} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft pointer-events-none" />
                <input
                  className="input h-12 pl-11"
                  placeholder="At least 6 characters"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {error && (
                <div className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2 mb-4">
                  {error}
                  {error.includes("already registered") && (
                    <>
                      {" "}
                      <button className="font-semibold underline" onClick={() => switchMode("login")}>
                        Log in instead
                      </button>
                    </>
                  )}
                </div>
              )}

              <button
                className="btn-primary w-full flex items-center justify-center gap-2"
                onClick={handleSignup}
                disabled={loading}
              >
                {loading && <Loader2 size={15} className="animate-spin" />}
                {loading ? "Creating account…" : "Create account"}
              </button>
            </>
          )}
        </div>

        <p className="text-center text-[12px] text-ink-soft mt-6">
          Private to your shop alone — no one else can ever see your data.
        </p>
      </div>
    </div>
  );
}