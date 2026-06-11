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
    superadmin: {
      label: "Superadmin",
      emoji: "🛰️",
      desc: "Operador de plataforma: visión multitenant de todos los locales.",
    },
  };

export const ROLE_DEFAULT: Rol = "cliente";

export function isStaff(rol?: Rol | null): boolean {
  return (
    rol === "chef_partner" ||
    rol === "gerente" ||
    rol === "admin" ||
    rol === "superadmin"
  );
}

export function isAdmin(rol?: Rol | null): boolean {
  return rol === "admin" || rol === "superadmin";
}

export function isSuperAdmin(rol?: Rol | null): boolean {
  return rol === "superadmin";
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
    case "superadmin":
      return "/superadmin";
    default:
      return "/";
  }
}

/**
 * Determina el rol inicial. El email del operador de plataforma obtiene
 * superadmin; el del dueño del local, admin. Ambos al registrarse.
 */
export function rolInicial(email: string): Rol {
  const e = email.toLowerCase();
  const superEmail = (
    process.env.NEXT_PUBLIC_SUPERADMIN_EMAIL || ""
  ).toLowerCase();
  if (superEmail && e === superEmail) return "superadmin";
  const adminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "").toLowerCase();
  if (adminEmail && e === adminEmail) return "admin";
  return ROLE_DEFAULT;
}
