import {
  SkeletonBar,
  SkeletonBlock,
  SkeletonHeader,
  SkeletonListRow,
} from "@/components/superadmin/Skeletons";

export default function LoadingTareas() {
  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <SkeletonHeader />

      {/* Toggle de notificaciones */}
      <SkeletonBlock className="h-20" />

      {/* Tabs "Mis tareas" / "Del equipo" */}
      <div className="flex gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-1">
        {Array.from({ length: 2 }).map((_, i) => (
          <SkeletonBar key={i} className="h-9 flex-1 rounded-xl" />
        ))}
      </div>

      {/* Sección "Por hacer" */}
      <section className="space-y-2">
        <SkeletonBar className="h-2 w-28" />
        <div className="space-y-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonListRow key={i} />
          ))}
        </div>
      </section>
    </div>
  );
}
