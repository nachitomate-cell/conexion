"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  Cpu,
  Database,
  DollarSign,
  Download,
  ExternalLink,
  Flame,
  Globe,
  Handshake,
  Info,
  Loader2,
  LogIn,
  Pencil,
  Plus,
  RefreshCw,
  Rocket,
  Search,
  Server,
  ShieldAlert,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/firebase";
import type { VendorStatus } from "@/types";

// =========================================================
// Tipos — matchean la respuesta de /api/superadmin/overview
// =========================================================

type EntornoTier = string;
type PlanTier = string;
type StatusFilter = "todos" | VendorStatus;

interface TenantRow {
  id: string;
  nombre: string;
  emoji: string;
  slug: string;
  dominio: string | null;
  createdAt: string | null;
  status: VendorStatus;
  entorno: EntornoTier;
  plan: PlanTier;
  usuarios: number;
  sellos30d: number;
  canjes30d: number;
  fireReads: number;
  fireWrites: number;
  mrr: number;
  ownerEmail: string | null;
  nota: string | null;
}

interface QuotaApi {
  service: string;
  usage: number;
  limit: number;
  unit: string;
  iconKey: string;
}

interface IncidentApi {
  id: string;
  titulo: string;
  descripcion: string;
  severidad: "critical" | "warning" | "info";
  vendorId: string | null;
  createdAt: number;
}

interface OverviewResponse {
  plataforma: {
    tenantsTotales: number;
    tenantsOperativos: number;
    totalUsuarios: number;
    totalClientes: number;
    totalStaff: number;
    sellosPlataforma: number;
    canjesPendientes: number;
    mrrTotal: number;
  };
  tenants: Array<{
    id: string;
    nombre: string;
    emoji: string;
    slug: string;
    status: VendorStatus;
    dominio: string | null;
    plan: string;
    entorno: string;
    mrr: number;
    ownerEmail: string | null;
    nota: string | null;
    createdAt: string | null;
    fireReads: number;
    fireWrites: number;
    clientes: number;
    sellos30d: number;
    canjes30d: number;
  }>;
  requestsSpark: number[];
  quotas: QuotaApi[];
  incidents: IncidentApi[];
}

type YearFilter = "todos" | "2024" | "2025" | "2026";
type MonthFilter = "todos" | "trimestre" | "mes";

// Mapa iconKey (que viaja como string desde el server) → componente lucide.
const QUOTA_ICONS: Record<string, LucideIcon> = {
  firestore: Database,
  auth: Users,
  functions: Cpu,
  vercel: Server,
};

const INCIDENT_META: Record<
  IncidentApi["severidad"],
  { icon: LucideIcon; color: string }
> = {
  critical: { icon: Flame, color: "text-rose-400" },
  warning: { icon: Globe, color: "text-amber-400" },
  info: { icon: Info, color: "text-sky-400" },
};

function mapTenant(t: OverviewResponse["tenants"][number]): TenantRow {
  return {
    id: t.id,
    nombre: t.nombre,
    emoji: t.emoji,
    slug: t.slug,
    dominio: t.dominio,
    createdAt: t.createdAt,
    status: t.status,
    entorno: t.entorno,
    plan: t.plan,
    usuarios: t.clientes,
    sellos30d: t.sellos30d,
    canjes30d: t.canjes30d,
    fireReads: t.fireReads,
    fireWrites: t.fireWrites,
    mrr: t.mrr,
    ownerEmail: t.ownerEmail,
    nota: t.nota,
  };
}

// =========================================================
// Utilidades de formato
// =========================================================

function fmtNumber(n: number): string {
  return n.toLocaleString("es-CL");
}

function fmtCLP(n: number): string {
  return "$" + n.toLocaleString("es-CL");
}

function fmtCompact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function fmtFecha(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtRelativo(ms: number): string {
  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "recién";
  if (min < 60) return `hace ${min} min`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  const dias = Math.floor(hrs / 24);
  return `hace ${dias} ${dias === 1 ? "día" : "días"}`;
}

// =========================================================
// Config visual del pipeline
// =========================================================

const STATUS_META: Record<
  VendorStatus,
  {
    label: string;
    icon: LucideIcon;
    // Estilo de la columna (light — se ve como panel iluminado sobre el frame oscuro)
    col: string;
    colBorder: string;
    // Badge / píldora del estado
    badge: string;
    // Barra superior de la tarjeta (identifica visualmente la etapa)
    stripe: string;
    // Ícono coloreado del header
    iconWrap: string;
    // Copy secundario del header
    desc: string;
  }
> = {
  propuesta: {
    label: "Propuestas",
    icon: Sparkles,
    col: "bg-slate-50",
    colBorder: "border-slate-200",
    badge: "bg-blue-100 text-blue-700 ring-blue-200",
    stripe: "bg-blue-400",
    iconWrap: "bg-blue-100 text-blue-700",
    desc: "Clientes potenciales o en negociación",
  },
  por_presentar: {
    label: "Falta por presentar",
    icon: Handshake,
    col: "bg-orange-50",
    colBorder: "border-orange-200",
    badge: "bg-orange-100 text-orange-700 ring-orange-200",
    stripe: "bg-orange-400",
    iconWrap: "bg-orange-100 text-orange-700",
    desc: "Desarrollo listo · pendiente reunión con el cliente",
  },
  funcionando: {
    label: "Funcionando",
    icon: Rocket,
    col: "bg-green-50",
    colBorder: "border-green-200",
    badge: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    stripe: "bg-emerald-500",
    iconWrap: "bg-emerald-100 text-emerald-700",
    desc: "En producción · uso real por parte de clientes",
  },
};

const STATUS_ORDER: VendorStatus[] = [
  "propuesta",
  "por_presentar",
  "funcionando",
];

// =========================================================
// KPI Cards (fila superior)
// =========================================================

interface KpiSpec {
  label: string;
  value: string;
  hint: string;
  delta: number;
  icon: LucideIcon;
  tone: "indigo" | "emerald" | "amber" | "fuchsia";
}

function KpiCard({ kpi }: { kpi: KpiSpec }) {
  const Icon = kpi.icon;
  const up = kpi.delta >= 0;
  const TrendArrow = up ? ArrowUpRight : ArrowDownRight;

  const toneMap = {
    indigo: "from-indigo-500/20 to-indigo-500/0 text-indigo-300 ring-indigo-500/30",
    emerald: "from-emerald-500/20 to-emerald-500/0 text-emerald-300 ring-emerald-500/30",
    amber: "from-amber-500/20 to-amber-500/0 text-amber-300 ring-amber-500/30",
    fuchsia: "from-fuchsia-500/20 to-fuchsia-500/0 text-fuchsia-300 ring-fuchsia-500/30",
  } as const;

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-inner shadow-black/20">
      <div
        className={cn(
          "absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br opacity-70 blur-2xl",
          toneMap[kpi.tone]
        )}
      />
      <div className="relative flex items-center justify-between">
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg ring-1",
            toneMap[kpi.tone]
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={2.25} />
        </span>
        <span
          className={cn(
            "flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1",
            up
              ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30"
              : "bg-rose-500/10 text-rose-300 ring-rose-500/30"
          )}
        >
          <TrendArrow className="h-3 w-3" strokeWidth={2.5} />
          {up ? "+" : ""}
          {kpi.delta.toFixed(1)}%
        </span>
      </div>
      <p className="relative mt-3 text-[11px] uppercase tracking-widest text-slate-500">
        {kpi.label}
      </p>
      <p className="relative mt-1 font-mono text-2xl font-bold tabular-nums text-white">
        {kpi.value}
      </p>
      <p className="relative mt-0.5 text-xs text-slate-500">{kpi.hint}</p>
    </div>
  );
}

// =========================================================
// Slicers (filtros avanzados)
// =========================================================

function Slicer<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 shadow-sm hover:bg-slate-800"
      >
        <span className="text-[10px] uppercase tracking-widest text-slate-500">
          {label}
        </span>
        <span className="text-slate-100">{current?.label}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-slate-500 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1.5 min-w-[10rem] overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-xl">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={cn(
                "block w-full px-3 py-2 text-left text-xs hover:bg-slate-800",
                value === o.value
                  ? "font-semibold text-fuchsia-300"
                  : "text-slate-300"
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// =========================================================
// Tarjeta de tenant (para el Kanban)
// =========================================================

function TenantCard({
  t,
  onImpersonate,
  onEdit,
}: {
  t: TenantRow;
  onImpersonate: (t: TenantRow) => void;
  onEdit: (t: TenantRow) => void;
}) {
  const meta = STATUS_META[t.status];
  return (
    <article className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className={cn("h-1 w-full", meta.stripe)} />
      <div className="p-4 sm:p-5">
        <header className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xl ring-1 ring-slate-200">
              {t.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <h4 className="truncate text-sm font-bold text-slate-900">
                {t.nombre}
              </h4>
              <p className="truncate font-mono text-[11px] text-slate-500">
                {t.dominio}
              </p>
            </div>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1",
              meta.badge
            )}
          >
            {meta.label}
          </span>
        </header>

        {/* Meta info */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {fmtFecha(t.createdAt)}
          </span>
          <span className="font-mono text-slate-400">·</span>
          <span className="font-mono uppercase tracking-wider text-slate-400">
            {t.id}
          </span>
        </div>

        {/* Mini métricas — solo para funcionando */}
        {t.status === "funcionando" && (
          <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-emerald-50/70 p-2 ring-1 ring-emerald-100">
            <div className="text-center">
              <p className="font-mono text-sm font-bold tabular-nums text-emerald-900">
                {fmtNumber(t.usuarios)}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-emerald-700/70">
                usuarios
              </p>
            </div>
            <div className="text-center">
              <p className="font-mono text-sm font-bold tabular-nums text-emerald-900">
                {fmtNumber(t.sellos30d)}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-emerald-700/70">
                sellos 30d
              </p>
            </div>
            <div className="text-center">
              <p className="font-mono text-sm font-bold tabular-nums text-emerald-900">
                {t.mrr > 0 ? fmtCLP(t.mrr) : "—"}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-emerald-700/70">
                mrr
              </p>
            </div>
          </div>
        )}

        {/* Nota interna — visible en las etapas comerciales */}
        {t.nota && t.status !== "funcionando" && (
          <p className="mt-3 rounded-lg bg-slate-50 p-2 text-[11px] italic text-slate-600 ring-1 ring-slate-200">
            {t.nota}
          </p>
        )}

        {/* Acciones */}
        <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="min-w-0 truncate break-all text-[11px] text-slate-500">
            {t.ownerEmail || "—"}
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => onEdit(t)}
              title="Editar configuración"
              className="inline-flex flex-1 items-center justify-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 sm:flex-none"
            >
              <Pencil className="h-3 w-3" strokeWidth={2.25} />
              Editar
            </button>
            <button
              type="button"
              onClick={() => onImpersonate(t)}
              title="Impersonar tenant"
              className="inline-flex flex-1 items-center justify-center gap-1 rounded-md border border-fuchsia-300 bg-fuchsia-50 px-2 py-1.5 text-[11px] font-semibold text-fuchsia-700 hover:bg-fuchsia-100 sm:flex-none"
            >
              <LogIn className="h-3 w-3" strokeWidth={2.25} />
              Impersonar
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

// =========================================================
// Columna del Kanban (una por status)
// =========================================================

function PipelineColumn({
  status,
  rows,
  onImpersonate,
  onEdit,
  onCreate,
}: {
  status: VendorStatus;
  rows: TenantRow[];
  onImpersonate: (t: TenantRow) => void;
  onEdit: (t: TenantRow) => void;
  onCreate: () => void;
}) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <section
      className={cn(
        "flex w-full min-w-0 min-h-[240px] flex-col rounded-2xl border p-4 lg:flex-1 lg:p-5",
        meta.col,
        meta.colBorder
      )}
    >
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span
            className={cn(
              "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
              meta.iconWrap
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={2.25} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">{meta.label}</h3>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold ring-1",
                  meta.badge
                )}
              >
                {rows.length}
              </span>
            </div>
            <p className="mt-0.5 max-w-[24ch] text-[11px] leading-snug text-slate-600">
              {meta.desc}
            </p>
          </div>
        </div>
        {status === "propuesta" && (
          <button
            type="button"
            onClick={onCreate}
            title="Añadir propuesta"
            className="rounded-md border border-blue-300 bg-white p-1.5 text-blue-700 hover:bg-blue-100"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
          </button>
        )}
      </header>

      <div className="flex-1 space-y-3">
        {rows.length === 0 ? (
          <div className="flex h-full min-h-[140px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white/60 p-4 text-center">
            <CircleDashed className="h-5 w-5 text-slate-400" />
            <p className="text-xs text-slate-500">
              Sin tenants en esta etapa.
            </p>
          </div>
        ) : (
          rows.map((t) => (
            <TenantCard
              key={t.id}
              t={t}
              onImpersonate={onImpersonate}
              onEdit={onEdit}
            />
          ))
        )}
      </div>
    </section>
  );
}

// =========================================================
// Sparkline (SVG minimal, sin dependencia extra)
// =========================================================

function Sparkline({
  data,
  height = 44,
  color = "#a78bfa",
}: {
  data: number[];
  height?: number;
  color?: string;
}) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - ((v - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{ height, width: "100%" }}
    >
      <defs>
        <linearGradient id="spark-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        fill="url(#spark-fill)"
        stroke="none"
        points={`0,100 ${points} 100,100`}
      />
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
        points={points}
      />
    </svg>
  );
}

// =========================================================
// Panel de infraestructura (cuotas Firebase estimadas)
// =========================================================

interface QuotaRow {
  service: string;
  usage: number;
  limit: number;
  unit: string;
  icon: LucideIcon;
}

const QUOTAS: QuotaRow[] = [
  { service: "Firestore reads / día", usage: 1_048_590, limit: 5_000_000, unit: "req", icon: Database },
  { service: "Firestore writes / día", usage: 118_260, limit: 1_000_000, unit: "req", icon: Database },
  { service: "Auth users totales", usage: 1_917, limit: 50_000, unit: "u", icon: Users },
  { service: "Cloud Functions / mes", usage: 214_820, limit: 2_000_000, unit: "inv", icon: Cpu },
  { service: "Vercel Functions / mes", usage: 82_140, limit: 1_000_000, unit: "inv", icon: Server },
];

function InfraPanel({ quotas }: { quotas: QuotaApi[] }) {
  const rows =
    quotas.length > 0
      ? quotas
      : [
          {
            service: "Sin datos de infraestructura",
            usage: 0,
            limit: 1,
            unit: "—",
            iconKey: "firestore",
          } as QuotaApi,
        ];
  return (
    <section
      id="infra"
      className="rounded-xl border border-slate-800 bg-slate-900/60"
    >
      <header className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
            <Database className="h-4 w-4 text-indigo-400" strokeWidth={2.25} />
            Infraestructura & cuotas
          </h2>
          <p className="text-xs text-slate-500">
            Consumo global agregado en todos los tenants (últimas 24 h)
          </p>
        </div>
        <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
          {quotas.length > 0 ? "nominal" : "sin datos"}
        </span>
      </header>
      <ul className="divide-y divide-slate-800">
        {rows.map((q) => {
          const pct = Math.min(100, (q.usage / q.limit) * 100);
          const critical = pct >= 80;
          const warning = pct >= 50 && pct < 80;
          const Icon = QUOTA_ICONS[q.iconKey] ?? Database;
          return (
            <li key={q.service} className="px-5 py-3.5">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-400">
                  <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-200">
                    {q.service}
                  </p>
                  <p className="font-mono text-[11px] text-slate-500">
                    {fmtNumber(q.usage)} / {fmtNumber(q.limit)} {q.unit}
                  </p>
                </div>
                <span
                  className={cn(
                    "font-mono text-xs font-bold tabular-nums",
                    critical
                      ? "text-rose-300"
                      : warning
                      ? "text-amber-300"
                      : "text-emerald-300"
                  )}
                >
                  {pct.toFixed(1)}%
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
                <div
                  className={cn(
                    "h-full rounded-full transition-[width]",
                    critical
                      ? "bg-rose-400"
                      : warning
                      ? "bg-amber-400"
                      : "bg-emerald-400"
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// =========================================================
// Modal: registrar nuevo tenant
// =========================================================

function NewTenantModal({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [prefijo, setPrefijo] = useState("");
  const [dominio, setDominio] = useState("");
  const [plan, setPlan] = useState<PlanTier>("starter");
  const [entorno, setEntorno] = useState<EntornoTier>("staging");
  const [status, setStatus] = useState<VendorStatus>("propuesta");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const slugSugerido = nombre.toLowerCase().replace(/[^a-z0-9]+/g, "");

  const reset = () => {
    setNombre("");
    setPrefijo("");
    setDominio("");
    setPlan("starter");
    setEntorno("staging");
    setStatus("propuesta");
    setOwnerEmail("");
    setErr(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !prefijo) return;
    setBusy(true);
    setErr(null);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/superadmin/tenants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken ?? ""}`,
        },
        body: JSON.stringify({
          id: prefijo.toLowerCase(),
          nombre,
          slug: slugSugerido || prefijo.toLowerCase(),
          dominio: dominio || `${slugSugerido}.synaptechspa.cl`,
          emoji: "🏬",
          status,
          plan,
          entorno,
          ownerEmail,
          nota: status === "propuesta" ? "Propuesta recién creada." : "",
          mrr: 0,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
      onCreated();
      onOpenChange(false);
      reset();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-slate-800 bg-slate-900 text-slate-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Plus className="h-4 w-4 text-fuchsia-400" />
            Registrar nuevo tenant
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Provisiona un local nuevo en la plataforma. Se generará un
            <span className="font-mono text-slate-300"> vendorId </span>
            y un subdominio asociado.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-widest text-slate-500">
              Nombre del local
            </label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              placeholder="Café Unión"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-fuchsia-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-widest text-slate-500">
              Prefijo / vendorId
            </label>
            <input
              value={prefijo}
              onChange={(e) => setPrefijo(e.target.value.toUpperCase())}
              required
              placeholder="CAFEUNION"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm uppercase text-white outline-none focus:border-fuchsia-500"
            />
            <p className="text-[11px] text-slate-500">
              Se usará como namespace en Firestore (
              <span className="font-mono">vendorId = "{prefijo.toLowerCase()}"</span>
              ).
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-widest text-slate-500">
              Dominio asociado
            </label>
            <input
              value={dominio}
              onChange={(e) => setDominio(e.target.value)}
              placeholder={`${slugSugerido || "tenant"}.synaptechspa.cl`}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-white outline-none focus:border-fuchsia-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-widest text-slate-500">
              Etapa inicial
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as VendorStatus)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-fuchsia-500"
            >
              <option value="propuesta">Propuesta</option>
              <option value="por_presentar">Falta por presentar</option>
              <option value="funcionando">Funcionando</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-widest text-slate-500">
                Plan
              </label>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value as PlanTier)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-fuchsia-500"
              >
                <option value="starter">Starter</option>
                <option value="growth">Growth</option>
                <option value="scale">Scale</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-widest text-slate-500">
                Entorno
              </label>
              <select
                value={entorno}
                onChange={(e) => setEntorno(e.target.value as EntornoTier)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-fuchsia-500"
              >
                <option value="staging">Staging</option>
                <option value="produccion">Producción</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-widest text-slate-500">
              Email del dueño
            </label>
            <input
              type="email"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              placeholder="contacto@local.cl"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-fuchsia-500"
            />
          </div>

          {err && (
            <div className="flex items-start gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{err}</span>
            </div>
          )}

          <DialogFooter className="mt-4 gap-2 sm:gap-2">
            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                reset();
              }}
              className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-fuchsia-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/20 hover:from-fuchsia-400 hover:to-indigo-400 disabled:opacity-60"
            >
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {busy ? "Creando…" : "Crear tenant"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// =========================================================
// Página principal
// =========================================================

const YEAR_OPTIONS = [
  { value: "todos", label: "Histórico" },
  { value: "2026", label: "2026" },
  { value: "2025", label: "2025" },
  { value: "2024", label: "2024" },
] as const;

const MONTH_OPTIONS = [
  { value: "todos", label: "Todo el rango" },
  { value: "trimestre", label: "Últimos 3 meses" },
  { value: "mes", label: "Último mes" },
] as const;

const STATUS_OPTIONS = [
  { value: "todos", label: "Todos" },
  { value: "propuesta", label: "Propuestas" },
  { value: "por_presentar", label: "Falta por presentar" },
  { value: "funcionando", label: "Funcionando" },
] as const;

export default function SuperAdminDashboardPage() {
  const [year, setYear] = useState<YearFilter>("todos");
  const [month, setMonth] = useState<MonthFilter>("todos");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");
  const [search, setSearch] = useState("");
  const [newModal, setNewModal] = useState(false);

  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

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
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
      setData(json as OverviewResponse);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const tenants = useMemo<TenantRow[]>(
    () => (data?.tenants ?? []).map(mapTenant),
    [data]
  );

  const filtered = useMemo(() => {
    return tenants.filter((t) => {
      if (statusFilter !== "todos" && t.status !== statusFilter) return false;
      if (year !== "todos" && !(t.createdAt ?? "").startsWith(year))
        return false;
      if (
        search &&
        !`${t.nombre} ${t.dominio ?? ""} ${t.id}`
          .toLowerCase()
          .includes(search.toLowerCase())
      )
        return false;
      return true;
    });
  }, [tenants, statusFilter, year, search]);

  // Agrupamos por status para el Kanban.
  const grouped = useMemo(() => {
    const acc: Record<VendorStatus, TenantRow[]> = {
      propuesta: [],
      por_presentar: [],
      funcionando: [],
    };
    for (const t of filtered) acc[t.status].push(t);
    return acc;
  }, [filtered]);

  const kpis: KpiSpec[] = useMemo(() => {
    const plat = data?.plataforma;
    const funcionandoCount = tenants.filter(
      (t) => t.status === "funcionando"
    ).length;
    const totalTenants = tenants.length;
    const usuariosPlataforma = plat?.totalUsuarios ?? 0;
    const totalReads = tenants.reduce((a, t) => a + t.fireReads, 0);
    const mrrTotal = plat?.mrrTotal ?? 0;
    return [
      {
        label: "Tenants funcionando",
        value: `${funcionandoCount}/${totalTenants}`,
        hint: "en producción",
        delta: 0,
        icon: Building2,
        tone: "emerald",
      },
      {
        label: "Usuarios plataforma",
        value: fmtNumber(usuariosPlataforma),
        hint: `${plat?.totalClientes ?? 0} clientes · ${plat?.totalStaff ?? 0} staff`,
        delta: 0,
        icon: Users,
        tone: "indigo",
      },
      {
        label: "Firebase reads / día",
        value: fmtCompact(totalReads),
        hint: totalReads > 0 ? "métricas por tenant" : "conectar GCP Monitoring",
        delta: 0,
        icon: Database,
        tone: "amber",
      },
      {
        label: "MRR estimado",
        value: fmtCLP(mrrTotal),
        hint: mrrTotal > 0 ? "suma de vendor.mrr" : "editable por tenant",
        delta: 0,
        icon: DollarSign,
        tone: "fuchsia",
      },
    ];
  }, [data, tenants]);

  const impersonate = (t: TenantRow) => {
    // TODO: setear cookie de sesión superadmin + header x-tenant-id.
    window.open(`/?tenant=${t.slug}`, "_blank");
  };

  const edit = (t: TenantRow) => {
    // TODO: abrir drawer de configuración avanzada del tenant.
    // eslint-disable-next-line no-console
    console.log("edit tenant", t.id);
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-fuchsia-400">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-fuchsia-400" />
            Multitenant control plane
          </p>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
            Super Admin · Pipeline
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Gestor de estados de los tenants: propuesta → por presentar → funcionando.
          </p>
        </div>

        {/* Barra de filtros — flujo en móvil: slicers wrap, luego botones full-width */}
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <Slicer<YearFilter>
              label="Año"
              value={year}
              options={YEAR_OPTIONS}
              onChange={setYear}
            />
            <Slicer<MonthFilter>
              label="Periodo"
              value={month}
              options={MONTH_OPTIONS}
              onChange={setMonth}
            />
            <Slicer<StatusFilter>
              label="Etapa"
              value={statusFilter}
              options={STATUS_OPTIONS}
              onChange={setStatusFilter}
            />
          </div>
          <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center">
            <button
              type="button"
              onClick={cargar}
              disabled={loading}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-60"
              title="Refrescar métricas"
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", loading && "animate-spin")}
              />
              Refrescar
            </button>
            <button
              type="button"
              className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
            >
              <Download className="h-3.5 w-3.5" />
              CSV
            </button>
            <button
              type="button"
              onClick={() => setNewModal(true)}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-br from-fuchsia-500 to-indigo-500 px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-fuchsia-500/20 hover:from-fuchsia-400 hover:to-indigo-400"
            >
              <Plus className="h-3.5 w-3.5" />
              Nuevo tenant
            </button>
          </div>
        </div>
      </header>

      {err && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">No pudimos cargar el overview</p>
            <p className="text-xs text-rose-300/80">{err}</p>
          </div>
          <button
            type="button"
            onClick={cargar}
            className="rounded-md border border-rose-500/40 px-2 py-1 text-[11px] font-semibold hover:bg-rose-500/20"
          >
            Reintentar
          </button>
        </div>
      )}

      {loading && !data && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Consultando métricas de la plataforma…
        </div>
      )}

      {/* KPIs — 1 col móvil · 2 cols tablet · 4 cols desktop */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <KpiCard key={k.label} kpi={k} />
        ))}
      </section>

      {/* PIPELINE BOARD (Kanban) */}
      <section id="tenants" className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              Pipeline de tenants
            </h2>
            <p className="text-xs text-slate-500">
              {filtered.length} tenant{filtered.length === 1 ? "" : "s"} en la vista ·
              agrupado por etapa comercial
            </p>
          </div>
          {/* Búsqueda: full-width en móvil, ancho fijo en desktop */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar tenant, dominio, vendorId…"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2 pl-8 pr-3 text-xs text-slate-200 placeholder:text-slate-500 focus:border-fuchsia-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Columnas: apiladas en móvil, en fila desde lg */}
        <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
          {STATUS_ORDER.map((status) => (
            <PipelineColumn
              key={status}
              status={status}
              rows={grouped[status]}
              onImpersonate={impersonate}
              onEdit={edit}
              onCreate={() => setNewModal(true)}
            />
          ))}
        </div>
      </section>

      {/* SPARKLINE + INFRA + INCIDENTES */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5 xl:col-span-2">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
                <Activity className="h-4 w-4 shrink-0 text-fuchsia-400" strokeWidth={2.25} />
                Eventos plataforma · últimos 30 días
              </h2>
              <p className="text-xs text-slate-500">
                Suma diaria de <span className="font-mono">system_logs</span> a través de todos los tenants.
              </p>
            </div>
            <div className="text-left sm:text-right">
              <p className="font-mono text-2xl font-bold text-white">
                {fmtCompact(
                  (data?.requestsSpark ?? []).reduce((a, b) => a + b, 0)
                )}
              </p>
              <p className="text-[11px] text-slate-500">
                {(data?.requestsSpark ?? []).length} días con datos
              </p>
            </div>
          </div>
          <Sparkline data={data?.requestsSpark ?? []} height={80} />
        </div>

        <InfraPanel quotas={data?.quotas ?? []} />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div
          id="incidentes"
          className="rounded-xl border border-slate-800 bg-slate-900/60 xl:col-span-2"
        >
          <header className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
              <ShieldAlert className="h-4 w-4 text-rose-400" strokeWidth={2.25} />
              Incidentes activos
            </h2>
            <span
              className={cn(
                "rounded-md border px-1.5 py-0.5 text-[10px] font-bold",
                (data?.incidents.length ?? 0) > 0
                  ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
                  : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
              )}
            >
              {data?.incidents.length ?? 0}
            </span>
          </header>
          <ul className="divide-y divide-slate-800 text-xs">
            {(data?.incidents ?? []).map((inc) => {
              const meta = INCIDENT_META[inc.severidad];
              const Icon = meta.icon;
              return (
                <li key={inc.id} className="flex items-start gap-3 px-5 py-3">
                  <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", meta.color)} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-200">
                      {inc.titulo}
                      {inc.vendorId && (
                        <>
                          {" "}
                          ·{" "}
                          <span className="font-mono text-white">
                            {inc.vendorId}
                          </span>
                        </>
                      )}
                    </p>
                    <p className="text-slate-500">
                      {inc.descripcion} · {fmtRelativo(inc.createdAt)}
                    </p>
                  </div>
                </li>
              );
            })}
            {(!data?.incidents || data.incidents.length === 0) && (
              <li className="flex items-start gap-3 px-5 py-3 text-slate-500">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <div className="min-w-0">
                  <p className="text-slate-400">
                    Sin incidentes registrados en <span className="font-mono">incidents</span>.
                  </p>
                </div>
              </li>
            )}
          </ul>
        </div>

        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            Accesos rápidos
          </h3>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link
              href="https://console.firebase.google.com"
              target="_blank"
              className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-300 hover:border-slate-700 hover:text-white"
            >
              Firebase
              <ExternalLink className="h-3 w-3 text-slate-500" />
            </Link>
            <Link
              href="https://vercel.com/dashboard"
              target="_blank"
              className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-300 hover:border-slate-700 hover:text-white"
            >
              Vercel
              <ExternalLink className="h-3 w-3 text-slate-500" />
            </Link>
            <Link
              href="/superadmin/logs"
              className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-300 hover:border-slate-700 hover:text-white"
            >
              Logs sistema
              <ExternalLink className="h-3 w-3 text-slate-500" />
            </Link>
            <Link
              href="/admin"
              className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-300 hover:border-slate-700 hover:text-white"
            >
              Panel admin
              <ExternalLink className="h-3 w-3 text-slate-500" />
            </Link>
          </div>
        </section>
      </section>

      {/* Modal nuevo tenant */}
      <NewTenantModal
        open={newModal}
        onOpenChange={setNewModal}
        onCreated={cargar}
      />
    </div>
  );
}
