"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import {
  ExternalLink,
  Eye,
  EyeOff,
  Flame,
  Gift,
  LayoutDashboard,
  Mail,
  MapPin,
  Pencil,
  Plus,
  Search,
  Settings,
  Sparkles,
  Store,
  X,
  Zap,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { AdminGate } from "@/components/AdminGate";
import { useAuth } from "@/context/AuthContext";
import { Switch } from "@/components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { PORTAL_NAME } from "@/lib/portal";
import {
  MOCK_TENANTS,
  TENANTS_COLLECTION,
  type TenantLocale,
  type TenantLocaleDirectoryConfig,
} from "@/lib/officialTenants";
import { cn } from "@/lib/utils";

// =========================================================
// /admin/locales — Centro de Mando de tenants del portal.
// SaaS admin: sidebar izq + área de trabajo con tabla + drawer
// de edición profunda. La única fuente de verdad es Firestore
// `tenants/*` — cada toggle escribe directo con `updateDoc`.
// =========================================================

const NAV_ITEMS: {
  href?: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
  disabled?: boolean;
}[] = [
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    href: "/admin/locales",
    label: "Locales & Directorio",
    icon: <Store className="h-4 w-4" />,
    active: true,
  },
  {
    label: "Leads B2B",
    icon: <Mail className="h-4 w-4" />,
    disabled: true,
  },
  {
    href: "/admin/premios",
    label: "Catálogo de Premios",
    icon: <Gift className="h-4 w-4" />,
  },
  {
    label: "Configuración",
    icon: <Settings className="h-4 w-4" />,
    disabled: true,
  },
];

const RUBROS_ADMIN = [
  "Gastronomía",
  "Cafetería",
  "Barbería & Belleza",
  "Bar & Cervecería",
  "Retail",
  "Servicios",
  "Otro",
];

const CIUDADES_ADMIN = [
  "Viña del Mar",
  "Valparaíso",
  "Curauma",
  "Reñaca",
  "Concón",
  "Providencia",
  "Quilpué",
  "Villa Alemana",
];

function emptyTenant(): TenantLocale {
  return {
    id: "",
    slug: "",
    nombre: "",
    status: "active",
    tier: "standard",
    emoji: "🏪",
    directoryConfig: {
      isPublished: false,
      isPremium: false,
      welcomeStamp: false,
      happyHour: { active: false, label: "" },
      premiosFlashStock: 0,
    },
  };
}

function toSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ─── Sidebar ─────────────────────────────────────────────

function Sidebar({ resumen }: { resumen: { total: number; primeraFila: number } }) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
      <div className="border-b border-slate-100 p-6">
        <Link
          href="/"
          className="flex items-baseline gap-1 font-headline text-[20px] font-black leading-none tracking-tight text-slate-900"
        >
          {PORTAL_NAME}
          <span className="text-primary">.</span>
          <span className="ml-1.5 rounded-md bg-slate-900 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
            Admin
          </span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {NAV_ITEMS.map((item) => {
          const cls = cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-semibold transition-colors",
            item.active
              ? "bg-slate-900 text-white shadow-sm"
              : item.disabled
                ? "cursor-not-allowed text-slate-400"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          );
          const inner = (
            <>
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded",
                  item.active
                    ? "bg-white/15"
                    : item.disabled
                      ? "bg-slate-100"
                      : "bg-slate-100 text-slate-500"
                )}
              >
                {item.icon}
              </span>
              <span className="flex-1">{item.label}</span>
              {item.disabled && (
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Pronto
                </span>
              )}
            </>
          );
          if (item.href && !item.disabled) {
            return (
              <Link key={item.label} href={item.href} className={cls}>
                {inner}
              </Link>
            );
          }
          return (
            <div key={item.label} className={cls}>
              {inner}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 p-4">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Resumen del portal
          </p>
          <p className="mt-1.5 text-[13px] font-semibold text-slate-900">
            <span className="tabular-nums">{resumen.total}</span> locales
            {" · "}
            <span className="tabular-nums text-amber-600">
              {resumen.primeraFila}
            </span>{" "}
            en Primera Fila
          </p>
        </div>
      </div>
    </aside>
  );
}

// ─── Top header ──────────────────────────────────────────

function TopBar({
  search,
  onSearchChange,
  onNew,
  adminName,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  onNew: () => void;
  adminName: string;
}) {
  return (
    <header className="flex items-center gap-4 border-b border-slate-200 bg-white px-6 py-4">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar local por nombre o rubro…"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-[13px] text-slate-800 outline-none transition-colors focus:border-indigo-500 focus:bg-white"
        />
      </div>

      <button
        type="button"
        onClick={onNew}
        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-[13px] font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-800"
      >
        <Plus className="h-4 w-4" />
        Nuevo Local
      </button>

      <div className="ml-2 flex items-center gap-2 border-l border-slate-200 pl-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-[13px] font-bold text-white">
          {adminName[0]?.toUpperCase() ?? "A"}
        </span>
        <div className="hidden text-right md:block">
          <p className="text-[13px] font-semibold text-slate-900">
            {adminName}
          </p>
          <p className="text-[11px] text-slate-500">Administrador</p>
        </div>
      </div>
    </header>
  );
}

// ─── Traffic icon (con estado activo/inactivo) ───────────

function TrafficIcon({
  active,
  icon,
  label,
  tone,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  tone: "emerald" | "amber" | "rose";
}) {
  const activeCls = {
    emerald: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    amber: "bg-amber-100 text-amber-700 ring-amber-200",
    rose: "bg-rose-100 text-rose-700 ring-rose-200",
  }[tone];
  return (
    <span
      title={`${label} ${active ? "activo" : "apagado"}`}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-full ring-1",
        active
          ? activeCls
          : "bg-slate-50 text-slate-300 ring-slate-100"
      )}
    >
      {icon}
    </span>
  );
}

// ─── Table row ───────────────────────────────────────────

function TenantRow({
  t,
  onToggleField,
  onEdit,
  onSuspend,
}: {
  t: TenantLocale;
  onToggleField: (
    id: string,
    path: keyof TenantLocaleDirectoryConfig | "status",
    value: unknown
  ) => Promise<void>;
  onEdit: (t: TenantLocale) => void;
  onSuspend: (t: TenantLocale) => Promise<void>;
}) {
  const suspended = t.status !== "active";
  return (
    <div
      className={cn(
        "grid grid-cols-12 items-center gap-4 border-b border-slate-100 px-6 py-4 transition-colors hover:bg-slate-50/50",
        suspended && "opacity-60"
      )}
    >
      {/* Local */}
      <div className="col-span-4 flex items-center gap-3 min-w-0">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[22px] ring-1 ring-slate-100"
          style={{
            backgroundColor: t.primaryColor
              ? `${t.primaryColor}18`
              : "rgb(241 245 249)",
          }}
        >
          {t.emoji ?? "🏪"}
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900">{t.nombre}</p>
          <p className="mt-0.5 flex items-center gap-1 truncate text-[12px] text-slate-500">
            <span>{t.rubro ?? "Sin rubro"}</span>
            {t.ciudad && (
              <>
                <span>·</span>
                <MapPin className="h-3 w-3" />
                <span>{t.ciudad}</span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Publicado */}
      <div className="col-span-2 flex items-center justify-center">
        <Switch
          checked={t.directoryConfig.isPublished}
          onCheckedChange={(v) =>
            onToggleField(t.id, "isPublished", v)
          }
        />
      </div>

      {/* Primera Fila */}
      <div className="col-span-2 flex items-center justify-center">
        <Switch
          checked={t.directoryConfig.isPremium}
          onCheckedChange={(v) => onToggleField(t.id, "isPremium", v)}
          className="data-[state=checked]:bg-amber-500"
        />
      </div>

      {/* Tráfico */}
      <div className="col-span-2 flex items-center justify-center gap-1.5">
        <TrafficIcon
          active={!!t.directoryConfig.welcomeStamp}
          icon={<Gift className="h-3.5 w-3.5" />}
          label="1er Sello Gratis"
          tone="emerald"
        />
        <TrafficIcon
          active={!!t.directoryConfig.happyHour?.active}
          icon={<Zap className="h-3.5 w-3.5" />}
          label="Happy Hour"
          tone="amber"
        />
        <TrafficIcon
          active={(t.directoryConfig.premiosFlashStock ?? 0) > 0}
          icon={<Flame className="h-3.5 w-3.5" />}
          label="Premio Flash"
          tone="rose"
        />
      </div>

      {/* Acciones */}
      <div className="col-span-2 flex items-center justify-end gap-1.5">
        <button
          type="button"
          onClick={() => onEdit(t)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors hover:bg-slate-900 hover:text-white"
          title="Editar configuración"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <a
          href={`/club/${t.slug}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors hover:bg-slate-900 hover:text-white"
          title="Ver en el directorio"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
        <button
          type="button"
          onClick={() => onSuspend(t)}
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
            suspended
              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
              : "bg-rose-50 text-rose-600 hover:bg-rose-100"
          )}
          title={suspended ? "Reactivar" : "Suspender"}
        >
          {suspended ? (
            <Eye className="h-3.5 w-3.5" />
          ) : (
            <EyeOff className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Drawer de edición ───────────────────────────────────

function FieldRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </span>
      {children}
      {hint && (
        <span className="block text-[11px] leading-relaxed text-slate-500">
          {hint}
        </span>
      )}
    </label>
  );
}

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-[13px] text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white";

function SwitchRow({
  title,
  hint,
  checked,
  onChange,
  accent,
}: {
  title: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  accent?: "amber" | "emerald" | "rose";
}) {
  const accentCls = accent
    ? {
        amber: "data-[state=checked]:bg-amber-500",
        emerald: "data-[state=checked]:bg-emerald-500",
        rose: "data-[state=checked]:bg-rose-500",
      }[accent]
    : "";
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-slate-900">{title}</p>
        {hint && (
          <p className="mt-1 text-[12px] leading-relaxed text-slate-600">
            {hint}
          </p>
        )}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} className={accentCls} />
    </div>
  );
}

function TenantDrawer({
  tenant,
  isNew,
  onClose,
  onSave,
}: {
  tenant: TenantLocale;
  isNew: boolean;
  onClose: () => void;
  onSave: (t: TenantLocale, isNew: boolean) => Promise<void>;
}) {
  const [draft, setDraft] = useState<TenantLocale>(tenant);
  const [saving, setSaving] = useState(false);

  useEffect(() => setDraft(tenant), [tenant]);

  const patchDraft = <K extends keyof TenantLocale>(
    key: K,
    value: TenantLocale[K]
  ) => setDraft((d) => ({ ...d, [key]: value }));

  const patchDirectory = <K extends keyof TenantLocaleDirectoryConfig>(
    key: K,
    value: TenantLocaleDirectoryConfig[K]
  ) =>
    setDraft((d) => ({
      ...d,
      directoryConfig: { ...d.directoryConfig, [key]: value },
    }));

  const handleSave = async () => {
    if (!draft.nombre.trim()) return;
    setSaving(true);
    try {
      const finalDraft: TenantLocale = {
        ...draft,
        slug: draft.slug || toSlug(draft.nombre),
        id: draft.id || draft.slug || toSlug(draft.nombre),
      };
      await onSave(finalDraft, isNew);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div
        aria-hidden
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-8 py-6">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              {isNew ? "Nuevo local" : "Editar local"}
            </p>
            <h2 className="mt-1 font-headline text-[24px] font-black tracking-tight text-slate-900">
              {draft.nombre || "Sin nombre"}
            </h2>
            <p className="mt-0.5 truncate text-[12px] text-slate-500">
              /club/{draft.slug || toSlug(draft.nombre) || "…"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="basicos" className="px-8 py-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basicos">Datos básicos</TabsTrigger>
              <TabsTrigger value="monetizacion">Monetización</TabsTrigger>
              <TabsTrigger value="gatillos">Gatillos</TabsTrigger>
            </TabsList>

            {/* ── Sección A: Datos Básicos ── */}
            <TabsContent value="basicos" className="mt-6 space-y-5">
              <FieldRow label="Nombre del comercio">
                <input
                  type="text"
                  value={draft.nombre}
                  onChange={(e) => patchDraft("nombre", e.target.value)}
                  placeholder="Barbería Ferraza"
                  className={inputCls}
                />
              </FieldRow>

              <div className="grid grid-cols-2 gap-4">
                <FieldRow
                  label="Slug / ID"
                  hint={`URL pública: /club/${draft.slug || toSlug(draft.nombre) || "…"}`}
                >
                  <input
                    type="text"
                    value={draft.slug}
                    onChange={(e) =>
                      patchDraft("slug", toSlug(e.target.value))
                    }
                    placeholder="barberia-ferraza"
                    className={inputCls}
                  />
                </FieldRow>
                <FieldRow label="Emoji del club">
                  <input
                    type="text"
                    value={draft.emoji ?? ""}
                    onChange={(e) => patchDraft("emoji", e.target.value)}
                    placeholder="🏪"
                    maxLength={4}
                    className={inputCls}
                  />
                </FieldRow>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FieldRow label="Rubro">
                  <select
                    value={draft.rubro ?? ""}
                    onChange={(e) => patchDraft("rubro", e.target.value)}
                    className={inputCls}
                  >
                    <option value="">Elige un rubro</option>
                    {RUBROS_ADMIN.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </FieldRow>
                <FieldRow label="Ciudad / Zona">
                  <select
                    value={draft.ciudad ?? ""}
                    onChange={(e) => patchDraft("ciudad", e.target.value)}
                    className={inputCls}
                  >
                    <option value="">Elige una zona</option>
                    {CIUDADES_ADMIN.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </FieldRow>
              </div>

              <FieldRow
                label="URL de portada (.webp)"
                hint="Puede ser una URL de Firebase Storage o una ruta local /assets/…"
              >
                <input
                  type="url"
                  value={draft.coverImageUrl ?? ""}
                  onChange={(e) =>
                    patchDraft("coverImageUrl", e.target.value)
                  }
                  placeholder="https://firebasestorage.googleapis.com/…/portada.webp"
                  className={inputCls}
                />
              </FieldRow>

              <FieldRow label="URL del logo">
                <input
                  type="url"
                  value={draft.logoUrl ?? ""}
                  onChange={(e) => patchDraft("logoUrl", e.target.value)}
                  placeholder="https://firebasestorage.googleapis.com/…/logo.png"
                  className={inputCls}
                />
              </FieldRow>

              <FieldRow
                label="Color de marca"
                hint="HEX. Se usa como base para chips, halos y fallbacks."
              >
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={draft.primaryColor ?? "#877AB8"}
                    onChange={(e) =>
                      patchDraft("primaryColor", e.target.value)
                    }
                    className="h-10 w-14 shrink-0 cursor-pointer rounded-lg border border-slate-200"
                  />
                  <input
                    type="text"
                    value={draft.primaryColor ?? ""}
                    onChange={(e) =>
                      patchDraft("primaryColor", e.target.value)
                    }
                    placeholder="#877AB8"
                    className={inputCls}
                  />
                </div>
              </FieldRow>
            </TabsContent>

            {/* ── Sección B: Monetización & Vitrina ── */}
            <TabsContent value="monetizacion" className="mt-6 space-y-5">
              <SwitchRow
                title="Primera Fila (Socio Premium)"
                hint="El club aparece en el Bento destacado de /explora sobre el directorio general."
                checked={draft.directoryConfig.isPremium}
                onChange={(v) => {
                  patchDirectory("isPremium", v);
                  patchDraft("tier", v ? "primera_fila" : "standard");
                }}
                accent="amber"
              />

              <FieldRow
                label="Orden en el Bento (0–99)"
                hint="Menor número = más arriba. Solo aplica cuando Primera Fila está activo."
              >
                <input
                  type="number"
                  min={0}
                  max={99}
                  value={draft.directoryConfig.premiumOrder ?? ""}
                  onChange={(e) =>
                    patchDirectory(
                      "premiumOrder",
                      e.target.value === ""
                        ? undefined
                        : Number(e.target.value)
                    )
                  }
                  disabled={!draft.directoryConfig.isPremium}
                  placeholder="0"
                  className={cn(inputCls, "disabled:opacity-50")}
                />
              </FieldRow>

              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 text-[12px] leading-relaxed text-indigo-950">
                <p className="font-semibold">Vitrina activa</p>
                <p className="mt-1 text-indigo-900/80">
                  Publicado en /explora:{" "}
                  <strong>
                    {draft.directoryConfig.isPublished ? "Sí" : "No"}
                  </strong>{" "}
                  · Primera Fila:{" "}
                  <strong>
                    {draft.directoryConfig.isPremium ? "Sí" : "No"}
                  </strong>
                </p>
              </div>

              <SwitchRow
                title="Publicado en /explora"
                hint="Interruptor maestro. Si está apagado, el club no aparece en el portal."
                checked={draft.directoryConfig.isPublished}
                onChange={(v) => patchDirectory("isPublished", v)}
                accent="emerald"
              />
            </TabsContent>

            {/* ── Sección C: Gatillos de tráfico ── */}
            <TabsContent value="gatillos" className="mt-6 space-y-5">
              <SwitchRow
                title="🎁 1er Sello de bienvenida"
                hint="Regala 1 sello al usuario que se registra en este club por primera vez."
                checked={!!draft.directoryConfig.welcomeStamp}
                onChange={(v) => patchDirectory("welcomeStamp", v)}
                accent="emerald"
              />

              <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                <SwitchRow
                  title="⚡ Happy Hour digital (sellos x2)"
                  hint="Durante la ventana definida, cada compra suma sellos dobles."
                  checked={!!draft.directoryConfig.happyHour?.active}
                  onChange={(v) =>
                    patchDirectory("happyHour", {
                      active: v,
                      label: draft.directoryConfig.happyHour?.label ?? "",
                    })
                  }
                  accent="amber"
                />
                <FieldRow
                  label="Texto del badge"
                  hint="Se muestra en el chip promocional del club."
                >
                  <input
                    type="text"
                    value={draft.directoryConfig.happyHour?.label ?? ""}
                    onChange={(e) =>
                      patchDirectory("happyHour", {
                        active:
                          !!draft.directoryConfig.happyHour?.active,
                        label: e.target.value,
                      })
                    }
                    disabled={!draft.directoryConfig.happyHour?.active}
                    placeholder="⚡ ¡SELLOS X2 HOY 18–20 h!"
                    className={cn(inputCls, "disabled:opacity-50")}
                  />
                </FieldRow>
              </div>

              <div className="space-y-4 rounded-xl border border-rose-200 bg-rose-50/50 p-4">
                <p className="text-[13px] font-semibold text-slate-900">
                  🔥 Premio Flash con stock limitado
                </p>
                <p className="text-[12px] leading-relaxed text-slate-600">
                  Ingresa cuántos cupos quedan. Cuando llega a 0, la promo
                  se apaga sola. Usa números bajos para generar FOMO.
                </p>
                <FieldRow label="Stock disponible">
                  <input
                    type="number"
                    min={0}
                    value={draft.directoryConfig.premiosFlashStock ?? 0}
                    onChange={(e) =>
                      patchDirectory(
                        "premiosFlashStock",
                        Number(e.target.value) || 0
                      )
                    }
                    placeholder="0"
                    className={inputCls}
                  />
                </FieldRow>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-8 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-[13px] font-semibold text-slate-600 transition-colors hover:bg-white hover:text-slate-900"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !draft.nombre.trim()}
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-[13px] font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          >
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Página ──────────────────────────────────────────────

function AdminLocalesInner() {
  const { usuario } = useAuth();
  const { toast } = useToast();
  const [tenants, setTenants] = useState<TenantLocale[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMock, setIsMock] = useState(false);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<{
    tenant: TenantLocale;
    isNew: boolean;
  } | null>(null);

  // Subscripción a Firestore
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, TENANTS_COLLECTION),
      (snap) => {
        const list: TenantLocale[] = [];
        snap.forEach((d) => {
          const data = d.data() as Partial<TenantLocale>;
          if (!data.directoryConfig) return;
          list.push({
            id: d.id,
            slug: data.slug ?? d.id,
            nombre: data.nombre ?? d.id,
            status: (data.status ?? "pending") as TenantLocale["status"],
            tier: data.tier ?? "standard",
            rubro: data.rubro,
            ciudad: data.ciudad,
            emoji: data.emoji,
            logoUrl: data.logoUrl,
            coverImageUrl: data.coverImageUrl,
            primaryColor: data.primaryColor,
            directoryConfig: data.directoryConfig,
          });
        });
        if (list.length > 0) {
          setTenants(list.sort((a, b) => a.nombre.localeCompare(b.nombre)));
          setIsMock(false);
        } else {
          setTenants(MOCK_TENANTS);
          setIsMock(true);
        }
        setLoading(false);
      },
      () => {
        setTenants(MOCK_TENANTS);
        setIsMock(true);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tenants;
    return tenants.filter(
      (t) =>
        t.nombre.toLowerCase().includes(q) ||
        (t.rubro?.toLowerCase().includes(q) ?? false) ||
        (t.ciudad?.toLowerCase().includes(q) ?? false) ||
        t.slug.toLowerCase().includes(q)
    );
  }, [tenants, search]);

  const resumen = useMemo(
    () => ({
      total: tenants.length,
      primeraFila: tenants.filter(
        (t) => t.directoryConfig.isPremium || t.tier === "primera_fila"
      ).length,
    }),
    [tenants]
  );

  // ─── Persistencia ──────────────────────────────────────

  const toggleDirectoryField = async (
    id: string,
    field: keyof TenantLocaleDirectoryConfig | "status",
    value: unknown
  ) => {
    const tenant = tenants.find((t) => t.id === id);
    if (!tenant) return;
    try {
      if (field === "status") {
        await updateDoc(doc(db, TENANTS_COLLECTION, id), {
          status: value as string,
        });
      } else {
        await updateDoc(doc(db, TENANTS_COLLECTION, id), {
          [`directoryConfig.${field}`]: value,
        });
      }
      const nice =
        field === "isPublished"
          ? value
            ? "publicado en /explora"
            : "quitado del directorio"
          : field === "isPremium"
            ? value
              ? "elevado a Primera Fila"
              : "movido a directorio estándar"
            : field === "status"
              ? value === "active"
                ? "reactivado"
                : "suspendido"
              : "actualizado";
      toast({
        variant: "success",
        title: `✨ ${tenant.nombre} ${nice}`,
        description: "El cambio se ve al instante en el portal.",
      });
    } catch (err) {
      toast({
        title: "No se pudo guardar",
        description:
          err instanceof Error ? err.message : "Reintenta en un momento.",
      });
    }
  };

  const handleSave = async (draft: TenantLocale, isNew: boolean) => {
    try {
      const id = draft.id || draft.slug || toSlug(draft.nombre);
      const payload: TenantLocale = { ...draft, id };
      if (isNew) {
        await setDoc(doc(db, TENANTS_COLLECTION, id), payload);
      } else {
        await updateDoc(doc(db, TENANTS_COLLECTION, id), {
          ...payload,
        });
      }
      toast({
        variant: "success",
        title: `✨ Configuración de ${draft.nombre} actualizada`,
        description: draft.directoryConfig.isPremium
          ? "Visible en Primera Fila al instante."
          : "Sincronizado con el directorio del portal.",
      });
    } catch (err) {
      toast({
        title: "No se pudo guardar",
        description:
          err instanceof Error ? err.message : "Reintenta en un momento.",
      });
    }
  };

  const handleSuspend = async (t: TenantLocale) => {
    await toggleDirectoryField(
      t.id,
      "status",
      t.status === "active" ? "paused" : "active"
    );
  };

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar resumen={resumen} />

      <div className="flex flex-1 flex-col">
        <TopBar
          search={search}
          onSearchChange={setSearch}
          onNew={() => setEditing({ tenant: emptyTenant(), isNew: true })}
          adminName={usuario?.nombre ?? "Admin"}
        />

        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {/* Encabezado sección */}
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Directorio
                {isMock && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold tracking-wider text-amber-800 ring-1 ring-amber-200">
                    [Dev Mock]
                  </span>
                )}
              </p>
              <h1 className="mt-1 font-headline text-[28px] font-black leading-none tracking-tight text-slate-900 md:text-[32px]">
                Locales del portal
              </h1>
              <p className="mt-2 text-[13px] text-slate-600">
                Publica, destaca o pausa cualquier club de la red — los cambios
                se sincronizan con /explora en tiempo real.
              </p>
            </div>
            <div className="hidden shrink-0 items-center gap-2 md:flex">
              <span className="rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 ring-1 ring-slate-200">
                {filtered.length} de {tenants.length}
              </span>
            </div>
          </div>

          {/* Tabla */}
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            {/* Header */}
            <div className="grid grid-cols-12 gap-4 border-b border-slate-100 bg-slate-50/60 px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <div className="col-span-4">Local</div>
              <div className="col-span-2 text-center">Publicado</div>
              <div className="col-span-2 text-center">Primera Fila</div>
              <div className="col-span-2 text-center">Gatillos</div>
              <div className="col-span-2 text-right">Acciones</div>
            </div>

            {loading ? (
              <div className="space-y-2 p-6">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-16 animate-pulse rounded-xl bg-slate-100"
                  />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-16 text-center">
                <p className="text-5xl">🏪</p>
                <h2 className="mt-4 font-headline text-[20px] font-black tracking-tight text-slate-900">
                  {search
                    ? "No hay locales con ese filtro"
                    : "Aún no hay locales en el portal"}
                </h2>
                <p className="mx-auto mt-2 max-w-[42ch] text-[13px] text-slate-600">
                  {search
                    ? "Cambia los términos de búsqueda para ver más resultados."
                    : "Presiona “Nuevo Local” arriba para crear el primer club."}
                </p>
              </div>
            ) : (
              filtered.map((t) => (
                <TenantRow
                  key={t.id}
                  t={t}
                  onToggleField={toggleDirectoryField}
                  onEdit={(tt) => setEditing({ tenant: tt, isNew: false })}
                  onSuspend={handleSuspend}
                />
              ))
            )}
          </div>

          {/* Leyenda */}
          <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-[12px] text-slate-600">
            <span className="font-semibold text-slate-900">Leyenda:</span>
            <span className="inline-flex items-center gap-1.5">
              <TrafficIcon
                active
                icon={<Gift className="h-3 w-3" />}
                label="1er Sello Gratis"
                tone="emerald"
              />
              1er Sello Gratis
            </span>
            <span className="inline-flex items-center gap-1.5">
              <TrafficIcon
                active
                icon={<Zap className="h-3 w-3" />}
                label="Happy Hour"
                tone="amber"
              />
              Happy Hour x2
            </span>
            <span className="inline-flex items-center gap-1.5">
              <TrafficIcon
                active
                icon={<Flame className="h-3 w-3" />}
                label="Premio Flash"
                tone="rose"
              />
              Premio Flash
            </span>
            <span className="ml-auto inline-flex items-center gap-1.5 text-slate-500">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Primera Fila usa acento ámbar en el toggle
            </span>
          </div>
        </main>
      </div>

      {editing && (
        <TenantDrawer
          tenant={editing.tenant}
          isNew={editing.isNew}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

export default function AdminLocalesPage() {
  return (
    <AdminGate>
      <AdminLocalesInner />
    </AdminGate>
  );
}
