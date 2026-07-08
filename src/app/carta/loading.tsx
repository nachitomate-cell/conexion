import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingCarta() {
  return (
    <main className="min-h-dvh bg-background animate-in fade-in duration-300">
      {/* Hero */}
      <div className="relative">
        <Skeleton className="h-56 w-full rounded-none sm:h-64" />
        <div className="relative -mt-16 flex flex-col items-center gap-3 px-4 pb-6">
          <Skeleton className="h-24 w-24 rounded-full border-4 border-background" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-7 w-24 rounded-full" />
        </div>
      </div>

      {/* Buscador */}
      <div className="mx-auto max-w-2xl">
        <div className="border-b px-4 py-3">
          <Skeleton className="h-10 w-full rounded-full" />
        </div>

        {/* Nav categorías */}
        <div className="flex gap-2 overflow-hidden border-b px-4 py-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 shrink-0 rounded-full" />
          ))}
        </div>

        {/* Productos */}
        <div className="space-y-6 px-4 pb-24 pt-4">
          {Array.from({ length: 2 }).map((_, s) => (
            <section key={s}>
              <Skeleton className="mb-3 h-6 w-32" />
              <div className="space-y-2.5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 rounded-2xl" />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
