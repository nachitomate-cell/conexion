/**
 * Marca del portal-directorio de la Quinta Región.
 *
 * Es independiente del tenant activo: en rutas de discovery
 * (`/explora`, `/rutas`) manda la identidad del portal, no la del
 * vendor. Fuera de esas rutas se mantiene la identidad del vendor.
 */
export const PORTAL_NAME = "ElBarrio";

/** Rutas donde el Header muestra la marca del portal. */
export const PORTAL_ROUTES = [
  "/", // Home global (billetera del portal)
  "/explora",
  "/rutas",
  "/premios",
  "/perfil",
  "/historial",
  "/terminos",
  "/privacidad",
];

/** Prefijo de las rutas de tenant aislado. Fuera del contexto del portal. */
export const CLUB_ROUTE_PREFIX = "/club/";

export function isPortalRoute(pathname: string): boolean {
  // Nunca portal-context cuando estamos dentro de un club aislado.
  if (pathname.startsWith(CLUB_ROUTE_PREFIX)) return false;
  return PORTAL_ROUTES.some((r) => {
    // `/` es match exacto; el resto usa startsWith para /explora/x, etc.
    if (r === "/") return pathname === "/";
    return pathname.startsWith(r);
  });
}

/** Devuelve el slug del club si estamos en `/club/[slug]`, si no `null`. */
export function clubSlugFromPathname(pathname: string): string | null {
  if (!pathname.startsWith(CLUB_ROUTE_PREFIX)) return null;
  const rest = pathname.slice(CLUB_ROUTE_PREFIX.length);
  const slug = rest.split("/")[0];
  return slug || null;
}
