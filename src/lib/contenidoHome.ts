/**
 * Contenido editorial del home (banners de promo, galería tipo feed).
 * Las imágenes viven en /public/locales/sushipro/. Reemplázalas por las del
 * local manteniendo el nombre del archivo, o cambia la ruta `imagen` aquí.
 * Si una imagen falta, el slot muestra un placeholder.
 */

export type AccionBanner = "wsp" | "premios" | "menu" | "unete";

export interface Banner {
  id: string;
  etiqueta: string;
  titulo: string;
  bajada: string;
  imagen?: string;
  cta: string;
  accion: AccionBanner;
}

export const BANNERS: Banner[] = [
  {
    id: "miercoles",
    etiqueta: "Promo de la semana",
    titulo: "2x1 en Rolls California",
    bajada: "Todos los miércoles · junta el doble de sellos",
    imagen: "/locales/sushipro/promo-1.jpg",
    cta: "Pedir ahora",
    accion: "wsp",
  },
  {
    id: "omakase",
    etiqueta: "Edición limitada",
    titulo: "Omakase del Chef",
    bajada: "Selección sorpresa de temporada",
    imagen: "/locales/sushipro/promo-2.jpg",
    cta: "Ver la carta",
    accion: "menu",
  },
  {
    id: "club",
    etiqueta: "Beneficio socio",
    titulo: "Tu 10° sello, premio gratis",
    bajada: "Cada visita suma. Canjea rolls, postres y más",
    imagen: "/locales/sushipro/promo-3.jpg",
    cta: "Ver premios",
    accion: "premios",
  },
];

export interface ItemGaleria {
  id: string;
  imagen?: string;
  alt: string;
}

export const GALERIA: ItemGaleria[] = [
  { id: "g1", imagen: "/locales/sushipro/plato-1.jpg", alt: "Plato SushiPro" },
  { id: "g2", imagen: "/locales/sushipro/plato-2.jpg", alt: "Plato SushiPro" },
  { id: "g3", imagen: "/locales/sushipro/plato-3.jpg", alt: "Plato SushiPro" },
  { id: "g4", imagen: "/locales/sushipro/plato-4.jpg", alt: "Plato SushiPro" },
];

/** Imagen grande de marca/destacado (hero del socio). */
export const DESTACADO = "/locales/sushipro/destacado.png";
