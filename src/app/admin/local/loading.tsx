import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingLocal() {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-7 w-32" />
      </div>
      <Skeleton className="h-16 rounded-lg" />
      <Skeleton className="h-80 rounded-xl" />
      <Skeleton className="h-56 rounded-xl" />
      <Skeleton className="h-11 w-full rounded-md" />
    </div>
  );
}
