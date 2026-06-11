"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { rolInicial, homeForRole } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Logo, Wordmark } from "@/components/Logo";
import { useToast } from "@/hooks/use-toast";

function authError(code: string): string {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email o contraseña incorrectos.";
    case "auth/email-already-in-use":
      return "Ese email ya tiene una cuenta. Inicia sesión.";
    case "auth/weak-password":
      return "La contraseña debe tener al menos 6 caracteres.";
    case "auth/invalid-email":
      return "Email inválido.";
    default:
      return "Algo salió mal. Inténtalo de nuevo.";
  }
}

function UneteInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { firebaseUser, usuario, loading } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState("login");
  const [busy, setBusy] = useState(false);

  // login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // registro
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");

  // Si ya está logueado, redirige según rol.
  useEffect(() => {
    if (!loading && firebaseUser && usuario) {
      router.replace(homeForRole(usuario.rol));
    }
  }, [loading, firebaseUser, usuario, router]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // el redirect lo maneja el useEffect
    } catch (err) {
      const code = (err as { code?: string })?.code || "";
      toast({ title: "No pudimos entrar", description: authError(code) });
    } finally {
      setBusy(false);
    }
  };

  const registro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      toast({ title: "Falta tu nombre" });
      return;
    }
    setBusy(true);
    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );
      const ref = params.get("ref") || undefined;
      await setDoc(doc(db, "usuarios", cred.user.uid), {
        nombre: nombre.trim(),
        email: email.trim().toLowerCase(),
        telefono: telefono.trim() || null,
        fechaNacimiento: fechaNacimiento || null,
        rol: rolInicial(email.trim()),
        sellos: 0,
        sellosHistoricos: 0,
        rachaActual: 0,
        baneado: false,
        recompensaDisponible: false,
        sellosLocales: {},
        referidoPor: ref || null,
        createdAt: serverTimestamp(),
      });
      toast({
        variant: "success",
        title: "¡Bienvenido al club! 🍣",
        description: "Tu primera tarjeta de sellos te espera.",
      });
    } catch (err) {
      const code = (err as { code?: string })?.code || "";
      toast({ title: "No pudimos registrarte", description: authError(code) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-secondary/40 to-background px-5 py-10">
      <div className="mb-6 flex flex-col items-center text-center">
        <Logo size={72} />
        <Wordmark className="mt-4 text-3xl" />
        <p className="font-headline text-sm font-bold uppercase tracking-[0.35em] text-muted-foreground">
          Club
        </p>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Junta sellos con cada pedido y canjea rolls, postres y premios
          exclusivos. 🍣🥢
        </p>
      </div>

      <div className="w-full max-w-sm rounded-2xl border bg-card p-5 shadow-sm">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Entrar</TabsTrigger>
            <TabsTrigger value="registro">Crear cuenta</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={login} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="l-email">Email</Label>
                <Input
                  id="l-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tucorreo@email.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="l-pass">Contraseña</Label>
                <Input
                  id="l-pass"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Entrando…" : "Entrar 🍣"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="registro">
            <form onSubmit={registro} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="r-nombre">Nombre</Label>
                <Input
                  id="r-nombre"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="¿Cómo te llamas?"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="r-email">Email</Label>
                <Input
                  id="r-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tucorreo@email.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="r-pass">Contraseña</Label>
                <Input
                  id="r-pass"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="r-tel">Teléfono</Label>
                  <Input
                    id="r-tel"
                    type="tel"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="+569…"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="r-fn">Cumpleaños</Label>
                  <Input
                    id="r-fn"
                    type="date"
                    value={fechaNacimiento}
                    onChange={(e) => setFechaNacimiento(e.target.value)}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Creando…" : "Crear mi cuenta 🎉"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>

      <p className="mt-5 max-w-xs text-center text-xs text-muted-foreground">
        Al continuar aceptas nuestros{" "}
        <Link href="/terminos" className="underline">
          términos
        </Link>{" "}
        y{" "}
        <Link href="/privacidad" className="underline">
          política de privacidad
        </Link>
        .
      </p>
    </div>
  );
}

export default function UnetePage() {
  return (
    <Suspense fallback={null}>
      <UneteInner />
    </Suspense>
  );
}
