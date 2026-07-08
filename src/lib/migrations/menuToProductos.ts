"use client";

import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Categoria, MenuItem, Producto } from "@/types";

/**
 * Firestore permite 500 operaciones por `writeBatch`. Dejamos margen para
 * evitar rollback si el vendor tiene mucho volumen.
 */
const MAX_OPS_POR_BATCH = 400;

export interface MigracionPreview {
  /** Ítems públicos en `menu` — los `scope="app"` no se migran. */
  itemsPublicos: number;
  /** Categorías únicas presentes en `menu`. */
  categoriasEnMenu: number;
  /** Categorías que hay que crear (aún no existen en `categorias`). */
  categoriasACrear: number;
  /** Productos a crear en `productos`. */
  productosACrear: number;
  /** Productos ya presentes por nombre en `productos` — se skipean. */
  productosSkipDuplicados: number;
  /** `menu` items con scope="app" que se dejan como están. */
  itemsAppMantenidos: number;
}

export interface MigracionResultado {
  categoriasCreadas: number;
  productosCreados: number;
  productosSkipDuplicados: number;
  itemsAppMantenidos: number;
}

async function cargarSnapshots(vendorId: string) {
  const [menuSnap, catSnap, prodSnap] = await Promise.all([
    getDocs(query(collection(db, "menu"), where("vendorId", "==", vendorId))),
    getDocs(
      query(collection(db, "categorias"), where("vendorId", "==", vendorId))
    ),
    getDocs(
      query(collection(db, "productos"), where("vendorId", "==", vendorId))
    ),
  ]);
  const menuItems = menuSnap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as MenuItem
  );
  const categoriasExistentes = catSnap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as Categoria
  );
  const productosExistentes = prodSnap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as Producto
  );
  return { menuItems, categoriasExistentes, productosExistentes };
}

/**
 * Calcula qué haría la migración sin escribir nada.
 * Útil para mostrar preview antes de confirmar.
 */
export async function previewMigracion(
  vendorId: string
): Promise<MigracionPreview> {
  const { menuItems, categoriasExistentes, productosExistentes } =
    await cargarSnapshots(vendorId);

  const publicos = menuItems.filter(
    (it) => (it.scope ?? "publica") === "publica"
  );
  const app = menuItems.length - publicos.length;

  const nombresCat = new Set(
    publicos.map((it) => (it.categoria || "General").toLowerCase())
  );
  const nombresCatExistentes = new Set(
    categoriasExistentes.map((c) => c.nombre.toLowerCase())
  );
  const categoriasACrear = Array.from(nombresCat).filter(
    (n) => !nombresCatExistentes.has(n)
  ).length;

  const nombresProdExistentes = new Set(
    productosExistentes.map((p) => (p.nombre || "").toLowerCase())
  );
  let productosSkipDuplicados = 0;
  let productosACrear = 0;
  for (const it of publicos) {
    if (nombresProdExistentes.has(it.nombre.toLowerCase())) {
      productosSkipDuplicados++;
    } else {
      productosACrear++;
    }
  }

  return {
    itemsPublicos: publicos.length,
    categoriasEnMenu: nombresCat.size,
    categoriasACrear,
    productosACrear,
    productosSkipDuplicados,
    itemsAppMantenidos: app,
  };
}

/**
 * Ejecuta la migración de `menu` → `categorias` + `productos` para el vendor.
 * - Solo se migran ítems públicos (scope="publica" o sin scope).
 * - Categorías se crean por nombre único, con `iconName="Utensils"` por
 *   defecto (editables después desde el admin).
 * - Productos se skippean si ya existe uno con el mismo nombre para evitar
 *   duplicados en re-ejecuciones.
 * - No borra nada de `menu` — la carta vieja queda intacta hasta que decidas
 *   limpiarla manualmente.
 */
export async function ejecutarMigracion(
  vendorId: string
): Promise<MigracionResultado> {
  const { menuItems, categoriasExistentes, productosExistentes } =
    await cargarSnapshots(vendorId);

  const publicos = menuItems.filter(
    (it) => (it.scope ?? "publica") === "publica"
  );
  const itemsAppMantenidos = menuItems.length - publicos.length;

  // 1) Crear categorías faltantes.
  const catByNombre = new Map<string, string>(
    categoriasExistentes.map((c) => [c.nombre.toLowerCase(), c.id])
  );
  const nombresCatEnMenu = Array.from(
    new Set(publicos.map((it) => it.categoria || "General"))
  );
  let ordenBase = categoriasExistentes.reduce(
    (m, c) => Math.max(m, c.orden ?? 0),
    -1
  );

  const catsPorCrear = nombresCatEnMenu.filter(
    (n) => !catByNombre.has(n.toLowerCase())
  );

  let batch = writeBatch(db);
  let opsEnBatch = 0;
  let categoriasCreadas = 0;

  for (const nombre of catsPorCrear) {
    ordenBase++;
    const ref = doc(collection(db, "categorias"));
    batch.set(ref, {
      vendorId,
      nombre,
      iconName: "Utensils",
      orden: ordenBase,
      createdAt: serverTimestamp(),
    });
    catByNombre.set(nombre.toLowerCase(), ref.id);
    categoriasCreadas++;
    opsEnBatch++;
    if (opsEnBatch >= MAX_OPS_POR_BATCH) {
      await batch.commit();
      batch = writeBatch(db);
      opsEnBatch = 0;
    }
  }
  if (opsEnBatch > 0) {
    await batch.commit();
  }

  // 2) Crear productos (skip duplicados por nombre).
  const nombresProdExistentes = new Set(
    productosExistentes.map((p) => (p.nombre || "").toLowerCase())
  );

  batch = writeBatch(db);
  opsEnBatch = 0;
  let productosCreados = 0;
  let productosSkipDuplicados = 0;

  for (const it of publicos) {
    if (nombresProdExistentes.has(it.nombre.toLowerCase())) {
      productosSkipDuplicados++;
      continue;
    }
    const categoriaId = catByNombre.get(
      (it.categoria || "General").toLowerCase()
    );
    if (!categoriaId) continue;

    const ref = doc(collection(db, "productos"));
    batch.set(ref, {
      vendorId,
      categoriaId,
      nombre: it.nombre,
      descripcion: it.descripcion ?? "",
      precio: Number(it.precio) || 0,
      imageUrl: "", // legacy solo tenía emoji, sin URL
      // Preservamos el emoji por si querés usarlo como fallback visual.
      emojiLegacy: it.emoji ?? "",
      disponible: !!it.activo,
      orden: it.orden ?? 0,
      createdAt: serverTimestamp(),
    });
    nombresProdExistentes.add(it.nombre.toLowerCase());
    productosCreados++;
    opsEnBatch++;

    if (opsEnBatch >= MAX_OPS_POR_BATCH) {
      await batch.commit();
      batch = writeBatch(db);
      opsEnBatch = 0;
    }
  }
  if (opsEnBatch > 0) {
    await batch.commit();
  }

  return {
    categoriasCreadas,
    productosCreados,
    productosSkipDuplicados,
    itemsAppMantenidos,
  };
}
