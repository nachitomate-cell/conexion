"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { getVendor } from "@/lib/vendors";
import type { Vendor } from "@/types";

const VendorContext = createContext<Vendor | null>(null);

export function VendorProvider({
  vendorId,
  children,
}: {
  vendorId: string;
  children: ReactNode;
}) {
  const vendor = useMemo(() => getVendor(vendorId), [vendorId]);
  return (
    <VendorContext.Provider value={vendor}>{children}</VendorContext.Provider>
  );
}

export function useVendor(): Vendor {
  const v = useContext(VendorContext);
  if (!v) {
    throw new Error("useVendor debe usarse dentro de <VendorProvider>");
  }
  return v;
}
