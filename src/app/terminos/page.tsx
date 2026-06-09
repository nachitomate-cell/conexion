import Link from "next/link";

export const metadata = { title: "Términos · SushiPro Club" };

export default function TerminosPage() {
  return (
    <article className="prose-sm space-y-4">
      <h1 className="font-headline text-2xl font-bold">Términos y Condiciones</h1>
      <p className="text-sm text-muted-foreground">
        Programa de fidelización SushiPro Club.
      </p>

      <section className="space-y-2 text-sm leading-relaxed">
        <h2 className="font-headline text-lg font-bold">1. El programa</h2>
        <p>
          SushiPro Club es un programa de fidelización gratuito. Al registrarte
          aceptas estos términos. Acumulas “sellos” con tus compras y puedes
          canjearlos por premios disponibles en el local.
        </p>

        <h2 className="font-headline text-lg font-bold">2. Sellos</h2>
        <p>
          Los sellos se otorgan al escanear el código del local o mediante el
          Handshake en caja según el monto de tu consumo. Los sellos no tienen
          valor monetario, no son transferibles ni canjeables por dinero.
        </p>

        <h2 className="font-headline text-lg font-bold">3. Premios</h2>
        <p>
          Los premios están sujetos a disponibilidad (stock). Un canje genera un
          código válido por 48 horas; pasado ese plazo se anula. SushiPro puede
          modificar el catálogo de premios en cualquier momento.
        </p>

        <h2 className="font-headline text-lg font-bold">4. Uso correcto</h2>
        <p>
          El uso fraudulento (sellos no asociados a compras reales, suplantación
          u otros) puede resultar en la suspensión de la cuenta sin previo aviso.
        </p>

        <h2 className="font-headline text-lg font-bold">5. Cambios</h2>
        <p>
          SushiPro podrá modificar o finalizar el programa avisando por sus
          canales oficiales (@sushipro.cl).
        </p>
      </section>

      <Link href="/privacidad" className="text-sm font-medium text-primary">
        Ver Política de Privacidad →
      </Link>
    </article>
  );
}
