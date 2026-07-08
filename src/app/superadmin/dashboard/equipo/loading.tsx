import {
  SkeletonHeader,
  SkeletonListRow,
} from "@/components/superadmin/Skeletons";

export default function LoadingEquipo() {
  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <SkeletonHeader showActions />

      <ul className="space-y-2.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <li key={i}>
            <SkeletonListRow />
          </li>
        ))}
      </ul>
    </div>
  );
}
