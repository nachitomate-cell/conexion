"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CircleDashed,
  Code,
  Copy,
  Handshake,
  Loader2,
  Mail,
  Plus,
  UserPlus,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import type { TeamMember, TeamRole } from "@/types";

// =========================================================
// Avatar helpers — mismos que Tareas (iniciales + color determinístico)
// =========================================================

const PALETTE: { bg: string; text: string; ring: string }[] = [
  { bg: "bg-sky-500/15", text: "text-sky-200", ring: "ring-sky-400/30" },
  { bg: "bg-emerald-500/15", text: "text-emerald-200", ring: "ring-emerald-400/30" },
  { bg: "bg-amber-500/15", text: "text-amber-200", ring: "ring-amber-400/30" },
  { bg: "bg-fuchsia-500/15", text: "text-fuchsia-200", ring: "ring-fuchsia-400/30" },
  { bg: "bg-indigo-500/15", text: "text-indigo-200", ring: "ring-indigo-400/30" },
  { bg: "bg-rose-500/15", text: "text-rose-200", ring: "ring-rose-400/30" },
  { bg: "bg-teal-500/15", text: "text-teal-200", ring: "ring-teal-400/30" },
  { bg: "bg-orange-500/15", text: "text-orange-200", ring: "ring-orange-400/30" },
  { bg: "bg-violet-500/15", text: "text-violet-200", ring: "ring-violet-400/30" },
  { bg: "bg-lime-500/15", text: "text-lime-200", ring: "ring-lime-400/30" },
];

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function initialsOf(name: string): string {
  const n = name.trim();
  if (!n) return "?";
  const base = n.includes("@") ? n.split("@")[0] : n;
  const parts = base.replace(/[._-]+/g, " ").split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// =========================================================
// Metadata visual de cada rol
// =========================================================

const ROLE_META: Record<
  TeamRole,
  { label: string; icon: typeof Handshake; badge: string }
> = {
  socio: {
    label: "Socio Comercial",
    icon: Handshake,
    badge:
      "bg-emerald-400/10 text-emerald-200 ring-emerald-400/30",
  },
  desarrollador: {
    label: "Desarrollador",
    icon: Code,
    badge: "bg-indigo-400/10 text-indigo-200 ring-indigo-400/30",
  },
};

// =========================================================
// Tarjeta de miembro
// =========================================================

function MemberCard({
  member,
  isMe,
}: {
  member: TeamMember;
  isMe: boolean;
}) {
  const meta = ROLE_META[member.teamRole];
  const RoleIcon = meta.icon;
  const p = PALETTE[hashSeed(member.email) % PALETTE.length];
  return (
    <article className="group flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 shadow-lg shadow-black/20 backdrop-blur-xl transition-all duration-300 hover:border-white/[0.1] sm:p-4">
      <span
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-semibold ring-1",
          p.bg,
          p.text,
          p.ring
        )}
      >
        {initialsOf(member.nombre || member.email)}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <p className="truncate text-sm font-semibold text-white">
            {member.nombre || member.email}
          </p>
          {isMe && (
            <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-semibold text-slate-300">
              tú
            </span>
          )}
        </div>
        <p className="truncate text-[11px] text-slate-400">{member.email}</p>
      </div>

      <span
        className={cn(
          "flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1",
          meta.badge
        )}
      >
        <RoleIcon className="h-3 w-3" strokeWidth={2.5} />
        {meta.label}
      </span>
    </article>
  );
}

// =========================================================
// Modal de invitación
// =========================================================

function InviteModal({
  open,
  onClose,
  onInvited,
}: {
  open: boolean;
  onClose: () => void;
  onInvited: () => void;
}) {
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [teamRole, setTeamRole] = useState<TeamRole>("socio");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (!open) {
      setEmail("");
      setNombre("");
      setTeamRole("socio");
      setErr(null);
      setResetLink(null);
      setLinkCopied(false);
    }
  }, [open]);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken ?? ""}`,
        },
        body: JSON.stringify({
          email: email.trim(),
          nombre: nombre.trim() || null,
          teamRole,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        resetLink?: string | null;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
      setResetLink(json.resetLink ?? null);
      onInvited();
      // Si no hay reset link, cerramos el modal directo.
      if (!json.resetLink) onClose();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    if (!resetLink) return;
    try {
      await navigator.clipboard.writeText(resetLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1800);
    } catch {
      setLinkCopied(false);
    }
  };

  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      />
      <div
        role="dialog"
        aria-label="Invitar al equipo"
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border border-b-0 border-white/10 bg-slate-950 p-5 pb-8 shadow-2xl shadow-black/60 animate-in slide-in-from-bottom-6 duration-300",
          "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[calc(100%-2rem)] sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:border sm:p-6"
        )}
      >
        <div
          aria-hidden
          className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/15 sm:hidden"
        />
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <UserPlus className="h-5 w-5 text-emerald-300" strokeWidth={2.25} />
              Invitar al Equipo
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              La persona invitada podrá entrar al panel con este correo.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {resetLink ? (
          // Estado post-invitación exitosa — mostramos el link de reseteo para
          // que el invitador se lo comparta al invitado por WhatsApp/email.
          <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.06] p-4">
              <p className="text-sm font-semibold text-emerald-200">
                ¡Invitación creada!
              </p>
              <p className="mt-1 text-xs text-slate-300">
                Comparte este link con la persona para que ponga su contraseña
                y entre al panel.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-2">
              <p className="min-w-0 flex-1 truncate font-mono text-[11px] text-slate-300">
                {resetLink}
              </p>
              <button
                type="button"
                onClick={copyLink}
                className={cn(
                  "shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-all duration-200 active:scale-[0.98]",
                  linkCopied
                    ? "bg-emerald-400/20 text-emerald-200"
                    : "bg-white/[0.06] text-slate-200 hover:bg-white/[0.1]"
                )}
              >
                <span className="flex items-center gap-1">
                  <Copy className="h-3 w-3" strokeWidth={2.5} />
                  {linkCopied ? "Copiado" : "Copiar"}
                </span>
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl bg-gradient-to-br from-emerald-400 to-lime-400 py-2.5 text-sm font-semibold text-slate-950 shadow-md shadow-emerald-500/25 transition-all duration-200 hover:from-emerald-300 hover:to-lime-300 active:scale-[0.98]"
            >
              Listo
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-widest text-slate-400">
                Correo electrónico
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 transition-colors focus-within:border-emerald-400/60 focus-within:ring-1 focus-within:ring-emerald-400/30">
                <Mail className="h-4 w-4 shrink-0 text-slate-500" />
                <input
                  autoFocus
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="socio@negocio.cl"
                  className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-widest text-slate-400">
                Nombre (opcional)
              </label>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Diego Contreras"
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-emerald-400/60 focus:ring-1 focus:ring-emerald-400/30"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-widest text-slate-400">
                Rol
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(["socio", "desarrollador"] as const).map((r) => {
                  const meta = ROLE_META[r];
                  const RoleIcon = meta.icon;
                  const active = teamRole === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setTeamRole(r)}
                      className={cn(
                        "flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all duration-200",
                        active
                          ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-200"
                          : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20"
                      )}
                    >
                      <RoleIcon className="h-3.5 w-3.5" strokeWidth={2.25} />
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {err && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                {err}
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row-reverse">
              <button
                type="submit"
                disabled={busy || !email.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-emerald-400 to-lime-400 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/25 transition-all duration-200 hover:from-emerald-300 hover:to-lime-300 hover:shadow-emerald-500/40 active:scale-[0.98] disabled:opacity-50"
              >
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {busy ? "Invitando…" : "Enviar invitación"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/[0.06]"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}

// =========================================================
// Página principal
// =========================================================

export default function EquipoPage() {
  const { firebaseUser, loading: authLoading } = useAuth();
  const authReady = !authLoading && !!firebaseUser;
  const myEmail = (firebaseUser?.email || "").toLowerCase();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/team/members", {
        headers: { Authorization: `Bearer ${idToken ?? ""}` },
      });
      const json = (await res.json().catch(() => ({}))) as {
        members?: TeamMember[];
        error?: string;
      };
      if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
      setMembers(json.members ?? []);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authReady) return;
    cargar();
  }, [cargar, authReady]);

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-300">
            Equipo
          </p>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
            Miembros del panel
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Socios y desarrolladores con acceso al panel general.
          </p>
        </div>

        {/* Botón principal — visible en desktop; en móvil hay FAB flotante */}
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="hidden shrink-0 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-emerald-400 to-lime-400 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/25 transition-all duration-200 hover:from-emerald-300 hover:to-lime-300 hover:shadow-emerald-500/40 active:scale-[0.98] sm:flex"
        >
          <UserPlus className="h-4 w-4" strokeWidth={2.5} />
          Invitar al Equipo
        </button>
      </header>

      {err && (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-200">
          {err}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Cargando miembros…
        </div>
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
          <CircleDashed className="h-5 w-5 text-slate-500" />
          <p className="text-xs text-slate-400">
            Todavía no hay miembros del equipo.
          </p>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="mt-1 inline-flex items-center gap-1 rounded-lg bg-gradient-to-br from-emerald-400 to-lime-400 px-3 py-1.5 text-[11px] font-semibold text-slate-950 shadow-md shadow-emerald-500/20 transition-all duration-200 active:scale-[0.98]"
          >
            <Plus className="h-3 w-3" strokeWidth={2.75} />
            Invitar al primero
          </button>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {members.map((m) => (
            <li key={m.uid}>
              <MemberCard member={m} isMe={m.email === myEmail} />
            </li>
          ))}
        </ul>
      )}

      {/* FAB móvil */}
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        aria-label="Invitar al equipo"
        className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-lime-400 text-slate-950 shadow-2xl shadow-emerald-500/40 transition-all duration-200 hover:scale-105 hover:shadow-emerald-500/60 active:scale-95 sm:hidden"
      >
        <UserPlus className="h-6 w-6" strokeWidth={2.5} />
      </button>

      <InviteModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onInvited={cargar}
      />
    </div>
  );
}
