import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No usamos output: 'export' — la app corre como servidor (API routes + crons).
  images: {
    // Firebase Storage URLs no son optimizables por Vercel.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Paquetes server-only que no deben empaquetarse por webpack/turbopack.
  serverExternalPackages: [
    "firebase-admin",
    "genkit",
    "@genkit-ai/google-genai",
    "@opentelemetry/sdk-node",
  ],
};

export default nextConfig;
