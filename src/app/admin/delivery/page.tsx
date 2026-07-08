"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bike, Info, Save } from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AdminGate } from "@/components/AdminGate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useVendor } from "@/context/VendorContext";

interface FormDelivery {
  activo: boolean;
  whatsapp: string;
  cobertura: string;
  montoMinimo: number;
  horario: string;
  costoEnvio: number;
  tiempoEstimado: string;
}

const VACIO: FormDelivery = {
  activo: false,
  whatsapp: "",
  cobertura: "",
  montoMinimo: 0,
  horario: "",
  costoEnvio: 0,
  tiempoEstimado: "30-45 min",
};

function DeliveryAdminInner() {
  const { toast } = useToast();
  const vendor = useVendor();
  const [form, setForm] = useState<FormDelivery>({
    ...VACIO,
    whatsapp: vendor.whatsapp ?? "",
  });
  const [busy, setBusy] = useState(false);

  // Carga la config de delivery guardada en `vendors/{id}.delivery`.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "vendors", vendor.id));
        if (cancelled || !snap.exists()) return;
        const raw = snap.data() as {
          delivery?: Partial<FormDelivery>;
          whatsapp?: string;
        };
        if (raw.delivery) {
          setForm((f) => ({
            ...f,
            ...raw.delivery,
            whatsapp: raw.delivery?.whatsapp || raw.whatsapp || f.whatsapp,
          }));
        }
      } catch {
        // sin doc → se queda con VACIO
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vendor.id]);

  const guardar = async () => {
    setBusy(true);
    try {
      await setDoc(
        doc(db, "vendors", vendor.id),
        {
          delivery: {
            activo: form.activo,
            whatsapp: form.whatsapp.trim(),
            cobertura: form.cobertura.trim(),
            montoMinimo: Number(form.montoMinimo) || 0,
            horario: form.horario.trim(),
            costoEnvio: Number(form.costoEnvio) || 0,
            tiempoEstimado: form.tiempoEstimado.trim(),
          },
        },
        { merge: true }
      );
      toast({
        variant: "success",
        title: "Delivery guardado 🛵",
        description: form.activo
          ? "Aparecerá disponible para los clientes."
          : "Delivery quedó apagado.",
      });
    } catch {
      toast({ title: "No se pudo guardar" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon">
          <Link href="/admin/dashboard">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="font-headline text-2xl font-bold">Delivery 🛵</h1>
      </div>

      <Card>
        <CardContent className="flex items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                form.activo
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <Bike className="h-5 w-5" strokeWidth={2.25} />
            </span>
            <div className="min-w-0">
              <p className="font-semibold">Delivery activo</p>
              <p className="text-xs text-muted-foreground">
                {form.activo
                  ? "Los clientes ven la opción disponible."
                  : "Delivery apagado — sin opción visible."}
              </p>
            </div>
          </div>
          <Switch
            checked={form.activo}
            onCheckedChange={(v) => setForm({ ...form, activo: v })}
          />
        </CardContent>
      </Card>

      <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>
          Los pedidos se toman por WhatsApp. Configura el número que recibe los
          pedidos, la zona de cobertura y el monto mínimo.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="wa">WhatsApp para pedidos</Label>
            <Input
              id="wa"
              value={form.whatsapp}
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              placeholder="56912345678"
            />
            <p className="text-[11px] text-muted-foreground">
              Formato internacional sin + ni espacios.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cobertura">Zona de cobertura</Label>
            <Input
              id="cobertura"
              value={form.cobertura}
              onChange={(e) =>
                setForm({ ...form, cobertura: e.target.value })
              }
              placeholder="Curauma, Placilla, Valpo centro"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="minimo">Monto mínimo (CLP)</Label>
              <Input
                id="minimo"
                type="number"
                min={0}
                value={form.montoMinimo}
                onChange={(e) =>
                  setForm({
                    ...form,
                    montoMinimo: Number(e.target.value),
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="envio">Costo de envío (CLP)</Label>
              <Input
                id="envio"
                type="number"
                min={0}
                value={form.costoEnvio}
                onChange={(e) =>
                  setForm({
                    ...form,
                    costoEnvio: Number(e.target.value),
                  })
                }
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="horario">Horario de delivery</Label>
            <Input
              id="horario"
              value={form.horario}
              onChange={(e) => setForm({ ...form, horario: e.target.value })}
              placeholder="Jue-Dom · 19:00 a 23:30"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tiempo">Tiempo estimado</Label>
            <Input
              id="tiempo"
              value={form.tiempoEstimado}
              onChange={(e) =>
                setForm({ ...form, tiempoEstimado: e.target.value })
              }
              placeholder="30-45 min"
            />
          </div>
        </CardContent>
      </Card>

      <Button
        className="w-full"
        size="lg"
        onClick={guardar}
        disabled={busy}
      >
        <Save className="h-4 w-4" />
        {busy ? "Guardando…" : "Guardar cambios"}
      </Button>
    </div>
  );
}

export default function DeliveryAdminPage() {
  return (
    <AdminGate>
      <DeliveryAdminInner />
    </AdminGate>
  );
}
