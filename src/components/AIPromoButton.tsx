"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Result {
  title: string;
  message: string;
  cta: string;
}

/** Genera una idea de mensaje promocional con IA (Genkit / Gemini). */
export function AIPromoButton() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const generar = async () => {
    setLoading(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/ai/promo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          userName: "cliente",
          sellosCount: 6,
          diasSinVisita: 5,
          context: "Promo del día: 2x1 en rolls",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "IA no disponible", description: data.error });
        return;
      }
      setResult({ title: data.title, message: data.message, cta: data.cta });
    } catch {
      toast({ title: "Error al generar el mensaje" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        variant="gold"
        className="w-full"
        onClick={generar}
        disabled={loading}
      >
        <Sparkles className="h-4 w-4" />
        {loading ? "Generando con IA…" : "Generar idea de promo (IA)"}
      </Button>
      {result && (
        <div className="rounded-xl border bg-card p-3 text-sm">
          <p className="font-bold">{result.title}</p>
          <p className="text-muted-foreground">{result.message}</p>
          <p className="mt-1 font-semibold text-primary">{result.cta} →</p>
        </div>
      )}
    </div>
  );
}
