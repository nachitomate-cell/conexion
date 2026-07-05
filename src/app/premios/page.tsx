"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";
import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { PremioCard } from "@/components/PremioCard";
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
import { useVendor } from "@/context/VendorContext";
import type { Premio } from "@/types";

// Vista previa que se muestra mientras la colección `premios` esté vacía.
// En cuanto el admin crea el primer premio real desde /admin, desaparece.
// Cada tenant define su propio set; si no está mapeado se usa el de SushiPro.
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
      descripcion: "Lomo salteado al wok con papas fritas y arroz graneado.",
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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-2xl font-bold">Premios 🎁</h1>
          <p className="text-sm text-muted-foreground">
            Tienes {sellos} sellos para canjear.
          </p>
        </div>
        {usuario && (
          <RangoBadge sellosHistoricos={usuario.sellosHistoricos || 0} />
        )}
      </div>

      {premios === null ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : (
        <div className="space-y-3">
          {esVistaPrevia && (
            <div className="flex items-center justify-between rounded-xl border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-xs text-primary">
              <span className="font-semibold">🍱 Vista previa</span>
              <span className="text-primary/80">
                Aún no hay premios publicados. Crea los reales desde /admin.
              </span>
            </div>
          )}
          {paraMostrar.map((p) => (
            <PremioCard
              key={p.id}
              premio={p}
              sellosActuales={sellos}
              onCanjear={esVistaPrevia ? undefined : handleCanjear}
              loading={canjeandoId === p.id}
            />
          ))}
        </div>
      )}

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
