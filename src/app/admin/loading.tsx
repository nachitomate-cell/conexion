import { Skeleton } from "@/components/ui/skeleton";

// Loading para /admin (vista de Usuarios).
export default function LoadingAdminUsuarios() {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-7 w-40" />
      </div>
      <Skeleton className="h-10 w-full rounded-md" />
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
