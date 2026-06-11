"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Logo, Wordmark } from "@/components/Logo";

export function Header() {
  const { firebaseUser } = useAuth();
  const [noLeidas, setNoLeidas] = useState(0);

  useEffect(() => {
    if (!firebaseUser) {
      setNoLeidas(0);
      return;
    }
    const q = query(
      collection(db, "usuarios", firebaseUser.uid, "notificaciones"),
      where("leida", "==", false)
    );
    const unsub = onSnapshot(
      q,
      (snap) => setNoLeidas(snap.size),
      () => setNoLeidas(0)
    );
    return () => unsub();
  }, [firebaseUser]);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Logo size={32} />
          <Wordmark className="text-lg" />
        </Link>

        {firebaseUser ? (
          <Link
            href="/notificacion"
            className="relative rounded-full p-2 text-foreground/70 transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Notificaciones"
          >
            <Bell className="h-5 w-5" />
            {noLeidas > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {noLeidas > 9 ? "9+" : noLeidas}
              </span>
            )}
          </Link>
        ) : (
          <Link
            href="/unete"
            className="rounded-full bg-foreground px-4 py-1.5 text-sm font-bold text-background transition-colors hover:bg-foreground/90"
          >
            Entrar
          </Link>
        )}
      </div>
    </header>
  );
}
