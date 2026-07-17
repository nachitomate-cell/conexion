"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { TenantHomeContent } from "@/components/TenantHomeContent";
import { getVendorBySlug } from "@/lib/vendors";

// =========================================================
// /club/[slug] — Vista aislada de un tenant (club) accedida
// por URL. El header del portal detecta esta ruta y muestra
// un back-button, sin usar la marca del club para el brand
// global.
// =========================================================

export default function ClubPage() {
  const params = useParams();
  const slug =
    typeof params?.slug === "string"
      ? params.slug
      : Array.isArray(params?.slug)
        ? params.slug[0]
        : "";
  const vendor = getVendorBySlug(slug);

  if (!vendor) {
    return (
      <div className="mx-auto max-w-md space-y-4 px-4 py-16 text-center">
        <p className="text-5xl">🗺️</p>
        <h1 className="font-headline text-[24px] font-black tracking-tight">
          Este club aún no está en el portal
        </h1>
        <p className="text-[14px] text-muted-foreground">
          El club <code className="rounded bg-black/[0.05] px-1.5 py-0.5 font-mono text-[12px]">{slug}</code>{" "}
          no forma parte de la red o cambió de dirección.
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-[13px] font-bold text-white shadow-md transition-colors hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a ElBarrio
        </Link>
      </div>
    );
  }

  return <TenantHomeContent vendor={vendor} />;
}
