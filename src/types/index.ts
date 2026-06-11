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
}
