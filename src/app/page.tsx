"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { PunchCard } from "@/components/PunchCard";
import { RangoBadge } from "@/components/RangoBadge";
import { PremioCard } from "@/components/PremioCard";
import { NotifBanner } from "@/components/NotifBanner";
import { MediaSlot } from "@/components/MediaSlot";
import { Wordmark } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { getDefaultVendor } from "@/lib/vendors";
import { BANNERS, GALERIA, type AccionBanner } from "@/lib/contenidoHome";
import type { Premio } from "@/types";

function saludo(): string {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
}

function SectionHeader({
  eyebrow,
  titulo,
  href,
  hrefLabel = "Ver todo",
}: {
  eyebrow?: string;
  titulo: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-2">
      <div>
        {eyebrow && (
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
            {eyebrow}
          </p>
        )}
        <h2 className="font-headline text-xl font-extrabold leading-tight">
          {titulo}
        </h2>
      </div>
      {href && (
        <Link
          href={href}
          className="shrink-0 text-sm font-semibold text-primary"
        >
          {hrefLabel} →
        </Link>
      )}
    </div>
  );
}

export default function HomePage() {
  const { usuario } = useAuth();
  const logueado = !!usuario;
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

  const sellos = usuario?.sellos || 0;
  const wsp = `https://wa.me/${vendor.whatsapp}?text=${encodeURIComponent(
    `¡Hola ${vendor.nombre}! Quiero hacer un pedido / reservar 🍣`
  )}`;
  const igUrl = `https://instagram.com/${vendor.instagram}`;

  const hrefFor = (a: AccionBanner) =>
    a === "wsp"
      ? wsp
      : a === "premios"
        ? "/premios"
        : a === "menu"
          ? "/menu"
          : "/unete";

  return (
    <div className="animate-fade-up space-y-8 pb-4">
      {/* Saludo / marca */}
      {logueado ? (
        <header className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              {saludo()}
            </p>
            <h1 className="font-headline text-2xl font-extrabold leading-tight">
              {usuario!.nombre.split(" ")[0]} 🍣
            </h1>
          </div>
          <RangoBadge sellosHistoricos={usuario!.sellosHistoricos || 0} />
        </header>
      ) : (
        <header>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Bienvenido a
          </p>
          <Wordmark className="text-2xl" />
        </header>
      )}

      {/* Carrusel de promociones con imágenes */}
      <section className="space-y-3">
        <SectionHeader eyebrow="Lo de hoy" titulo="Promociones 🔥" />
        <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1">
          {BANNERS.map((b, i) => {
            const href = hrefFor(b.accion);
            const externo = b.accion === "wsp";
            const cls =
              "group relative aspect-[4/5] w-[78%] shrink-0 snap-start overflow-hidden rounded-3xl border border-border/40 shadow-md transition-transform active:scale-[0.98]";
            const inner = (
              <>
                <MediaSlot
                  src={b.imagen}
                  alt={b.titulo}
                  label="Promo"
                  priority={i === 0}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-foreground">
                  {b.etiqueta}
                </span>
                <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                  <h3 className="font-headline text-xl font-extrabold leading-tight">
                    {b.titulo}
                  </h3>
                  <p className="mt-1 text-sm text-white/85">{b.bajada}</p>
                  <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground">
                    {b.cta} →
                  </span>
                </div>
              </>
            );
            return externo ? (
              <a
                key={b.id}
                href={href}
                target="_blank"
                rel="noreferrer"
                className={cls}
              >
                {inner}
              </a>
            ) : (
              <Link key={b.id} href={href} className={cls}>
                {inner}
              </Link>
            );
          })}
        </div>
      </section>

      <NotifBanner />

      {/* Membresía */}
      {logueado ? (
        <PunchCard sellos={sellos} total={vendor.sellosParaPremio} />
      ) : (
        <section className="bg-nigiri-dark relative overflow-hidden rounded-3xl border border-white/10 p-6 text-white shadow-lg">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary-foreground/70">
            SushiPro Club
          </p>
          <h2 className="mt-1 font-headline text-2xl font-extrabold">
            Hazte socio gratis
          </h2>
          <p className="mt-1 text-sm text-white/70">
            Junta sellos con cada pedido y canjea premios exclusivos.
          </p>
          <ul className="mt-4 space-y-1.5 text-sm text-white/90">
            <li>🍣 1 sello por cada visita</li>
            <li>🏆 Premio gratis al 10° sello</li>
            <li>🎂 Sello doble el mes de tu cumpleaños</li>
          </ul>
          <Button asChild size="lg" className="mt-5 w-full">
            <Link href="/unete">Únete al club</Link>
          </Button>
        </section>
      )}

      {usuario?.recompensaDisponible && (
        <Link
          href="/premios"
          className="flex items-center gap-3 rounded-2xl border border-gold bg-gold/10 p-4"
        >
          <span className="text-3xl">🏆</span>
          <div className="flex-1">
            <p className="font-bold">¡Tienes un premio listo!</p>
            <p className="text-sm text-muted-foreground">
              Canjéalo antes de que se enfríe.
            </p>
          </div>
          <span className="font-semibold text-primary">Canjear →</span>
        </Link>
      )}

      {/* Acciones rápidas */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          asChild
          size="lg"
          className="h-auto flex-col gap-1 rounded-2xl py-5"
        >
          <Link href={logueado ? "/scan" : "/unete"}>
            <span className="text-2xl">{logueado ? "📷" : "🍣"}</span>
            <span>{logueado ? "Escanear" : "Únete"}</span>
          </Link>
        </Button>
        <Button
          asChild
          size="lg"
          variant="accent"
          className="h-auto flex-col gap-1 rounded-2xl py-5"
        >
          <a href={wsp} target="_blank" rel="noreferrer">
            <span className="text-2xl">🥢</span>
            <span>Pedir / Reservar</span>
          </a>
        </Button>
      </div>

      {/* Recompensas destacadas */}
      {destacados.length > 0 && (
        <section className="space-y-3">
          <SectionHeader
            eyebrow="Tus sellos rinden"
            titulo="Recompensas 🎁"
            href="/premios"
          />
          <div className="space-y-3">
            {destacados.map((p) => (
              <PremioCard key={p.id} premio={p} sellosActuales={sellos} />
            ))}
          </div>
        </section>
      )}

      {/* Galería tipo feed */}
      <section className="space-y-3">
        <SectionHeader
          eyebrow={`@${vendor.instagram}`}
          titulo="Del feed 📸"
          href={igUrl}
          hrefLabel="Seguir"
        />
        <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1">
          {GALERIA.map((g) => (
            <a
              key={g.id}
              href={igUrl}
              target="_blank"
              rel="noreferrer"
              className="relative aspect-square w-28 shrink-0 overflow-hidden rounded-2xl border border-border/40"
            >
              <MediaSlot src={g.imagen} alt={g.alt} label="Foto" />
            </a>
          ))}
        </div>
      </section>

      {/* Cierre */}
      <section className="overflow-hidden rounded-3xl border bg-secondary/50">
        <div className="relative aspect-[16/9]">
          <MediaSlot src="/locales/sushipro/destacado.png" alt="SushiPro" label="Imagen del local" />
        </div>
        <div className="flex items-center justify-between gap-3 p-4">
          <div>
            <p className="font-headline text-lg font-extrabold">
              Sushi de verdad, hecho al momento
            </p>
            <p className="text-sm text-muted-foreground">
              Pide por WhatsApp y suma sellos.
            </p>
          </div>
          <Button asChild variant="accent" className="shrink-0">
            <a href={wsp} target="_blank" rel="noreferrer">
              Pedir
            </a>
          </Button>
        </div>
      </section>
    </div>
  );
}
