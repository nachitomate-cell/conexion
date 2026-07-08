"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Info, Save } from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AdminGate } from "@/components/AdminGate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useVendor } from "@/context/VendorContext";

// Los campos editables desde este panel — subset del type Vendor.
interface FormLocal {
  nombre: string;
  instagram: string;
  whatsapp: string;
  emoji: string;
  sellosParaPremio: number;
  clubName: string;
  joinDescription: string;
  emojis: string;
}

function LocalAdminInner() {
  const { toast } = useToast();
  const vendor = useVendor();
  const [form, setForm] = useState<FormLocal>(() => ({
    nombre: vendor.nombre,
    instagram: vendor.instagram ?? "",
    whatsapp: vendor.whatsapp ?? "",
    emoji: vendor.emoji,
    sellosParaPremio: vendor.sellosParaPremio,
    clubName: vendor.copy.clubName,
    joinDescription: vendor.copy.joinDescription,
    emojis: vendor.copy.emojis,
  }));
  const [busy, setBusy] = useState(false);

  // Al montar, chequeamos si hay overrides en Firestore (`vendors/{id}`) —
  // si sí, los pisamos sobre los valores del registro estático, para que el
  // form muestre siempre el último guardado.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "vendors", vendor.id));
        if (cancelled || !snap.exists()) return;
        const raw = snap.data() as Partial<{
          nombre: string;
          instagram: string;
          whatsapp: string;
          emoji: string;
          sellosParaPremio: number;
          copy: {
            clubName?: string;
            joinDescription?: string;
            emojis?: string;
          };
        }>;
        setForm((f) => ({
          nombre: raw.nombre ?? f.nombre,
          instagram: raw.instagram ?? f.instagram,
          whatsapp: raw.whatsapp ?? f.whatsapp,
          emoji: raw.emoji ?? f.emoji,
          sellosParaPremio: raw.sellosParaPremio ?? f.sellosParaPremio,
          clubName: raw.copy?.clubName ?? f.clubName,
          joinDescription: raw.copy?.joinDescription ?? f.joinDescription,
          emojis: raw.copy?.emojis ?? f.emojis,
        }));
      } catch {
        // sin permisos / no existe → nos quedamos con los valores estáticos
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vendor.id]);

  const guardar = async () => {
    if (!form.nombre.trim()) {
      toast({ title: "Falta el nombre del local" });
      return;
    }
    setBusy(true);
    try {
      await setDoc(
        doc(db, "vendors", vendor.id),
        {
          nombre: form.nombre.trim(),
          instagram: form.instagram.trim(),
          whatsapp: form.whatsapp.trim(),
          emoji: form.emoji.trim() || "🏬",
          sellosParaPremio: Number(form.sellosParaPremio) || 10,
          copy: {
            clubName: form.clubName.trim(),
            joinDescription: form.joinDescription.trim(),
            emojis: form.emojis.trim(),
          },
        },
        { merge: true }
      );
      toast({
        variant: "success",
        title: "Guardado 🏪",
        description:
          "Los cambios aparecerán en la app tras el próximo despliegue.",
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
        <h1 className="font-headline text-2xl font-bold">Mi Local 🏪</h1>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>
          Estos cambios se guardan en la base de datos y quedarán reflejados en la
          app cliente después de la próxima actualización.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="grid grid-cols-[80px_1fr] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="emoji">Emoji</Label>
              <Input
                id="emoji"
                value={form.emoji}
                onChange={(e) => setForm({ ...form, emoji: e.target.value })}
                maxLength={4}
                className="text-center text-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="SushiPro"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="instagram">Instagram</Label>
            <Input
              id="instagram"
              value={form.instagram}
              onChange={(e) =>
                setForm({ ...form, instagram: e.target.value })
              }
              placeholder="sushipro.cl"
            />
            <p className="text-[11px] text-muted-foreground">
              Sin arroba. Ej: <code>sushipro.cl</code>
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input
              id="whatsapp"
              value={form.whatsapp}
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              placeholder="56912345678"
            />
            <p className="text-[11px] text-muted-foreground">
              Formato internacional sin + ni espacios. Ej:{" "}
              <code>56912345678</code>
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sellos">Sellos para completar la punch card</Label>
            <Input
              id="sellos"
              type="number"
              min={1}
              max={50}
              value={form.sellosParaPremio}
              onChange={(e) =>
                setForm({
                  ...form,
                  sellosParaPremio: Number(e.target.value),
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Textos del Club
          </h2>

          <div className="space-y-1.5">
            <Label htmlFor="clubName">Nombre del Club</Label>
            <Input
              id="clubName"
              value={form.clubName}
              onChange={(e) => setForm({ ...form, clubName: e.target.value })}
              placeholder="SUSHIPRO CLUB"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="joinDescription">Frase de bienvenida</Label>
            <textarea
              id="joinDescription"
              value={form.joinDescription}
              onChange={(e) =>
                setForm({ ...form, joinDescription: e.target.value })
              }
              placeholder="Junta sellos con cada pedido y canjea rolls, postres y premios exclusivos."
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="emojis">Emojis temáticos</Label>
            <Input
              id="emojis"
              value={form.emojis}
              onChange={(e) => setForm({ ...form, emojis: e.target.value })}
              maxLength={16}
              className="text-xl"
              placeholder="🍣🥢"
            />
            <p className="text-[11px] text-muted-foreground">
              Se usan como decoración en varias partes de la app.
            </p>
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

export default function LocalAdminPage() {
  return (
    <AdminGate>
      <LocalAdminInner />
    </AdminGate>
  );
}
