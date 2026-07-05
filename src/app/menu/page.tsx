"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCLP } from "@/lib/utils";
import { useVendor } from "@/context/VendorContext";
import type { MenuItem } from "@/types";

export default function MenuPage() {
  const vendor = useVendor();
  const [items, setItems] = useState<MenuItem[] | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, "menu"),
      where("vendorId", "==", vendor.id)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as MenuItem)
          .filter((it) => it.activo);
        setItems(list);
      },
      () => setItems([])
    );
    return () => unsub();
  }, [vendor.id]);

  // Agrupa por categoría preservando el orden `orden` si existe.
  const porCategoria = useMemo(() => {
    if (!items) return null;
    const grupos: Record<string, MenuItem[]> = {};
    for (const it of items) {
      (grupos[it.categoria] ||= []).push(it);
    }
    for (const key of Object.keys(grupos)) {
      grupos[key].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
    }
    return grupos;
  }, [items]);

  const wspMsg = encodeURIComponent(
    `¡Hola ${vendor.nombre}! Quiero hacer un pedido ${vendor.copy.emojis}`
  );

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h1 className="font-headline text-2xl font-bold">
          Nuestra carta {vendor.copy.emojis}
        </h1>
        <p className="text-sm text-muted-foreground">
          Pide directo por WhatsApp y suma sellos.
        </p>
      </div>

      {items === null ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : items.length === 0 || !porCategoria ? (
        <div className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
          <p className="text-4xl">🍽️</p>
          <p className="mt-2 font-semibold">Menú en construcción</p>
          <p className="mt-1 text-sm">
            Estamos cargando la carta de {vendor.nombre}. Vuelve pronto.
          </p>
        </div>
      ) : (
        Object.entries(porCategoria).map(([categoria, its]) => (
          <section key={categoria} className="space-y-2">
            <h2 className="font-headline text-lg font-bold">{categoria}</h2>
            <Card>
              <CardContent className="divide-y p-0">
                {its.map((it) => (
                  <div
                    key={it.id}
                    className="flex items-center gap-3 p-3.5"
                  >
                    {it.emoji && <span className="text-2xl">{it.emoji}</span>}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold leading-tight">{it.nombre}</p>
                      {it.descripcion && (
                        <p className="truncate text-xs text-muted-foreground">
                          {it.descripcion}
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
        ))
      )}

      {vendor.whatsapp && (
        <Button asChild size="lg" variant="accent" className="w-full">
          <a
            href={`https://wa.me/${vendor.whatsapp}?text=${wspMsg}`}
            target="_blank"
            rel="noreferrer"
          >
            🥢 Pedir por WhatsApp
          </a>
        </Button>
      )}
    </div>
  );
}
