"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { AlertTriangle, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

// =========================================================
// Login dedicado del panel superadmin.
// - Branding neutro (no muestra el tenant activo)
// - Dark mode + acento verde neón
// - Si ya hay sesión, salta directo al dashboard
// - Manda al usuario a /superadmin/dashboard tras autenticar
// =========================================================

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const { firebaseUser, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  // Si el user ya está logueado, no tiene sentido quedarse acá.
  useEffect(() => {
    if (!authLoading && firebaseUser) {
      router.replace("/superadmin/dashboard");
    }
  }, [authLoading, firebaseUser, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setBusy(true);
    setErr(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace("/superadmin/dashboard");
    } catch (e) {
      const code = (e as { code?: string })?.code;
      setErr(mensajeError(code));
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    if (!email.trim()) {
      setErr("Escribe tu correo primero para enviarte el link.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setResetSent(true);
    } catch (e) {
      const code = (e as { code?: string })?.code;
      setErr(mensajeError(code));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-slate-950 px-4 py-10 text-slate-100">
      {/* Aura de fondo — glow verde sutil */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 bottom-1/4 h-96 w-96 rounded-full bg-lime-500/10 blur-3xl"
      />

      <div className="relative w-full max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Brand del panel */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-lime-400 text-2xl font-black text-slate-950 shadow-lg shadow-emerald-500/25">
            Σ
          </span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-300">
              Panel General
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white">
              Acceso al panel
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              Ingresa con tu cuenta de administrador.
            </p>
          </div>
        </div>

        {resetSent ? (
          <div className="rounded-3xl border border-emerald-400/25 bg-emerald-400/[0.06] p-5 text-center">
            <ShieldCheck className="mx-auto h-8 w-8 text-emerald-300" />
            <p className="mt-3 text-sm font-semibold text-white">
              Te enviamos un link
            </p>
            <p className="mt-1 text-xs text-slate-300">
              Revisa {email.trim()} para restablecer tu contraseña.
            </p>
            <button
              type="button"
              onClick={() => setResetSent(false)}
              className="mt-4 text-xs font-semibold text-emerald-300 hover:text-emerald-200"
            >
              Volver al login
            </button>
          </div>
        ) : (
          <form
            onSubmit={submit}
            className="space-y-3 rounded-3xl border border-white/[0.08] bg-white/[0.02] p-5 shadow-2xl shadow-black/40 backdrop-blur-xl"
          >
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-widest text-slate-400">
                Correo
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 transition-colors focus-within:border-emerald-400/60 focus-within:ring-1 focus-within:ring-emerald-400/30">
                <Mail className="h-4 w-4 shrink-0 text-slate-500" />
                <input
                  autoFocus
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="tu@correo.cl"
                  className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-widest text-slate-400">
                Contraseña
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 transition-colors focus-within:border-emerald-400/60 focus-within:ring-1 focus-within:ring-emerald-400/30">
                <Lock className="h-4 w-4 shrink-0 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
                />
              </div>
            </div>

            {err && (
              <div className="flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{err}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={busy || !email.trim() || !password}
              className={cn(
                "mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-emerald-400 to-lime-400 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/25 transition-all duration-200 hover:from-emerald-300 hover:to-lime-300 hover:shadow-emerald-500/40 active:scale-[0.98] disabled:opacity-60"
              )}
            >
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {busy ? "Entrando…" : "Entrar al panel"}
            </button>

            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={resetPassword}
                disabled={busy}
                className="text-[11px] text-slate-400 transition-colors hover:text-emerald-300 disabled:opacity-50"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          </form>
        )}

        <p className="mt-6 text-center text-[11px] text-slate-500">
          ¿Cliente de la plataforma?{" "}
          <Link
            href="/"
            className="font-semibold text-slate-400 hover:text-emerald-300"
          >
            Volver al inicio
          </Link>
        </p>
      </div>
    </div>
  );
}

function mensajeError(code: string | undefined): string {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Correo o contraseña incorrectos.";
    case "auth/invalid-email":
      return "El correo no es válido.";
    case "auth/too-many-requests":
      return "Muchos intentos. Espera un rato y vuelve a probar.";
    case "auth/network-request-failed":
      return "Error de red. Revisa tu conexión.";
    case "auth/user-disabled":
      return "Esta cuenta está deshabilitada.";
    default:
      return "No pudimos iniciar sesión. Vuelve a probar.";
  }
}
