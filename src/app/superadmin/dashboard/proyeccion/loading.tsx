import {
  SkeletonBar,
  SkeletonBlock,
  SkeletonHeader,
  SkeletonKpi,
  SkeletonListRow,
} from "@/components/superadmin/Skeletons";

export default function LoadingProyeccion() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <SkeletonHeader />

      {/* KPIs del mercado */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonKpi key={i} />
        ))}
      </div>

      {/* Escenarios de proyección */}
      <section className="space-y-3">
        <SkeletonBar className="h-3 w-48" />
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-32" />
          ))}
        </div>
      </section>

      {/* Chips por rubro */}
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonBar key={i} className="h-8 w-28 rounded-xl" />
        ))}
      </div>

      {/* Lista de marcas */}
      <div className="grid gap-3 lg:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonListRow key={i} />
        ))}
      </div>
    </div>
  );
}
