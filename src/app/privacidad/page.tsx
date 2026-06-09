import Link from "next/link";

export const metadata = { title: "Privacidad · SushiPro Club" };

export default function PrivacidadPage() {
  return (
    <article className="space-y-4">
      <h1 className="font-headline text-2xl font-bold">
        Política de Privacidad
      </h1>

      <section className="space-y-2 text-sm leading-relaxed">
        <h2 className="font-headline text-lg font-bold">1. Datos que pedimos</h2>
        <p>
          Recopilamos tu nombre, email, teléfono y fecha de nacimiento (opcional)
          para administrar tu cuenta del club, tus sellos y tus premios.
        </p>

        <h2 className="font-headline text-lg font-bold">2. Uso de los datos</h2>
        <p>
          Usamos tus datos para identificarte en el local, enviarte
          notificaciones sobre promociones y premios, y mejorar el servicio. No
          vendemos tus datos a terceros.
        </p>

        <h2 className="font-headline text-lg font-bold">3. Notificaciones</h2>
        <p>
          Si las activas, podemos enviarte notificaciones push. Puedes
          desactivarlas cuando quieras desde la configuración de tu navegador o
          dispositivo.
        </p>

        <h2 className="font-headline text-lg font-bold">4. Seguridad</h2>
        <p>
          Tus datos se almacenan en Firebase (Google Cloud) con las medidas de
          seguridad estándar de la industria.
        </p>

        <h2 className="font-headline text-lg font-bold">5. Tus derechos</h2>
        <p>
          Puedes solicitar la eliminación de tu cuenta y datos escribiéndonos por
          Instagram @sushipro.cl.
        </p>
      </section>

      <Link href="/terminos" className="text-sm font-medium text-primary">
        ← Volver a Términos
      </Link>
    </article>
  );
}
