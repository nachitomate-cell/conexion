import type { Rol } from "@/types";

export const ROLES: Record<Rol, { label: string; emoji: string; desc: string }> =
  {
    cliente: {
      label: "Socio",
      emoji: "🍣",
      desc: "Cliente del club: junta sellos y canjea premios.",
    },
    chef_partner: {
      label: "Chef Partner",
      emoji: "🥢",
      desc: "Personal del local: escanea clientes y entrega premios.",
    },
    gerente: {
      label: "Gerente",
      emoji: "📊",
      desc: "Métricas globales del restaurante.",
    },
    admin: {
      label: "Admin",
      emoji: "🫙",
      desc: "Acceso total con PIN: usuarios, premios y logs.",
    },
  };

export const ROLE_DEFAULT: Rol = "cliente";

export function isStaff(rol?: Rol | null): boolean {
  return rol === "chef_partner" || rol === "gerente" || rol === "admin";
}

export function isAdmin(rol?: Rol | null): boolean {
  return rol === "admin";
}

/** Ruta de aterrizaje según el rol al iniciar sesión. */
export function homeForRole(rol?: Rol | null): string {
  switch (rol) {
    case "chef_partner":
      return "/vendedor";
    case "gerente":
      return "/gerente";
    case "admin":
      return "/admin";
    default:
      return "/";
  }
}

/**
 * Determina el rol inicial. El email del dueño obtiene admin automáticamente.
 */
export function rolInicial(email: string): Rol {
  const adminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "").toLowerCase();
  if (adminEmail && email.toLowerCase() === adminEmail) return "admin";
  return ROLE_DEFAULT;
}
