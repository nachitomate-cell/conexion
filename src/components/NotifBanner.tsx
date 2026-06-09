"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { pushSupported, registerFcmToken } from "@/lib/fcmTokenManager";

const DISMISS_KEY = "sushipro_notif_dismissed";

export function NotifBanner() {
  const { firebaseUser, usuario } = useAuth();
  const { toast } = useToast();
  const [visible, setVisible] = useState(false);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    (async () => {
      if (!firebaseUser || !usuario) return;
      if (usuario.fcmToken) return; // ya activado
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
      if (typeof Notification !== "undefined" && Notification.permission === "granted")
        return;
      if (!(await pushSupported())) return;
      setVisible(true);
    })();
  }, [firebaseUser, usuario]);

  if (!visible) return null;

  const activar = async () => {
    if (!firebaseUser) return;
    setWorking(true);
    const token = await registerFcmToken(firebaseUser.uid);
    setWorking(false);
    setVisible(false);
    if (token) {
      toast({
        variant: "success",
        title: "¡Notificaciones activadas! 🔔",
        description: "Te avisaremos de promos y cuando tu premio esté listo.",
      });
    } else {
      toast({
        title: "No se pudieron activar",
        description: "Puedes intentarlo más tarde desde tu perfil.",
      });
    }
  };

  const cerrar = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  return (
    <div className="animate-fade-up relative overflow-hidden rounded-2xl border border-primary/30 bg-primary/10 p-4">
      <button
        onClick={cerrar}
        className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:bg-secondary"
        aria-label="Cerrar"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Bell className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <p className="font-semibold">Activa las notificaciones 🍣</p>
          <p className="text-sm text-muted-foreground">
            Entérate de promos del día y cuando tengas un premio listo.
          </p>
          <Button
            size="sm"
            className="mt-3"
            onClick={activar}
            disabled={working}
          >
            {working ? "Activando…" : "Activar ahora"}
          </Button>
        </div>
      </div>
    </div>
  );
}
