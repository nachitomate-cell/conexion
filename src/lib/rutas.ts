import type { Ruta, Usuario, Vendor } from "@/types";

/**
 * Rutas del marketplace — mecánica portada de la Ruta BAC de Patio Curauma
 * (26 bares de Valparaíso): visita locales, junta el pasaporte, gana.
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
 * Categorías del banner "Grandes Alianzas y Circuitos".
 * Se pintan en la píldora superior de cada tarjeta.
 */
export type RedCategoria =
  | "Club Comercial"
  | "Mega Club Recreativo"
  | "Ruta Gastronómica"
  | "Ruta Cultural"
  | "Evento Premium";

/**
 * Red hermana del portal (proyecto Firebase separado). Cada una es un
 * circuito grande de la Quinta Región con identidad propia.
 *
 * `bgImage` es el path canónico a la portada. Hoy puede ser un `.webp`
 * en `/public`; mañana un `storagePath` de Firebase Storage que se
 * resuelve con `useFirebaseImage()`. El componente no necesita cambiar.
 */
export interface RedExterna {
  id: string;
  nombre: string;
  emoji: string;
  descripcion: string;
  url: string;
  badge: RedCategoria;
  /**
   * Ruta a la imagen de portada (`.webp` idealmente).
   * Se admite: URL absoluta, `/public/...`, o `storagePath` estilo
   * Firebase Storage (`redes/patio-curauma.webp`) — este último se
   * resolverá en el hook cuando exista el panel de admin.
   */
  bgImage: string;
  /** Color de marca — sirve de fondo mientras carga la imagen. */
  accentColor: string;
  /**
   * Zona de cobertura — se pinta como kicker sobre el título de la
   * tarjeta y da contexto geográfico (útil ahora que hay alianzas
   * fuera de la Quinta Región).
   */
  zonaCobertura?: string;
}

/**
 * Redes hermanas de SynapTech — federación nivel 1: el marketplace
 * enlaza a las apps existentes (proyectos Firebase separados) mientras
 * no exista cuenta unificada. Aparecen como banner al final de /explora.
 */
export const REDES_EXTERNAS: RedExterna[] = [
  {
    id: "clubpatiocurauma",
    nombre: "Club Patio Curauma",
    emoji: "🏞️",
    descripcion:
      "El club del patio: sellos, premios y emprendedores del centro comercial más querido de Curauma.",
    url: "https://clubpatiocurauma.synaptechspa.cl/",
    badge: "Club Comercial",
    bgImage: "/assets/redes/patio-curauma.webp",
    accentColor: "#0a6b4d",
    zonaCobertura: "Curauma · Valparaíso",
  },
  {
    id: "club-providencia",
    nombre: "Club Providencia",
    emoji: "🎳",
    descripcion:
      "Club deportivo y recreativo familiar: Restaurante, Bowling, Masajes, Deportes y Shows en vivo para todos.",
    url: "https://clubprovidencia.synaptechspa.cl/",
    badge: "Mega Club Recreativo",
    bgImage: "/assets/redes/club-providencia.webp",
    accentColor: "#0f3a4d",
    zonaCobertura: "Providencia · Santiago",
  },
  {
    id: "expovino",
    nombre: "Expovino Valparaíso",
    emoji: "🍇",
    descripcion:
      "El festival de las viñas del valle. Catas, maridajes, música en vivo y sellos que se transforman en botellas.",
    url: "/expovino",
    badge: "Evento Premium",
    bgImage: "/assets/redes/expovino.webp",
    accentColor: "#3a1548",
    zonaCobertura: "Valle de Casablanca",
  },
  {
    id: "ruta-bac",
    nombre: "Ruta BAC · Valparaíso",
    emoji: "🍷",
    descripcion:
      "26 bares y cocinas patrimoniales de los cerros Alegre y Concepción. Tapa + cóctel por $6.000.",
    url: "https://clubpatiocurauma.synaptechspa.cl/ruta-bac",
    badge: "Ruta Gastronómica",
    bgImage: "/assets/redes/ruta-bac.webp",
    accentColor: "#7a1e1e",
    zonaCobertura: "Cerros Alegre y Concepción",
  },
];
