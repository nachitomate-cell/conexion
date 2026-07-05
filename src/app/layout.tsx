import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Noto_Sans, Archivo } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { AppShell } from "@/components/AppShell";
import { TENANT_HEADER } from "@/lib/tenant";
import { DEFAULT_VENDOR_ID, getVendor } from "@/lib/vendors";
import type { VendorTheme } from "@/types";

/**
 * Traduce el `theme` del vendor a un bloque de CSS variables que sobreescribe
 * las definidas en globals.css para el árbol de este tenant.
 */
function themeToCss(theme: VendorTheme): string {
  const decl: string[] = [
    `--primary: ${theme.primaryHsl};`,
    `--ring: ${theme.primaryHsl};`,
  ];
  if (theme.primaryForegroundHsl)
    decl.push(`--primary-foreground: ${theme.primaryForegroundHsl};`);
  if (theme.accentHsl) decl.push(`--accent: ${theme.accentHsl};`);
  if (theme.accentForegroundHsl)
    decl.push(`--accent-foreground: ${theme.accentForegroundHsl};`);
  if (theme.goldHsl) decl.push(`--gold: ${theme.goldHsl};`);
  if (theme.goldForegroundHsl)
    decl.push(`--gold-foreground: ${theme.goldForegroundHsl};`);
  return `:root{${decl.join("")}}`;
}

const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Grotesca pesada para titulares (estética del logo SUSHI PRO).
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SushiPro Club 🍣",
  description:
    "El club de fidelización de SushiPro. Junta sellos con cada pedido y canjea rolls, postres y premios exclusivos.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SushiPro Club",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icons/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/icons/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#877AB8",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const vendorId =
    (await headers()).get(TENANT_HEADER) ?? DEFAULT_VENDOR_ID;
  const themeCss = themeToCss(getVendor(vendorId).theme);
  return (
    <html lang="es-CL" className={`${notoSans.variable} ${archivo.variable}`}>
      <head>
        <style
          id="tenant-theme"
          dangerouslySetInnerHTML={{ __html: themeCss }}
        />
      </head>
      <body className="min-h-dvh bg-background font-sans antialiased">
        <Providers vendorId={vendorId}>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
