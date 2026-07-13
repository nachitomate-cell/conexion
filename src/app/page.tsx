"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { PunchCard } from "@/components/PunchCard";
import { RangoBadge } from "@/components/RangoBadge";
import { VideoAmbiente } from "@/components/VideoAmbiente";
import { PremioCard } from "@/components/PremioCard";
import { NotifBanner } from "@/components/NotifBanner";
import { MediaSlot } from "@/components/MediaSlot";
import { Button } from "@/components/ui/button";
import { useVendor } from "@/context/VendorContext";
import { GALERIA } from "@/lib/contenidoHome";
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
  const vendor = useVendor();
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
  const emojiHola = vendor.copy.emojis.slice(0, 2) || vendor.emoji;

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
              {usuario!.nombre.split(" ")[0]} {emojiHola}
            </h1>
          </div>
          <RangoBadge sellosHistoricos={usuario!.sellosHistoricos || 0} />
        </header>
      ) : (
        <header className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={vendor.theme.logoUrl}
            alt={vendor.nombre}
            width={vendor.theme.logoWidth}
            height={40}
            className="h-10 w-auto"
          />
        </header>
      )}

      {/* Hero de bienvenida (reemplaza el carrusel de promos hardcodeadas) */}
      <section
        className="relative overflow-hidden rounded-3xl p-6 text-white shadow-lg"
        style={{ backgroundColor: vendor.theme.primaryColor }}
      >
        {/* Video de portada — feature premium por tenant (Growth+) */}
        {vendor.theme.heroVideoUrl && (
          <>
            <VideoAmbiente src={vendor.theme.heroVideoUrl} />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/35 to-black/20"
            />
          </>
        )}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/10"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-14 -left-6 h-32 w-32 rounded-full bg-white/10"
        />
        <p className="relative text-[11px] font-bold uppercase tracking-[0.22em] text-white/70">
          Bienvenido a
        </p>
        <h2 className="relative mt-1 font-headline text-2xl font-extrabold leading-tight">
          {vendor.nombre} {vendor.copy.emojis}
        </h2>
        <p className="relative mt-2 max-w-md text-sm text-white/85">
          {vendor.copy.joinDescription}
        </p>
      </section>

      <NotifBanner />

      {/* Membresía */}
      {logueado ? (
        <PunchCard sellos={sellos} total={vendor.sellosParaPremio} />
      ) : (
        <section className="bg-nigiri-dark relative overflow-hidden rounded-3xl border border-white/10 p-6 text-white shadow-lg">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary-foreground/70">
            {vendor.copy.clubName}
          </p>
          <h2 className="mt-1 font-headline text-2xl font-extrabold">
            Hazte socio gratis
          </h2>
          <p className="mt-1 text-sm text-white/70">
            {vendor.copy.joinDescription}
          </p>
          <ul className="mt-4 space-y-1.5 text-sm text-white/90">
            <li>{vendor.emoji} 1 sello por cada visita</li>
            <li>🏆 Premio gratis al {vendor.sellosParaPremio}° sello</li>
            <li>🎂 Sello doble el mes de tu cumpleaños</li>
          </ul>
          <Button
            asChild
            size="lg"
            className="mt-5 w-full"
            style={{ backgroundColor: vendor.theme.primaryColor }}
          >
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
            <span className="text-2xl">
              {logueado ? "📷" : vendor.emoji}
            </span>
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
            <span className="text-2xl">{vendor.emoji}</span>
            <span>Pedir / Reservar</span>
          </a>
        </Button>
      </div>

      {/* Marketplace de sellos — Fase 1: descubre otros clubes */}
      <Link
        href="/explora"
        className="flex items-center gap-3 rounded-3xl border bg-secondary/50 p-4 transition-shadow hover:shadow-md"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-background text-2xl shadow-sm">
          🏪
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
            Nuevo
          </p>
          <p className="font-headline font-extrabold leading-tight">
            Explora los clubes del barrio
          </p>
          <p className="text-sm text-muted-foreground">
            Tu misma cuenta, sellos en todos los locales.
          </p>
        </div>
        <span className="shrink-0 font-semibold text-primary">Ver →</span>
      </Link>

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
          <MediaSlot
            src={`/locales/${vendor.slug}/destacado.jpg`}
            alt={vendor.nombre}
            label="Imagen del local"
          />
        </div>
        <div className="flex items-center justify-between gap-3 p-4">
          <div>
            <p className="font-headline text-lg font-extrabold">
              {vendor.nombre} {vendor.copy.emojis}
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
