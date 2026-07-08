"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
} from "lucide-react";
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
import { cn, formatCLP } from "@/lib/utils";
import type { MenuItem, MenuScope } from "@/types";

const VACIO = {
  nombre: "",
  emoji: "🍣",
  descripcion: "",
  precio: 0,
  categoria: "General",
  orden: 0,
  activo: true,
};

function itemScope(m: MenuItem): MenuScope {
  return m.scope ?? "publica";
}

function CartaAdminInner() {
  const { toast } = useToast();
  const vendor = useVendor();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [scope, setScope] = useState<MenuScope>("publica");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...VACIO });
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);

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

  const filtered = useMemo(
    () => items.filter((it) => itemScope(it) === scope),
    [items, scope]
  );

  // Agrupa por categoría preservando el orden.
  const grupos = useMemo(() => {
    const acc: Record<string, MenuItem[]> = {};
    for (const it of filtered) (acc[it.categoria || "General"] ||= []).push(it);
    for (const key of Object.keys(acc)) {
      acc[key].sort(
        (a, b) => (a.orden ?? 0) - (b.orden ?? 0) || a.nombre.localeCompare(b.nombre)
      );
    }
    return acc;
  }, [filtered]);

  const categoriasActuales = useMemo(
    () => Array.from(new Set(items.map((it) => it.categoria || "General"))).sort(),
    [items]
  );

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
        scope,
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

  /**
   * Copia todos los ítems de la carta pública a la carta app.
   * Evita duplicados: mismo (nombre + categoria) ya presentes en app se saltan.
   * Cada ítem se clona con un nuevo id — así puedes ajustar precios / promos
   * sin afectar la pública.
   */
  const sincronizar = async () => {
    const publicos = items.filter((it) => itemScope(it) === "publica");
    if (publicos.length === 0) {
      toast({ title: "No hay ítems públicos para sincronizar" });
      return;
    }
    const existentes = new Set(
      items
        .filter((it) => itemScope(it) === "app")
        .map((it) => `${it.nombre.toLowerCase()}::${it.categoria || ""}`)
    );
    setSyncing(true);
    try {
      let copiados = 0;
      for (const it of publicos) {
        const key = `${it.nombre.toLowerCase()}::${it.categoria || ""}`;
        if (existentes.has(key)) continue;
        await addDoc(collection(db, "menu"), {
          vendorId: vendor.id,
          nombre: it.nombre,
          emoji: it.emoji || "🍣",
          descripcion: it.descripcion || "",
          precio: it.precio || 0,
          categoria: it.categoria || "General",
          orden: it.orden ?? 0,
          activo: it.activo,
          scope: "app" as MenuScope,
        });
        copiados++;
      }
      toast({
        variant: "success",
        title:
          copiados > 0
            ? `${copiados} ítem${copiados === 1 ? "" : "s"} sincronizado${
                copiados === 1 ? "" : "s"
              }`
            : "La carta app ya estaba al día",
        description:
          copiados > 0
            ? "Ahora puedes ajustar precios o marcar promos exclusivas."
            : undefined,
      });
      if (copiados > 0) setScope("app");
    } catch {
      toast({ title: "No pudimos sincronizar" });
    } finally {
      setSyncing(false);
    }
  };

  const categorias = Object.keys(grupos).sort();
  const countPublica = items.filter((it) => itemScope(it) === "publica").length;
  const countApp = items.filter((it) => itemScope(it) === "app").length;

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

      {/* Segmented control público / app */}
      <div className="flex gap-1 rounded-xl border bg-muted/40 p-1">
        {(
          [
            { id: "publica" as const, label: "Carta pública", count: countPublica },
            { id: "app" as const, label: "Carta app", count: countApp },
          ] satisfies { id: MenuScope; label: string; count: number }[]
        ).map((t) => {
          const active = scope === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setScope(t.id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-200",
                active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="truncate">{t.label}</span>
              <span
                className={cn(
                  "min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                  active
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Aviso de la carta app */}
      {scope === "app" && (
        <div className="flex items-start gap-2 rounded-lg border border-primary/25 bg-primary/[0.06] p-3 text-xs">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground">Promos exclusivas de la app</p>
            <p className="mt-0.5 text-muted-foreground">
              Aquí puedes crear precios especiales, combos o promos que solo
              verán los clientes dentro de la app / Club. Se muestran separadas
              de la carta pública.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={sincronizar}
            disabled={syncing}
            className="shrink-0"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", syncing && "animate-spin")}
            />
            {syncing ? "Sincronizando…" : "Sincronizar con pública"}
          </Button>
        </div>
      )}

      <Button className="w-full" onClick={abrirNuevo}>
        <Plus className="h-4 w-4" /> Nuevo ítem
        <span className="ml-1 text-xs opacity-75">
          {scope === "publica" ? "(pública)" : "(app)"}
        </span>
      </Button>

      {categorias.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {scope === "publica"
            ? "Aún no hay ítems en la carta pública. Crea el primero."
            : "La carta app está vacía. Usa 'Sincronizar' para partir de la pública o crea promos nuevas."}
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
            <DialogTitle>
              {editId ? "Editar ítem" : "Nuevo ítem"} ·{" "}
              <span className="text-xs font-normal text-muted-foreground">
                {scope === "publica" ? "carta pública" : "carta app"}
              </span>
            </DialogTitle>
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
                  {categoriasActuales.map((c) => (
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
