"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Pencil } from "lucide-react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AdminGate } from "@/components/AdminGate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useVendor } from "@/context/VendorContext";
import type { Premio } from "@/types";

const VACIO = {
  nombre: "",
  icono: "🍣",
  descripcion: "",
  sellosRequeridos: 10,
  stock: 10,
  activo: true,
};

function PremiosAdminInner() {
  const { toast } = useToast();
  const vendor = useVendor();
  const [premios, setPremios] = useState<Premio[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...VACIO });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, "premios"),
      where("vendorId", "==", vendor.id)
    );
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Premio);
      list.sort((a, b) => a.sellosRequeridos - b.sellosRequeridos);
      setPremios(list);
    });
    return () => unsub();
  }, [vendor.id]);

  const abrirNuevo = () => {
    setEditId(null);
    setForm({ ...VACIO });
    setOpen(true);
  };

  const abrirEdit = (p: Premio) => {
    setEditId(p.id);
    setForm({
      nombre: p.nombre,
      icono: p.icono || "🍣",
      descripcion: p.descripcion || "",
      sellosRequeridos: p.sellosRequeridos,
      stock: p.stock,
      activo: p.activo,
    });
    setOpen(true);
  };

  const guardar = async () => {
    if (!form.nombre.trim()) {
      toast({ title: "Falta el nombre" });
      return;
    }
    setBusy(true);
    try {
      const payload = {
        nombre: form.nombre.trim(),
        icono: form.icono || "🍣",
        descripcion: form.descripcion.trim(),
        sellosRequeridos: Number(form.sellosRequeridos) || 1,
        stock: Number(form.stock) || 0,
        activo: form.activo,
        vendorId: vendor.id,
      };
      if (editId) {
        await updateDoc(doc(db, "premios", editId), payload);
      } else {
        await addDoc(collection(db, "premios"), payload);
      }
      setOpen(false);
      toast({ variant: "success", title: "Premio guardado 🎁" });
    } catch {
      toast({ title: "No se pudo guardar" });
    } finally {
      setBusy(false);
    }
  };

  const toggleActivo = async (p: Premio) => {
    await updateDoc(doc(db, "premios", p.id), { activo: !p.activo }).catch(
      () => {}
    );
  };

  const eliminar = async (p: Premio) => {
    await deleteDoc(doc(db, "premios", p.id)).catch(() => {});
    toast({ title: "Premio eliminado" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon">
          <Link href="/admin">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="font-headline text-2xl font-bold">Premios 🎁</h1>
      </div>

      <Button className="w-full" onClick={abrirNuevo}>
        <Plus className="h-4 w-4" /> Nuevo premio
      </Button>

      <div className="space-y-2">
        {premios.map((p) => (
          <Card key={p.id}>
            <CardContent className="flex items-center gap-3 p-3">
              <span className="text-3xl">{p.icono}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{p.nombre}</p>
                <p className="text-xs text-muted-foreground">
                  🍣 {p.sellosRequeridos} · stock {p.stock}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Switch
                  checked={p.activo}
                  onCheckedChange={() => toggleActivo(p)}
                />
                <button
                  onClick={() => abrirEdit(p)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
        {premios.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Aún no hay premios. Crea el primero.
          </p>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar premio" : "Nuevo premio"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-[80px_1fr] gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="icono">Emoji</Label>
                <Input
                  id="icono"
                  value={form.icono}
                  onChange={(e) => setForm({ ...form, icono: e.target.value })}
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
                  placeholder="Roll gratis"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="desc">Descripción</Label>
              <Input
                id="desc"
                value={form.descripcion}
                onChange={(e) =>
                  setForm({ ...form, descripcion: e.target.value })
                }
                placeholder="Un roll clásico a elección"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="sellos">Sellos requeridos</Label>
                <Input
                  id="sellos"
                  type="number"
                  value={form.sellosRequeridos}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      sellosRequeridos: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stock">Stock</Label>
                <Input
                  id="stock"
                  type="number"
                  value={form.stock}
                  onChange={(e) =>
                    setForm({ ...form, stock: Number(e.target.value) })
                  }
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2">
              <Label htmlFor="activo">Activo (visible para clientes)</Label>
              <Switch
                id="activo"
                checked={form.activo}
                onCheckedChange={(v) => setForm({ ...form, activo: v })}
              />
            </div>
            <div className="flex gap-2 pt-1">
              {editId && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    const p = premios.find((x) => x.id === editId);
                    if (p) eliminar(p);
                    setOpen(false);
                  }}
                >
                  Eliminar
                </Button>
              )}
              <Button className="flex-1" onClick={guardar} disabled={busy}>
                {busy ? "Guardando…" : "Guardar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function PremiosAdminPage() {
  return (
    <AdminGate>
      <PremiosAdminInner />
    </AdminGate>
  );
}
