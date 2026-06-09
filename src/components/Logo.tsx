import { cn } from "@/lib/utils";

export function Logo({
  size = 40,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-black text-white shadow-md",
        className
      )}
      style={{ width: size, height: size }}
      aria-label="SushiPro"
    >
      <span
        className="font-headline font-bold leading-none"
        style={{ fontSize: size * 0.42 }}
      >
        SP
      </span>
    </span>
  );
}
