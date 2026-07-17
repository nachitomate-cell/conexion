"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";
import {
  Award,
  Bell,
  ChevronRight,
  Clock,
  LogOut,
  Maximize2,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { RequireAuth } from "@/components/RequireAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { buildClientQRValue } from "@/lib/vendors";
import { getRango, siguienteRango } from "@/lib/rangos";
import { registerFcmToken } from "@/lib/fcmTokenManager";
import { cn } from "@/lib/utils";

// =========================================================
// Perfil — dashboard personal en 2 columnas (desktop). Móvil
// stackea todo. Izquierda: pasaporte gamificado + QR. Derecha:
// métricas bento + menú de ajustes SaaS + logout rose.
// =========================================================

function iniciales(nombre: string): string {
  return nombre
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

// ─── Bento stat ──────────────────────────────────────────

function StatCard({
  value,
  label,
  sublabel,
  icon,
  accent,
}: {
  value: number | string;
  label: string;
  sublabel?: string;
  icon?: string;
  accent: "primary" | "emerald" | "rose";
}) {
  const bgCls = {
    primary: "bg-primary/5 ring-primary/15",
    emerald: "bg-emerald-50 ring-emerald-100",
    rose: "bg-rose-50 ring-rose-100",
  }[accent];
  const numCls = {
    primary: "text-primary",
    emerald: "text-emerald-600",
    rose: "text-rose-600",
  }[accent];
  return (
    <div className={cn("rounded-2xl p-4 ring-1", bgCls)}>
      <p
        className={cn(
          "flex items-baseline gap-1 font-headline text-[28px] font-black leading-none tabular-nums md:text-[32px]",
          numCls
        )}
      >
        <span>{value}</span>
        {icon && <span className="text-[20px]">{icon}</span>}
      </p>
      <p className="mt-3 text-[13px] font-semibold text-slate-800">{label}</p>
      {sublabel && (
        <p className="mt-0.5 text-[11px] leading-tight text-slate-500">
          {sublabel}
        </p>
      )}
    </div>
  );
}

// ─── Menú SaaS ───────────────────────────────────────────

interface MenuItemProps {
  href?: string;
  onClick?: () => void;
  icon: ReactNode;
  iconBg: string;
  title: string;
  subtitle?: string;
  disabled?: boolean;
}

function MenuItem({
  href,
  onClick,
  icon,
  iconBg,
  title,
  subtitle,
  disabled,
}: MenuItemProps) {
  const content = (
    <>
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
          iconBg
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1 text-left">
        <p className="text-[14px] font-semibold text-slate-900">{title}</p>
        {subtitle && (
          <p className="mt-0.5 text-[12px] leading-tight text-slate-500">
            {subtitle}
          </p>
        )}
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
    </>
  );
  const cls =
    "flex w-full items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60";
  if (href) {
    return (
      <Link href={href} className={cls}>
        {content}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cls}
    >
      {content}
    </button>
  );
}

// ─── Página ──────────────────────────────────────────────

function PerfilInner() {
  const { usuario, firebaseUser, signOut } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [activando, setActivando] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  if (!usuario || !firebaseUser) return null;

  const sellosHist = usuario.sellosHistoricos || 0;
  const rango = getRango(sellosHist);
  const next = siguienteRango(sellosHist);
  const pctNext = next
    ? Math.max(
        0,
        Math.min(
          100,
          Math.round(
            ((sellosHist - rango.desde) / (next.rango.desde - rango.desde)) *
              100
          )
        )
      )
    : 100;

  const activarNotis = async () => {
    setActivando(true);
    const t = await registerFcmToken(firebaseUser.uid);
    setActivando(false);
    toast(
      t
        ? { variant: "success", title: "Notificaciones activadas 🔔" }
        : { title: "No se pudieron activar" }
    );
  };

  const salir = async () => {
    await signOut();
    router.replace("/unete");
  };

  const qrValue = buildClientQRValue(usuario.uid);

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 pb-8 md:px-6 lg:grid-cols-12 lg:gap-8 lg:px-8">
      {/* ═══════════════════════════════════════════════
          Columna izquierda — Pasaporte + QR
          ═══════════════════════════════════════════════ */}
      <div className="space-y-6 lg:col-span-5">
        {/* ── Pasaporte digital (dark card) ── */}
        <div className="relative overflow-hidden rounded-3xl bg-slate-900 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 text-white shadow-xl md:p-7">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-indigo-500/25 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-violet-500/15 blur-3xl"
          />

          <div className="relative">
            {/* Header: avatar + identidad */}
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16 shrink-0 ring-2 ring-white/15">
                <AvatarFallback className="bg-white/10 text-[18px] font-bold text-white">
                  {iniciales(usuario.nombre)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/50">
                  Pasaporte digital
                </p>
                <h1 className="mt-1 truncate font-headline text-[22px] font-black tracking-tight text-white">
                  {usuario.nombre}
                </h1>
                <p className="mt-0.5 truncate text-[12px] text-white/60">
                  {usuario.email}
                </p>
              </div>
            </div>

            {/* Badge dorado del rango — sensación de logro */}
            <div className="mt-5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 px-3 py-1.5 text-[12px] font-bold text-slate-900 shadow-[0_4px_20px_-4px_rgba(251,191,36,0.6)]">
                <Award className="h-3.5 w-3.5" strokeWidth={2.5} />
                <span className="text-[14px] leading-none">
                  {rango.emoji}
                </span>
                <span className="tracking-tight">{rango.nombre}</span>
              </span>
            </div>

            {/* Beneficio + progreso al siguiente rango */}
            <div className="mt-5 border-t border-white/10 pt-5">
              <p className="text-[13px] leading-relaxed text-white/75">
                {rango.beneficio}
              </p>

              {next ? (
                <div className="mt-4 space-y-2.5">
                  <div className="flex items-baseline justify-between gap-2 text-[11px]">
                    <span className="font-semibold uppercase tracking-[0.16em] text-white/55">
                      Próximo rango
                    </span>
                    <span className="font-semibold text-white">
                      {next.rango.emoji} {next.rango.nombre}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 transition-all duration-700"
                      style={{ width: `${pctNext}%` }}
                    />
                  </div>
                  <p className="text-[12px] text-white/70">
                    Te faltan{" "}
                    <span className="font-bold tabular-nums text-white">
                      {next.faltan}
                    </span>{" "}
                    sellos para {next.rango.nombre}.
                  </p>
                </div>
              ) : (
                <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-3 py-1 text-[12px] font-bold text-amber-300">
                  🏆 Nivel máximo desbloqueado
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── QR de cliente ── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-800 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            Tu QR de cliente
          </p>
          <h2 className="mt-1 font-headline text-[18px] font-black tracking-tight text-slate-900">
            Handshake en caja 🥢
          </h2>
          <p className="mx-auto mt-1.5 max-w-[36ch] text-[12px] leading-relaxed text-slate-600">
            Muestra este código al cajero para sumar sellos al instante.
          </p>

          <div className="mt-5 flex justify-center">
            <div className="rounded-xl bg-white p-3 ring-1 ring-slate-100">
              <QRCode value={qrValue} size={170} />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setQrOpen(true)}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 py-2.5 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-slate-200"
          >
            <Maximize2 className="h-4 w-4" />
            Ver a pantalla completa
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          Columna derecha — Métricas + Ajustes
          ═══════════════════════════════════════════════ */}
      <div className="space-y-8 lg:col-span-7">
        {/* ── Métricas Bento ── */}
        <section className="space-y-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground/70">
              Fidelidad
            </p>
            <h2 className="mt-1 font-headline text-[24px] font-black leading-none tracking-tight md:text-[28px]">
              Tu actividad
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <StatCard
              value={usuario.sellos || 0}
              label="Sellos"
              sublabel="Disponibles hoy"
              accent="primary"
            />
            <StatCard
              value={usuario.sellosHistoricos || 0}
              label="Históricos"
              sublabel="Total acumulado"
              accent="emerald"
            />
            <StatCard
              value={usuario.rachaActual || 0}
              label="Racha"
              sublabel="Semanas seguidas"
              icon="🔥"
              accent="rose"
            />
          </div>
        </section>

        {/* ── Ajustes (menú SaaS) ── */}
        <section className="space-y-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground/70">
              Ajustes
            </p>
            <h2 className="mt-1 font-headline text-[24px] font-black leading-none tracking-tight md:text-[28px]">
              Tu cuenta
            </h2>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            <div className="divide-y divide-slate-100">
              <MenuItem
                onClick={activarNotis}
                disabled={activando}
                icon={<Bell className="h-4 w-4" />}
                iconBg="bg-blue-100 text-blue-600"
                title={
                  activando ? "Activando…" : "Activar notificaciones"
                }
                subtitle="Recibe promos y recordatorios de sellos"
              />
              <MenuItem
                href="/historial"
                icon={<Clock className="h-4 w-4" />}
                iconBg="bg-amber-100 text-amber-700"
                title="Mi historial"
                subtitle="Sellos ganados y canjes realizados"
              />
              <MenuItem
                href="/terminos"
                icon={<ShieldCheck className="h-4 w-4" />}
                iconBg="bg-violet-100 text-violet-600"
                title="Términos y privacidad"
                subtitle="Cómo cuidamos tus datos"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={salir}
            className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-rose-50 py-3.5 font-semibold text-rose-600 transition-colors hover:bg-rose-100"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </section>
      </div>

      {/* ── Modal: QR a pantalla completa ── */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-sm text-center sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tu QR de cliente 🥢</DialogTitle>
            <DialogDescription>
              Muestra este código al cajero para sumar sellos al instante.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-2">
            <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-100">
              <QRCode value={qrValue} size={280} />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {usuario.nombre} · ID {usuario.uid.slice(0, 8)}
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function PerfilPage() {
  return (
    <RequireAuth roles={["cliente"]}>
      <PerfilInner />
    </RequireAuth>
  );
}
