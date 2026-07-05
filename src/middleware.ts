import { NextResponse, type NextRequest } from "next/server";
import { resolveTenantFromHost, TENANT_HEADER } from "@/lib/tenant";

/**
 * `/admin`, `/Admin`, `/ADMIN` (con o sin trailing slash) → `/admin/dashboard`.
 * Se resuelve antes de la inyección del tenant, por lo que aplica a
 * TODOS los dominios del multitenant sin configuración adicional.
 */
const ADMIN_ALIAS = /^\/admin\/?$/i;

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

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
