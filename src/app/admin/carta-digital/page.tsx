"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import * as LucideIcons from "lucide-react";
import {
  ArrowLeft,
  Pencil,
  Plus,
  HelpCircle,
  GripVertical,
} from "lucide-react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useVendor } from "@/context/VendorContext";
import { cn, formatCLP } from "@/lib/utils";
import type { Categoria, Producto } from "@/types";

// =========================================================
// Icono dinámico por nombre de Lucide
// =========================================================

// Sugerencias comunes para restauración — el usuario puede escribir cualquier
// nombre de Lucide, este set es solo el dropdown de ayuda.
const ICON_SUGGESTIONS = [
  "Pizza",
  "Coffee",
  "Sandwich",
  "Beer",
  "Wine",
  "IceCream",
  "Cookie",
  "Cake",
  "Salad",
  "Utensils",
  "Beef",
  "Fish",
  "Croissant",
  "Soup",
  "Milk",
  "ChefHat",
  "Drumstick",
  "EggFried",
  "Carrot",
  "Wheat",
  "CupSoda",
  "Grape",
  "Apple",
  "Cherry",
];

type LucideIconName = keyof typeof LucideIcons;

function IconByName({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const key = name as LucideIconName;
  const raw = LucideIcons[key] as unknown;
  const Icon =
    (typeof raw === "function" || typeof raw === "object")
      ? (raw as React.ComponentType<{ className?: string }>)
      : HelpCircle;
  return <Icon className={className} />;
}

// =========================================================
// Modal — Categoría
// =========================================================

interface FormCategoria {
  nombre: string;
  iconName: string;
  orden: number;
}

function CategoriaModal({
  open,
  onOpenChange,
  vendorId,
  editando,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  vendorId: string;
  editando: Categoria | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<FormCategoria>({
    nombre: "",
    iconName: "Utensils",
    orden: 0,
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        editando
          ? {
              nombre: editando.nombre,
              iconName: editando.iconName || "Utensils",
              orden: editando.orden ?? 0,
            }
          : { nombre: "", iconName: "Utensils", orden: 0 }
      );
    }
  }, [open, editando]);

  const guardar = async () => {
    if (!form.nombre.trim()) {
      toast({ title: "Falta el nombre de la categoría" });
      return;
    }
    setBusy(true);
    try {
      const payload = {
        nombre: form.nombre.trim(),
        iconName: form.iconName.trim() || "Utensils",
        orden: Number(form.orden) || 0,
        vendorId,
      };
      if (editando) {
        await updateDoc(doc(db, "categorias", editando.id), payload);
      } else {
        await addDoc(collection(db, "categorias"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }
      toast({ variant: "success", title: "Categoría guardada" });
      onSaved();
      onOpenChange(false);
    } catch {
      toast({ title: "No se pudo guardar" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editando ? "Editar categoría" : "Nueva categoría"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="cat-nombre">Nombre</Label>
            <Input
              id="cat-nombre"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Papas, Tablas, Bebestibles…"
            />
          </div>
          <div className="grid grid-cols-[1fr_80px] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cat-icon">Ícono</Label>
              <Input
                id="cat-icon"
                value={form.iconName}
                onChange={(e) =>
                  setForm({ ...form, iconName: e.target.value })
                }
                placeholder="Pizza"
                list="icon-suggestions"
              />
              <datalist id="icon-suggestions">
                {ICON_SUGGESTIONS.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
              <p className="text-[11px] text-muted-foreground">
                Nombre exacto de un icono de{" "}
                <a
                  href="https://lucide.dev/icons/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                >
                  Lucide
                </a>{" "}
                (ej. Pizza, Coffee, Sandwich).
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Preview</Label>
              <div className="flex h-10 w-full items-center justify-center rounded-md border bg-muted">
                <IconByName
                  name={form.iconName}
                  className="h-5 w-5 text-foreground"
                />
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cat-orden">Orden</Label>
            <Input
              id="cat-orden"
              type="number"
              value={form.orden}
              onChange={(e) =>
                setForm({ ...form, orden: Number(e.target.value) })
              }
            />
            <p className="text-[11px] text-muted-foreground">
              Menor = aparece primero en el scroll horizontal.
            </p>
          </div>
          <div className="flex gap-2 pt-1">
            <Button className="flex-1" onClick={guardar} disabled={busy}>
              {busy ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =========================================================
// Modal — Producto
// =========================================================

interface FormProducto {
  nombre: string;
  descripcion: string;
  precio: number;
  categoriaId: string;
  imageUrl: string;
  disponible: boolean;
  orden: number;
}

function ProductoModal({
  open,
  onOpenChange,
  vendorId,
  categorias,
  editando,
  defaultCategoriaId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  vendorId: string;
  categorias: Categoria[];
  editando: Producto | null;
  defaultCategoriaId: string | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<FormProducto>({
    nombre: "",
    descripcion: "",
    precio: 0,
    categoriaId: "",
    imageUrl: "",
    disponible: true,
    orden: 0,
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        editando
          ? {
              nombre: editando.nombre,
              descripcion: editando.descripcion || "",
              precio: editando.precio || 0,
              categoriaId: editando.categoriaId,
              imageUrl: editando.imageUrl || "",
              disponible: editando.disponible,
              orden: editando.orden ?? 0,
            }
          : {
              nombre: "",
              descripcion: "",
              precio: 0,
              categoriaId:
                defaultCategoriaId || categorias[0]?.id || "",
              imageUrl: "",
              disponible: true,
              orden: 0,
            }
      );
    }
  }, [open, editando, defaultCategoriaId, categorias]);

  const guardar = async () => {
    if (!form.nombre.trim()) {
      toast({ title: "Falta el nombre del producto" });
      return;
    }
    if (!form.categoriaId) {
      toast({
        title: "Elige una categoría",
        description: "Debes crear al menos una categoría antes de agregar productos.",
      });
      return;
    }
    setBusy(true);
    try {
      const payload = {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim(),
        precio: Number(form.precio) || 0,
        categoriaId: form.categoriaId,
        imageUrl: form.imageUrl.trim(),
        disponible: form.disponible,
        orden: Number(form.orden) || 0,
        vendorId,
      };
      if (editando) {
        await updateDoc(doc(db, "productos", editando.id), payload);
      } else {
        await addDoc(collection(db, "productos"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }
      toast({ variant: "success", title: "Producto guardado" });
      onSaved();
      onOpenChange(false);
    } catch {
      toast({ title: "No se pudo guardar" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editando ? "Editar producto" : "Nuevo producto"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="prod-nombre">Nombre</Label>
            <Input
              id="prod-nombre"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Tabla mixta"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prod-desc">Descripción</Label>
            <textarea
              id="prod-desc"
              rows={2}
              value={form.descripcion}
              onChange={(e) =>
                setForm({ ...form, descripcion: e.target.value })
              }
              placeholder="Ingredientes, ideal para compartir…"
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="prod-precio">Precio (CLP)</Label>
              <Input
                id="prod-precio"
                type="number"
                value={form.precio}
                onChange={(e) =>
                  setForm({ ...form, precio: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prod-cat">Categoría</Label>
              <Select
                value={form.categoriaId}
                onValueChange={(v) => setForm({ ...form, categoriaId: v })}
              >
                <SelectTrigger id="prod-cat">
                  <SelectValue placeholder="Elige categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prod-img">URL de la imagen</Label>
            <Input
              id="prod-img"
              type="url"
              value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              placeholder="https://…"
            />
            {form.imageUrl && (
              <div className="mt-1 aspect-video w-full overflow-hidden rounded-lg border bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.imageUrl}
                  alt="preview"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display =
                      "none";
                  }}
                />
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              Pega una URL pública (Cloudinary, Unsplash, etc.). Upload directo
              lo agregamos después.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="prod-orden">Orden</Label>
              <Input
                id="prod-orden"
                type="number"
                value={form.orden}
                onChange={(e) =>
                  setForm({ ...form, orden: Number(e.target.value) })
                }
              />
            </div>
            <div className="flex flex-col justify-end space-y-1.5">
              <div className="flex items-center justify-between rounded-md border bg-secondary px-3 py-2">
                <Label htmlFor="prod-disp" className="text-xs">
                  Disponible
                </Label>
                <Switch
                  id="prod-disp"
                  checked={form.disponible}
                  onCheckedChange={(v) =>
                    setForm({ ...form, disponible: v })
                  }
                />
              </div>
            </div>
          </div>

          <Button className="w-full" onClick={guardar} disabled={busy}>
            {busy ? "Guardando…" : "Guardar producto"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =========================================================
// Página principal
// =========================================================

function CartaDigitalInner() {
  const { toast } = useToast();
  const vendor = useVendor();

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [tab, setTab] = useState<"categorias" | "productos">("categorias");

  const [catModal, setCatModal] = useState(false);
  const [editCat, setEditCat] = useState<Categoria | null>(null);
  const [prodModal, setProdModal] = useState(false);
  const [editProd, setEditProd] = useState<Producto | null>(null);
  const [prodDefaultCat, setProdDefaultCat] = useState<string | null>(null);

  // Suscripciones en vivo — se actualizan al crear/editar/borrar.
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

  const catById = useMemo(() => {
    const m = new Map<string, Categoria>();
    for (const c of categorias) m.set(c.id, c);
    return m;
  }, [categorias]);

  // Productos agrupados por categoría, en el orden definido.
  const gruposProductos = useMemo(() => {
    const acc: Record<string, Producto[]> = {};
    for (const p of productos) (acc[p.categoriaId] ||= []).push(p);
    for (const key of Object.keys(acc)) {
      acc[key].sort(
        (a, b) => (a.orden ?? 0) - (b.orden ?? 0) || a.nombre.localeCompare(b.nombre)
      );
    }
    return acc;
  }, [productos]);

  const abrirNuevaCategoria = () => {
    setEditCat(null);
    setCatModal(true);
  };

  const abrirEditCategoria = (c: Categoria) => {
    setEditCat(c);
    setCatModal(true);
  };

  const eliminarCategoria = async (c: Categoria) => {
    const productosDeCat = productos.filter((p) => p.categoriaId === c.id);
    if (productosDeCat.length > 0) {
      const ok = confirm(
        `"${c.nombre}" tiene ${productosDeCat.length} producto(s). ` +
          "Al eliminarla los productos quedan huérfanos (sin categoría). " +
          "¿Continuar?"
      );
      if (!ok) return;
    }
    await deleteDoc(doc(db, "categorias", c.id)).catch(() => {});
    toast({ title: "Categoría eliminada" });
  };

  const abrirNuevoProducto = (categoriaId?: string) => {
    setEditProd(null);
    setProdDefaultCat(categoriaId ?? null);
    setProdModal(true);
  };

  const abrirEditProducto = (p: Producto) => {
    setEditProd(p);
    setProdDefaultCat(null);
    setProdModal(true);
  };

  const eliminarProducto = async (p: Producto) => {
    if (!confirm(`¿Eliminar "${p.nombre}"?`)) return;
    await deleteDoc(doc(db, "productos", p.id)).catch(() => {});
    toast({ title: "Producto eliminado" });
  };

  const toggleDisponible = async (p: Producto) => {
    await updateDoc(doc(db, "productos", p.id), {
      disponible: !p.disponible,
    }).catch(() => {});
  };

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

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as "categorias" | "productos")}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="categorias">
            Categorías
            <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold">
              {categorias.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="productos">
            Productos
            <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold">
              {productos.length}
            </span>
          </TabsTrigger>
        </TabsList>

        {/* Categorías */}
        <TabsContent value="categorias" className="space-y-3">
          <Button className="w-full" onClick={abrirNuevaCategoria}>
            <Plus className="h-4 w-4" /> Nueva categoría
          </Button>

          {categorias.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Aún no hay categorías. Crea la primera (ej. Papas, Tablas,
              Bebestibles).
            </p>
          ) : (
            <div className="space-y-2">
              {categorias.map((c) => (
                <Card key={c.id}>
                  <CardContent className="flex items-center gap-3 p-3">
                    <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <IconByName
                        name={c.iconName || "Utensils"}
                        className="h-5 w-5"
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{c.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        Orden {c.orden} ·{" "}
                        {productos.filter((p) => p.categoriaId === c.id).length}{" "}
                        producto(s)
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <button
                        onClick={() => abrirEditCategoria(c)}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="Editar categoría"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => eliminarCategoria(c)}
                        className="text-xs text-destructive hover:underline"
                      >
                        Eliminar
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Productos */}
        <TabsContent value="productos" className="space-y-3">
          <Button
            className="w-full"
            onClick={() => abrirNuevoProducto()}
            disabled={categorias.length === 0}
          >
            <Plus className="h-4 w-4" /> Nuevo producto
          </Button>
          {categorias.length === 0 && (
            <p className="rounded-md border bg-amber-50 p-3 text-xs text-amber-900">
              Primero crea al menos una categoría para poder agregar productos.
            </p>
          )}

          {productos.length === 0 && categorias.length > 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Aún no hay productos. Crea el primero.
            </p>
          ) : (
            <div className="space-y-6">
              {categorias.map((c) => {
                const items = gruposProductos[c.id] || [];
                if (items.length === 0) return null;
                return (
                  <section key={c.id}>
                    <div className="mb-2 flex items-center justify-between">
                      <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        <IconByName
                          name={c.iconName || "Utensils"}
                          className="h-3.5 w-3.5"
                        />
                        {c.nombre}
                      </h2>
                      <button
                        onClick={() => abrirNuevoProducto(c.id)}
                        className="text-xs text-primary hover:underline"
                      >
                        + Agregar aquí
                      </button>
                    </div>
                    <div className="space-y-2">
                      {items.map((p) => (
                        <Card key={p.id}>
                          <CardContent className="flex items-center gap-3 p-3">
                            {p.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={p.imageUrl}
                                alt=""
                                className="h-14 w-14 shrink-0 rounded-lg object-cover ring-1 ring-border"
                              />
                            ) : (
                              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                <IconByName
                                  name={c.iconName || "Utensils"}
                                  className="h-5 w-5"
                                />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p
                                className={cn(
                                  "truncate font-semibold",
                                  !p.disponible && "text-muted-foreground line-through"
                                )}
                              >
                                {p.nombre}
                              </p>
                              {p.descripcion && (
                                <p className="line-clamp-1 text-xs text-muted-foreground">
                                  {p.descripcion}
                                </p>
                              )}
                              <p className="text-sm font-semibold text-orange-600">
                                {formatCLP(p.precio)}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <Switch
                                checked={p.disponible}
                                onCheckedChange={() => toggleDisponible(p)}
                              />
                              <button
                                onClick={() => abrirEditProducto(p)}
                                className="text-muted-foreground hover:text-foreground"
                                aria-label="Editar producto"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => eliminarProducto(p)}
                                className="text-xs text-destructive hover:underline"
                              >
                                Eliminar
                              </button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </section>
                );
              })}

              {/* Productos huérfanos (categoría eliminada) */}
              {(() => {
                const huerfanos = productos.filter(
                  (p) => !catById.has(p.categoriaId)
                );
                if (huerfanos.length === 0) return null;
                return (
                  <section>
                    <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-destructive">
                      Sin categoría · {huerfanos.length}
                    </h2>
                    <div className="space-y-2">
                      {huerfanos.map((p) => (
                        <Card key={p.id} className="border-destructive/40">
                          <CardContent className="flex items-center gap-3 p-3">
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-semibold">
                                {p.nombre}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                Reasígnale una categoría o elimina.
                              </p>
                            </div>
                            <button
                              onClick={() => abrirEditProducto(p)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </section>
                );
              })()}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CategoriaModal
        open={catModal}
        onOpenChange={setCatModal}
        vendorId={vendor.id}
        editando={editCat}
        onSaved={() => {}}
      />
      <ProductoModal
        open={prodModal}
        onOpenChange={setProdModal}
        vendorId={vendor.id}
        categorias={categorias}
        editando={editProd}
        defaultCategoriaId={prodDefaultCat}
        onSaved={() => {}}
      />
    </div>
  );
}

export default function CartaDigitalPage() {
  return (
    <AdminGate>
      <CartaDigitalInner />
    </AdminGate>
  );
}
