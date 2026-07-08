import {
  SkeletonBar,
  SkeletonBlock,
  SkeletonHeader,
  SkeletonKpi,
} from "@/components/superadmin/Skeletons";

/**
 * Loading UI del /superadmin/dashboard.
 * Se muestra automáticamente durante la navegación (App Router) y también
 * antes de que la fetch inicial resuelva.
 */
export default function LoadingPanel() {
  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Hero */}
      <SkeletonBlock className="h-40 rounded-3xl sm:h-48" />

      <SkeletonHeader showActions />

      {/* KPIs — mismo grid 2x2 en móvil, 4 en desktop */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonKpi key={i} />
        ))}
      </section>

      {/* Pipeline / clientes */}
      <section className="space-y-3">
        <SkeletonBar className="h-3 w-40" />
        <div className="flex gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-1 lg:hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonBar key={i} className="h-8 flex-1 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3 lg:gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonBlock
              key={i}
              className="h-64 !border-slate-200 !bg-slate-50 lg:h-72"
            />
          ))}
        </div>
      </section>

      {/* Actividad */}
      <SkeletonBlock className="h-40" />
    </div>
  );
}
