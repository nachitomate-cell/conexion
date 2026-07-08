import { NextResponse, type NextRequest } from "next/server";
import { resolveTenantFromHost, TENANT_HEADER } from "@/lib/tenant";

/**
 * `/admin`, `/Admin`, `/ADMIN` (con o sin trailing slash) → `/admin/dashboard`.
 * Se resuelve antes de la inyección del tenant, por lo que aplica a
 * TODOS los dominios del multitenant sin configuración adicional.
 */
const ADMIN_ALIAS = /^\/admin\/?$/i;

/**
 * Hosts dedicados al panel superadmin — entrando a la raíz redirigen directo
 * al dashboard. Agregar aquí cuando estrenemos otro dominio de panel.
 */
const PANEL_HOSTS = new Set(["panel.synaptechspa.cl", "panel.localhost"]);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host = (req.headers.get("host") || "").toLowerCase().split(":")[0];

  // Landing del panel dedicado: `panel.synaptechspa.cl/` → dashboard.
  if (PANEL_HOSTS.has(host) && (pathname === "/" || pathname === "")) {
    const url = req.nextUrl.clone();
    url.pathname = "/superadmin/dashboard";
    return NextResponse.redirect(url, 307);
  }

  if (ADMIN_ALIAS.test(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/dashboard";
    // 308: permanente + preserva el método (equivalente a `permanent: true`
    // de next.config.ts redirects()).
    return NextResponse.redirect(url, 308);
  }

  const tenant = resolveTenantFromHost(req.headers.get("host"));
  const headers = new Headers(req.headers);
  headers.set(TENANT_HEADER, tenant);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: [
    "/((?!_next/|favicon.ico|icons/|manifest.json|firebase-messaging-sw.js|robots.txt).*)",
  ],
};
