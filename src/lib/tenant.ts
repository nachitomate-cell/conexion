import { DEFAULT_VENDOR_ID, VENDORS } from "./vendors";

export const TENANT_HEADER = "x-tenant";

/**
 * Mapa explícito hostname → vendorId. Tiene precedencia sobre la heurística.
 * Añadir aquí cuando un tenant estrene dominio no-subdominio.
 */
const HOSTNAME_MAP: Record<string, string> = {
  "sushipro.synaptechspa.cl": "sushipro",
  "nene.synaptechspa.cl": "nenecurauma",
  "gustunazca.synaptechspa.cl": "gustunazca",
  // Alias de dev — Chrome/Edge resuelven *.localhost como loopback.
  "nene.localhost": "nenecurauma",
  "sushipro.localhost": "sushipro",
  "gustu.localhost": "gustunazca",
};

/**
 * Resuelve el vendorId activo a partir del hostname que llega en la request.
 * Orden de resolución:
 *   1. Mapa explícito de dominios.
 *   2. Primer segmento como subdominio (`sushipro.foo.cl` → sushipro).
 *   3. Heurística dev: el host contiene el id de un vendor conocido.
 *   4. DEFAULT_VENDOR_ID.
 */
export function resolveTenantFromHost(
  hostname: string | null | undefined
): string {
  if (!hostname) return DEFAULT_VENDOR_ID;
  const host = hostname.toLowerCase().split(":")[0];

  if (HOSTNAME_MAP[host]) return HOSTNAME_MAP[host];

  const sub = host.split(".")[0];
  if (VENDORS[sub]?.activo) return sub;

  for (const id of Object.keys(VENDORS)) {
    if (VENDORS[id].activo && host.includes(id)) return id;
  }

  return DEFAULT_VENDOR_ID;
}
