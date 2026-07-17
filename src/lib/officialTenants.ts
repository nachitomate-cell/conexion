import { VENDORS } from "@/lib/vendors";
import type { ProspectoRubro, Vendor, VendorTheme } from "@/types";

// =========================================================
// Modelo del tenant "oficial" publicado en Firestore.
// Cada local satélite (app propia) escribe en esta colección
// para aparecer en el directorio central (/explora).
// =========================================================

export const TENANTS_COLLECTION = "tenants";

export type TenantStatus = "active" | "pending" | "paused";
export type TenantTier = "standard" | "primera_fila";

export interface HappyHourWindow {
  active: boolean;
  /** Label opcional que se muestra en el chip — ej "Happy Hour 18–20 h". */
  label?: string;
}

export interface TenantLocaleDirectoryConfig {
  /** Interruptor maestro: aparece en el directorio público. */
  isPublished: boolean;
  /** Suscripción Primera Fila — se pinta en el Bento destacado. */
  isPremium: boolean;
  /** Orden dentro del Bento de Primera Fila (menor = más arriba). */
  premiumOrder?: number;
  /** El local regala 1 sello de bienvenida al registrar el cliente. */
  welcomeStamp?: boolean;
  /** Ventana promocional dinámica que muestra un chip. */
  happyHour?: HappyHourWindow;
  /** Stock actual de "Premios Flash" (canjes con descuento en sellos). */
  premiosFlashStock?: number;
}

export interface TenantLocale {
  id: string;
  status: TenantStatus;
  tier?: TenantTier;
  nombre: string;
  slug: string;
  rubro?: string;
  ciudad?: string;
  emoji?: string;
  logoUrl?: string;
  /** Portada `.webp` — se resuelve por `useFirebaseImage()`. */
  coverImageUrl?: string;
  primaryColor?: string;
  directoryConfig: TenantLocaleDirectoryConfig;
}

// ─── Helpers ─────────────────────────────────────────────

export function isTenantPremium(t: TenantLocale): boolean {
  return t.tier === "primera_fila" || t.directoryConfig.isPremium === true;
}

export function isTenantPublishable(t: TenantLocale): boolean {
  return t.status === "active" && t.directoryConfig.isPublished === true;
}

/**
 * Theme mínimo cuando el tenant no está en el registro local (tenant nuevo
 * que solo vive en Firestore). Usamos el `primaryColor` para derivar HSL
 * de forma barata; en producción el panel de admin escribe los HSL.
 */
function fallbackTheme(t: TenantLocale): VendorTheme {
  const primaryColor = t.primaryColor ?? "#877AB8";
  return {
    primaryColor,
    primaryHsl: "252 30% 62%",
    logoUrl: t.logoUrl ?? "/icons/icon.svg",
    logoWidth: 40,
  };
}

/**
 * Adapta un `TenantLocale` de Firestore al `Vendor` que consume el resto
 * de la UI. Si el tenant existe en el registro local, hereda su theme + copy
 * (mucho más rico). Si es un tenant nuevo — nacido en Firestore — se rellena
 * con defaults para no romper el maquetado.
 */
export function tenantToVendor(t: TenantLocale): Vendor {
  const known = VENDORS[t.id];
  return {
    id: t.id,
    nombre: t.nombre,
    slug: t.slug,
    emoji: t.emoji ?? known?.emoji ?? "🏪",
    sellosParaPremio: known?.sellosParaPremio ?? 10,
    activo: t.status === "active",
    status: "funcionando",
    rubro: (t.rubro as ProspectoRubro | undefined) ?? known?.rubro,
    zona: t.ciudad ?? known?.zona,
    destacado: isTenantPremium(t),
    instagram: known?.instagram,
    whatsapp: known?.whatsapp,
    theme: known?.theme ?? fallbackTheme(t),
    copy: known?.copy ?? {
      clubName: `${t.nombre} Club`,
      joinDescription: `Suma sellos en ${t.nombre} y canjea premios.`,
      emojis: t.emoji ?? "🏪",
    },
  };
}

// ─── Fallback para dev / Firestore vacío ─────────────────

/**
 * Muestra de dev: se activa cuando la colección `tenants` está vacía
 * o la conexión falla. Tomamos dos IDs conocidos (sushipro,
 * barberiafaro) para que el mapper caiga en el theme + copy ricos del
 * registro local — así la maqueta luce igual que con datos reales.
 */
export const MOCK_TENANTS: TenantLocale[] = [
  {
    id: "sushipro",
    status: "active",
    tier: "primera_fila",
    nombre: VENDORS.sushipro?.nombre ?? "SushiPro",
    slug: VENDORS.sushipro?.slug ?? "sushipro",
    rubro: VENDORS.sushipro?.rubro,
    ciudad: VENDORS.sushipro?.zona,
    emoji: VENDORS.sushipro?.emoji ?? "🍣",
    primaryColor: VENDORS.sushipro?.theme.primaryColor,
    directoryConfig: {
      isPublished: true,
      isPremium: true,
      welcomeStamp: true,
      happyHour: { active: false },
      premiosFlashStock: 5,
    },
  },
  {
    id: "barberiafaro",
    status: "active",
    tier: "standard",
    nombre: VENDORS.barberiafaro?.nombre ?? "Barbería El Faro",
    slug: VENDORS.barberiafaro?.slug ?? "barberiafaro",
    rubro: VENDORS.barberiafaro?.rubro,
    ciudad: VENDORS.barberiafaro?.zona,
    emoji: VENDORS.barberiafaro?.emoji ?? "💈",
    primaryColor: VENDORS.barberiafaro?.theme.primaryColor,
    directoryConfig: {
      isPublished: true,
      isPremium: false,
    },
  },
];
