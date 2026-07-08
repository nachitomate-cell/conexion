"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  Check,
  ExternalLink,
  Filter,
  Info,
  Loader2,
  LogIn,
  Palette,
  Pencil,
  Phone,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Wrench,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { VENDORS } from "@/lib/vendors";
import type { VendorStatus } from "@/types";

// =========================================================
// Tipos
// =========================================================

interface TenantRow {
  id: string;
  nombre: string;
  emoji: string;
  slug: string;
  dominio: string | null;
  instagram: string | null;
  status: VendorStatus;
  plan: string;
  entorno: string;
  activo: boolean;
  origen: "registro" | "firestore";
  operativo: boolean;
  mrr: number;
  ownerEmail: string | null;
  nota: string | null;
  clientes: number;
  sellos: number;
  createdAt: string | null;
}

interface OverviewTenant extends TenantRow {
  canjesPendientes?: number;
}

interface EditableFields {
  nombre: string;
  emoji: string;
  slug: string;
  dominio: string;
  instagram: string;
  whatsapp: string;
  status: VendorStatus;
  plan: string;
  entorno: string;
  activo: boolean;
  mrr: number;
  ownerEmail: string;
  nota: string;
  sellosParaPremio: number;
  primaryColor: string;
  clubName: string;
  joinDescription: string;
  emojis: string;
}

const PLAN_OPTIONS = ["starter", "growth", "scale", "enterprise"] as const;
const ENTORNO_OPTIONS = [
  { value: "staging", label: "Prueba" },
  { value: "produccion", label: "Producción" },
] as const;

const STATUS_META: Record<
  VendorStatus,
  { label: string; badge: string; dot: string }
> = {
  propuesta: {
    label: "Propuesta",
    badge: "bg-blue-400/10 text-blue-200 ring-blue-400/30",
    dot: "bg-blue-400",
  },
  por_presentar: {
    label: "Por presentar",
    badge: "bg-orange-400/10 text-orange-200 ring-orange-400/30",
    dot: "bg-orange-400",
  },
  funcionando: {
    label: "Funcionando",
    badge: "bg-emerald-400/10 text-emerald-200 ring-emerald-400/30",
    dot: "bg-emerald-400",
  },
};

const STATUS_FILTER_OPTIONS = [
  { value: "todos", label: "Todas las etapas" },
  { value: "funcionando", label: "Funcionando" },
  { value: "por_presentar", label: "Por presentar" },
  { value: "propuesta", label: "Propuesta" },
] as const;
type StatusFilter = (typeof STATUS_FILTER_OPTIONS)[number]["value"];

// =========================================================
// Defaults desde el registro estático (para campos que `overview` no trae)
// =========================================================

function seedFromStatic(id: string): Partial<EditableFields> {
  const v = VENDORS[id];
  if (!v) return {};
  return {
    whatsapp: v.whatsapp ?? "",
    sellosParaPremio: v.sellosParaPremio,
    primaryColor: v.theme.primaryColor,
    clubName: v.copy.clubName,
    joinDescription: v.copy.joinDescription,
    emojis: v.copy.emojis,
  };
}

function buildInitialForm(t: TenantRow): EditableFields {
  const seed = seedFromStatic(t.id);
  return {
    nombre: t.nombre,
    emoji: t.emoji,
    slug: t.slug,
    dominio: t.dominio ?? "",
    instagram: t.instagram ?? "",
    whatsapp: seed.whatsapp ?? "",
    status: t.status,
    plan: t.plan || "starter",
    entorno: t.entorno || "staging",
    activo: t.activo,
    mrr: t.mrr,
    ownerEmail: t.ownerEmail ?? "",
    nota: t.nota ?? "",
    sellosParaPremio: seed.sellosParaPremio ?? 10,
    primaryColor: seed.primaryColor ?? "#4f46e5",
    clubName: seed.clubName ?? "",
    joinDescription: seed.joinDescription ?? "",
    emojis: seed.emojis ?? "",
  };
}

// =========================================================
// Utilidades
// =========================================================

function fmtCLP(n: number): string {
  return "$" + (n || 0).toLocaleString("es-CL");
}

function fmtNumber(n: number): string {
  return (n || 0).toLocaleString("es-CL");
}

// =========================================================
// Bloque de sección dentro del editor
// =========================================================

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Sparkles;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
      <header className="mb-3 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-400/25">
          <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
        </span>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-300">
          {title}
        </h3>
      </header>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] uppercase tracking-widest text-slate-400">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-emerald-400/60 focus:ring-1 focus:ring-emerald-400/30";

// =========================================================
// Modal: editor de tenant
// =========================================================

function EditorModal({
  tenant,
  onClose,
  onSaved,
}: {
  tenant: TenantRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<EditableFields | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!tenant) return;
    setForm(buildInitialForm(tenant));
    setErr(null);
    setSaved(false);
  }, [tenant]);

  useEffect(() => {
    if (!tenant) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [tenant, busy, onClose]);

  if (!tenant || !form) return null;

  const update = <K extends keyof EditableFields>(k: K, v: EditableFields[K]) => {
    setForm((f) => (f ? { ...f, [k]: v } : f));
    setSaved(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/superadmin/tenants", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken ?? ""}`,
        },
        body: JSON.stringify({ id: tenant.id, ...form }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
      setSaved(true);
      onSaved();
      setTimeout(onClose, 700);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const impersonate = () => window.open(`/?tenant=${tenant.slug}`, "_blank");

  return (
    <>
      <div
        aria-hidden
        onClick={busy ? undefined : onClose}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      />
      <div
        role="dialog"
        aria-label={`Editar ${tenant.nombre}`}
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col overflow-hidden rounded-t-3xl border border-b-0 border-white/10 bg-slate-950 shadow-2xl shadow-black/60 animate-in slide-in-from-bottom-6 duration-300",
          "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[85dvh] sm:w-[calc(100%-2rem)] sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:border"
        )}
      >
        <div className="relative flex shrink-0 items-start justify-between gap-3 border-b border-white/[0.06] bg-slate-950/95 px-5 pb-3 pt-5 backdrop-blur-xl">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-white/15 sm:hidden"
          />
          <div className="flex min-w-0 flex-1 items-center gap-3 pt-2 sm:pt-0">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-2xl ring-1 ring-white/10">
              {form.emoji || "🏬"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
                Editando
              </p>
              <h2 className="truncate text-base font-bold text-white sm:text-lg">
                {form.nombre || tenant.id}
              </h2>
              <p className="truncate font-mono text-[10px] text-slate-500">
                {tenant.id}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Cerrar"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={submit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {tenant.origen === "registro" && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-400/[0.06] px-3 py-2 text-[11px] text-amber-200">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <div className="min-w-0">
                  <p className="font-semibold">Solo en el registro estático.</p>
                  <p className="mt-0.5 text-amber-200/80">
                    Al guardar creamos su ficha en Firestore y estos cambios
                    quedan como override sobre el registro.
                  </p>
                </div>
              </div>
            )}

            <Section title="Identidad" icon={Sparkles}>
              <div className="grid grid-cols-[5rem_1fr] gap-3">
                <Field label="Emoji">
                  <input
                    value={form.emoji}
                    onChange={(e) => update("emoji", e.target.value.slice(0, 4))}
                    className={cn(inputCls, "text-center text-xl")}
                    maxLength={4}
                  />
                </Field>
                <Field label="Nombre">
                  <input
                    value={form.nombre}
                    onChange={(e) => update("nombre", e.target.value)}
                    required
                    maxLength={80}
                    className={inputCls}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Slug" hint="Se usa en URLs. Cámbialo con cuidado.">
                  <input
                    value={form.slug}
                    onChange={(e) =>
                      update("slug", e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))
                    }
                    pattern="[a-z0-9]{2,32}"
                    className={cn(inputCls, "font-mono")}
                  />
                </Field>
                <Field label="Dominio">
                  <input
                    value={form.dominio}
                    onChange={(e) => update("dominio", e.target.value.trim())}
                    placeholder={`${form.slug || "cliente"}.synaptechspa.cl`}
                    className={inputCls}
                  />
                </Field>
              </div>
            </Section>

            <Section title="Estado comercial" icon={Building2}>
              <Field label="Etapa del pipeline">
                <div className="grid grid-cols-3 gap-2">
                  {(["propuesta", "por_presentar", "funcionando"] as const).map(
                    (s) => {
                      const meta = STATUS_META[s];
                      const active = form.status === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => update("status", s)}
                          className={cn(
                            "flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-[11px] font-semibold transition-all duration-200",
                            active
                              ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-200"
                              : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20"
                          )}
                        >
                          <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
                          {meta.label}
                        </button>
                      );
                    }
                  )}
                </div>
              </Field>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field label="Plan">
                  <select
                    value={form.plan}
                    onChange={(e) => update("plan", e.target.value)}
                    className={inputCls}
                  >
                    {PLAN_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p[0].toUpperCase() + p.slice(1)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Entorno">
                  <select
                    value={form.entorno}
                    onChange={(e) => update("entorno", e.target.value)}
                    className={inputCls}
                  >
                    {ENTORNO_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="MRR (CLP)">
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={form.mrr}
                    onChange={(e) => update("mrr", Number(e.target.value) || 0)}
                    className={cn(inputCls, "tabular-nums")}
                  />
                </Field>
              </div>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={form.activo}
                  onChange={(e) => update("activo", e.target.checked)}
                  className="h-4 w-4 accent-emerald-400"
                />
                <span className="text-sm text-white">Activo</span>
                <span className="ml-auto text-[11px] text-slate-500">
                  {form.activo ? "operando" : "pausado"}
                </span>
              </label>
            </Section>

            <Section title="Contacto y ownership" icon={Phone}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Email del dueño">
                  <input
                    type="email"
                    value={form.ownerEmail}
                    onChange={(e) => update("ownerEmail", e.target.value)}
                    placeholder="contacto@negocio.cl"
                    className={inputCls}
                  />
                </Field>
                <Field label="Instagram" hint="Sin @, ej. sushipro.cl">
                  <input
                    value={form.instagram}
                    onChange={(e) => update("instagram", e.target.value.replace(/^@/, ""))}
                    className={inputCls}
                  />
                </Field>
              </div>
              <Field label="WhatsApp" hint="Formato internacional sin +, ej. 56912345678">
                <input
                  value={form.whatsapp}
                  onChange={(e) => update("whatsapp", e.target.value.replace(/[^0-9]/g, ""))}
                  inputMode="numeric"
                  className={cn(inputCls, "tabular-nums")}
                />
              </Field>
              <Field label="Nota interna">
                <textarea
                  value={form.nota}
                  onChange={(e) => update("nota", e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Contexto, acuerdos, próximos pasos…"
                  className={cn(inputCls, "resize-none")}
                />
              </Field>
            </Section>

            <Section title="Programa y marca" icon={Palette}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Sellos para premio">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={form.sellosParaPremio}
                    onChange={(e) =>
                      update("sellosParaPremio", Number(e.target.value) || 1)
                    }
                    className={cn(inputCls, "tabular-nums")}
                  />
                </Field>
                <Field label="Color primario">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.primaryColor}
                      onChange={(e) => update("primaryColor", e.target.value)}
                      className="h-9 w-12 shrink-0 cursor-pointer rounded-lg border border-white/10 bg-transparent p-0.5"
                    />
                    <input
                      value={form.primaryColor}
                      onChange={(e) => update("primaryColor", e.target.value)}
                      pattern="^#[0-9a-fA-F]{6}$"
                      className={cn(inputCls, "font-mono uppercase")}
                    />
                  </div>
                </Field>
              </div>
              <Field label="Nombre del club" hint="Ej. SUSHIPRO CLUB">
                <input
                  value={form.clubName}
                  onChange={(e) => update("clubName", e.target.value)}
                  maxLength={60}
                  className={inputCls}
                />
              </Field>
              <Field
                label="Descripción de unirse"
                hint="Copy que se muestra en /unete y el hero."
              >
                <textarea
                  value={form.joinDescription}
                  onChange={(e) => update("joinDescription", e.target.value)}
                  rows={2}
                  maxLength={240}
                  className={cn(inputCls, "resize-none")}
                />
              </Field>
              <Field label="Emojis del club" hint="Ej. 🍣🥢">
                <input
                  value={form.emojis}
                  onChange={(e) => update("emojis", e.target.value)}
                  maxLength={20}
                  className={inputCls}
                />
              </Field>
              <div className="flex items-start gap-2 rounded-xl border border-sky-400/25 bg-sky-400/[0.05] px-3 py-2 text-[11px] text-sky-200">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <p>
                  Los campos de marca se guardan en Firestore. Se aplicarán en
                  la UI del cliente cuando el overlay Firestore → VENDORS quede
                  cableado.
                </p>
              </div>
            </Section>

            {err && (
              <div className="flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{err}</span>
              </div>
            )}
          </div>

          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-white/[0.06] bg-slate-950/95 px-5 py-3 backdrop-blur-xl sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={impersonate}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/[0.06]"
            >
              <LogIn className="h-3.5 w-3.5" strokeWidth={2.5} />
              Ver como cliente
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/[0.06] disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={busy}
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-lg transition-all duration-200 active:scale-[0.98] disabled:opacity-60",
                  saved
                    ? "bg-emerald-400 text-slate-950 shadow-emerald-500/40"
                    : "bg-gradient-to-br from-emerald-400 to-lime-400 text-slate-950 shadow-emerald-500/25 hover:from-emerald-300 hover:to-lime-300 hover:shadow-emerald-500/40"
                )}
              >
                {busy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : saved ? (
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                ) : (
                  <Save className="h-3.5 w-3.5" strokeWidth={2.5} />
                )}
                {busy ? "Guardando…" : saved ? "Guardado" : "Guardar cambios"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}

// =========================================================
// Tarjeta de tenant en la lista
// =========================================================

function TenantCard({
  t,
  onEdit,
}: {
  t: TenantRow;
  onEdit: (t: TenantRow) => void;
}) {
  const meta = STATUS_META[t.status];
  return (
    <article className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 shadow-lg shadow-black/20 backdrop-blur-xl transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.03]">
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-xl ring-1 ring-white/10">
            {t.emoji || "🏬"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white">{t.nombre}</p>
            <p className="truncate font-mono text-[10px] text-slate-500">
              {t.id}
              {t.dominio && ` · ${t.dominio}`}
            </p>
          </div>
        </div>
        <span
          className={cn(
            "flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1",
            meta.badge
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
          {meta.label}
        </span>
      </header>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
        <span className="inline-flex items-center gap-1">
          <ShieldCheck className="h-3 w-3 text-slate-500" />
          {t.plan}
        </span>
        <span className="inline-flex items-center gap-1">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              t.entorno === "produccion" ? "bg-emerald-400" : "bg-amber-400"
            )}
          />
          {t.entorno === "produccion" ? "Producción" : "Prueba"}
        </span>
        <span>·</span>
        <span>{fmtNumber(t.clientes)} clientes</span>
        {t.mrr > 0 && (
          <>
            <span>·</span>
            <span className="tabular-nums">{fmtCLP(t.mrr)}</span>
          </>
        )}
        {t.origen === "registro" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.04] px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-slate-500 ring-1 ring-white/[0.06]">
            estático
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-white/[0.04] pt-3">
        <button
          type="button"
          onClick={() => onEdit(t)}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-emerald-400 to-lime-400 px-3 py-2 text-xs font-semibold text-slate-950 shadow-md shadow-emerald-500/20 transition-all duration-200 hover:from-emerald-300 hover:to-lime-300 active:scale-[0.98]"
        >
          <Pencil className="h-3.5 w-3.5" strokeWidth={2.5} />
          Editar
        </button>
        <a
          href={`/?tenant=${t.slug}`}
          target="_blank"
          rel="noreferrer"
          title="Ver como cliente"
          className="rounded-xl border border-white/10 bg-white/[0.03] p-2 text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white"
        >
          <ExternalLink className="h-3.5 w-3.5" strokeWidth={2.25} />
        </a>
      </div>
    </article>
  );
}

// =========================================================
// Página principal
// =========================================================

export default function DesarrollarPage() {
  const { firebaseUser, loading: authLoading } = useAuth();
  const authReady = !authLoading && !!firebaseUser;

  const [rows, setRows] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");
  const [editing, setEditing] = useState<TenantRow | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/superadmin/overview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken ?? ""}`,
        },
        body: JSON.stringify({}),
      });
      const json = (await res.json().catch(() => ({}))) as {
        tenants?: OverviewTenant[];
        error?: string;
      };
      if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
      const list = (json.tenants ?? []).map<TenantRow>((t) => ({
        id: t.id,
        nombre: t.nombre,
        emoji: t.emoji,
        slug: t.slug,
        dominio: t.dominio,
        instagram: t.instagram,
        status: t.status,
        plan: t.plan,
        entorno: t.entorno,
        activo: t.activo,
        origen: t.origen,
        operativo: t.operativo,
        mrr: t.mrr,
        ownerEmail: t.ownerEmail,
        nota: t.nota,
        clientes: t.clientes,
        sellos: t.sellos,
        createdAt: t.createdAt,
      }));
      setRows(list);
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((t) => {
      if (statusFilter !== "todos" && t.status !== statusFilter) return false;
      if (!q) return true;
      return (
        t.nombre.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        (t.dominio ?? "").toLowerCase().includes(q) ||
        (t.ownerEmail ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, search, statusFilter]);

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-300">
            <Wrench className="h-3 w-3" strokeWidth={2.5} />
            Desarrollar
          </p>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
            Editar tenants
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Ajusta la ficha técnica de cada cliente desde acá — identidad,
            etapa comercial, contacto y marca. Los cambios se guardan en
            Firestore y sobrescriben el registro estático.
          </p>
        </div>

        <button
          type="button"
          onClick={cargar}
          disabled={loading}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-slate-300 transition-all duration-200 hover:bg-white/[0.06] active:scale-[0.98] disabled:opacity-60"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          Actualizar
        </button>
      </header>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, id, dominio o dueño…"
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2 pl-9 pr-3 text-xs text-slate-200 placeholder:text-slate-500 transition-colors focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/30"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto sm:flex-wrap">
          <Filter className="h-3.5 w-3.5 shrink-0 text-slate-500" />
          {STATUS_FILTER_OPTIONS.map((o) => {
            const active = statusFilter === o.value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => setStatusFilter(o.value)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition-colors",
                  active
                    ? "bg-emerald-400/15 text-emerald-200 ring-1 ring-emerald-400/30"
                    : "bg-white/[0.03] text-slate-400 ring-1 ring-white/10 hover:text-white"
                )}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </div>

      {err && (
        <div className="flex items-start gap-2 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1">{err}</span>
        </div>
      )}

      {loading && rows.length === 0 ? (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Cargando tenants…
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
          <Building2 className="h-5 w-5 text-slate-500" />
          <p className="text-xs text-slate-400">
            {rows.length === 0
              ? "Todavía no hay tenants registrados."
              : "No hay tenants que coincidan con los filtros."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtered.map((t) => (
            <TenantCard key={t.id} t={t} onEdit={setEditing} />
          ))}
        </div>
      )}

      <EditorModal
        tenant={editing}
        onClose={() => setEditing(null)}
        onSaved={cargar}
      />
    </div>
  );
}
