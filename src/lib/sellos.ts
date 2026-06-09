/**
 * Tabla de montos (CLP) → sellos para el flujo Handshake.
 * El escaneo directo (CLIENT_SCAN) siempre entrega 1 sello.
 */
export function calcularSellos(monto: number): number {
  if (monto >= 40000) return 4;
  if (monto >= 25000) return 3;
  if (monto >= 15000) return 2;
  if (monto >= 8000) return 1;
  return 0;
}

/** Tramos visibles para mostrar en la UI del Chef Partner. */
export const TRAMOS_SELLOS = [
  { desde: 8000, sellos: 1 },
  { desde: 15000, sellos: 2 },
  { desde: 25000, sellos: 3 },
  { desde: 40000, sellos: 4 },
];

/**
 * ¿Estamos en el mes de cumpleaños del cliente? Recibe la fecha ISO
 * "YYYY-MM-DD". En ese mes los sellos se duplican (sello de cumpleaños).
 */
export function esMesCumpleanos(fechaNacimiento?: string | null): boolean {
  if (!fechaNacimiento) return false;
  const mes = parseInt(fechaNacimiento.slice(5, 7), 10); // 1-12
  if (!mes || mes < 1 || mes > 12) return false;
  return mes === new Date().getMonth() + 1;
}

/** Aplica el bonus de cumpleaños (x2) si corresponde. */
export function aplicarBonusCumple(
  sellos: number,
  fechaNacimiento?: string | null
): { sellos: number; bonus: boolean } {
  if (sellos > 0 && esMesCumpleanos(fechaNacimiento)) {
    return { sellos: sellos * 2, bonus: true };
  }
  return { sellos, bonus: false };
}
