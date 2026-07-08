import type { Timestamp } from "firebase/firestore";

export type Rol =
  | "cliente"
  | "chef_partner"
  | "gerente"
  | "admin"
  | "superadmin";

export interface Usuario {
  uid: string;
  nombre: string;
  email: string;
  telefono?: string;
  fechaNacimiento?: string; // ISO "YYYY-MM-DD"
  comuna?: string;
  rol: Rol;
  sellos: number; // sellos actuales (== comprasRealizadas vigentes)
  sellosHistoricos: number; // total acumulado histórico
  ultimaVisita?: Timestamp | null;
  rachaActual: number; // días consecutivos con visita
  fcmToken?: string;
  /**
   * Tokens FCM para el módulo interno de tareas del panel superadmin.
   * Se usa un array porque el mismo dueño/socio puede tener PC + móvil.
   * Separado de `fcmToken` para no mezclar con las notificaciones a clientes.
   */
  taskFcmTokens?: string[];
  baneado: boolean;
  recompensaDisponible: boolean;
  sellosLocales?: Record<string, number>; // sellos por vendor/local
  referidoPor?: string;
  createdAt: Timestamp;
}

export type PendingStatus = "pending" | "confirmed" | "expired" | "rejected";

export interface PendingStamp {
  id: string;
  userId: string;
  vendorId: string;
  monto: number;
  numSellos: number; // calculado según la tabla de montos
  status: PendingStatus;
  createdAt: Timestamp;
  expiresAt: Timestamp; // createdAt + 5 min
  // denormalizado para mostrar rápido en el dashboard del chef
  userNombre?: string;
  userSellos?: number;
}

export type CanjeStatus = "pending" | "redeemed" | "expired";

export interface Canje {
  id: string;
  clienteId: string;
  clienteNombre?: string;
  premioId: string;
  premioNombre: string;
  vendorId: string;
  sellosDescontados: number;
  codigo: string; // SUSHI-{timestamp}-{random4}
  status: CanjeStatus;
  expiraEn: Timestamp; // 48 horas
  createdAt: Timestamp;
}

export interface Premio {
  id: string;
  nombre: string; // "Roll gratis", "Postre incluido"
  icono: string; // emoji o URL
  descripcion?: string;
  vendorId: string;
  sellosRequeridos: number;
  stock: number;
  activo: boolean;
}

export type LogTipo =
  | "SELLO"
  | "CANJE"
  | "SELLO_RECHAZADO"
  | "REFERIDO";

export type LogMetodo = "CLIENT_SCAN" | "HANDSHAKE" | "REFERIDO";

export interface SystemLog {
  id: string;
  userId: string;
  vendorId?: string;
  accion: string;
  tipo: LogTipo;
  metodo: LogMetodo;
  fecha: Timestamp;
  monto?: number;
  numSellos?: number;
}

export type NotifTipo = "IA_REMINDER" | "diaria" | "canje" | "bienvenida";

export interface Notificacion {
  id: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  fecha: Timestamp;
  tipo: NotifTipo;
  isAI: boolean;
  cta?: string;
}

/**
 * Identidad visual del tenant. Combina:
 *   - hex (para `style={{}}` inline en superficies que Tailwind purga mal)
 *   - HSL triplet (para inyectar como CSS variables sobre los tokens shadcn)
 *   - assets de logo
 */
export interface VendorTheme {
  primaryColor: string; // hex, ej. "#991b1b"
  primaryHsl: string; // HSL triplet, ej. "358 62% 42%"
  primaryForegroundHsl?: string;
  accentHsl?: string;
  accentForegroundHsl?: string;
  goldHsl?: string;
  goldForegroundHsl?: string;
  logoUrl: string; // ruta relativa o URL absoluta
  logoWidth: number; // px, alto se calcula por ratio del SVG
}

/** Copies white-label del tenant. */
export interface VendorCopy {
  clubName: string; // ej. "NENE CLUB", "SUSHIPRO CLUB"
  joinDescription: string; // frase corta para /unete y hero
  emojis: string; // string de emojis temáticos, ej. "🍔🍻"
}

/**
 * Alcance de un ítem de la carta:
 *   - "publica": aparece en la carta pública (`/menu`, la que ve cualquier
 *     visitante que abre el dominio del local).
 *   - "app":    solo visible dentro de la app / Club — el espacio ideal para
 *     promos y precios exclusivos de fidelización.
 * Ítems sin `scope` se tratan como "publica" (compat con datos previos).
 */
export type MenuScope = "publica" | "app";

/**
 * Categoría del catálogo estructurado del local — colección `categorias/`.
 * Multitenant por `vendorId`. `iconName` es el nombre exacto de un icono
 * de Lucide (ej. "Pizza", "Coffee") — la UI lo mapea dinámicamente.
 */
export interface Categoria {
  id: string;
  vendorId: string;
  nombre: string;
  iconName: string;
  orden: number;
  createdAt?: Timestamp;
}

/**
 * Producto del catálogo estructurado — colección `productos/`.
 * Enlaza a `categorias/{categoriaId}` sin denormalizar el nombre (single
 * source of truth). `disponible=false` permite agotar sin borrar.
 */
export interface Producto {
  id: string;
  vendorId: string;
  categoriaId: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  imageUrl?: string;
  disponible: boolean;
  orden?: number;
  createdAt?: Timestamp;
}

/** Item del menú digital, guardado en Firestore por tenant. */
export interface MenuItem {
  id: string;
  vendorId: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  emoji?: string;
  categoria: string;
  activo: boolean;
  orden?: number;
  scope?: MenuScope;
}

/** Etapa comercial del tenant dentro del pipeline de la plataforma. */
export type VendorStatus = "propuesta" | "por_presentar" | "funcionando";

/**
 * Rol dentro del equipo del panel superadmin. Se usa solo como etiqueta/UI —
 * los permisos reales los da el claim `superadmin: true` de Firebase Auth y
 * el campo `rol` de `usuarios/{uid}`.
 */
export type TeamRole = "socio" | "desarrollador";

/**
 * Miembro del equipo con acceso al panel superadmin.
 * Colección Firestore: `team_members/{uid}`.
 */
export interface TeamMember {
  uid: string;
  email: string;
  nombre: string;
  teamRole: TeamRole;
  invitedBy?: string | null; // uid del que lo invitó
  createdAt: number; // epoch ms
}

/**
 * Tarea compartida del panel superadmin — para que los socios/dueños de la
 * plataforma se asignen pendientes entre ellos y reciban recordatorios diarios.
 */
export interface Task {
  id: string;
  title: string;
  /** Email (o uid) del asignado. */
  assignedTo: string;
  /** Nombre legible para mostrar en la UI. */
  assignedToName?: string | null;
  /** Uid del creador. */
  createdBy: string;
  createdByEmail?: string | null;
  createdByName?: string | null;
  isCompleted: boolean;
  createdAt: number; // epoch ms
  completedAt: number | null; // epoch ms
  dueDate: number | null; // epoch ms (día objetivo)
}

/** Local/comercio dentro del multitenant. */
export interface Vendor {
  id: string;
  nombre: string;
  slug: string;
  instagram?: string;
  whatsapp?: string; // formato internacional sin +, ej "56912345678"
  emoji: string;
  sellosParaPremio: number; // tamaño de la punch card (ej 10)
  activo: boolean;
  /** Etapa en el pipeline (propuesta → por_presentar → funcionando). */
  status: VendorStatus;
  theme: VendorTheme;
  copy: VendorCopy;
}
