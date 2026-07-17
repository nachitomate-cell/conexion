"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { MapPin } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useVendor } from "@/context/VendorContext";
import { PremioVitrinaCard } from "@/components/PremioVitrinaCard";
import { RangoBadge } from "@/components/RangoBadge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { canjearPremio } from "@/lib/puntos";
import { buildCanjeQRValue } from "@/lib/vendors";
import { cn } from "@/lib/utils";
import type { Premio } from "@/types";

// =========================================================
// Centro de Recompensas — grilla responsiva de premios con
// tabs (Todos / Canjeables / En progreso). Mientras la
// federación multi-tenant no exista, todos los premios vienen
// del vendor actual — el badge del club sirve como pista visual
// para cuando la vista sea inter-club.
// =========================================================

// Vista previa: se muestra mientras `premios` esté vacío para
// que el admin vea la maqueta cargada. Se apaga solo al crear
// el primer premio real.
const DEMO_POR_VENDOR: Record<string, Omit<Premio, "vendorId">[]> = {
  sushipro: [
    {
      id: "__demo_gyozas",
      nombre: "Gyozas de Cerdo",
      icono: "🥟",
      descripcion: "5 unidades recién hechas, salsa ponzu de la casa.",
      sellosRequeridos: 5,
      stock: 999,
      activo: true,
    },
    {
      id: "__demo_roll",
      nombre: "Roll a elección (8 cortes)",
      icono: "🍣",
      descripcion: "Elige cualquier roll clásico de la carta.",
      sellosRequeridos: 10,
      stock: 999,
      activo: true,
    },
    {
      id: "__demo_helado",
      nombre: "Tempura Ice Cream",
      icono: "🍨",
      descripcion: "Helado tempurizado con salsa de matcha.",
      sellosRequeridos: 15,
      stock: 999,
      activo: true,
    },
  ],
  nenecurauma: [
    {
      id: "__demo_schop",
      nombre: "Schop Cerveza Cusqueña",
      icono: "🍺",
      descripcion: "Schop pilsener 500cc bien helado.",
      sellosRequeridos: 6,
      stock: 999,
      activo: true,
    },
    {
      id: "__demo_piscola",
      nombre: "Piscola Mistral 35°",
      icono: "🥃",
      descripcion: "Piscola clásica con Mistral 35° y bebida.",
      sellosRequeridos: 8,
      stock: 999,
      activo: true,
    },
    {
      id: "__demo_burger",
      nombre: "Burger Chancharteria",
      icono: "🍔",
      descripcion: "Doble mechada, cheddar y salsa de la casa.",
      sellosRequeridos: 12,
      stock: 999,
      activo: true,
    },
  ],
  gustunazca: [
    {
      id: "__demo_piscosour",
      nombre: "Pisco Sour Catedral",
      icono: "🍹",
      descripcion: "Pisco quebranta, limón sutil y clara batida.",
      sellosRequeridos: 6,
      stock: 999,
      activo: true,
    },
    {
      id: "__demo_ceviche",
      nombre: "Ceviche Clásico",
      icono: "🐟",
      descripcion: "Pescado del día, cebolla morada, ají limo y camote.",
      sellosRequeridos: 10,
      stock: 999,
      activo: true,
    },
    {
      id: "__demo_lomo",
      nombre: "Lomo Saltado",
      icono: "🍛",
      descripcion:
        "Lomo salteado al wok con papas fritas y arroz graneado.",
      sellosRequeridos: 12,
      stock: 999,
      activo: true,
    },
  ],
};

function demoPremios(vendorId: string): Premio[] {
  const list = DEMO_POR_VENDOR[vendorId] ?? DEMO_POR_VENDOR.sushipro;
  return list.map((p) => ({ ...p, vendorId }));
}

type TabId = "todos" | "canjeables" | "progreso";

function VistaPreviaBanner() {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-[13px] text-indigo-900">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[18px]">
        🍱
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">Vista previa de premios</p>
        <p className="text-[12px] text-indigo-800/75">
          Este club aún no publica premios reales. Los que ves son de muestra —
          crea los definitivos desde{" "}
          <code className="rounded bg-white/70 px-1.5 py-0.5 font-mono text-[11px] text-indigo-900">
            /admin
          </code>
          .
        </p>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  accent,
  children,
}: {
  active: boolean;
  onClick: () => void;
  accent?: "emerald";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition-all active:scale-[0.98]",
        active
          ? accent === "emerald"
            ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/30"
            : "bg-foreground text-background"
          : "bg-black/[0.04] text-foreground/70 hover:bg-black/[0.06]"
      )}
    >
      {children}
    </button>
  );
}

function EmptyState({ tab }: { tab: TabId }) {
  const cfg = {
    todos: { emoji: "🎁", msg: "Este club aún no publica premios." },
    canjeables: {
      emoji: "🎯",
      msg: "Aún no tienes premios listos para canjear. Junta más sellos.",
    },
    progreso: {
      emoji: "🏁",
      msg: "No hay premios en progreso ahora mismo.",
    },
  }[tab];
  return (
    <div className="col-span-full rounded-2xl bg-slate-50 p-16 text-center ring-1 ring-slate-100">
      <p className="text-5xl">{cfg.emoji}</p>
      <p className="mt-3 text-[14px] text-slate-600">{cfg.msg}</p>
    </div>
  );
}

export default function PremiosPage() {
  const { usuario, firebaseUser } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const vendor = useVendor();
  const [premios, setPremios] = useState<Premio[] | null>(null);
  const [canjeandoId, setCanjeandoId] = useState<string | null>(null);
  const [voucher, setVoucher] = useState<{
    codigo: string;
    canjeId: string;
    nombre: string;
  } | null>(null);
  const [tab, setTab] = useState<TabId>("todos");

  useEffect(() => {
    const q = query(
      collection(db, "premios"),
      where("vendorId", "==", vendor.id)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as Premio)
          .filter((p) => p.activo)
          .sort((a, b) => a.sellosRequeridos - b.sellosRequeridos);
        setPremios(list);
      },
      () => setPremios([])
    );
    return () => unsub();
  }, [vendor.id]);

  const sellos = usuario?.sellos ?? 0;

  const handleCanjear = async (premio: Premio) => {
    if (!firebaseUser) {
      toast({
        title: "Inicia sesión para canjear",
        description: "Crea tu cuenta gratis y empieza a juntar sellos.",
      });
      router.push("/unete");
      return;
    }
    setCanjeandoId(premio.id);
    const res = await canjearPremio(premio.id);
    setCanjeandoId(null);
    if (!res.ok) {
      toast({ title: "No se pudo canjear", description: res.error });
      return;
    }
    setVoucher({
      codigo: res.codigo!,
      canjeId: res.canjeId!,
      nombre: premio.nombre,
    });
  };

  const ordenados = useMemo(() => premios ?? [], [premios]);
  const esVistaPrevia = premios !== null && ordenados.length === 0;
  const paraMostrar = esVistaPrevia ? demoPremios(vendor.id) : ordenados;

  const canjeables = useMemo(
    () =>
      paraMostrar.filter(
        (p) => sellos >= p.sellosRequeridos && p.stock > 0
      ),
    [paraMostrar, sellos]
  );
  const enProgreso = useMemo(
    () => paraMostrar.filter((p) => sellos < p.sellosRequeridos),
    [paraMostrar, sellos]
  );

  const visibles = useMemo(() => {
    if (tab === "canjeables") return canjeables;
    if (tab === "progreso") return enProgreso;
    return paraMostrar;
  }, [tab, canjeables, enProgreso, paraMostrar]);

  return (
    <div className="mx-auto max-w-xl space-y-8 px-4 md:max-w-4xl md:px-6 lg:max-w-6xl lg:px-8">
      {/* ── Hero ── */}
      <header className="flex flex-col items-start gap-4 pt-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground/70">
            Centro de Recompensas
          </p>
          <h1 className="mt-2 font-headline text-[32px] font-black leading-none tracking-tight md:text-[42px]">
            Premios 🎁
          </h1>
          <p className="mt-3 text-[14px] text-muted-foreground md:text-[15px]">
            Tienes{" "}
            <span className="font-bold tabular-nums text-foreground">
              {sellos}
            </span>{" "}
            sellos disponibles para canjear.
          </p>
        </div>
        {usuario && (
          <RangoBadge
            sellosHistoricos={usuario.sellosHistoricos || 0}
            variant="rank"
          />
        )}
      </header>

      {/* ── Vista previa (solo si no hay premios reales todavía) ── */}
      {esVistaPrevia && <VistaPreviaBanner />}

      {/* ── Tabs + selector de club ── */}
      <div className="flex flex-wrap items-center gap-2">
        <TabButton active={tab === "todos"} onClick={() => setTab("todos")}>
          Todos los premios · {paraMostrar.length}
        </TabButton>
        <TabButton
          active={tab === "canjeables"}
          onClick={() => setTab("canjeables")}
          accent="emerald"
        >
          ✨ Canjeables ahora · {canjeables.length}
        </TabButton>
        <TabButton
          active={tab === "progreso"}
          onClick={() => setTab("progreso")}
        >
          En progreso · {enProgreso.length}
        </TabButton>

        {/*
          TODO(federación): cuando /premios agregue Firestore de todos los
          vendors donde el usuario tiene sellos, este pill se vuelve un
          <Select> con la lista y `setVendorFiltro`. Hoy es informativo.
        */}
        <div className="ml-auto hidden items-center gap-2 rounded-full bg-black/[0.04] px-3 py-1.5 text-[12px] text-muted-foreground md:flex">
          <MapPin className="h-3.5 w-3.5" />
          <span>
            Club:{" "}
            <span className="font-semibold text-foreground">
              {vendor.nombre}
            </span>
          </span>
        </div>
      </div>

      {/* ── Grilla ── */}
      {premios === null ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-72 w-full rounded-2xl" />
          <Skeleton className="h-72 w-full rounded-2xl" />
          <Skeleton className="h-72 w-full rounded-2xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {visibles.length === 0 ? (
            <EmptyState tab={tab} />
          ) : (
            visibles.map((p) => (
              <PremioVitrinaCard
                key={p.id}
                premio={p}
                sellosActuales={sellos}
                vendorNombre={vendor.nombre}
                vendorZona={vendor.zona}
                vendorEmoji={vendor.emoji}
                vendorColor={vendor.theme.primaryColor}
                verLocalUrl="/"
                onCanjear={esVistaPrevia ? undefined : handleCanjear}
                loading={canjeandoId === p.id}
              />
            ))
          )}
        </div>
      )}

      {/* ── Voucher post-canje ── */}
      <Dialog open={!!voucher} onOpenChange={(v) => !v && setVoucher(null)}>
        <DialogContent className="max-w-xs text-center">
          <DialogHeader>
            <DialogTitle>¡Premio canjeado! 🎉</DialogTitle>
            <DialogDescription>
              Muéstrale este código al staff de {vendor.nombre}.
            </DialogDescription>
          </DialogHeader>
          {voucher && (
            <div className="flex flex-col items-center gap-3 py-2">
              <p className="font-semibold">{voucher.nombre}</p>
              <div className="rounded-xl bg-white p-3">
                <QRCode
                  value={buildCanjeQRValue(voucher.canjeId)}
                  size={180}
                />
              </div>
              <p className="rounded-lg bg-secondary px-3 py-1.5 font-mono text-sm font-bold tracking-wider">
                {voucher.codigo}
              </p>
              <p className="text-xs text-muted-foreground">
                Válido por 48 horas. Lo encuentras también en tu historial.
              </p>
              <Button className="w-full" onClick={() => setVoucher(null)}>
                Entendido
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
