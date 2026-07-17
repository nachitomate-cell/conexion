import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { PORTAL_NAME } from "@/lib/portal";

export const metadata = { title: `Términos · ${PORTAL_NAME}` };

// =========================================================
// Términos y Condiciones globales del portal. Layout tipo
// help-center: aside sticky con índice + tarjeta blanca con
// las secciones separadas por hairlines. Server component,
// contenido estático.
// =========================================================

const ULTIMA_ACTUALIZACION = "17 de julio de 2026";

const SECCIONES: {
  id: string;
  num: string;
  titulo: string;
  cuerpo: React.ReactNode;
}[] = [
  {
    id: "programa",
    num: "01",
    titulo: "El programa",
    cuerpo: (
      <>
        <p>
          <strong>{PORTAL_NAME}</strong> es una plataforma de fidelización que
          agrupa a los clubes participantes de la Quinta Región y otras
          alianzas de la red. La cuenta es gratuita y única: te permite
          acumular sellos digitales en distintos comercios adheridos y
          canjearlos por recompensas reales.
        </p>
        <p>
          Al registrarte y usar la aplicación aceptas estos términos, así como
          las políticas particulares que cada club adherido pueda publicar en
          sus propios canales.
        </p>
      </>
    ),
  },
  {
    id: "sellos",
    num: "02",
    titulo: "Acumulación de sellos",
    cuerpo: (
      <>
        <p>
          Los sellos se ganan escaneando el código QR del local o mediante el
          Handshake en caja (según el monto de tu consumo, cuando el club así
          lo haya configurado).
        </p>
        <p>
          Los sellos son personales, se guardan por club (uno separado por
          cada comercio), <strong>no tienen valor monetario</strong>, no son
          transferibles y no son canjeables por dinero. Cada club adherido
          administra libremente su tabla de sellos, promociones y premios.
        </p>
      </>
    ),
  },
  {
    id: "canje",
    num: "03",
    titulo: "Canje de premios",
    cuerpo: (
      <>
        <p>
          Los premios se solicitan desde la app y están sujetos a
          disponibilidad (stock). Al canjear se genera un{" "}
          <strong>código válido por 48 horas</strong>: preséntalo — o muestra
          su QR — en el local para retirar la recompensa.
        </p>
        <p>
          El catálogo de premios se rige por las condiciones de cada club
          emisor y puede cambiar sin previo aviso. Pasado el plazo del código,
          el canje se anula y los sellos no son reintegrables.
        </p>
      </>
    ),
  },
  {
    id: "uso",
    num: "04",
    titulo: "Uso correcto",
    cuerpo: (
      <>
        <p>
          El uso indebido de la plataforma —sellos no asociados a compras
          reales, suplantación de identidad, uso de la cuenta de otra persona,
          o cualquier otro abuso— puede resultar en la{" "}
          <strong>suspensión inmediata</strong> de la cuenta y la anulación de
          sellos y canjes pendientes, sin necesidad de aviso previo.
        </p>
      </>
    ),
  },
  {
    id: "cambios",
    num: "05",
    titulo: "Modificaciones y cambios",
    cuerpo: (
      <>
        <p>
          {PORTAL_NAME} y los clubes adheridos pueden modificar estos
          términos, actualizar catálogos de premios o descontinuar el programa
          avisando por los canales oficiales del portal y de cada club.
        </p>
        <p>
          Recomendamos revisar esta página periódicamente. La fecha de última
          actualización aparece al inicio del documento.
        </p>
      </>
    ),
  },
];

export default function TerminosPage() {
  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 px-4 pb-8 pt-2 lg:grid-cols-12 lg:gap-12 lg:pt-6">
      {/* ═══════════════════════════════════════════════
          Columna izquierda — índice sticky (desktop)
          ═══════════════════════════════════════════════ */}
      <aside className="sticky top-28 hidden self-start lg:col-span-4 lg:block">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">
            Contenido
          </p>
          <p className="mt-1 font-headline text-[15px] font-black tracking-tight text-slate-900">
            Ir a una sección
          </p>
          <nav className="mt-4 space-y-1">
            {SECCIONES.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-slate-700 transition-colors hover:bg-white hover:text-slate-900"
              >
                <span className="tabular-nums text-slate-400">{s.num}</span>
                <span className="truncate">{s.titulo}</span>
              </a>
            ))}
          </nav>
          <div className="mt-6 border-t border-slate-200 pt-4">
            <p className="text-[11px] leading-relaxed text-slate-500">
              Actualizado{" "}
              <span className="font-semibold text-slate-700">
                {ULTIMA_ACTUALIZACION}
              </span>
            </p>
          </div>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════
          Columna derecha — contenido legal
          ═══════════════════════════════════════════════ */}
      <article className="divide-y divide-slate-100 rounded-3xl border border-slate-100 bg-white p-8 shadow-sm lg:col-span-8 lg:p-10">
        {/* Encabezado */}
        <div className="pb-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground/70">
            Documento legal
          </p>
          <h1 className="mt-2 font-headline text-[32px] font-black leading-tight tracking-tight md:text-[38px]">
            Términos y Condiciones
          </h1>
          <p className="mt-2 text-[13px] text-slate-500">
            Portal {PORTAL_NAME} · Red de clubes de fidelidad · Última
            actualización:{" "}
            <span className="font-semibold text-slate-700">
              {ULTIMA_ACTUALIZACION}
            </span>
          </p>
        </div>

        {/* Resumen ejecutivo */}
        <div className="py-8">
          <div className="rounded-r-xl border-l-4 border-indigo-500 bg-indigo-50/50 p-4 text-sm text-indigo-950">
            <p className="font-bold uppercase tracking-wide text-[11px] text-indigo-700">
              En pocas palabras
            </p>
            <p className="mt-1.5 leading-relaxed">
              Este programa te permite acumular sellos digitales en diversos
              locales adheridos para canjear recompensas reales. No tiene
              costo de uso ni requiere tarjetas de papel.
            </p>
          </div>
        </div>

        {/* Secciones */}
        {SECCIONES.map((s) => (
          <section
            key={s.id}
            id={s.id}
            className="scroll-mt-28 space-y-3 py-8"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-500">
              Sección {s.num}
            </p>
            <h2 className="mb-2 text-lg font-bold tracking-tight text-slate-900">
              {s.num.replace(/^0/, "")}. {s.titulo}
            </h2>
            <div className="space-y-3 text-[14px] leading-relaxed text-slate-700">
              {s.cuerpo}
            </div>
          </section>
        ))}

        {/* Enlace a Privacidad */}
        <div className="pt-8">
          <Link
            href="/privacidad"
            className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-white hover:shadow-md"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Documento relacionado
              </p>
              <p className="mt-0.5 font-headline text-[15px] font-bold tracking-tight text-slate-900">
                Política de Privacidad
              </p>
              <p className="mt-0.5 text-[12px] text-slate-500">
                Cómo tratamos los datos que compartes con la plataforma.
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-600" />
          </Link>
        </div>
      </article>
    </div>
  );
}
