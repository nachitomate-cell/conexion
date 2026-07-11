import type {
  ProspectoPrioridad,
  ProspectoRubro,
} from "@/types";

/**
 * Análisis de mercado — Gran Viña del Mar (julio 2026).
 *
 * Marcas reales de la ciudad a las que se les puede ofrecer la plataforma
 * (fidelización con sellos + carta digital QR + push + reserva WhatsApp).
 * Levantadas de rankings públicos (TripAdvisor, La Nación, La Tercera,
 * Wanderlog, AgendaPro, guías locales) priorizando negocios independientes
 * con compra recurrente — el mismo perfil de SushiPro, el primer cliente.
 *
 * Este archivo es el SEED del módulo Proyección: la primera vez que el API
 * `/api/superadmin/prospectos` encuentra la colección vacía, la puebla con
 * esta lista (one-shot). Después de eso, Firestore es la fuente de verdad.
 */

export const RUBRO_META: Record<
  ProspectoRubro,
  { label: string; emoji: string }
> = {
  sushi: { label: "Sushi", emoji: "🍣" },
  cafeteria: { label: "Cafeterías", emoji: "☕" },
  barberia: { label: "Barberías", emoji: "💈" },
  heladeria: { label: "Heladerías y pastelerías", emoji: "🍦" },
  sangucheria: { label: "Sangucherías", emoji: "🍔" },
  pizzeria: { label: "Pizzerías", emoji: "🍕" },
  bar: { label: "Bares y cervecerías", emoji: "🍺" },
  restaurante: { label: "Restaurantes", emoji: "🍽️" },
  fitness: { label: "Fitness y estudios", emoji: "🧘" },
};

/** MRR estimado por plan (CLP/mes) — referencia editable por prospecto. */
export const PLAN_MRR: Record<string, number> = {
  starter: 39990,
  growth: 69990,
  scale: 109990,
};

export interface ProspectoSeed {
  id: string;
  nombre: string;
  rubro: ProspectoRubro;
  zona: string;
  direccion: string | null;
  notas: string;
  prioridad: ProspectoPrioridad;
  planSugerido: "starter" | "growth" | "scale";
}

export const MERCADO_VINA: ProspectoSeed[] = [
  // ── Sushi — mismo rubro que SushiPro: el caso de éxito aplica directo ──
  {
    id: "only-sushi",
    nombre: "Only Sushi",
    rubro: "sushi",
    zona: "Viña Centro",
    direccion: null,
    notas:
      "Top del ranking TripAdvisor de sushi en Viña. Mismo rubro que SushiPro: sellos por compra + canje de premios aplican tal cual.",
    prioridad: "alta",
    planSugerido: "starter",
  },
  {
    id: "koala-sushi",
    nombre: "Koala Sushi",
    rubro: "sushi",
    zona: "Viña Centro",
    direccion: null,
    notas:
      "Porciones generosas y clientela fiel en el centro; punch card de rolls calza perfecto.",
    prioridad: "alta",
    planSugerido: "starter",
  },
  {
    id: "jiren-sushi",
    nombre: "Jiren Sushi",
    rubro: "sushi",
    zona: "Viña Centro",
    direccion: "5 Norte 615",
    notas:
      "Temática Dragon Ball con comunidad joven; los rangos gamificados (Aprendiz → Omakase) calzan con su identidad.",
    prioridad: "alta",
    planSugerido: "starter",
  },
  {
    id: "sushi-geti",
    nombre: "Sushi Geti Nikkei",
    rubro: "sushi",
    zona: "Viña Centro",
    direccion: null,
    notas:
      "Fusión nikkei trendy con marisco fresco; carta digital + fidelización para su clientela recurrente.",
    prioridad: "media",
    planSugerido: "starter",
  },
  {
    id: "tomodachi-house",
    nombre: "Tomodachi House",
    rubro: "sushi",
    zona: "Viña Centro",
    direccion: null,
    notas:
      "Clásico de comida oriental para ir con amigos; base de clientes estable que vuelve.",
    prioridad: "media",
    planSugerido: "starter",
  },
  {
    id: "praisa-sushi",
    nombre: "Praisa Sushi",
    rubro: "sushi",
    zona: "Viña Centro",
    direccion: "5 Norte 337",
    notas: "Local chico con horario acotado; plan starter con QR en el mesón.",
    prioridad: "media",
    planSugerido: "starter",
  },
  {
    id: "sushirolls",
    nombre: "Sushirolls",
    rubro: "sushi",
    zona: "Viña Centro",
    direccion: "1 Norte 607",
    notas:
      "Carta variada (makis, gohan, ceviches) y promos frecuentes; las promos push reemplazan el descuento genérico.",
    prioridad: "media",
    planSugerido: "starter",
  },
  {
    id: "sushi-burger-home",
    nombre: "Sushi & Burger Home",
    rubro: "sushi",
    zona: "Viña Centro",
    direccion: "6 Poniente 150",
    notas:
      "Doble carta (sushi + burgers) — el menú digital ordena su oferta y los sellos cruzan ambas líneas.",
    prioridad: "media",
    planSugerido: "starter",
  },
  {
    id: "sushi-home-beach",
    nombre: "Sushi Home Beach",
    rubro: "sushi",
    zona: "Reñaca",
    direccion: null,
    notas:
      "Frente a la playa de Reñaca; QR en mesa y push de promos en temporada alta.",
    prioridad: "media",
    planSugerido: "starter",
  },
  {
    id: "seiko-sushi",
    nombre: "Seiko Sushi",
    rubro: "sushi",
    zona: "Viña / multi-sucursal",
    direccion: null,
    notas:
      "Cadena regional con delivery propio y varias sucursales; el multitenant por local justifica plan growth.",
    prioridad: "alta",
    planSugerido: "growth",
  },

  // ── Cafeterías — compra diaria: el punch card más natural que existe ──
  {
    id: "murta-cafe",
    nombre: "Murta Café",
    rubro: "cafeteria",
    zona: "Recreo",
    direccion: null,
    notas:
      "Cafetería y pastelería de autor nacida en pandemia, hoy con local propio; público fiel de barrio, sello por café.",
    prioridad: "alta",
    planSugerido: "starter",
  },
  {
    id: "johnson-coffee",
    nombre: "Johnson Coffee House",
    rubro: "cafeteria",
    zona: "Recreo",
    direccion: "Diego Portales 649",
    notas:
      "Cafetería de especialidad nueva; partir con fidelización desde el día uno construye la cartera de clientes.",
    prioridad: "alta",
    planSugerido: "starter",
  },
  {
    id: "pan-y-fermento",
    nombre: "Pan & Fermento",
    rubro: "cafeteria",
    zona: "Viña Centro",
    direccion: null,
    notas:
      "Masa madre + café de especialidad a precio justo; compra diaria = punch card perfecta.",
    prioridad: "alta",
    planSugerido: "starter",
  },
  {
    id: "vintage-kffe",
    nombre: "Vintage Kffe",
    rubro: "cafeteria",
    zona: "Viña Centro",
    direccion: null,
    notas: "Cafetería para desayunos y onces con clientela habitual.",
    prioridad: "media",
    planSugerido: "starter",
  },
  {
    id: "agora-cafe",
    nombre: "Ágora Café",
    rubro: "cafeteria",
    zona: "Viña Centro",
    direccion: null,
    notas: "Cafetería de barrio con oferta dulce/salada; fidelización simple.",
    prioridad: "media",
    planSugerido: "starter",
  },
  {
    id: "american-diner",
    nombre: "The American Diner",
    rubro: "cafeteria",
    zona: "Viña Centro",
    direccion: null,
    notas: "Desayunos y onces; tráfico matinal recurrente ideal para sellos.",
    prioridad: "media",
    planSugerido: "starter",
  },

  // ── Barberías — corte mensual = sello mensual, retención pura ──
  {
    id: "mapu-barbershop",
    nombre: "Mapu Barber Shop",
    rubro: "barberia",
    zona: "Viña / Valparaíso",
    direccion: null,
    notas:
      "Barbería premium + academia desde 2017, presencia en dos ciudades; multi-sede justifica plan growth.",
    prioridad: "alta",
    planSugerido: "growth",
  },
  {
    id: "the-wolf-salon",
    nombre: "The Wolf Salon",
    rubro: "barberia",
    zona: "Viña Centro",
    direccion: null,
    notas:
      "Salón masculino premium (color, camuflado de canas); la 10ª visita gratis es el gancho clásico del rubro.",
    prioridad: "alta",
    planSugerido: "starter",
  },
  {
    id: "chic-and-barber",
    nombre: "Chic & Barber",
    rubro: "barberia",
    zona: "Viña Centro",
    direccion: null,
    notas:
      "Concepto premium de la V región con atención personalizada de principio a fin.",
    prioridad: "alta",
    planSugerido: "starter",
  },
  {
    id: "life-barberia",
    nombre: "Life Barbería & Studio",
    rubro: "barberia",
    zona: "Viña Centro",
    direccion: "1 Norte 681",
    notas: "5.0★ en reseñas; clientela fiel que vuelve todos los meses.",
    prioridad: "media",
    planSugerido: "starter",
  },
  {
    id: "black-sheep",
    nombre: "Barbería Black Sheep",
    rubro: "barberia",
    zona: "Viña Centro",
    direccion: "Von Schroeder 229, Local 1",
    notas: "Barbería vintage y de lujo (masajes capilares, barba a la moda).",
    prioridad: "media",
    planSugerido: "starter",
  },
  {
    id: "alfa-men",
    nombre: "Barbería Alfa Men",
    rubro: "barberia",
    zona: "Viña Centro",
    direccion: "Av. Valparaíso 694, Local 14",
    notas: "Afeitado tradicional y diseño de barba en plena Av. Valparaíso.",
    prioridad: "media",
    planSugerido: "starter",
  },
  {
    id: "alpacino-barber",
    nombre: "Alpacino Barber",
    rubro: "barberia",
    zona: "Viña Centro",
    direccion: "Irlanda 14",
    notas: "Barbería chica bien evaluada; ticket bajo pero recompra mensual.",
    prioridad: "baja",
    planSugerido: "starter",
  },

  // ── Heladerías y pastelerías ──
  {
    id: "helados-coletti",
    nombre: "Helados Coletti",
    rubro: "heladeria",
    zona: "Viña Centro",
    direccion: null,
    notas:
      "Heladería artesanal italiana desde 1957 (3 generaciones); marca icónica con alto tráfico de verano.",
    prioridad: "alta",
    planSugerido: "growth",
  },
  {
    id: "maxidea",
    nombre: "Maxidea",
    rubro: "heladeria",
    zona: "Av. San Martín",
    direccion: null,
    notas:
      "Híbrido pastelería + heladería + cafetería con porciones generosas; ticket alto y visitas repetidas.",
    prioridad: "media",
    planSugerido: "starter",
  },
  {
    id: "cory-pasteleria",
    nombre: "Cory Pastelería",
    rubro: "heladeria",
    zona: "Viña Centro",
    direccion: null,
    notas:
      "Clásico austriaco (Torta María Antonieta); clientela histórica lista para digitalizar.",
    prioridad: "media",
    planSugerido: "starter",
  },
  {
    id: "torta-caluga",
    nombre: "Torta Caluga",
    rubro: "heladeria",
    zona: "Viña Centro",
    direccion: null,
    notas: "Marca con producto insignia propio; venta por encargo + vitrina.",
    prioridad: "media",
    planSugerido: "starter",
  },
  {
    id: "locosxvina-cafe",
    nombre: "Locos X Viña Café",
    rubro: "heladeria",
    zona: "Viña Centro",
    direccion: null,
    notas:
      "Ya usa carta digital básica de terceros — candidato a upgrade con fidelización integrada.",
    prioridad: "baja",
    planSugerido: "starter",
  },

  // ── Sangucherías y hamburgueserías ──
  {
    id: "gorilas",
    nombre: "Sanguchería Gorilas",
    rubro: "sangucheria",
    zona: "Viña Centro",
    direccion: null,
    notas:
      "Referente de hamburguesas artesanales en Viña; volumen alto de pedidos y delivery.",
    prioridad: "alta",
    planSugerido: "growth",
  },
  {
    id: "club-gordos",
    nombre: "Club Gordos",
    rubro: "sangucheria",
    zona: "Viña Centro",
    direccion: "Quinta 323, Local 5",
    notas:
      "Smash burgers take-away; público joven que responde a apps y sellos.",
    prioridad: "alta",
    planSugerido: "starter",
  },
  {
    id: "bravos",
    nombre: "Bravos Sanguchería",
    rubro: "sangucheria",
    zona: "Viña Centro",
    direccion: "10 Norte 1117",
    notas: "Burgers de carne fresca + churrascos y completos.",
    prioridad: "media",
    planSugerido: "starter",
  },
  {
    id: "la-criolla",
    nombre: "La Criolla Sanguchería",
    rubro: "sangucheria",
    zona: "Viña Centro",
    direccion: "5 Norte 301",
    notas:
      "Sánguches chilenos tradicionales desde 2020; carta amplia ideal para menú digital.",
    prioridad: "media",
    planSugerido: "starter",
  },
  {
    id: "rockola-diner",
    nombre: "Rockola Diner",
    rubro: "sangucheria",
    zona: "Viña Centro",
    direccion: "Calle Valparaíso 330",
    notas:
      "Diner cincuentero con ambientación única desde 2014; carta digital temática + fidelización.",
    prioridad: "media",
    planSugerido: "starter",
  },
  {
    id: "mr-wo",
    nombre: "Mr. Wo",
    rubro: "sangucheria",
    zona: "Viña Centro",
    direccion: "Álvarez 610, Local 3",
    notas: "Sanguchería tradicional (completos, churrascos, mechada).",
    prioridad: "media",
    planSugerido: "starter",
  },
  {
    id: "a-mano-gin-burgers",
    nombre: "A Mano Gin & Burgers",
    rubro: "sangucheria",
    zona: "Viña Centro",
    direccion: "7 Norte",
    notas:
      "Burgers + gin de inspiración española que impuso tendencia; carta digital con coctelería.",
    prioridad: "media",
    planSugerido: "starter",
  },

  // ── Pizzerías ──
  {
    id: "san-romano",
    nombre: "San Romano Pizzería",
    rubro: "pizzeria",
    zona: "Viña Centro",
    direccion: null,
    notas:
      "Compitió en el Mundial de la Pizza (Parma); marca consolidada desde 2014 con recompra semanal.",
    prioridad: "alta",
    planSugerido: "growth",
  },
  {
    id: "otra-cozza",
    nombre: "Pizzería Otra Cozza",
    rubro: "pizzeria",
    zona: "Viña Centro",
    direccion: null,
    notas: "Masa artesanal diaria y pizzas de autor; sellos por pizza.",
    prioridad: "media",
    planSugerido: "starter",
  },
  {
    id: "la-fermata",
    nombre: "La Fermata Pizzería",
    rubro: "pizzeria",
    zona: "Viña Centro",
    direccion: null,
    notas: "Horno napolitano a leña; nicho premium con clientela que repite.",
    prioridad: "media",
    planSugerido: "starter",
  },
  {
    id: "paninos-food",
    nombre: "Panino's Food",
    rubro: "pizzeria",
    zona: "Viña Centro",
    direccion: null,
    notas: "Pizzas, pastas y paninis; carta amplia ideal para menú digital.",
    prioridad: "media",
    planSugerido: "starter",
  },
  {
    id: "farina",
    nombre: "Fariná",
    rubro: "pizzeria",
    zona: "Viña Centro",
    direccion: null,
    notas: "Fusión italiana-chilena popular en la ciudad.",
    prioridad: "baja",
    planSugerido: "starter",
  },

  // ── Bares y cervecerías — carta QR viva (schops rotativos) + eventos push ──
  {
    id: "quercus",
    nombre: "Quercus (Cervecería Granizo)",
    rubro: "bar",
    zona: "Barrio Poniente",
    direccion: "4 Poniente",
    notas:
      "Bar de la premiada cervecería Granizo; carta de schops rotativa = carta digital siempre al día.",
    prioridad: "media",
    planSugerido: "growth",
  },
  {
    id: "cerveceria-oh",
    nombre: "Cervecería OH",
    rubro: "bar",
    zona: "Barrio Poniente",
    direccion: "3 Poniente esq. 7 Norte",
    notas:
      "25 años de historia, pet friendly; clientela habitual de barrio que vuelve cada semana.",
    prioridad: "media",
    planSugerido: "starter",
  },
  {
    id: "glasgow",
    nombre: "Glasgow Restobar",
    rubro: "bar",
    zona: "Barrio Poniente",
    direccion: "3 Poniente 660",
    notas: "Restobar con curaduría cervecera de primer nivel en casona.",
    prioridad: "media",
    planSugerido: "starter",
  },
  {
    id: "chingana-del-barrio",
    nombre: "La Chingana del Barrio",
    rubro: "bar",
    zona: "Barrio Poniente",
    direccion: null,
    notas:
      "Parrilla + coctelería de autor con terraza; QR en mesa para carta y promos.",
    prioridad: "media",
    planSugerido: "starter",
  },
  {
    id: "lagerhaus",
    nombre: "Lagerhaus",
    rubro: "bar",
    zona: "Viña Centro",
    direccion: null,
    notas: "Cervecería + pizzería + pub; doble carta en un solo QR.",
    prioridad: "media",
    planSugerido: "starter",
  },
  {
    id: "bar-la-virgen",
    nombre: "Bar La Virgen",
    rubro: "bar",
    zona: "Reñaca",
    direccion: null,
    notas:
      "Mesas sobre la arena en Reñaca; alto flujo turístico estacional, push en temporada.",
    prioridad: "baja",
    planSugerido: "starter",
  },

  // ── Restaurantes Reñaca — el fit es carta QR + reserva WhatsApp ──
  {
    id: "la-marina-renaca",
    nombre: "La Marina de Reñaca",
    rubro: "restaurante",
    zona: "Reñaca",
    direccion: null,
    notas:
      "Mariscos con vista al mar; menos recompra semanal, pero carta QR + reserva WhatsApp le sirven.",
    prioridad: "baja",
    planSugerido: "starter",
  },
  {
    id: "carmine",
    nombre: "Carmine",
    rubro: "restaurante",
    zona: "Reñaca",
    direccion: null,
    notas: "Italiano con vista al mar; carta digital multilenguaje para turistas.",
    prioridad: "baja",
    planSugerido: "starter",
  },
  {
    id: "la-isla-cochoa",
    nombre: "La Isla Cochoa",
    rubro: "restaurante",
    zona: "Reñaca / Cochoa",
    direccion: null,
    notas: "Cocina mediterránea reconocida en el sector Cochoa.",
    prioridad: "baja",
    planSugerido: "starter",
  },

  // ── Fitness y estudios — punch card de clases + push de cupos ──
  {
    id: "dual-pilates",
    nombre: "Dual Pilates & Yoga",
    rubro: "fitness",
    zona: "Viña Centro",
    direccion: "Von Schroeders 273, Of. 10",
    notas:
      "Estudio boutique femenino de reformer; punch card de clases + push de cupos liberados.",
    prioridad: "media",
    planSugerido: "starter",
  },
  {
    id: "experiencia-pilates",
    nombre: "Experiencia Pilates",
    rubro: "fitness",
    zona: "Viña / Concón",
    direccion: null,
    notas:
      "Clases personalizadas de máx. 4 personas en dos comunas; fidelización por asistencia.",
    prioridad: "media",
    planSugerido: "starter",
  },
  {
    id: "pink-pilates",
    nombre: "Pink Pilates",
    rubro: "fitness",
    zona: "Reñaca",
    direccion: null,
    notas: "Studio reformer en el corazón de Reñaca con staff certificado.",
    prioridad: "media",
    planSugerido: "starter",
  },
  {
    id: "club-fitness-vina",
    nombre: "Club Fitness Viña",
    rubro: "fitness",
    zona: "Viña Centro",
    direccion: null,
    notas:
      "Gimnasio con instalaciones modernas y clases grupales; volumen de socios justifica growth.",
    prioridad: "baja",
    planSugerido: "growth",
  },
];
