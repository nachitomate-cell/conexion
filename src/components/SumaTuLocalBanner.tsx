"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import {
  Check,
  Sparkles,
  TrendingUp,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// =========================================================
// Suma tu local — CTA + formulario B2B para dueños de
// comercios de la Quinta Región. Móvil = una columna,
// desktop = pitch (col-span-5) + formulario (col-span-7).
// =========================================================

interface LeadFormData {
  comercio: string;
  rubro: string;
  ciudad: string;
  contacto: string;
  whatsapp: string;
  primeraFila: boolean;
}

const INITIAL_LEAD: LeadFormData = {
  comercio: "",
  rubro: "",
  ciudad: "",
  contacto: "",
  whatsapp: "",
  primeraFila: false,
};

const RUBROS = [
  "Gastronomía",
  "Cafetería",
  "Barbería & Belleza",
  "Bar & Cervecería",
  "Retail",
  "Servicios",
  "Otro",
];

const CIUDADES = [
  "Viña del Mar",
  "Valparaíso",
  "Curauma",
  "Reñaca",
  "Concón",
  "Quilpué",
  "Villa Alemana",
  "Interior",
  "Otra",
];

const BENEFICIOS: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Zap,
    title: "Digitaliza tu tarjeta de sellos en minutos",
    description:
      "Reemplaza la punch card de papel por una tarjeta digital que tus clientes llevan siempre en el bolsillo.",
  },
  {
    icon: TrendingUp,
    title: "Aumenta tus visitas recurrentes",
    description:
      "Notificaciones, rangos y premios que hacen que tus clientes vuelvan más seguido.",
  },
  {
    icon: Sparkles,
    title: "Destaca tu marca en Primera Fila",
    description:
      "Aparece arriba del directorio con tarjetas visuales cuando alguien busca tu rubro o zona.",
  },
];

/**
 * TODO(fb): reemplazar la simulación por escritura directa a Firestore:
 *
 *   const { addDoc, collection, serverTimestamp } =
 *     await import("firebase/firestore");
 *   const { db } = await import("@/lib/firebase");
 *   await addDoc(collection(db, "leads_comercios"), {
 *     ...data,
 *     createdAt: serverTimestamp(),
 *     source: "explora-b2b",
 *   });
 *
 * Idealmente vía Cloud Function que además dispare `sendEmail` al comercial
 * y notifique por WhatsApp Business. Manejar validación server-side allí.
 */
async function submitLead(_data: LeadFormData): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 900));
}

function Field({
  label,
  required,
  htmlFor,
  children,
}: {
  label: string;
  required?: boolean;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white";

function SuccessCard({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
        <Check className="h-8 w-8" strokeWidth={2.5} />
      </div>
      <h3 className="mt-5 font-headline text-[22px] font-black leading-tight tracking-tight text-slate-900">
        ¡Listo! Recibimos tu solicitud.
      </h3>
      <p className="mt-2 max-w-[36ch] text-[13px] leading-relaxed text-slate-600">
        Un asesor de <span className="font-semibold">ElBarrio</span> te
        contactará por WhatsApp en menos de 24 horas para agendar tu onboarding.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-6 text-[12px] font-semibold text-slate-500 underline underline-offset-4 transition-colors hover:text-slate-800"
      >
        Enviar otra solicitud
      </button>
    </div>
  );
}

export function SumaTuLocalBanner() {
  const [formData, setFormData] = useState<LeadFormData>(INITIAL_LEAD);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = <K extends keyof LeadFormData>(
    key: K,
    value: LeadFormData[K]
  ) => setFormData((f) => ({ ...f, [key]: value }));

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    // Validación cliente ligera — el server hace la validación fuerte.
    if (
      !formData.comercio.trim() ||
      !formData.rubro ||
      !formData.ciudad ||
      !formData.contacto.trim() ||
      !formData.whatsapp.trim()
    ) {
      setError("Completa todos los campos marcados con *.");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitLead(formData);
      setIsSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No pudimos registrar tu solicitud. Intenta de nuevo en un momento."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const onReset = () => {
    setFormData(INITIAL_LEAD);
    setIsSuccess(false);
    setError(null);
  };

  return (
    // Fondo defensivo: primero un sólido `bg-slate-900` (garantiza contraste
    // aunque el navegador/purga no procese el gradiente), después el gradiente
    // encima. Nunca vuelve a caer a "white-on-white".
    <section className="relative overflow-hidden rounded-3xl bg-slate-900 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-8 text-white shadow-2xl md:p-12">
      {/* Halos ambientales */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-indigo-500/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-violet-500/20 blur-3xl"
      />

      <div className="relative grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
        {/* ── Pitch (izquierda) ── */}
        {/*
          Cada texto lleva su color EXPLÍCITO (text-white / text-white/70 /
          text-white/60). No confiamos en la herencia — si un padre pinta
          encima o si un `text-*` global se cuela, el contraste se mantiene.
        */}
        <div className="lg:col-span-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-white/60">
            Para dueños de comercios · B2B
          </p>
          <h2 className="mt-4 font-headline text-[30px] font-black leading-[1.06] tracking-tight text-white md:text-[38px] lg:text-[42px]">
            ¿Tienes un local en la Quinta Región?{" "}
            <span className="text-indigo-300">Únete a ElBarrio.</span>
          </h2>
          <p className="mt-4 max-w-[42ch] text-[14px] leading-relaxed text-white/75 md:text-[15px]">
            Digitaliza tu tarjeta de sellos, aumenta la recurrencia y súmate
            al portal de fidelidad más grande de la región.
          </p>

          <ul className="mt-8 space-y-4">
            {BENEFICIOS.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                  <Icon className="h-5 w-5 text-indigo-300" />
                </span>
                <div className="min-w-0">
                  <p className="font-headline text-[15px] font-extrabold tracking-tight text-white">
                    {title}
                  </p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-white/70">
                    {description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* ── Formulario (derecha) ── */}
        <div className="lg:col-span-7">
          <div className="rounded-2xl bg-white p-6 text-slate-800 shadow-[0_25px_60px_-20px_rgba(15,23,42,0.6)] md:p-7">
            {isSuccess ? (
              <SuccessCard onReset={onReset} />
            ) : (
              <form onSubmit={onSubmit} noValidate className="space-y-4">
                <div>
                  <p className="font-headline text-[18px] font-extrabold leading-tight tracking-tight text-slate-900">
                    Postula tu local
                  </p>
                  <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
                    Toma menos de un minuto. Sin costo, sin permanencia.
                  </p>
                </div>

                <Field
                  htmlFor="lead-comercio"
                  label="Nombre del comercio"
                  required
                >
                  <input
                    id="lead-comercio"
                    type="text"
                    value={formData.comercio}
                    onChange={(e) => update("comercio", e.target.value)}
                    placeholder="Barbería El Faro"
                    autoComplete="organization"
                    className={inputCls}
                    required
                  />
                </Field>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field htmlFor="lead-rubro" label="Rubro" required>
                    <select
                      id="lead-rubro"
                      value={formData.rubro}
                      onChange={(e) => update("rubro", e.target.value)}
                      className={inputCls}
                      required
                    >
                      <option value="" disabled>
                        Elige tu categoría
                      </option>
                      {RUBROS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field
                    htmlFor="lead-ciudad"
                    label="Ciudad / Sector"
                    required
                  >
                    <select
                      id="lead-ciudad"
                      value={formData.ciudad}
                      onChange={(e) => update("ciudad", e.target.value)}
                      className={inputCls}
                      required
                    >
                      <option value="" disabled>
                        Elige tu zona
                      </option>
                      {CIUDADES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field
                    htmlFor="lead-contacto"
                    label="Nombre del contacto"
                    required
                  >
                    <input
                      id="lead-contacto"
                      type="text"
                      value={formData.contacto}
                      onChange={(e) => update("contacto", e.target.value)}
                      placeholder="María González"
                      autoComplete="name"
                      className={inputCls}
                      required
                    />
                  </Field>

                  <Field
                    htmlFor="lead-whatsapp"
                    label="Teléfono / WhatsApp"
                    required
                  >
                    <input
                      id="lead-whatsapp"
                      type="tel"
                      value={formData.whatsapp}
                      onChange={(e) => update("whatsapp", e.target.value)}
                      placeholder="+56 9 1234 5678"
                      autoComplete="tel"
                      inputMode="tel"
                      className={inputCls}
                      required
                    />
                  </Field>
                </div>

                {/* Toggle Primera Fila */}
                <label
                  htmlFor="lead-primera-fila"
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors",
                    formData.primeraFila
                      ? "border-amber-400 bg-amber-50"
                      : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100/60"
                  )}
                >
                  <input
                    id="lead-primera-fila"
                    type="checkbox"
                    checked={formData.primeraFila}
                    onChange={(e) => update("primeraFila", e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 font-headline text-[13px] font-extrabold tracking-tight text-slate-900">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      Me interesa Primera Fila
                    </p>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-slate-600">
                      Recibe info sobre las membresías destacadas para aparecer
                      primero en tu zona y en el bloque Bento del portal.
                    </p>
                  </div>
                </label>

                {error && (
                  <p
                    role="alert"
                    className="rounded-xl bg-rose-50 px-4 py-3 text-[13px] text-rose-700 ring-1 ring-rose-100"
                  >
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  size="lg"
                  disabled={isSubmitting}
                  className="h-12 w-full rounded-xl bg-slate-900 text-[14px] font-bold tracking-tight text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting
                    ? "Enviando…"
                    : "Solicitar unirme al directorio →"}
                </Button>

                <p className="text-center text-[11px] leading-relaxed text-slate-500">
                  Un asesor te contactará por WhatsApp en menos de 24h. Sin
                  spam, sin llamadas frías.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
