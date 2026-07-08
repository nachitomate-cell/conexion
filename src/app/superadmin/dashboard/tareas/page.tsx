"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  CircleDashed,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { TaskPushToggle } from "@/components/TaskPushToggle";
import type { Task } from "@/types";
import type { AdminRow } from "@/app/api/superadmin/admins/route";

// =========================================================
// Avatar helpers — iniciales + color pastel determinístico por identidad
// =========================================================

// Paleta suave estilo iOS/macOS — diez tonos para tener buena distribución.
const AVATAR_PALETTE: { bg: string; text: string; ring: string }[] = [
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

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function paletteFor(seed: string) {
  return AVATAR_PALETTE[hashString(seed) % AVATAR_PALETTE.length];
}

/**
 * Devuelve el nombre para mostrar del asignado:
 *   1. Nombre actual del admin (por si lo cambió en su perfil)
 *   2. Nombre snapshotado al crear la tarea
 *   3. Email (fallback)
 */
function resolveAssigneeName(
  task: Task,
  adminByEmail: Map<string, AdminRow>
): string {
  return (
    adminByEmail.get(task.assignedTo)?.nombre ||
    task.assignedToName ||
    task.assignedTo
  );
}

function initialsFor(name: string): string {
  const n = name.trim();
  if (!n) return "?";
  // Si es un email, usa la parte antes del @.
  const base = n.includes("@") ? n.split("@")[0] : n;
  const parts = base
    .replace(/[._-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function Avatar({
  name,
  seed,
  size = "sm",
  title,
}: {
  name: string;
  /** Semilla del color — normalmente el email (estable) en vez del nombre. */
  seed: string;
  size?: "sm" | "md";
  title?: string;
}) {
  const p = paletteFor(seed || name);
  return (
    <span
      title={title}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold ring-1 transition-all duration-200",
        p.bg,
        p.text,
        p.ring,
        size === "sm" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs"
      )}
    >
      {initialsFor(name)}
    </span>
  );
}

// =========================================================
// Utilidades
// =========================================================

function fmtRelativo(ms: number | null): string {
  if (!ms) return "";
  const diff = Date.now() - ms;
  const abs = Math.abs(diff);
  const min = Math.floor(abs / 60000);
  if (min < 1) return "recién";
  if (min < 60) return `hace ${min} min`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  const dias = Math.floor(hrs / 24);
  return `hace ${dias} ${dias === 1 ? "día" : "días"}`;
}

function fmtDueDate(ms: number | null): string | null {
  if (!ms) return null;
  const d = new Date(ms);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const objetivo = new Date(ms);
  objetivo.setHours(0, 0, 0, 0);
  const diffDias = Math.round(
    (objetivo.getTime() - hoy.getTime()) / (24 * 60 * 60 * 1000)
  );
  if (diffDias === 0) return "hoy";
  if (diffDias === 1) return "mañana";
  if (diffDias === -1) return "ayer";
  if (diffDias > 0 && diffDias < 7) return `en ${diffDias} días`;
  if (diffDias < 0) return `hace ${-diffDias} días`;
  return d.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
  });
}

// =========================================================
// Tarjeta de tarea
// =========================================================

function TaskCard({
  task,
  assigneeName,
  onToggle,
  onDelete,
}: {
  task: Task;
  /** Nombre resuelto del asignado (viene del índice de admins). Fallback a los campos de la task. */
  assigneeName: string;
  onToggle: (id: string, next: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const due = fmtDueDate(task.dueDate);
  const overdue =
    !task.isCompleted && task.dueDate !== null && task.dueDate < Date.now();
  return (
    <article
      className={cn(
        "group flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 shadow-lg shadow-black/20 backdrop-blur-xl transition-all duration-300 hover:border-white/[0.1]",
        task.isCompleted && "opacity-60"
      )}
    >
      <button
        type="button"
        onClick={() => onToggle(task.id, !task.isCompleted)}
        aria-label={
          task.isCompleted ? "Marcar como pendiente" : "Marcar como completada"
        }
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 active:scale-90",
          task.isCompleted
            ? "border-emerald-400 bg-gradient-to-br from-emerald-400 to-lime-400 text-slate-950 shadow-md shadow-emerald-500/30"
            : "border-white/25 bg-white/[0.03] hover:border-emerald-400/70"
        )}
      >
        {task.isCompleted && <Check className="h-4 w-4" strokeWidth={3.5} />}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <p
            className={cn(
              "min-w-0 flex-1 text-sm font-semibold text-white",
              task.isCompleted && "line-through decoration-emerald-400/60"
            )}
          >
            {task.title}
          </p>
          <Avatar
            name={assigneeName}
            seed={task.assignedTo}
            title={`Asignada a ${assigneeName}`}
          />
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
          <span className="truncate font-medium text-slate-300">
            {assigneeName}
          </span>
          {due && (
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                overdue
                  ? "bg-rose-500/15 text-rose-300"
                  : "bg-white/[0.05] text-slate-300"
              )}
            >
              {due}
            </span>
          )}
          {task.createdAt > 0 && (
            <span className="text-slate-500">· {fmtRelativo(task.createdAt)}</span>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          if (confirm("¿Eliminar esta tarea?")) onDelete(task.id);
        }}
        aria-label="Eliminar tarea"
        className="rounded-lg p-1.5 text-slate-500 opacity-0 transition-all duration-200 hover:bg-white/[0.06] hover:text-rose-300 group-hover:opacity-100 active:scale-95"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </article>
  );
}

// =========================================================
// Modal: nueva tarea (bottom sheet en móvil, dialog en desktop)
// =========================================================

function NewTaskModal({
  open,
  onClose,
  onCreated,
  currentEmail,
  admins,
  loadingAdmins,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  currentEmail: string;
  admins: AdminRow[];
  loadingAdmins: boolean;
}) {
  const [title, setTitle] = useState("");
  const [assignedTo, setAssignedTo] = useState<string>(currentEmail);
  const [dueDate, setDueDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Al abrir: auto-selecciona al usuario actual. Al cerrar: reset.
  useEffect(() => {
    if (open) {
      setAssignedTo(currentEmail);
    } else {
      setTitle("");
      setDueDate("");
      setErr(null);
    }
  }, [open, currentEmail]);

  if (!open) return null;

  const selected = admins.find((a) => a.email === assignedTo);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const target = assignedTo.trim().toLowerCase();
    if (!target) {
      setErr("Elige a quién asignar la tarea.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/superadmin/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken ?? ""}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          assignedTo: target,
          assignedToName: selected?.nombre ?? null,
          dueDate: dueDate ? new Date(dueDate).getTime() : null,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
      onCreated();
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
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
        aria-label="Nueva tarea"
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
            <h2 className="text-lg font-bold text-white">Nueva tarea</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Rápido y al grano — puedes editar el detalle después.
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

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-widest text-slate-400">
              ¿Qué hay que hacer?
            </label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
              placeholder="Ej. Reunión con Café Unión"
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-emerald-400/60 focus:ring-1 focus:ring-emerald-400/30"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-widest text-slate-400">
              Asignar a…
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 transition-colors focus-within:border-emerald-400/60 focus-within:ring-1 focus-within:ring-emerald-400/30">
              <Avatar
                name={selected?.nombre || assignedTo}
                seed={assignedTo}
                size="sm"
              />
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                disabled={loadingAdmins}
                className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none disabled:cursor-not-allowed"
              >
                {loadingAdmins && (
                  <option value={currentEmail} className="bg-slate-950">
                    Cargando equipo…
                  </option>
                )}
                {/* Si el usuario actual no está en la lista de admins (edge),
                    igual dejamos una opción para asignarse a sí mismo. */}
                {!loadingAdmins &&
                  !admins.some((a) => a.email === currentEmail) &&
                  currentEmail && (
                    <option value={currentEmail} className="bg-slate-950">
                      Yo ({currentEmail})
                    </option>
                  )}
                {admins.map((a) => (
                  <option key={a.uid} value={a.email} className="bg-slate-950">
                    {a.nombre}
                    {a.email === currentEmail ? " (yo)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[11px] text-slate-500">
              Por defecto queda asignada a ti — elige otro miembro si es para el equipo.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-widest text-slate-400">
              Fecha objetivo (opcional)
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-emerald-400/60 focus:ring-1 focus:ring-emerald-400/30"
            />
          </div>

          {err && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
              {err}
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <button
              type="submit"
              disabled={busy || !title.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-emerald-400 to-lime-400 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/25 transition-all duration-200 hover:from-emerald-300 hover:to-lime-300 hover:shadow-emerald-500/40 active:scale-[0.98] disabled:opacity-50"
            >
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {busy ? "Guardando…" : "Crear tarea"}
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
      </div>
    </>
  );
}

// =========================================================
// Página principal
// =========================================================

type TabId = "mias" | "equipo";

export default function TareasPage() {
  const { firebaseUser, loading: authLoading } = useAuth();
  const currentEmail = (firebaseUser?.email || "").toLowerCase();
  const authReady = !authLoading && !!firebaseUser;
  const [tab, setTab] = useState<TabId>("mias");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/superadmin/tasks", {
        headers: { Authorization: `Bearer ${idToken ?? ""}` },
      });
      const json = (await res.json().catch(() => ({}))) as {
        tasks?: Task[];
        error?: string;
      };
      if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
      setTasks(json.tasks ?? []);
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

  // Carga la lista de admins/socios una sola vez tras autenticar.
  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;
    (async () => {
      try {
        const idToken = await auth.currentUser?.getIdToken();
        const res = await fetch("/api/superadmin/admins", {
          headers: { Authorization: `Bearer ${idToken ?? ""}` },
        });
        const json = (await res.json().catch(() => ({}))) as {
          admins?: AdminRow[];
          error?: string;
        };
        if (!cancelled) {
          setAdmins(res.ok ? json.admins ?? [] : []);
          setLoadingAdmins(false);
        }
      } catch {
        if (!cancelled) {
          setAdmins([]);
          setLoadingAdmins(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authReady]);

  // Índice por email para resolver el nombre del asignado en las cards rápido.
  const adminByEmail = useMemo(() => {
    const m = new Map<string, AdminRow>();
    for (const a of admins) m.set(a.email, a);
    return m;
  }, [admins]);

  const { mias, equipo } = useMemo(() => {
    const m: Task[] = [];
    const e: Task[] = [];
    for (const t of tasks) {
      if (currentEmail && t.assignedTo === currentEmail) m.push(t);
      else e.push(t);
    }
    return { mias: m, equipo: e };
  }, [tasks, currentEmail]);

  const active = tab === "mias" ? mias : equipo;
  const pendientes = active.filter((t) => !t.isCompleted);
  const completadas = active.filter((t) => t.isCompleted);

  const toggle = useCallback(
    async (id: string, next: boolean) => {
      const prev = tasks;
      setTasks((ts) =>
        ts.map((t) => (t.id === id ? { ...t, isCompleted: next } : t))
      );
      try {
        const idToken = await auth.currentUser?.getIdToken();
        const res = await fetch(`/api/superadmin/tasks/${id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken ?? ""}`,
          },
          body: JSON.stringify({ isCompleted: next }),
        });
        if (!res.ok) throw new Error(`Error ${res.status}`);
      } catch (e) {
        setTasks(prev);
        setErr((e as Error).message);
      }
    },
    [tasks]
  );

  const del = useCallback(
    async (id: string) => {
      const prev = tasks;
      setTasks((ts) => ts.filter((t) => t.id !== id));
      try {
        const idToken = await auth.currentUser?.getIdToken();
        const res = await fetch(`/api/superadmin/tasks/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${idToken ?? ""}` },
        });
        if (!res.ok) throw new Error(`Error ${res.status}`);
      } catch (e) {
        setTasks(prev);
        setErr((e as Error).message);
      }
    },
    [tasks]
  );

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-300">
          Pendientes
        </p>
        <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
          Tareas Compartidas
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Deja pendientes a tu socio y recibe un recordatorio cada mañana.
        </p>
      </header>

      <TaskPushToggle />

      {/* Tabs — segmented control estilo iOS */}
      <div
        role="tablist"
        className="flex gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-1 backdrop-blur-xl"
      >
        {(
          [
            { id: "mias" as const, label: "Mis tareas", count: mias.length },
            {
              id: "equipo" as const,
              label: "Tareas del Equipo",
              count: equipo.length,
            },
          ] satisfies { id: TabId; label: string; count: number }[]
        ).map((t) => {
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-semibold transition-all duration-300",
                isActive
                  ? "bg-white/10 text-white shadow-md shadow-black/30"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <span className="truncate">{t.label}</span>
              <span
                className={cn(
                  "min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                  isActive
                    ? "bg-emerald-400/20 text-emerald-200"
                    : "bg-white/[0.06] text-slate-400"
                )}
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {err && (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-200">
          {err}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Cargando tareas…
        </div>
      ) : (
        <div key={tab} className="space-y-6 animate-in fade-in duration-300">
          <section>
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              Por hacer ({pendientes.length})
            </h2>
            {pendientes.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
                <CircleDashed className="h-5 w-5 text-slate-500" />
                <p className="text-xs text-slate-400">
                  {tab === "mias"
                    ? "No tienes pendientes. 🎉"
                    : "El equipo no tiene pendientes."}
                </p>
              </div>
            ) : (
              <ul className="space-y-2.5">
                {pendientes.map((t) => (
                  <li key={t.id}>
                    <TaskCard
                      task={t}
                      assigneeName={resolveAssigneeName(t, adminByEmail)}
                      onToggle={toggle}
                      onDelete={del}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {completadas.length > 0 && (
            <section>
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                Completadas ({completadas.length})
              </h2>
              <ul className="space-y-2.5">
                {completadas.map((t) => (
                  <li key={t.id}>
                    <TaskCard
                      task={t}
                      assigneeName={resolveAssigneeName(t, adminByEmail)}
                      onToggle={toggle}
                      onDelete={del}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {/* FAB Nueva tarea — flotante encima del bottom nav */}
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        aria-label="Nueva tarea"
        className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-lime-400 text-slate-950 shadow-2xl shadow-emerald-500/40 transition-all duration-200 hover:scale-105 hover:shadow-emerald-500/60 active:scale-95 lg:bottom-8 lg:right-8"
      >
        <Plus className="h-6 w-6" strokeWidth={3} />
      </button>

      <NewTaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={cargar}
        currentEmail={currentEmail}
        admins={admins}
        loadingAdmins={loadingAdmins}
      />
    </div>
  );
}
