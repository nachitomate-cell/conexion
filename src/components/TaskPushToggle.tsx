"use client";

import { useState } from "react";
import { Bell, BellOff, Loader2, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTaskPushNotifications } from "@/hooks/useTaskPushNotifications";

/**
 * Tarjeta de opt-in de notificaciones push del panel de tareas.
 *   - Estado inicial: botón "Activar" verde neón
 *   - Post-permiso: muestra "Activo en este dispositivo" con opción de apagar
 *   - Si el navegador no soporta o el usuario bloqueó, muestra un hint claro
 */
export function TaskPushToggle() {
  const {
    supported,
    permission,
    token,
    loading,
    error,
    enable,
    disable,
    sendTest,
  } = useTaskPushNotifications();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<
    { ok: boolean; message: string } | null
  >(null);

  if (!supported && permission === "unsupported") {
    // Silencioso — no queremos ruido en navegadores viejos / iOS < 16.4
    return null;
  }

  const enabled = permission === "granted" && !!token;
  const denied = permission === "denied";

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl border p-3.5 shadow-lg shadow-black/20 backdrop-blur-xl transition-all duration-300 sm:p-4",
        enabled
          ? "border-emerald-400/25 bg-emerald-400/[0.04]"
          : "border-white/[0.06] bg-white/[0.02]"
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors",
          enabled
            ? "bg-emerald-400/15 text-emerald-300"
            : "bg-white/[0.05] text-slate-400"
        )}
      >
        {enabled ? (
          <Bell className="h-4 w-4" strokeWidth={2.25} />
        ) : (
          <BellOff className="h-4 w-4" strokeWidth={2.25} />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white">
          {enabled
            ? "Notificaciones activas en este dispositivo"
            : denied
            ? "Notificaciones bloqueadas"
            : "Recordatorio diario"}
        </p>
        <p className="mt-0.5 text-xs text-slate-400">
          {enabled
            ? "Te avisaremos cada mañana si quedan pendientes."
            : denied
            ? "Actívalas desde la configuración del navegador para recibir el recordatorio."
            : "Recibe un aviso cada mañana con tus tareas pendientes."}
        </p>
        {error && (
          <p className="mt-1.5 text-[11px] text-rose-300">{error}</p>
        )}
        {testResult && (
          <p
            className={cn(
              "mt-1.5 text-[11px]",
              testResult.ok ? "text-emerald-300" : "text-amber-300"
            )}
          >
            {testResult.message}
          </p>
        )}
      </div>

      <div className="flex shrink-0 flex-col gap-1.5">
        {!denied && (
          <button
            type="button"
            onClick={enabled ? disable : enable}
            disabled={loading}
            className={cn(
              "rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-60",
              enabled
                ? "border border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"
                : "bg-gradient-to-br from-emerald-400 to-lime-400 text-slate-950 shadow-md shadow-emerald-500/25 hover:from-emerald-300 hover:to-lime-300 hover:shadow-emerald-500/40"
            )}
          >
            {loading ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {enabled ? "Apagando…" : "Pidiendo…"}
              </span>
            ) : enabled ? (
              "Apagar"
            ) : (
              "Activar"
            )}
          </button>
        )}
        {enabled && (
          <button
            type="button"
            onClick={async () => {
              setTesting(true);
              setTestResult(null);
              const r = await sendTest();
              setTestResult(r);
              setTesting(false);
            }}
            disabled={testing}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-400/30 bg-emerald-400/[0.06] px-3 py-1.5 text-[11px] font-semibold text-emerald-200 transition-all duration-200 hover:bg-emerald-400/[0.12] active:scale-[0.98] disabled:opacity-60"
          >
            {testing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Send className="h-3 w-3" strokeWidth={2.5} />
            )}
            {testing ? "Enviando…" : "Enviar prueba"}
          </button>
        )}
      </div>
    </div>
  );
}
