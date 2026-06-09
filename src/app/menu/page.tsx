"use client";

import { RequireAuth } from "@/components/RequireAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCLP } from "@/lib/utils";
import { getDefaultVendor } from "@/lib/vendors";

interface Item {
  nombre: string;
  desc?: string;
  precio: number;
  emoji: string;
}
interface Categoria {
  titulo: string;
  emoji: string;
  items: Item[];
}

// Menú digital estático (reemplaza la carta física). Editable a futuro desde admin.
const MENU: Categoria[] = [
  {
    titulo: "Rolls Clásicos",
    emoji: "🍣",
    items: [
      { nombre: "California Roll", desc: "Kanikama, palta, pepino", precio: 5900, emoji: "🍣" },
      { nombre: "Sake Roll", desc: "Salmón fresco, palta", precio: 6500, emoji: "🐟" },
      { nombre: "Ebi Tempura Roll", desc: "Camarón tempura, queso", precio: 6900, emoji: "🍤" },
    ],
  },
  {
    titulo: "Rolls Premium",
    emoji: "🔥",
    items: [
      { nombre: "Tori Crunch", desc: "Pollo crispy, salsa de la casa", precio: 7500, emoji: "🍗" },
      { nombre: "Avocado Deluxe", desc: "Doble palta, salmón, sésamo", precio: 7900, emoji: "🥑" },
    ],
  },
  {
    titulo: "Combos & Tablas",
    emoji: "🍱",
    items: [
      { nombre: "Tabla 30 bocados", desc: "Mix de rolls del chef", precio: 18900, emoji: "🍱" },
      { nombre: "Omakase del Chef", desc: "Selección sorpresa de temporada", precio: 24900, emoji: "👨‍🍳" },
    ],
  },
  {
    titulo: "Para acompañar",
    emoji: "🥢",
    items: [
      { nombre: "Gyozas (5u)", precio: 4900, emoji: "🥟" },
      { nombre: "Bebida / Té helado", precio: 1900, emoji: "🥤" },
      { nombre: "Mochi de postre", precio: 2900, emoji: "🍡" },
    ],
  },
];

function MenuInner() {
  const vendor = getDefaultVendor();
  const wspMsg = encodeURIComponent(
    `¡Hola ${vendor.nombre}! Quiero hacer un pedido 🍣`
  );

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h1 className="font-headline text-2xl font-bold">Nuestra carta 🍱</h1>
        <p className="text-sm text-muted-foreground">
          Pide directo por WhatsApp y suma sellos.
        </p>
      </div>

      {MENU.map((cat) => (
        <section key={cat.titulo} className="space-y-2">
          <h2 className="font-headline text-lg font-bold">
            {cat.emoji} {cat.titulo}
          </h2>
          <Card>
            <CardContent className="divide-y p-0">
              {cat.items.map((it) => (
                <div
                  key={it.nombre}
                  className="flex items-center gap-3 p-3.5"
                >
                  <span className="text-2xl">{it.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-tight">{it.nombre}</p>
                    {it.desc && (
                      <p className="truncate text-xs text-muted-foreground">
                        {it.desc}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 font-semibold text-primary">
                    {formatCLP(it.precio)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      ))}

      <Button asChild size="lg" variant="accent" className="w-full">
        <a
          href={`https://wa.me/${vendor.whatsapp}?text=${wspMsg}`}
          target="_blank"
          rel="noreferrer"
        >
          🥢 Pedir por WhatsApp
        </a>
      </Button>
    </div>
  );
}

export default function MenuPage() {
  return (
    <RequireAuth roles={["cliente"]}>
      <MenuInner />
    </RequireAuth>
  );
}
