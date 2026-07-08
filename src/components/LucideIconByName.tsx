"use client";

import * as LucideIcons from "lucide-react";
import { HelpCircle } from "lucide-react";

type LucideIconName = keyof typeof LucideIcons;

/**
 * Renderiza un icono de Lucide a partir de su nombre exacto.
 * Fallback a `HelpCircle` si el nombre no matchea — evita crashes cuando
 * en Firestore alguien escribe un nombre inválido.
 */
export function LucideIconByName({
  name,
  className,
  strokeWidth,
}: {
  name: string;
  className?: string;
  strokeWidth?: number;
}) {
  const key = name as LucideIconName;
  const raw = LucideIcons[key] as unknown;
  const Icon =
    typeof raw === "function" || typeof raw === "object"
      ? (raw as React.ComponentType<{
          className?: string;
          strokeWidth?: number;
        }>)
      : HelpCircle;
  return <Icon className={className} strokeWidth={strokeWidth} />;
}
