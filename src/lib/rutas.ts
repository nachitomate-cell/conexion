import type { Ruta, Usuario, Vendor } from "@/types";

/**
 * Rutas del marketplace — mecánica portada de la Ruta BAC de Patio Curauma
 * (27 bares de Valparaíso): visita locales, junta el pasaporte, gana.
 *
 * Registro estático por ahora (mismo camino de evolución que VENDORS:
 * cuando haga falta alta sin deploy, se agrega el overlay Firestore `rutas`).
 */
export const RUTAS: Record<string, Ruta> = {
  "barrio-vina": {
    id: "barrio-vina",
    nombre: "Ruta del Barrio",
    descripcion:
      "Recorre los clubes del barrio: junta al menos un sello en 3 locales distintos y canjea el premio de la ruta.",
    emoji: "🗺️",
    vendorIds: ["sushipro", "cafecentral", "burgerxyz", "gelatopacifico"],
    minLocales: 3,
    premioTexto: "Café o postre de la casa gratis en el local que tú elijas",
    activa: true,
  },
};

export function getRutasActivas(): Ruta[] {
  return Object.values(RUTAS).filter((r) => r.activa);
}

export function getRuta(id: string): Ruta | null {
  return RUTAS[id] ?? null;
}

/**
 * Sellos del usuario en un local. `sellosLocales` es la fuente multitenant;
 * en el club actual toleramos el contador legacy `sellos` (usuarios antiguos
 * sin desglose).
 */
export function sellosEnLocal(
  usuario: Usuario | null,
  vendorId: string,
  vendorActualId: string
): number {
  if (!usuario) return 0;
  const locales = usuario.sellosLocales || {};
  if (typeof locales[vendorId] === "number") return locales[vendorId];
  if (vendorId === vendorActualId) return usuario.sellos || 0;
  return 0;
}

/** Ids de locales de la ruta donde el usuario ya tiene al menos un sello. */
export function localesVisitados(
  ruta: Ruta,
  usuario: Usuario | null,
  vendorActualId: string
): string[] {
  return ruta.vendorIds.filter(
    (vid) => sellosEnLocal(usuario, vid, vendorActualId) > 0
  );
}

/**
 * URL del club de otro tenant. Cada local vive en su subdominio
 * ({slug}.synaptechspa.cl); en dev, {slug}.localhost:puerto.
 */
export function vendorHomeUrl(v: Vendor): string {
  if (typeof window === "undefined") return "/";
  const { protocol, host } = window.location;
  const bare = host.split(":")[0];
  if (bare === "localhost" || bare.endsWith(".localhost")) {
    const port = host.includes(":") ? `:${host.split(":")[1]}` : "";
    return `${protocol}//${v.slug}.localhost${port}`;
  }
  return `https://${v.slug}.synaptechspa.cl`;
}

/**
 * Redes hermanas de SynapTech — federación nivel 1: el marketplace enlaza
 * a las apps existentes (proyectos Firebase separados) mientras no exista
 * cuenta unificada. Aparecen como tarjetas al final de /explora.
 */
export const REDES_EXTERNAS = [
  {
    id: "clubpatiocurauma",
    nombre: "Club Patio Curauma",
    emoji: "🏞️",
    descripcion:
      "El club del patio: sellos, premios y emprendedores de Curauma.",
    url: "https://clubpatiocurauma.synaptechspa.cl/",
  },
  {
    id: "ruta-bac",
    nombre: "Ruta BAC · Valparaíso",
    emoji: "🍷",
    descripcion:
      "27 bares y cocinas de los cerros Alegre y Concepción. Tapa + cóctel x $6.000.",
    url: "https://clubpatiocurauma.synaptechspa.cl/ruta-bac",
  },
] as const;
