import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingQR() {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-7 w-32" />
      </div>
      <Skeleton className="h-4 w-3/4" />
      {/* QR grande */}
      <div className="mx-auto flex aspect-square w-full max-w-sm items-center justify-center rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <Skeleton className="h-full w-full rounded-2xl" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Skeleton className="col-span-2 h-11 rounded-md" />
        <Skeleton className="h-11 rounded-md" />
        <Skeleton className="h-11 rounded-md" />
      </div>
    </div>
  );
}
