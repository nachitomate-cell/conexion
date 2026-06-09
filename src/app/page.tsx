"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { RequireAuth } from "@/components/RequireAuth";
import { PunchCard } from "@/components/PunchCard";
import { RangoBadge } from "@/components/RangoBadge";
import { PremioCard } from "@/components/PremioCard";
import { NotifBanner } from "@/components/NotifBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getDefaultVendor } from "@/lib/vendors";
import type { Premio } from "@/types";

function saludo(): string {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
}

const PROMOS = [
  {
    emoji: "🔥",
    titulo: "2x1 en Rolls California",
    texto: "Todos los miércoles. Junta el doble de sellos.",
  },
  {
    emoji: "🍱",
    titulo: "Combo Omakase del chef",
    texto: "Edición limitada de temporada. Pregunta en el local.",
  },
];

function HomeInner() {
  const { usuario } = useAuth();
  const vendor = getDefaultVendor();
  const [destacados, setDestacados] = useState<Premio[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const q = query(
          collection(db, "premios"),
          where("vendorId", "==", vendor.id)
        );
        const snap = await getDocs(q);
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as Premio)
          .filter((p) => p.activo)
          .sort((a, b) => a.sellosRequeridos - b.sellosRequeridos)
          .slice(0, 3);
        setDestacados(list);
      } catch {
        setDestacados([]);
      }
    })();
  }, [vendor.id]);

  if (!usuario) return null;
  const sellos = usuario.sellos || 0;
  const wspMsg = encodeURIComponent(
    `¡Hola ${vendor.nombre}! Quiero hacer un pedido / reservar 🍣`
  );

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm text-muted-foreground">{saludo()},</p>
          <h1 className="font-headline text-2xl font-bold leading-tight">
            {usuario.nombre.split(" ")[0]} 🍣
          </h1>
        </div>
        <RangoBadge sellosHistoricos={usuario.sellosHistoricos || 0} />
      </div>

      <NotifBanner />

      <PunchCard sellos={sellos} total={vendor.sellosParaPremio} />

      {usuario.recompensaDisponible && (
        <Card className="border-gold bg-gold/10">
          <CardContent className="flex items-center gap-3 p-4">
            <span className="text-3xl">🏆</span>
            <div className="flex-1">
              <p className="font-semibold">¡Tienes un premio listo!</p>
              <p className="text-sm text-muted-foreground">
                Canjéalo antes de que se enfríe.
              </p>
            </div>
            <Button asChild size="sm" variant="gold">
              <Link href="/premios">Canjear</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Button asChild size="lg" className="h-auto flex-col gap-1 py-4">
          <Link href="/scan">
            <span className="text-2xl">📷</span>
            <span>Escanear ahora</span>
          </Link>
        </Button>
        <Button
          asChild
          size="lg"
          variant="accent"
          className="h-auto flex-col gap-1 py-4"
        >
          <a
            href={`https://wa.me/${vendor.whatsapp}?text=${wspMsg}`}
            target="_blank"
            rel="noreferrer"
          >
            <span className="text-2xl">🥢</span>
            <span>Pedir / Reservar</span>
          </a>
        </Button>
      </div>

      {destacados.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-headline text-lg font-bold">
              Premios destacados 🎁
            </h2>
            <Link href="/premios" className="text-sm font-medium text-primary">
              Ver todos
            </Link>
          </div>
          <div className="space-y-3">
            {destacados.map((p) => (
              <PremioCard key={p.id} premio={p} sellosActuales={sellos} />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-headline text-lg font-bold">
          Novedades del local 📣
        </h2>
        {PROMOS.map((promo) => (
          <Card key={promo.titulo}>
            <CardContent className="flex items-center gap-3 p-4">
              <span className="text-3xl">{promo.emoji}</span>
              <div>
                <p className="font-semibold">{promo.titulo}</p>
                <p className="text-sm text-muted-foreground">{promo.texto}</p>
              </div>
            </CardContent>
          </Card>
        ))}
        <a
          href={`https://instagram.com/${vendor.instagram}`}
          target="_blank"
          rel="noreferrer"
          className="block text-center text-sm font-medium text-primary"
        >
          Síguenos en @{vendor.instagram} →
        </a>
      </section>
    </div>
  );
}

export default function HomePage() {
  return (
    <RequireAuth roles={["cliente"]}>
      <HomeInner />
    </RequireAuth>
  );
}
