"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  ChevronDown,
  CircleDashed,
  DollarSign,
  Handshake,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Rocket,
  Search,
  Trash2,
  TrendingUp,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { SkeletonKpi, SkeletonListRow } from "@/components/superadmin/Skeletons";
import { PLAN_MRR, RUBRO_META } from "@/lib/mercadoVina";
import type {
  Prospecto,
  ProspectoEstado,
  ProspectoPrioridad,
  ProspectoRubro,
} from "@/types";

// =========================================================
// Config visual
// =========================================================

const ESTADO_ORDER: ProspectoEstado[] = [
  "por_contactar",
  "contactado",
  "reunion",
  "propuesta_enviada",
  "convertido",
  "descartado",
];

const ESTADO_META: Record<
  ProspectoEstado,
  { label: string; badge: string; dot: string; desc: string }
> = {
  por_contactar: {
    label: "Por contactar",
    badge: "bg-white/[0.06] text-slate-300 ring-white/15",
    dot: "bg-slate-400",
    desc: "Detectado en el análisis, sin primer contacto",
  },
  contactado: {
    label: "Contactado",
    badge: "bg-sky-500/15 text-sky-300 ring-sky-400/30",
    dot: "bg-sky-400",
    desc: "Primer contacto hecho (IG / WhatsApp / presencial)",
  },
  reunion: {
    label: "Reunión",
    badge: "bg-amber-500/15 text-amber-300 ring-amber-400/30",
    dot: "bg-amber-400",
    desc: "Reunión o demo agendada",
  },
  propuesta_enviada: {
    label: "Propuesta enviada",
    badge: "bg-violet-500/15 text-violet-300 ring-violet-400/30",
    dot: "bg-violet-400",
    desc: "Esperando respuesta a la propuesta",
  },
  convertido: {
    label: "Convertido",
    badge: "bg-emerald-400/15 text-emerald-300 ring-emerald-400/40",
    dot: "bg-emerald-400",
    desc: "Ya es cliente — crear tenant en el Panel",
  },
  descartado: {
    label: "Descartado",
    badge: "bg-rose-500/15 text-rose-300 ring-rose-400/30",
    dot: "bg-rose-400",
    desc: "No calza o no le interesó",
  },
};

const PRIORIDAD_META: Record<
  ProspectoPrioridad,
  { label: string; badge: string }
> = {
  alta: {
    label: "Alta",
    badge: "bg-rose-500/15 text-rose-300 ring-rose-400/30",
  },
  media: {
    label: "Media",
    badge: "bg-amber-500/15 text-amber-300 ring-amber-400/30",
  },
  baja: {
    label: "Baja",
    badge: "bg-white/[0.06] text-slate-400 ring-white/10",
  },
};

/** Escenarios de conversión sobre el mercado potencial. */
const ESCENARIOS = [
  {
    id: "conservador",
    label: "Conservador",
    pct: 0.1,
    desc: "1 de cada 10 marcas firma",
    accent: "text-slate-200",
    ring: "border-white/[0.08]",
  },
  {
    id: "realista",
    label: "Realista",
    pct: 0.2,
    desc: "1 de cada 5 marcas firma",
    accent: "text-emerald-300",
    ring: "border-emerald-400/40",
  },
  {
    id: "optimista",
    label: "Optimista",
    pct: 0.35,
    desc: "1 de cada 3 marcas firma",
    accent: "text-lime-300",
    ring: "border-lime-400/30",
  },
] as const;

const RUBROS: ProspectoRubro[] = Object.keys(RUBRO_META) as ProspectoRubro[];

// =========================================================
// Utilidades
// =========================================================

function fmtCLP(n: number): string {
  return "$" + Math.round(n).toLocaleString("es-CL");
}

const PRIO_RANK: Record<ProspectoPrioridad, number> = {
  alta: 0,
  media: 1,
  baja: 2,
};

// =========================================================
// Slicer (mismo patrón del panel principal)
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
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 shadow-sm hover:bg-slate-800"
      >
        <span className="text-[10px] uppercase tracking-widest text-slate-500">
          {label}
        </span>
        <span className="truncate text-slate-100">{current?.label}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <>
          <div
            aria-hidden
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-20"
          />
          <div className="absolute right-0 z-30 mt-1.5 max-h-64 min-w-[11rem] overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 shadow-xl">
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
                    ? "font-semibold text-emerald-300"
                    : "text-slate-300"
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// =========================================================
// Menú de cambio de estado — popover desktop / bottom sheet móvil
// =========================================================

function EstadoMenu({
  current,
  onSelect,
  onClose,
}: {
  current: ProspectoEstado;
  onSelect: (next: ProspectoEstado) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  const alternativas = ESTADO_ORDER.filter((s) => s !== current);

  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 sm:bg-transparent sm:backdrop-blur-0"
      />
      <div
        role="dialog"
        aria-label="Cambiar etapa del prospecto"
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border border-b-0 border-white/10 bg-slate-950 p-3 pb-8 shadow-2xl shadow-black/60 animate-in slide-in-from-bottom-4 duration-300",
          "sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-1.5 sm:min-w-[15rem] sm:rounded-xl sm:border sm:p-1.5 sm:pb-1.5 sm:slide-in-from-top-2"
        )}
      >
        <div
          aria-hidden
          className="mx-auto mb-2 h-1 w-10 rounded-full bg-white/15 sm:hidden"
        />
        <p className="px-3 pb-1 pt-1 text-[11px] uppercase tracking-widest text-slate-500 sm:hidden">
          Mover a
        </p>
        <ul className="space-y-1">
          {alternativas.map((s) => {
            const meta = ESTADO_META[s];
            return (
              <li key={s}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(s);
                    onClose();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.06]"
                >
                  <span
                    className={cn("h-2 w-2 shrink-0 rounded-full", meta.dot)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-white">
                      {meta.label}
                    </span>
                    <span className="block truncate text-[11px] text-slate-500">
                      {meta.desc}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}

// =========================================================
// Tarjeta de prospecto
// =========================================================

function ProspectoCard({
  p,
  onChangeEstado,
  onDelete,
}: {
  p: Prospecto;
  onChangeEstado: (id: string, next: ProspectoEstado) => void;
  onDelete: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const rubro = RUBRO_META[p.rubro];
  const estado = ESTADO_META[p.estado];
  const prioridad = PRIORIDAD_META[p.prioridad];
  const cerrado = p.estado === "descartado";

  return (
    <article
      className={cn(
        "group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 shadow-lg shadow-black/20 backdrop-blur-xl transition-all duration-300 hover:border-white/[0.1]",
        cerrado && "opacity-50"
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-xl ring-1 ring-white/10">
          {rubro?.emoji ?? "🏬"}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className="truncate text-sm font-bold text-white">
                {p.nombre}
              </h4>
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">
                  {p.zona}
                  {p.direccion ? ` · ${p.direccion}` : ""}
                </span>
              </p>
            </div>

            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                title="Cambiar etapa"
                className={cn(
                  "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 transition-all duration-200 hover:brightness-125 active:scale-[0.97]",
                  estado.badge
                )}
              >
                {estado.label}
                <ChevronDown
                  className={cn(
                    "h-3 w-3 transition-transform duration-200",
                    menuOpen && "rotate-180"
                  )}
                  strokeWidth={2.5}
                />
              </button>
              {menuOpen && (
                <EstadoMenu
                  current={p.estado}
                  onSelect={(next) => onChangeEstado(p.id, next)}
                  onClose={() => setMenuOpen(false)}
                />
              )}
            </div>
          </div>

          {p.notas && (
            <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
              {p.notas}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1",
                prioridad.badge
              )}
            >
              Prioridad {prioridad.label}
            </span>
            <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] font-semibold text-slate-300 ring-1 ring-white/10">
              Plan {p.planSugerido} · {fmtCLP(p.mrrPotencial)}/mes
            </span>
            <span className="rounded-full bg-white/[0.03] px-2 py-0.5 text-[10px] text-slate-500 ring-1 ring-white/[0.06]">
              {rubro?.label ?? p.rubro}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            if (confirm(`¿Eliminar a ${p.nombre} del mercado?`)) onDelete(p.id);
          }}
          aria-label="Eliminar prospecto"
          className="rounded-lg p-1.5 text-slate-600 opacity-0 transition-all duration-200 hover:bg-white/[0.06] hover:text-rose-300 group-hover:opacity-100 active:scale-95"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  );
}

// =========================================================
// Modal: nuevo prospecto
// =========================================================

function NewProspectoModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [rubro, setRubro] = useState<ProspectoRubro>("cafeteria");
  const [zona, setZona] = useState("Viña Centro");
  const [direccion, setDireccion] = useState("");
  const [prioridad, setPrioridad] = useState<ProspectoPrioridad>("media");
  const [plan, setPlan] = useState("starter");
  const [notas, setNotas] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setNombre("");
      setRubro("cafeteria");
      setZona("Viña Centro");
      setDireccion("");
      setPrioridad("media");
      setPlan("starter");
      setNotas("");
      setErr(null);
    }
  }, [open]);

  if (!open) return null;

  const inputCls =
    "w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-emerald-400/60 focus:ring-1 focus:ring-emerald-400/30";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/superadmin/prospectos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken ?? ""}`,
        },
        body: JSON.stringify({
          nombre: nombre.trim(),
          rubro,
          zona: zona.trim() || "Viña del Mar",
          direccion: direccion.trim() || null,
          prioridad,
          planSugerido: plan,
          notas: notas.trim() || null,
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
        aria-label="Nuevo prospecto"
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 max-h-[90dvh] overflow-y-auto rounded-t-3xl border border-b-0 border-white/10 bg-slate-950 p-5 pb-8 shadow-2xl shadow-black/60 animate-in slide-in-from-bottom-6 duration-300",
          "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[calc(100%-2rem)] sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:border sm:p-6"
        )}
      >
        <div
          aria-hidden
          className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/15 sm:hidden"
        />
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-white">Nuevo prospecto</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Agrega una marca detectada en terreno o por redes.
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
              Nombre de la marca
            </label>
            <input
              autoFocus
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              maxLength={120}
              placeholder="Ej. Café del Puerto"
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-widest text-slate-400">
                Rubro
              </label>
              <select
                value={rubro}
                onChange={(e) => setRubro(e.target.value as ProspectoRubro)}
                className={inputCls}
              >
                {RUBROS.map((r) => (
                  <option key={r} value={r} className="bg-slate-950">
                    {RUBRO_META[r].emoji} {RUBRO_META[r].label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-widest text-slate-400">
                Prioridad
              </label>
              <select
                value={prioridad}
                onChange={(e) =>
                  setPrioridad(e.target.value as ProspectoPrioridad)
                }
                className={inputCls}
              >
                <option value="alta" className="bg-slate-950">
                  Alta
                </option>
                <option value="media" className="bg-slate-950">
                  Media
                </option>
                <option value="baja" className="bg-slate-950">
                  Baja
                </option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-widest text-slate-400">
                Zona
              </label>
              <input
                value={zona}
                onChange={(e) => setZona(e.target.value)}
                placeholder="Viña Centro"
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-widest text-slate-400">
                Dirección (opcional)
              </label>
              <input
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="5 Norte 123"
                className={inputCls}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-widest text-slate-400">
              Plan sugerido
            </label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className={inputCls}
            >
              {Object.entries(PLAN_MRR).map(([id, mrr]) => (
                <option key={id} value={id} className="bg-slate-950">
                  {id} · {fmtCLP(mrr)}/mes
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-widest text-slate-400">
              ¿Por qué le calza el producto?
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              maxLength={300}
              placeholder="Ej. Compra recurrente semanal, sin programa de fidelización…"
              className={cn(inputCls, "resize-none")}
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
              disabled={busy || !nombre.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-emerald-400 to-lime-400 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/25 transition-all duration-200 hover:from-emerald-300 hover:to-lime-300 hover:shadow-emerald-500/40 active:scale-[0.98] disabled:opacity-50"
            >
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {busy ? "Guardando…" : "Agregar al mercado"}
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

type RubroFilter = "todos" | ProspectoRubro;
type EstadoFilter = "todos" | ProspectoEstado;
type PrioridadFilter = "todas" | ProspectoPrioridad;

const ESTADO_OPTIONS = [
  { value: "todos" as const, label: "Todos" },
  ...ESTADO_ORDER.map((s) => ({ value: s, label: ESTADO_META[s].label })),
];

const PRIORIDAD_OPTIONS = [
  { value: "todas" as const, label: "Todas" },
  { value: "alta" as const, label: "Alta" },
  { value: "media" as const, label: "Media" },
  { value: "baja" as const, label: "Baja" },
];

export default function ProyeccionPage() {
  const { firebaseUser, loading: authLoading } = useAuth();
  const authReady = !authLoading && !!firebaseUser;

  const [prospectos, setProspectos] = useState<Prospecto[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [rubroFilter, setRubroFilter] = useState<RubroFilter>("todos");
  const [estadoFilter, setEstadoFilter] = useState<EstadoFilter>("todos");
  const [prioridadFilter, setPrioridadFilter] =
    useState<PrioridadFilter>("todas");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/superadmin/prospectos", {
        headers: { Authorization: `Bearer ${idToken ?? ""}` },
      });
      const json = (await res.json().catch(() => ({}))) as {
        prospectos?: Prospecto[];
        error?: string;
      };
      if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
      setProspectos(json.prospectos ?? []);
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

  // ── Métricas de mercado (sobre TODO el dataset, no lo filtrado) ──
  const mercado = useMemo(() => {
    const activos = prospectos.filter((p) => p.estado !== "descartado");
    const enJuego = activos.filter((p) => p.estado !== "convertido");
    const convertidos = prospectos.filter((p) => p.estado === "convertido");
    const enConversacion = prospectos.filter(
      (p) =>
        p.estado === "contactado" ||
        p.estado === "reunion" ||
        p.estado === "propuesta_enviada"
    );
    const mrrPotencial = enJuego.reduce((a, p) => a + p.mrrPotencial, 0);
    const mrrConvertido = convertidos.reduce((a, p) => a + p.mrrPotencial, 0);
    return {
      total: activos.length,
      enJuego,
      convertidos: convertidos.length,
      enConversacion: enConversacion.length,
      mrrPotencial,
      mrrConvertido,
    };
  }, [prospectos]);

  // ── Resumen por rubro (para los chips-filtro) ──
  const porRubro = useMemo(() => {
    const acc = new Map<ProspectoRubro, { count: number; mrr: number }>();
    for (const p of prospectos) {
      if (p.estado === "descartado") continue;
      const cur = acc.get(p.rubro) ?? { count: 0, mrr: 0 };
      cur.count += 1;
      cur.mrr += p.mrrPotencial;
      acc.set(p.rubro, cur);
    }
    return acc;
  }, [prospectos]);

  // ── Lista filtrada + ordenada (prioridad → nombre, descartados al final) ──
  const filtrados = useMemo(() => {
    const list = prospectos.filter((p) => {
      if (rubroFilter !== "todos" && p.rubro !== rubroFilter) return false;
      if (estadoFilter !== "todos" && p.estado !== estadoFilter) return false;
      if (prioridadFilter !== "todas" && p.prioridad !== prioridadFilter)
        return false;
      if (
        search &&
        !`${p.nombre} ${p.zona} ${p.direccion ?? ""}`
          .toLowerCase()
          .includes(search.toLowerCase())
      )
        return false;
      return true;
    });
    return list.sort((a, b) => {
      const aDesc = a.estado === "descartado" ? 1 : 0;
      const bDesc = b.estado === "descartado" ? 1 : 0;
      if (aDesc !== bDesc) return aDesc - bDesc;
      if (PRIO_RANK[a.prioridad] !== PRIO_RANK[b.prioridad])
        return PRIO_RANK[a.prioridad] - PRIO_RANK[b.prioridad];
      return a.nombre.localeCompare(b.nombre, "es");
    });
  }, [prospectos, rubroFilter, estadoFilter, prioridadFilter, search]);

  // ── Mutaciones con optimistic update + rollback ──
  const changeEstado = useCallback(
    async (id: string, next: ProspectoEstado) => {
      const prev = prospectos;
      setProspectos((ps) =>
        ps.map((p) => (p.id === id ? { ...p, estado: next } : p))
      );
      try {
        const idToken = await auth.currentUser?.getIdToken();
        const res = await fetch("/api/superadmin/prospectos", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken ?? ""}`,
          },
          body: JSON.stringify({ id, estado: next }),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error || `Error ${res.status}`);
        }
      } catch (e) {
        setProspectos(prev);
        setErr((e as Error).message);
      }
    },
    [prospectos]
  );

  const del = useCallback(
    async (id: string) => {
      const prev = prospectos;
      setProspectos((ps) => ps.filter((p) => p.id !== id));
      try {
        const idToken = await auth.currentUser?.getIdToken();
        const res = await fetch(
          `/api/superadmin/prospectos?id=${encodeURIComponent(id)}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${idToken ?? ""}` },
          }
        );
        if (!res.ok) throw new Error(`Error ${res.status}`);
      } catch (e) {
        setProspectos(prev);
        setErr((e as Error).message);
      }
    },
    [prospectos]
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* HEADER */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-300">
            Proyección
          </p>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
            Mercado Viña del Mar
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Marcas reales de la ciudad a las que se les puede ofrecer la
            plataforma. Levantadas de rankings públicos priorizando negocios con
            compra recurrente — el mismo perfil de SushiPro.
          </p>
        </div>
        <button
          type="button"
          onClick={cargar}
          disabled={loading}
          className="flex shrink-0 items-center justify-center gap-1.5 self-start rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-slate-300 transition-all duration-200 hover:bg-white/[0.06] active:scale-[0.98] disabled:opacity-60 sm:self-auto"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          Actualizar
        </button>
      </header>

      {err && (
        <div className="flex items-start gap-2 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">No pudimos cargar el mercado</p>
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

      {loading ? (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonKpi key={i} />
            ))}
          </div>
          <div className="space-y-2.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonListRow key={i} />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {(
              [
                {
                  label: "Mercado detectado",
                  value: String(mercado.total),
                  hint: "marcas en el radar",
                  icon: Building2,
                  tone: "from-indigo-500/20 to-indigo-500/0 text-indigo-300 ring-indigo-500/30",
                },
                {
                  label: "MRR potencial",
                  value: fmtCLP(mercado.mrrPotencial),
                  hint: "si todo el mercado firma",
                  icon: DollarSign,
                  tone: "from-emerald-400/25 to-emerald-400/0 text-emerald-300 ring-emerald-400/40",
                },
                {
                  label: "En conversación",
                  value: String(mercado.enConversacion),
                  hint: "contactados · reunión · propuesta",
                  icon: Handshake,
                  tone: "from-amber-500/20 to-amber-500/0 text-amber-300 ring-amber-500/30",
                },
                {
                  label: "Convertidos",
                  value: String(mercado.convertidos),
                  hint:
                    mercado.mrrConvertido > 0
                      ? `${fmtCLP(mercado.mrrConvertido)}/mes ganados`
                      : "aún ninguno — ¡a vender!",
                  icon: Rocket,
                  tone: "from-fuchsia-500/20 to-fuchsia-500/0 text-fuchsia-300 ring-fuchsia-500/30",
                },
              ] satisfies {
                label: string;
                value: string;
                hint: string;
                icon: LucideIcon;
                tone: string;
              }[]
            ).map((kpi, i) => {
              const Icon = kpi.icon;
              return (
                <div
                  key={kpi.label}
                  className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 shadow-xl shadow-black/20 backdrop-blur-xl transition-all duration-300 hover:border-white/10 hover:bg-white/[0.04] animate-in fade-in slide-in-from-bottom-2 fill-mode-both sm:p-5"
                  style={{
                    animationDuration: "500ms",
                    animationDelay: `${i * 80}ms`,
                  }}
                >
                  <div
                    className={cn(
                      "pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br opacity-70 blur-2xl",
                      kpi.tone
                    )}
                  />
                  <span
                    className={cn(
                      "relative flex h-9 w-9 items-center justify-center rounded-xl ring-1",
                      kpi.tone
                    )}
                  >
                    <Icon className="h-4 w-4" strokeWidth={2.25} />
                  </span>
                  <p className="relative mt-3 text-[10px] font-medium uppercase tracking-widest text-slate-400 sm:text-[11px]">
                    {kpi.label}
                  </p>
                  <p className="relative mt-1 text-xl font-bold tabular-nums text-white sm:text-2xl">
                    {kpi.value}
                  </p>
                  <p className="relative mt-0.5 text-[11px] text-slate-400 sm:text-xs">
                    {kpi.hint}
                  </p>
                </div>
              );
            })}
          </section>

          {/* ESCENARIOS DE PROYECCIÓN */}
          <section className="space-y-3">
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-300">
                <TrendingUp
                  className="h-4 w-4 text-emerald-300"
                  strokeWidth={2.25}
                />
                Proyección de ingresos
              </h2>
              <p className="text-xs text-slate-500">
                Escenarios de conversión sobre las {mercado.enJuego.length}{" "}
                marcas aún en juego (excluye convertidos y descartados).
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {ESCENARIOS.map((esc) => {
                const marcas = Math.round(mercado.enJuego.length * esc.pct);
                const mrr = Math.round(mercado.mrrPotencial * esc.pct);
                const destacado = esc.id === "realista";
                return (
                  <div
                    key={esc.id}
                    className={cn(
                      "relative overflow-hidden rounded-2xl border bg-white/[0.02] p-4 shadow-xl shadow-black/20 backdrop-blur-xl sm:p-5",
                      esc.ring,
                      destacado && "bg-emerald-400/[0.04]"
                    )}
                  >
                    {destacado && (
                      <span className="absolute right-3 top-3 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-400/30">
                        Meta
                      </span>
                    )}
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                      {esc.label} · {Math.round(esc.pct * 100)}%
                    </p>
                    <p
                      className={cn(
                        "mt-2 text-2xl font-bold tabular-nums",
                        esc.accent
                      )}
                    >
                      {fmtCLP(mrr)}
                      <span className="text-xs font-medium text-slate-500">
                        {" "}
                        /mes
                      </span>
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      ≈ {marcas} clientes nuevos · {fmtCLP(mrr * 12)} al año
                    </p>
                    <p className="mt-2 text-[11px] text-slate-500">
                      {esc.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* RESUMEN POR RUBRO — chips que filtran la lista */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              Mercado por rubro
            </h2>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setRubroFilter("todos")}
                className={cn(
                  "rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-[0.98]",
                  rubroFilter === "todos"
                    ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-300"
                    : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
                )}
              >
                Todos ({mercado.total})
              </button>
              {RUBROS.filter((r) => (porRubro.get(r)?.count ?? 0) > 0).map(
                (r) => {
                  const info = porRubro.get(r)!;
                  const activo = rubroFilter === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRubroFilter(activo ? "todos" : r)}
                      title={`${fmtCLP(info.mrr)}/mes potencial`}
                      className={cn(
                        "rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-[0.98]",
                        activo
                          ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-300"
                          : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
                      )}
                    >
                      {RUBRO_META[r].emoji} {RUBRO_META[r].label} ({info.count})
                    </button>
                  );
                }
              )}
            </div>
          </section>

          {/* LISTA DE PROSPECTOS */}
          <section className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                  Marcas objetivo
                </h2>
                <p className="text-xs text-slate-500">
                  {filtrados.length} marca{filtrados.length === 1 ? "" : "s"} en
                  la vista
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="grid grid-cols-2 gap-2">
                  <Slicer<EstadoFilter>
                    label="Etapa"
                    value={estadoFilter}
                    options={ESTADO_OPTIONS}
                    onChange={setEstadoFilter}
                  />
                  <Slicer<PrioridadFilter>
                    label="Prioridad"
                    value={prioridadFilter}
                    options={PRIORIDAD_OPTIONS}
                    onChange={setPrioridadFilter}
                  />
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar marca o zona…"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2 pl-9 pr-3 text-xs text-slate-200 placeholder:text-slate-500 transition-colors focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/30"
                  />
                </div>
              </div>
            </div>

            {filtrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
                <CircleDashed className="h-5 w-5 text-slate-500" />
                <p className="text-xs text-slate-400">
                  Ninguna marca calza con los filtros.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {filtrados.map((p) => (
                  <ProspectoCard
                    key={p.id}
                    p={p}
                    onChangeEstado={changeEstado}
                    onDelete={del}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* FAB nuevo prospecto */}
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        aria-label="Nuevo prospecto"
        className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-lime-400 text-slate-950 shadow-2xl shadow-emerald-500/40 transition-all duration-200 hover:scale-105 hover:shadow-emerald-500/60 active:scale-95 lg:bottom-8 lg:right-8"
      >
        <Plus className="h-6 w-6" strokeWidth={3} />
      </button>

      <NewProspectoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={cargar}
      />
    </div>
  );
}
