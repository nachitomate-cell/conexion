import type { Vendor } from "@/types";

/**
 * Registro de locales del multitenant.
 * Cada local es un "vendor". SushiPro es el primero.
 * A futuro esto puede migrar a la colección Firestore `vendors/{id}`.
 */
export const VENDORS: Record<string, Vendor> = {
  sushipro: {
    id: "sushipro",
    nombre: "SushiPro",
    slug: "sushipro",
    instagram: "sushipro.cl",
    whatsapp: "56900000000", // TODO: número real del local
    emoji: "🍣",
    sellosParaPremio: 10,
    activo: true,
  },
};

/** Local activo por defecto (mientras la app sirve a un solo local a la vez). */
export const DEFAULT_VENDOR_ID = "sushipro";

export function getVendor(id?: string | null): Vendor {
  return VENDORS[id || DEFAULT_VENDOR_ID] || VENDORS[DEFAULT_VENDOR_ID];
}

export function getDefaultVendor(): Vendor {
  return VENDORS[DEFAULT_VENDOR_ID];
}

/** Payload que codifica el QR del local para el escaneo del cliente. */
export function buildVendorQRValue(vendorId: string): string {
  return `SUSHIPRO::VENDOR::${vendorId}`;
}

/** Parsea el QR del local. Devuelve el vendorId o null si no es válido. */
export function parseVendorQRValue(raw: string): string | null {
  const m = raw.trim().match(/^SUSHIPRO::VENDOR::(.+)$/);
  if (m) return m[1];
  // Tolerar QR que sea solo el id del vendor conocido.
  if (VENDORS[raw.trim()]) return raw.trim();
  return null;
}

/** Payload que codifica el QR de un cliente (para el Handshake del Chef). */
export function buildClientQRValue(uid: string): string {
  return `SUSHIPRO::CLIENT::${uid}`;
}

export function parseClientQRValue(raw: string): string | null {
  const m = raw.trim().match(/^SUSHIPRO::CLIENT::(.+)$/);
  return m ? m[1] : null;
}

/** Payload del voucher de canje (para que el Chef lo marque redeemed). */
export function buildCanjeQRValue(canjeId: string): string {
  return `SUSHIPRO::CANJE::${canjeId}`;
}

export function parseCanjeQRValue(raw: string): string | null {
  const m = raw.trim().match(/^SUSHIPRO::CANJE::(.+)$/);
  return m ? m[1] : null;
}
