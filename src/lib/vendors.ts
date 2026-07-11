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
    whatsapp: "56900000000",
    emoji: "🍣",
    sellosParaPremio: 10,
    activo: true,
    status: "funcionando",
    rubro: "sushi",
    zona: "Curauma",
    theme: {
      primaryColor: "#4f46e5",
      primaryHsl: "252 30% 62%",
      logoUrl: "/logos/sushipro.svg",
      logoWidth: 128,
    },
    copy: {
      clubName: "SUSHIPRO CLUB",
      joinDescription:
        "Junta sellos con cada pedido y canjea rolls, postres y premios exclusivos.",
      emojis: "🍣🥢",
    },
  },
  nenecurauma: {
    id: "nenecurauma",
    nombre: "NENE Schopería & Mechada",
    slug: "nene",
    instagram: "nene.curauma",
    whatsapp: "56900000000",
    emoji: "🍺",
    sellosParaPremio: 12,
    activo: true,
    status: "por_presentar",
    rubro: "bar",
    zona: "Curauma",
    theme: {
      primaryColor: "#991b1b",
      primaryHsl: "358 62% 42%",
      accentHsl: "0 0% 10%",
      accentForegroundHsl: "0 0% 100%",
      goldHsl: "38 85% 52%",
      goldForegroundHsl: "0 0% 10%",
      logoUrl: "/logos/nene.svg",
      logoWidth: 112,
    },
    copy: {
      clubName: "NENE CLUB",
      joinDescription:
        "Junta sellos con cada schop y canjea cerveza, piscolas y burgers de la casa.",
      emojis: "🍔🍻",
    },
  },
  burgerxyz: {
    id: "burgerxyz",
    nombre: "Burger XYZ",
    slug: "burgerxyz",
    instagram: "burger.xyz",
    emoji: "🍔",
    sellosParaPremio: 10,
    activo: true,
    status: "por_presentar",
    rubro: "sangucheria",
    zona: "Viña Centro",
    demo: true,
    theme: {
      primaryColor: "#ea580c",
      primaryHsl: "20 90% 48%",
      logoUrl: "/logos/sushipro.svg",
      logoWidth: 128,
    },
    copy: {
      clubName: "BURGER XYZ CLUB",
      joinDescription: "Junta sellos y canjea burgers y papas de la casa.",
      emojis: "🍔🍟",
    },
  },
  cafecentral: {
    id: "cafecentral",
    nombre: "Café Central",
    slug: "cafecentral",
    instagram: "cafecentral.cl",
    emoji: "☕",
    sellosParaPremio: 8,
    activo: true,
    status: "funcionando",
    rubro: "cafeteria",
    zona: "Valparaíso",
    demo: true,
    theme: {
      primaryColor: "#78350f",
      primaryHsl: "27 76% 26%",
      logoUrl: "/logos/sushipro.svg",
      logoWidth: 128,
    },
    copy: {
      clubName: "CAFÉ CENTRAL CLUB",
      joinDescription: "Junta sellos y canjea cafés, tostadas y postres.",
      emojis: "☕🥐",
    },
  },
  gustunazca: {
    id: "gustunazca",
    nombre: "Gustu Nazca",
    slug: "gustunazca",
    instagram: "gustunazca",
    whatsapp: "56900000000",
    emoji: "🇵🇪",
    sellosParaPremio: 12,
    activo: true,
    status: "por_presentar",
    rubro: "restaurante",
    zona: "Curauma",
    theme: {
      primaryColor: "#991b1b",
      primaryHsl: "0 70% 35%",
      accentHsl: "0 0% 10%",
      accentForegroundHsl: "0 0% 100%",
      goldHsl: "38 85% 52%",
      goldForegroundHsl: "0 0% 10%",
      logoUrl: "/logos/gustunazca.svg",
      logoWidth: 160,
    },
    copy: {
      clubName: "GUSTU NAZCA CLUB",
      joinDescription:
        "Disfruta la auténtica gastronomía peruana. Suma sellos en tus visitas y canjea pisco sours, ceviches y experiencias únicas. 🇵🇪🍹",
      emojis: "🇵🇪🍹🍽️",
    },
  },
  // ── Tenants de demostración del marketplace (demo: true) ──
  barberiafaro: {
    id: "barberiafaro",
    nombre: "Barbería El Faro",
    slug: "barberiafaro",
    instagram: "barberia.elfaro",
    whatsapp: "56900000000",
    emoji: "💈",
    sellosParaPremio: 10,
    activo: true,
    status: "funcionando",
    rubro: "barberia",
    zona: "Reñaca",
    demo: true,
    theme: {
      primaryColor: "#0f766e",
      primaryHsl: "175 77% 26%",
      logoUrl: "/logos/sushipro.svg",
      logoWidth: 128,
    },
    copy: {
      clubName: "EL FARO CLUB",
      joinDescription:
        "Un sello por cada corte: el 10° va gratis, más productos de barba y prioridad en la agenda.",
      emojis: "💈✂️",
    },
  },
  gelatopacifico: {
    id: "gelatopacifico",
    nombre: "Gelato Pacífico",
    slug: "gelatopacifico",
    instagram: "gelato.pacifico",
    emoji: "🍦",
    sellosParaPremio: 8,
    activo: true,
    status: "por_presentar",
    rubro: "heladeria",
    zona: "Av. San Martín",
    demo: true,
    theme: {
      primaryColor: "#db2777",
      primaryHsl: "330 70% 50%",
      logoUrl: "/logos/sushipro.svg",
      logoWidth: 128,
    },
    copy: {
      clubName: "PACÍFICO CLUB",
      joinDescription:
        "Suma sellos con cada copa y canjea helados dobles, toppings y café de la casa.",
      emojis: "🍦🌊",
    },
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
