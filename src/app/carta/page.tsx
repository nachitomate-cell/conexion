"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  Facebook,
  Instagram,
  Mail,
  MapPin,
  Phone,
  Search,
  X,
} from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { LucideIconByName } from "@/components/LucideIconByName";
import { useVendor } from "@/context/VendorContext";
import { cn, formatCLP } from "@/lib/utils";
import type { Categoria, Producto } from "@/types";

// =========================================================
// Overlay de negocio: fields extra que el vendor estático no tiene.
// Se leen de `vendors/{vendorId}` (mismo doc que edita /admin/local).
// =========================================================

interface BusinessOverlay {
  address?: string;
  schedule?: string;
  phone?: string;
  email?: string;
  facebookUrl?: string;
  backgroundUrl?: string;
  logoUrl?: string;
  // Fields ya editables desde /admin/local — permiten override del estático.
  nombre?: string;
  instagram?: string;
  whatsapp?: string;
  emoji?: string;
}

// =========================================================
// Modal de información del negocio
// =========================================================

function BusinessInfoModal({
  open,
  onOpenChange,
  info,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  info: {
    nombre: string;
    address?: string;
    schedule?: string;
    phone?: string;
    email?: string;
    whatsappHref?: string;
    instagramHref?: string;
    facebookHref?: string;
  };
}) {
  const filas: {
    icon: typeof MapPin;
    label: string;
    value?: string;
    href?: string;
  }[] = [
    { icon: MapPin, label: "Dirección", value: info.address },
    { icon: Clock, label: "Horario", value: info.schedule },
    {
      icon: Phone,
      label: "Teléfono",
      value: info.phone,
      href: info.phone
        ? `tel:${info.phone.replace(/\s/g, "")}`
        : undefined,
    },
    {
      icon: Mail,
      label: "Email",
      value: info.email,
      href: info.email ? `mailto:${info.email}` : undefined,
    },
  ];

  const conRedes =
    info.whatsappHref || info.instagramHref || info.facebookHref;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-sm p-0 [&>button]:hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* DialogTitle es requerido por accesibilidad — lo mantenemos oculto
            porque el modal ya tiene un header visual propio. */}
        <DialogTitle className="sr-only">{info.nombre}</DialogTitle>

        {/* Header con nombre + botón cerrar custom */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="truncate text-lg font-bold">{info.nombre}</h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Cerrar"
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <ul className="space-y-3">
            {filas
              .filter((f) => !!f.value)
              .map((f) => {
                const Icon = f.icon;
                const content = (
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" strokeWidth={2.25} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                        {f.label}
                      </p>
                      <p className="text-sm text-foreground">{f.value}</p>
                    </div>
                  </div>
                );
                return (
                  <li key={f.label}>
                    {f.href ? (
                      <a
                        href={f.href}
                        target={f.href.startsWith("http") ? "_blank" : undefined}
                        rel="noopener noreferrer"
                        className="block rounded-lg -m-1 p-1 transition-colors hover:bg-muted/60"
                      >
                        {content}
                      </a>
                    ) : (
                      content
                    )}
                  </li>
                );
              })}
          </ul>

          {conRedes && (
            <div className="border-t pt-4">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Nuestros canales de contacto
              </p>
              <div className="flex items-center justify-around">
                {info.whatsappHref && (
                  <a
                    href={info.whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="WhatsApp"
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-md shadow-emerald-500/30 transition-transform hover:scale-110 active:scale-95"
                  >
                    <WhatsAppIcon className="h-7 w-7" />
                  </a>
                )}
                {info.instagramHref && (
                  <a
                    href={info.instagramHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-fuchsia-500 via-pink-500 to-amber-400 text-white shadow-md shadow-pink-500/30 transition-transform hover:scale-110 active:scale-95"
                  >
                    <Instagram className="h-6 w-6" strokeWidth={2.25} />
                  </a>
                )}
                {info.facebookHref && (
                  <a
                    href={info.facebookHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1877F2] text-white shadow-md shadow-blue-500/30 transition-transform hover:scale-110 active:scale-95"
                  >
                    <Facebook className="h-6 w-6" strokeWidth={2.25} />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =========================================================
// Tarjeta de producto
// =========================================================

function ProductoCard({ p }: { p: Producto }) {
  const agotado = !p.disponible;
  return (
    <article
      className={cn(
        "flex items-stretch gap-3 rounded-2xl border bg-card p-3 shadow-sm transition-all",
        agotado && "opacity-60"
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-1.5">
          <h3 className="line-clamp-2 flex-1 text-sm font-bold leading-snug text-foreground">
            {p.nombre}
          </h3>
          {agotado && (
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              Agotado
            </span>
          )}
        </div>
        {p.descripcion && (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {p.descripcion}
          </p>
        )}
        <p className="mt-2 text-base font-bold text-orange-600">
          {formatCLP(p.precio)}
        </p>
      </div>
      {p.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={p.imageUrl}
          alt={p.nombre}
          className="h-24 w-24 shrink-0 rounded-xl object-cover sm:h-28 sm:w-28"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      )}
    </article>
  );
}

// =========================================================
// Página pública
// =========================================================

export default function CartaPublicaPage() {
  const vendor = useVendor();
  const [overlay, setOverlay] = useState<BusinessOverlay>({});
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [q, setQ] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Overlay editable del negocio (vendors/{id}) — realtime.
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "vendors", vendor.id),
      (snap) => setOverlay(snap.data() as BusinessOverlay ?? {}),
      () => setOverlay({})
    );
    return () => unsub();
  }, [vendor.id]);

  // Categorías — realtime.
  useEffect(() => {
    const qc = query(
      collection(db, "categorias"),
      where("vendorId", "==", vendor.id)
    );
    const unsub = onSnapshot(qc, (snap) => {
      const list = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as Categoria
      );
      list.sort(
        (a, b) => (a.orden ?? 0) - (b.orden ?? 0) || a.nombre.localeCompare(b.nombre)
      );
      setCategorias(list);
    });
    return () => unsub();
  }, [vendor.id]);

  // Productos — realtime.
  useEffect(() => {
    const qp = query(
      collection(db, "productos"),
      where("vendorId", "==", vendor.id)
    );
    const unsub = onSnapshot(qp, (snap) => {
      const list = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as Producto
      );
      setProductos(list);
    });
    return () => unsub();
  }, [vendor.id]);

  // Datos que muestra el hero + modal — overlay Firestore pisa el estático.
  const nombre = overlay.nombre?.trim() || vendor.nombre;
  const logoUrl = overlay.logoUrl || vendor.theme.logoUrl;
  const backgroundUrl = overlay.backgroundUrl;
  const emoji = overlay.emoji || vendor.emoji;

  const whatsapp = overlay.whatsapp || vendor.whatsapp;
  const instagram = overlay.instagram || vendor.instagram;

  const info = useMemo(
    () => ({
      nombre,
      address: overlay.address,
      schedule: overlay.schedule,
      phone: overlay.phone,
      email: overlay.email,
      whatsappHref: whatsapp ? `https://wa.me/${whatsapp}` : undefined,
      instagramHref: instagram
        ? `https://instagram.com/${instagram.replace(/^@/, "")}`
        : undefined,
      facebookHref: overlay.facebookUrl || undefined,
    }),
    [
      nombre,
      overlay.address,
      overlay.schedule,
      overlay.phone,
      overlay.email,
      overlay.facebookUrl,
      whatsapp,
      instagram,
    ]
  );

  // Filtra productos: solo disponibles se muestran solo cuando NO hay búsqueda.
  // Con búsqueda mostramos también los agotados que matchean (transparencia).
  const productosFiltrados = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return productos.filter((p) => {
      if (!needle) return p.disponible; // vista normal: solo disponibles
      const hay =
        p.nombre.toLowerCase().includes(needle) ||
        (p.descripcion || "").toLowerCase().includes(needle);
      return hay;
    });
  }, [productos, q]);

  // Agrupa productos por categoría en el orden de la categoría.
  const secciones = useMemo(() => {
    const grupos: Record<string, Producto[]> = {};
    for (const p of productosFiltrados)
      (grupos[p.categoriaId] ||= []).push(p);
    for (const key of Object.keys(grupos)) {
      grupos[key].sort(
        (a, b) => (a.orden ?? 0) - (b.orden ?? 0) || a.nombre.localeCompare(b.nombre)
      );
    }
    return categorias
      .map((c) => ({ categoria: c, items: grupos[c.id] || [] }))
      .filter((s) => s.items.length > 0);
  }, [productosFiltrados, categorias]);

  const scrollToCategoria = (categoriaId: string) => {
    const el = document.getElementById(`cat-${categoriaId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main className="min-h-dvh bg-background" ref={containerRef}>
      {/* HERO — full width con background image + overlay oscuro */}
      <header className="relative overflow-hidden">
        {/* Botón atrás — flotante sobre el hero */}
        <Link
          href="/"
          aria-label="Volver"
          className="absolute left-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition-colors hover:bg-black/60"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>

        <div className="relative h-56 w-full sm:h-64">
          {backgroundUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={backgroundUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              aria-hidden
            />
          ) : (
            // Gradient fallback si no hay backgroundUrl
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.7) 100%)",
              }}
              aria-hidden
            />
          )}
          {/* Overlay oscuro */}
          <div
            className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/70"
            aria-hidden
          />
        </div>

        {/* Logo circular superpuesto + nombre + CTA */}
        <div className="relative -mt-16 flex flex-col items-center gap-3 px-4 pb-6 text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-background bg-background shadow-xl">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={`Logo ${nombre}`}
                width={80}
                height={80}
                className="h-20 w-20 rounded-full object-cover"
                unoptimized
              />
            ) : (
              <span className="text-5xl">{emoji}</span>
            )}
          </div>
          <h1 className="font-headline text-2xl font-bold text-foreground">
            {nombre}
          </h1>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border bg-background px-4 py-1.5 text-xs font-semibold text-foreground shadow-sm transition-all hover:bg-muted"
          >
            Ver más
          </button>
        </div>
      </header>

      {/* CONTENIDO */}
      <div className="mx-auto max-w-2xl">
        {/* Buscador — sticky bajo el hero */}
        <div className="sticky top-0 z-10 border-b bg-background/95 px-4 py-3 backdrop-blur-md">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              inputMode="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por productos"
              className="w-full rounded-full border bg-muted/40 py-2.5 pl-9 pr-3 text-sm text-foreground outline-none transition-colors focus:border-primary/50 focus:bg-background focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Nav de categorías — scroll horizontal, sticky bajo el buscador */}
        {categorias.length > 0 && !q && (
          <div className="sticky top-14 z-[9] border-b bg-background/95 backdrop-blur-md">
            <nav
              aria-label="Categorías"
              className="flex gap-2 overflow-x-auto whitespace-nowrap px-4 py-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              {categorias.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => scrollToCategoria(c.id)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm transition-all hover:bg-primary/10 hover:text-primary active:scale-95"
                >
                  <LucideIconByName
                    name={c.iconName || "Utensils"}
                    className="h-3.5 w-3.5"
                    strokeWidth={2.25}
                  />
                  {c.nombre}
                </button>
              ))}
            </nav>
          </div>
        )}

        {/* Secciones de productos */}
        <div className="space-y-6 px-4 pb-24 pt-4">
          {secciones.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              {q
                ? `No encontramos productos con "${q}".`
                : "Aún no hay productos publicados."}
            </p>
          ) : (
            secciones.map(({ categoria, items }) => (
              <section
                key={categoria.id}
                id={`cat-${categoria.id}`}
                className="scroll-mt-32"
              >
                <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-foreground">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <LucideIconByName
                      name={categoria.iconName || "Utensils"}
                      className="h-4 w-4"
                      strokeWidth={2.25}
                    />
                  </span>
                  {categoria.nombre}
                </h2>
                <div className="space-y-2.5">
                  {items.map((p) => (
                    <ProductoCard key={p.id} p={p} />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </div>

      <BusinessInfoModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        info={info}
      />
    </main>
  );
}
