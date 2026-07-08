import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingCarta() {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-7 w-44" />
      </div>
      {/* Tabs público / app */}
      <Skeleton className="h-10 w-full rounded-xl" />
      <Skeleton className="h-10 w-full rounded-md" />

      {/* Grupos por categoría */}
      {Array.from({ length: 2 }).map((_, g) => (
        <section key={g} className="space-y-2">
          <Skeleton className="h-3 w-24" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </section>
      ))}
    </div>
  );
}
