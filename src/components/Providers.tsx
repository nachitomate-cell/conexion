"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/context/AuthContext";
import { VendorProvider } from "@/context/VendorContext";
import { Toaster } from "@/components/ui/toaster";

export function Providers({
  vendorId,
  children,
}: {
  vendorId: string;
  children: ReactNode;
}) {
  return (
    <VendorProvider vendorId={vendorId}>
      <AuthProvider>
        {children}
        <Toaster />
      </AuthProvider>
    </VendorProvider>
  );
}
