import { NextResponse, type NextRequest } from "next/server";
import { resolveTenantFromHost, TENANT_HEADER } from "@/lib/tenant";

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
