/**
 * ExpoVino y Gastronomía — Invierno 2026 (15 años · 24ª edición).
 * Vista exclusiva del evento: "Pasaporte ExpoVino".
 *
 * Mecánica (Ruta BAC adaptada a sala): el visitante activa su pasaporte al
 * entrar, en cada stand escanea el QR / acerca el teléfono al chip NFC
 * (NTAG213 grabado con la URL /expovino/s/{standId}), suma un sello y
 * califica 1-5. Al completar la meta entra al sorteo. El ranking en vivo
 * se proyecta en el escenario.
 *
 * Los stands de abajo son DEMO para presentar al organizador — se
 * reemplazan por la lista real de expositores cuando la entreguen.
 */

export const EXPOVINO = {
  id: "expovino2026",
  nombre: "ExpoVino y Gastronomía",
  edicion: "Invierno 2026 · 15 años",
  fecha: "Sábado 1 de agosto",
  lugar: "Terminal de Pasajeros, Valparaíso",
  /** Stands distintos necesarios para entrar al sorteo. */
  metaSorteo: 10,
  /** Inicio del evento (hora Chile). Antes de esto, /expovino corre en
   *  modo pre-inscripción: countdown + registro + share para RRSS. */
  inicioMs: Date.parse("2026-08-01T12:00:00-04:00"),
  /** Gancho de la preinscripción — lo define el organizador. */
  beneficioPreinscritos:
    "Los preinscritos llegan con su pasaporte listo y participan del sorteo especial de apertura 🍾",
  /** Paleta del evento (burdeos + oro sobre fondo vino profundo). */
  colores: {
    fondo: "#2a0a14",
    carta: "#3d1020",
    vino: "#8e2246",
    oro: "#d9a441",
    crema: "#f6ece0",
  },
} as const;

export type CategoriaStand =
  | "vina"
  | "cerveza"
  | "gin"
  | "pisco"
  | "restaurante"
  | "dulce";

export const CATEGORIA_META: Record<
  CategoriaStand,
  { label: string; emoji: string }
> = {
  vina: { label: "Viñas", emoji: "🍷" },
  cerveza: { label: "Cervezas", emoji: "🍺" },
  gin: { label: "Gin & Coctelería", emoji: "🍸" },
  pisco: { label: "Piscos", emoji: "🥃" },
  restaurante: { label: "Restaurantes", emoji: "🍽️" },
  dulce: { label: "Dulces & Quesos", emoji: "🧀" },
};

export interface StandExpovino {
  id: string;
  nombre: string;
  categoria: CategoriaStand;
  /** Valle, ciudad u origen — se muestra bajo el nombre. */
  origen: string;
}

/** Lista DEMO (14 stands) — reemplazar por los expositores reales. */
export const STANDS: StandExpovino[] = [
  { id: "alma-del-valle", nombre: "Viña Alma del Valle", categoria: "vina", origen: "Valle de Casablanca" },
  { id: "costa-fria", nombre: "Viña Costa Fría", categoria: "vina", origen: "Valle de San Antonio" },
  { id: "piedra-lunar", nombre: "Viña Piedra Lunar", categoria: "vina", origen: "Valle del Maipo" },
  { id: "cerro-alegre-wines", nombre: "Cerro Alegre Wines", categoria: "vina", origen: "Valle de Colchagua" },
  { id: "raices-del-itata", nombre: "Raíces del Itata", categoria: "vina", origen: "Valle del Itata" },
  { id: "vina-del-puerto", nombre: "Viña del Puerto", categoria: "vina", origen: "Valle de Aconcagua" },
  { id: "cerveza-farellon", nombre: "Cervecería Farellón", categoria: "cerveza", origen: "Valparaíso" },
  { id: "gin-neblina", nombre: "Gin Neblina", categoria: "gin", origen: "Quintay" },
  { id: "pisco-cumbres", nombre: "Pisco Cumbres", categoria: "pisco", origen: "Valle del Elqui" },
  { id: "cocina-del-mar", nombre: "Cocina del Mar", categoria: "restaurante", origen: "Valparaíso" },
  { id: "parrilla-del-cerro", nombre: "Parrilla del Cerro", categoria: "restaurante", origen: "Viña del Mar" },
  { id: "pastas-al-tiro", nombre: "Pastas Al Tiro", categoria: "restaurante", origen: "Curauma" },
  { id: "quesos-la-ligua", nombre: "Quesería La Ligua", categoria: "dulce", origen: "La Ligua" },
  { id: "dulces-de-vina", nombre: "Dulces de Viña", categoria: "dulce", origen: "Viña del Mar" },
];

export function getStand(id: string): StandExpovino | null {
  return STANDS.find((s) => s.id === id) ?? null;
}

/** Sello del pasaporte en el doc de usuario (`expovino.{standId}`). */
export interface SelloExpovino {
  at: number; // epoch ms
  rating: number | null; // 1-5, null = aún sin calificar
}

/** Stands agrupados por categoría, en el orden de CATEGORIA_META. */
export function standsPorCategoria(): Array<{
  categoria: CategoriaStand;
  stands: StandExpovino[];
}> {
  return (Object.keys(CATEGORIA_META) as CategoriaStand[])
    .map((categoria) => ({
      categoria,
      stands: STANDS.filter((s) => s.categoria === categoria),
    }))
    .filter((g) => g.stands.length > 0);
}

// =========================================================
// Dinámicas del momento
// =========================================================

/**
 * Programa de la noche — DEMO: se ajusta con los horarios reales que
 * entregue la producción. Marca los momentos donde el pasaporte y la
 * pantalla del escenario se cruzan (reveal del ranking, sorteo).
 */
export const PROGRAMA: Array<{ hora: string; titulo: string; emoji: string }> =
  [
    { hora: "12:00", titulo: "Apertura — activa tu pasaporte en la entrada", emoji: "🎟️" },
    { hora: "17:00", titulo: "Hora Dorada: el stand misterioso revela premio", emoji: "✨" },
    { hora: "20:00", titulo: "Reveal en escenario: lo más aplaudido del día", emoji: "🏆" },
    { hora: "22:00", titulo: "Sorteo en vivo entre pasaportes completos", emoji: "🍾" },
  ];

/**
 * Misiones del pasaporte — se calculan en el cliente desde los sellos.
 * La meta del sorteo (EXPOVINO.metaSorteo) va aparte, destacada.
 */
export interface Mision {
  id: string;
  nombre: string;
  emoji: string;
  descripcion: string;
  /** Evalúa el avance con los ids timbrados. Devuelve [logrado, meta]. */
  progreso: (timbrados: StandExpovino[]) => [number, number];
}

export const MISIONES: Mision[] = [
  {
    id: "vuelta-al-valle",
    nombre: "La vuelta al valle",
    emoji: "🍇",
    descripcion: "Timbra 4 viñas de valles distintos",
    progreso: (t) => [
      new Set(t.filter((s) => s.categoria === "vina").map((s) => s.origen))
        .size,
      4,
    ],
  },
  {
    id: "explorador-total",
    nombre: "Explorador total",
    emoji: "🧭",
    descripcion: "Timbra al menos un stand de cada categoría",
    progreso: (t) => [
      new Set(t.map((s) => s.categoria)).size,
      Object.keys(CATEGORIA_META).length,
    ],
  },
  {
    id: "critico-de-la-noche",
    nombre: "Crítico de la noche",
    emoji: "📝",
    descripcion: "Todo lo timbrado, calificado — cero pendientes",
    // El cálculo real usa ratings; se completa en la vista.
    progreso: (t) => [0, Math.max(1, t.length)],
  },
];

/** Resuelve los stands timbrados desde el mapa del pasaporte. */
export function standsTimbrados(
  pasaporte: Record<string, SelloExpovino>
): StandExpovino[] {
  return STANDS.filter((s) => pasaporte[s.id]);
}

/** Nombre para pantallas públicas: primer nombre + inicial del apellido. */
export function nombrePantalla(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "Catador anónimo";
  if (partes.length === 1) return partes[0];
  return `${partes[0]} ${partes[partes.length - 1][0].toUpperCase()}.`;
}

/** Evento del muro en vivo (pantalla LED) — vive en expovino_stats.feed. */
export interface EventoFeed {
  nombre: string; // ya abreviado para pantalla
  standId: string;
  tipo: "sello" | "completo";
  at: number;
}

/**
 * Cupón post-pasaporte — el premio inmediato al completar la meta,
 * canjeable en el bar de los organizadores (tráfico post-evento para
 * ellos = valor directo del canje). Texto final lo define Braulio.
 */
export const CUPON = {
  emoji: "🥂",
  titulo: "2x1 en Corazón Continto",
  detalle:
    "Por completar tu Pasaporte ExpoVino: 2x1 en la barra de vinos durante todo agosto.",
  lugar: "Templeman 561, Cerro Concepción · Valparaíso",
  vigencia: "Válido todo agosto 2026 · un canje por pasaporte",
} as const;

/**
 * Clave privada del expositor para su vista de métricas en vivo.
 * Determinística y sin dependencias — seguridad a nivel evento (las
 * métricas no son sensibles; solo evita curiosos adivinando URLs).
 */
export function claveStand(standId: string): string {
  let h = 5381;
  const s = `expovino2026::${standId}::synaptech`;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36).slice(0, 6);
}
