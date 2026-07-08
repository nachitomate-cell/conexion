"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil, Plus } from "lucide-react";
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
import { formatCLP } from "@/lib/utils";
import type { MenuItem } from "@/types";

const VACIO = {
  nombre: "",
  emoji: "🍣",
  descripcion: "",
  precio: 0,
  categoria: "General",
  orden: 0,
  activo: true,
};

function CartaAdminInner() {
  const { toast } = useToast();
  const vendor = useVendor();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...VACIO });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "menu"), where("vendorId", "==", vendor.id));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as MenuItem
      );
      setItems(list);
    });
    return () => unsub();
  }, [vendor.id]);

  // Agrupa por categoría preservando el orden.
  const grupos = useMemo(() => {
    const acc: Record<string, MenuItem[]> = {};
    for (const it of items) (acc[it.categoria || "General"] ||= []).push(it);
    for (const key of Object.keys(acc)) {
      acc[key].sort(
        (a, b) => (a.orden ?? 0) - (b.orden ?? 0) || a.nombre.localeCompare(b.nombre)
      );
    }
    return acc;
  }, [items]);

  const abrirNuevo = () => {
    setEditId(null);
    setForm({ ...VACIO });
    setOpen(true);
  };

  const abrirEdit = (m: MenuItem) => {
    setEditId(m.id);
    setForm({
      nombre: m.nombre,
      emoji: m.emoji || "🍣",
      descripcion: m.descripcion || "",
      precio: m.precio || 0,
      categoria: m.categoria || "General",
      orden: m.orden ?? 0,
      activo: m.activo,
    });
    setOpen(true);
  };

  const guardar = async () => {
    if (!form.nombre.trim()) {
      toast({ title: "Falta el nombre del ítem" });
      return;
    }
    setBusy(true);
    try {
      const payload = {
        nombre: form.nombre.trim(),
        emoji: form.emoji || "🍣",
        descripcion: form.descripcion.trim(),
        precio: Number(form.precio) || 0,
        categoria: form.categoria.trim() || "General",
        orden: Number(form.orden) || 0,
        activo: form.activo,
        vendorId: vendor.id,
      };
      if (editId) {
        await updateDoc(doc(db, "menu", editId), payload);
      } else {
        await addDoc(collection(db, "menu"), payload);
      }
      setOpen(false);
      toast({ variant: "success", title: "Ítem guardado 🍣" });
    } catch {
      toast({ title: "No se pudo guardar" });
    } finally {
      setBusy(false);
    }
  };

  const toggleActivo = async (m: MenuItem) => {
    await updateDoc(doc(db, "menu", m.id), { activo: !m.activo }).catch(() => {});
  };

  const eliminar = async (m: MenuItem) => {
    await deleteDoc(doc(db, "menu", m.id)).catch(() => {});
    toast({ title: "Ítem eliminado" });
  };

  const categorias = Object.keys(grupos).sort();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon">
          <Link href="/admin/dashboard">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="font-headline text-2xl font-bold">Carta Digital 🍽️</h1>
      </div>

      <Button className="w-full" onClick={abrirNuevo}>
        <Plus className="h-4 w-4" /> Nuevo ítem
      </Button>

      {categorias.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Aún no hay ítems en la carta. Crea el primero.
        </p>
      ) : (
        <div className="space-y-6">
          {categorias.map((cat) => (
            <section key={cat}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {cat}
              </h2>
              <div className="space-y-2">
                {grupos[cat].map((m) => (
                  <Card key={m.id}>
                    <CardContent className="flex items-center gap-3 p-3">
                      <span className="text-3xl">{m.emoji || "🍣"}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{m.nombre}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCLP(m.precio)}
                          {m.descripcion ? ` · ${m.descripcion}` : ""}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Switch
                          checked={m.activo}
                          onCheckedChange={() => toggleActivo(m)}
                        />
                        <button
                          onClick={() => abrirEdit(m)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar ítem" : "Nuevo ítem"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
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
                  placeholder="California Roll"
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
                placeholder="Palta, kanikama, pepino, envuelto en sésamo"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="precio">Precio (CLP)</Label>
                <Input
                  id="precio"
                  type="number"
                  value={form.precio}
                  onChange={(e) =>
                    setForm({ ...form, precio: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="categoria">Categoría</Label>
                <Input
                  id="categoria"
                  value={form.categoria}
                  onChange={(e) =>
                    setForm({ ...form, categoria: e.target.value })
                  }
                  placeholder="Rolls clásicos"
                  list="cat-suggestions"
                />
                <datalist id="cat-suggestions">
                  {categorias.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="orden">
                Orden dentro de la categoría (menor = primero)
              </Label>
              <Input
                id="orden"
                type="number"
                value={form.orden}
                onChange={(e) =>
                  setForm({ ...form, orden: Number(e.target.value) })
                }
              />
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
                    const m = items.find((x) => x.id === editId);
                    if (m) eliminar(m);
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

export default function CartaAdminPage() {
  return (
    <AdminGate>
      <CartaAdminInner />
    </AdminGate>
  );
}
