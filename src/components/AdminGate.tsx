"use client";

import { useState, type ReactNode } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SESSION_KEY = "sushipro_admin_pin_ok";
const PIN = process.env.NEXT_PUBLIC_MOD_PIN_ADMIN || "";

function PinScreen({ onOk }: { onOk: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (PIN && pin === PIN) {
      sessionStorage.setItem(SESSION_KEY, "1");
      onOk();
    } else {
      setError(true);
      setPin("");
    }
  };

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4">
      <Logo size={56} />
      <div className="w-full max-w-xs rounded-2xl border bg-card p-5 text-center shadow-sm">
        <h1 className="font-headline text-xl font-bold">Panel Admin 🫙</h1>
        <p className="mb-4 text-sm text-muted-foreground">
          Ingresa el PIN para continuar.
        </p>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5 text-left">
            <Label htmlFor="pin">PIN</Label>
            <Input
              id="pin"
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError(false);
              }}
              autoFocus
              placeholder="••••"
            />
            {error && (
              <p className="text-xs text-destructive">PIN incorrecto.</p>
            )}
          </div>
          <Button type="submit" className="w-full">
            Entrar
          </Button>
        </form>
      </div>
    </div>
  );
}

export function AdminGate({ children }: { children: ReactNode }) {
  const [ok, setOk] = useState(
    typeof window !== "undefined" &&
      sessionStorage.getItem(SESSION_KEY) === "1"
  );

  return (
    <RequireAuth roles={["admin"]}>
      {ok ? children : <PinScreen onOk={() => setOk(true)} />}
    </RequireAuth>
  );
}
