"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Gift, ScrollText } from "lucide-react";
import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { AdminGate } from "@/components/AdminGate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ROLES } from "@/lib/roles";
import type { PendingStamp, Usuario } from "@/types";

function UsuariosTab() {
  const { toast } = useToast();
  const [term, setTerm] = useState("");
  const [resultados, setResultados] = useState<Usuario[] | null>(null);
  const [busy, setBusy] = useState(false);

  const buscar = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/admin/usuarios", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ search: term.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: data.error });
        setResultados([]);
      } else {
        setResultados(data.usuarios as Usuario[]);
      }
    } catch {
      toast({ title: "Error de red" });
      setResultados([]);
    } finally {
      setBusy(false);
    }
  };

  const toggleBan = async (u: Usuario) => {
    try {
      await updateDoc(doc(db, "usuarios", u.uid), { baneado: !u.baneado });
      setResultados((prev) =>
        prev?.map((x) =>
          x.uid === u.uid ? { ...x, baneado: !x.baneado } : x
        ) ?? null
      );
      toast({
        title: u.baneado ? "Usuario reactivado" : "Usuario suspendido",
      });
    } catch {
      toast({ title: "No se pudo actualizar" });
    }
  };

  return (
    <div className="space-y-3">
      <form onSubmit={buscar} className="flex gap-2">
        <Input
          placeholder="Buscar por email o nombre…"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
        <Button type="submit" size="icon" disabled={busy}>
          <Search className="h-4 w-4" />
        </Button>
      </form>

      {resultados === null ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Busca un usuario para gestionarlo.
        </p>
      ) : resultados.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Sin resultados.
        </p>
      ) : (
        <div className="space-y-2">
          {resultados.map((u) => (
            <Card key={u.uid}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{u.nombre}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {u.email}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Badge variant="secondary">
                        {ROLES[u.rol]?.emoji} {ROLES[u.rol]?.label}
                      </Badge>
                      <Badge variant="outline">🍣 {u.sellos || 0}</Badge>
                      {u.baneado && (
                        <Badge variant="destructive">Suspendido</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] text-muted-foreground">
                      Ban
                    </span>
                    <Switch
                      checked={u.baneado}
                      onCheckedChange={() => toggleBan(u)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function PendientesTab() {
  const [pendientes, setPendientes] = useState<PendingStamp[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, "pending_stamps"),
      where("status", "==", "pending"),
      limit(30)
    );
    const unsub = onSnapshot(
      q,
      (snap) =>
        setPendientes(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PendingStamp)
        ),
      () => setPendientes([])
    );
    return () => unsub();
  }, []);

  return (
    <div className="space-y-2">
      {pendientes.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No hay handshakes pendientes.
        </p>
      ) : (
        pendientes.map((p) => (
          <Card key={p.id}>
            <CardContent className="flex items-center justify-between p-3 text-sm">
              <div>
                <p className="font-semibold">{p.userNombre || p.userId}</p>
                <p className="text-xs text-muted-foreground">
                  ${p.monto} · {p.numSellos} sellos
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(
                  (p.createdAt as Timestamp)?.toMillis?.() ?? 0
                ).toLocaleTimeString("es-CL", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

function AdminInner() {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted-foreground">Administración</p>
        <h1 className="font-headline text-2xl font-bold">Panel Admin 🫙</h1>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button asChild variant="outline" className="h-auto flex-col gap-1 py-4">
          <Link href="/admin/premios">
            <Gift className="h-5 w-5" />
            <span>Premios</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto flex-col gap-1 py-4">
          <Link href="/admin/logs">
            <ScrollText className="h-5 w-5" />
            <span>Logs</span>
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="usuarios">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
          <TabsTrigger value="pendientes">Pendientes</TabsTrigger>
        </TabsList>
        <TabsContent value="usuarios">
          <UsuariosTab />
        </TabsContent>
        <TabsContent value="pendientes">
          <PendientesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AdminPage() {
  return (
    <AdminGate>
      <AdminInner />
    </AdminGate>
  );
}
