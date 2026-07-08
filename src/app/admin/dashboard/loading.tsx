import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading UI del /admin/dashboard.
 * Se muestra automáticamente durante la navegación (App Router) — el
 * sidebar del admin se queda fijo y solo esta zona hace shimmer.
 */
export default function LoadingAdminDashboard() {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-7 w-48" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-40 rounded-xl" />
    </div>
  );
}
