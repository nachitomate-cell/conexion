import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "cl.sushipro.club",
  appName: "SushiPro Club",
  webDir: "public",
  server: {
    // En producción la PWA se sirve desde Vercel; Capacitor solo envuelve la URL.
    url: process.env.NEXT_PUBLIC_BASE_URL || "https://sushipro.cl",
    cleartext: true,
  },
  android: {
    backgroundColor: "#FFFDF8",
  },
  ios: {
    backgroundColor: "#FFFDF8",
    contentInset: "always",
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
