import {
  SkeletonBlock,
  SkeletonHeader,
} from "@/components/superadmin/Skeletons";

export default function LoadingDesarrollar() {
  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <SkeletonHeader />
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-32" />
        ))}
      </div>
    </div>
  );
}
