"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIInsightsPanelProps {
  title?: string;
  insights: string[];
  loading?: boolean;
  className?: string;
}

export function AIInsightsPanel({
  title = "Insights del Chef IA",
  insights,
  loading,
  className,
}: AIInsightsPanelProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-primary/30 p-5 text-white shadow-lg",
        "bg-gradient-to-br from-[#3a0a12] via-[#5a0f1c] to-[#2a060c]",
        className
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/20">
          <Sparkles className="h-4 w-4 text-gold" />
        </span>
        <h3 className="font-headline text-base font-bold">{title}</h3>
      </div>

      {loading ? (
        <div className="space-y-2">
          <div className="h-3 w-4/5 animate-pulse rounded bg-white/15" />
          <div className="h-3 w-3/5 animate-pulse rounded bg-white/15" />
        </div>
      ) : (
        <ul className="space-y-2">
          {insights.map((ins, i) => (
            <li key={i} className="flex gap-2 text-sm text-white/90">
              <span className="text-gold">✦</span>
              <span>{ins}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
