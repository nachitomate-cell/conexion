"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";
import { LogOut, Bell, ChevronRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { RequireAuth } from "@/components/RequireAuth";
import { RangoBadge } from "@/components/RangoBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { buildClientQRValue } from "@/lib/vendors";
import { getRango, siguienteRango } from "@/lib/rangos";
import { registerFcmToken } from "@/lib/fcmTokenManager";

function iniciales(nombre: string) {
  return nombre
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function PerfilInner() {
  const { usuario, firebaseUser, signOut } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [activando, setActivando] = useState(false);

  if (!usuario || !firebaseUser) return null;
  const rango = getRango(usuario.sellosHistoricos || 0);
  const next = siguienteRango(usuario.sellosHistoricos || 0);

  const activarNotis = async () => {
    setActivando(true);
    const t = await registerFcmToken(firebaseUser.uid);
    setActivando(false);
    toast(
      t
        ? {
            variant: "success",
            title: "Notificaciones activadas 🔔",
          }
        : { title: "No se pudieron activar" }
    );
  };

  const salir = async () => {
    await signOut();
    router.replace("/unete");
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Avatar className="h-16 w-16 text-xl">
          <AvatarFallback>{iniciales(usuario.nombre)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h1 className="truncate font-headline text-xl font-bold">
            {usuario.nombre}
          </h1>
          <p className="truncate text-sm text-muted-foreground">
            {usuario.email}
          </p>
          <div className="mt-1">
            <RangoBadge sellosHistoricos={usuario.sellosHistoricos || 0} />
          </div>
        </div>
      </div>

      <Card className="border-accent/30 bg-accent/5">
        <CardContent className="p-4">
          <p className="text-sm font-semibold">
            {rango.emoji} {rango.nombre}
          </p>
          <p className="text-sm text-muted-foreground">{rango.beneficio}</p>
          {next && (
            <p className="mt-1 text-xs text-muted-foreground">
              Te faltan {next.faltan} sellos para ser {next.rango.nombre}{" "}
              {next.rango.emoji}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-3 text-center">
        <Card>
          <CardContent className="p-3">
            <p className="font-headline text-2xl font-bold text-primary">
              {usuario.sellos || 0}
            </p>
            <p className="text-xs text-muted-foreground">Sellos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="font-headline text-2xl font-bold">
              {usuario.sellosHistoricos || 0}
            </p>
            <p className="text-xs text-muted-foreground">Históricos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="font-headline text-2xl font-bold">
              {usuario.rachaActual || 0}🔥
            </p>
            <p className="text-xs text-muted-foreground">Racha</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center gap-2 p-5">
          <p className="text-sm font-semibold">Tu QR de cliente 🥢</p>
          <p className="text-center text-xs text-muted-foreground">
            Muéstraselo al chef para sumar sellos en caja (Handshake).
          </p>
          <div className="rounded-xl bg-white p-3">
            <QRCode value={buildClientQRValue(usuario.uid)} size={170} />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Button
          variant="outline"
          className="w-full justify-between"
          onClick={activarNotis}
          disabled={activando}
        >
          <span className="flex items-center gap-2">
            <Bell className="h-4 w-4" /> Activar notificaciones
          </span>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button asChild variant="outline" className="w-full justify-between">
          <Link href="/historial">
            <span>📜 Mi historial</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="outline" className="w-full justify-between">
          <Link href="/terminos">
            <span>📄 Términos y privacidad</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start text-destructive"
          onClick={salir}
        >
          <LogOut className="h-4 w-4" /> Cerrar sesión
        </Button>
      </div>
    </div>
  );
}

export default function PerfilPage() {
  return (
    <RequireAuth roles={["cliente"]}>
      <PerfilInner />
    </RequireAuth>
  );
}
