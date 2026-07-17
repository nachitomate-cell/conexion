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
  /** Pasaporte ExpoVino 2026: sello por stand (ver src/lib/expovino.ts). */
  expovino?: Record<string, { at: number; rating: number | null }>;
  /** Contador plano de sellos ExpoVino — habilita el query del sorteo. */
  expovinoSellos?: number;
  /** Preinscripción al evento (antes del 1 de agosto). */
  expovinoPreinscrito?: boolean;
  expovinoPreinscritoAt?: number;
  /** Encuesta de salida ExpoVino ("¿volverías?"), 1-5. */
  expovinoNps?: number;
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
  /** Video de portada del hero del home (feature premium, Growth+). */
  heroVideoUrl?: string;
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

/** Rubro de un prospecto dentro del mercado local (módulo Proyección). */
export type ProspectoRubro =
  | "sushi"
  | "cafeteria"
  | "barberia"
  | "heladeria"
  | "sangucheria"
  | "pizzeria"
  | "bar"
  | "restaurante"
  | "fitness";

/** Etapa del prospecto en el embudo comercial. */
export type ProspectoEstado =
  | "por_contactar"
  | "contactado"
  | "reunion"
  | "propuesta_enviada"
  | "convertido"
  | "descartado";

export type ProspectoPrioridad = "alta" | "media" | "baja";

/**
 * Marca del mercado objetivo a la que se le puede ofrecer la plataforma.
 * Colección Firestore: `prospectos/{id}`. El seed inicial viene del análisis
 * de mercado de Viña del Mar (`src/lib/mercadoVina.ts`).
 */
export interface Prospecto {
  id: string;
  nombre: string;
  rubro: ProspectoRubro;
  /** Zona/barrio dentro del Gran Viña (Viña Centro, Recreo, Reñaca, etc.). */
  zona: string;
  direccion: string | null;
  /** Por qué el producto le calza a esta marca (fit comercial). */
  notas: string | null;
  prioridad: ProspectoPrioridad;
  planSugerido: string; // starter | growth | scale
  /** MRR estimado si se convierte (CLP). */
  mrrPotencial: number;
  estado: ProspectoEstado;
  /** Origen del dato: seed del análisis de mercado o carga manual. */
  fuente: string | null;
  createdAt: number; // epoch ms
  updatedAt: number | null; // epoch ms
}

/**
 * Ruta gamificada del marketplace (mecánica portada de la Ruta BAC de
 * Patio Curauma): el usuario visita locales participantes, junta al menos
 * un sello en cada uno y al completar el mínimo canjea el premio de la ruta.
 * El progreso se deriva de `sellosLocales` — no requiere contadores nuevos.
 */
export interface Ruta {
  id: string;
  nombre: string;
  descripcion: string;
  emoji: string;
  /** Vendors participantes (ids del registro estático u overlay Firestore). */
  vendorIds: string[];
  /** Locales distintos que hay que visitar para completar la ruta. */
  minLocales: number;
  premioTexto: string;
  activa: boolean;
  /** Marca/patrocinador opcional ("presentada por…"). */
  patrocinador?: string;
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
  /** Rubro para el directorio del marketplace (/explora). */
  rubro?: ProspectoRubro;
  /** Zona/barrio para el directorio del marketplace. */
  zona?: string;
  /** Suscrito al plan "Primera Fila" — aparece destacado en /explora. */
  destacado?: boolean;
  /** true = tenant de demostración: se muestra en demos, desactivar en prod. */
  demo?: boolean;
  theme: VendorTheme;
  copy: VendorCopy;
}
