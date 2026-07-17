"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
  type DocumentData,
  type QuerySnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  MOCK_TENANTS,
  TENANTS_COLLECTION,
  isTenantPublishable,
  tenantToVendor,
  type TenantLocale,
} from "@/lib/officialTenants";
import type { Vendor } from "@/types";

// =========================================================
// useOfficialTenants — subscripción en tiempo real a la
// colección `tenants` de Firestore. Cualquier local satélite
// que actualice su directoryConfig se refleja acá sin recargar.
//
// El hook nunca deja la UI vacía: si la subscripción responde
// con 0 filas (o falla), cae a MOCK_TENANTS con un flag `isMock`
// para que el consumer pueda mostrar un badge de "Dev Mock".
// =========================================================

export interface UseOfficialTenantsResult {
  /** Documentos crudos, para features que necesiten `directoryConfig` completo. */
  tenants: TenantLocale[];
  /** Adaptados a `Vendor` — plug&play para los componentes del directorio. */
  vendors: Vendor[];
  /** Solo los tenants con Primera Fila / Premium — Bento destacado. */
  premium: Vendor[];
  /** El resto (no premium) — listado estándar. */
  standard: Vendor[];
  /** true mientras la primera subscripción no resuelve. */
  loading: boolean;
  /** true si estamos mostrando el fallback demo (Firestore vacío o error). */
  isMock: boolean;
  /** Último error de subscripción, si hubo. */
  error: Error | null;
}

function docsToTenants(snap: QuerySnapshot<DocumentData>): TenantLocale[] {
  const list: TenantLocale[] = [];
  snap.forEach((d) => {
    const data = d.data() as Partial<TenantLocale>;
    // El documento debe traer al menos `directoryConfig` y `nombre`.
    if (!data.directoryConfig) return;
    list.push({
      id: d.id,
      status: (data.status ?? "pending") as TenantLocale["status"],
      tier: data.tier,
      nombre: data.nombre ?? d.id,
      slug: data.slug ?? d.id,
      rubro: data.rubro,
      ciudad: data.ciudad,
      emoji: data.emoji,
      logoUrl: data.logoUrl,
      coverImageUrl: data.coverImageUrl,
      primaryColor: data.primaryColor,
      directoryConfig: data.directoryConfig,
    });
  });
  return list;
}

function warnDevMock(reason: string, err?: unknown) {
  if (process.env.NODE_ENV === "production") return;
  // eslint-disable-next-line no-console
  console.warn(
    `[Dev Mock] Directorio usando MOCK_TENANTS · ${reason}`,
    err ?? ""
  );
}

export function useOfficialTenants(): UseOfficialTenantsResult {
  const [tenants, setTenants] = useState<TenantLocale[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMock, setIsMock] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    const q = query(
      collection(db, TENANTS_COLLECTION),
      where("status", "==", "active"),
      where("directoryConfig.isPublished", "==", true)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        if (cancelled) return;
        const list = docsToTenants(snap).filter(isTenantPublishable);
        if (list.length > 0) {
          setTenants(list);
          setIsMock(false);
        } else {
          setTenants(MOCK_TENANTS);
          setIsMock(true);
          warnDevMock("colección `tenants` vacía");
        }
        setError(null);
        setLoading(false);
      },
      (err) => {
        if (cancelled) return;
        setTenants(MOCK_TENANTS);
        setIsMock(true);
        setError(err);
        setLoading(false);
        warnDevMock("subscripción a Firestore falló", err);
      }
    );

    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  const vendors = useMemo(() => tenants.map(tenantToVendor), [tenants]);
  const premium = useMemo(() => vendors.filter((v) => v.destacado), [vendors]);
  const standard = useMemo(
    () => vendors.filter((v) => !v.destacado),
    [vendors]
  );

  return { tenants, vendors, premium, standard, loading, isMock, error };
}
