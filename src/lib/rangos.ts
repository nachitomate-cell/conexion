export type RangoId = "aprendiz" | "roll_master" | "omakase";

export interface Rango {
  id: RangoId;
  nombre: string;
  emoji: string;
  desde: number; // umbral inferior (sellos históricos)
  beneficio: string;
  /** Clases tailwind para el chip/badge del rango. */
  badgeClass: string;
}

export const RANGOS: Rango[] = [
  {
    id: "aprendiz",
    nombre: "Aprendiz de Sushi",
    emoji: "🍙",
    desde: 0,
    beneficio: "Junta tus primeros sellos y desbloquea tu primer premio.",
    badgeClass: "bg-secondary text-secondary-foreground border-border",
  },
  {
    id: "roll_master",
    nombre: "Roll Master",
    emoji: "🍱",
    desde: 5,
    beneficio: "Acceso anticipado a promos y rolls de temporada.",
    badgeClass: "bg-accent text-accent-foreground border-accent",
  },
  {
    id: "omakase",
    nombre: "Omakase VIP",
    emoji: "🏆",
    desde: 10,
    beneficio: "Premios exclusivos y atención prioritaria del chef.",
    badgeClass: "bg-gold text-gold-foreground border-gold",
  },
];

/** Rango según sellos históricos (lifetime). */
export function getRango(sellosHistoricos: number): Rango {
  const valor = sellosHistoricos || 0;
  let actual = RANGOS[0];
  for (const r of RANGOS) {
    if (valor >= r.desde) actual = r;
  }
  return actual;
}

/** Devuelve el siguiente rango y cuántos sellos faltan, o null si es máximo. */
export function siguienteRango(
  sellosHistoricos: number
): { rango: Rango; faltan: number } | null {
  const valor = sellosHistoricos || 0;
  for (const r of RANGOS) {
    if (valor < r.desde) {
      return { rango: r, faltan: r.desde - valor };
    }
  }
  return null;
}
