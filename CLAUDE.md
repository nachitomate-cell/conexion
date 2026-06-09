# SushiPro Club — Guía del proyecto

PWA de fidelización para **SushiPro** (sushi chileno, IG @sushipro.cl). Arquitectura
**multitenant de locales**: SushiPro es el primer `vendor`. Todo el modelo de datos
ya lleva `vendorId` / `sellosLocales` para soportar más locales en el futuro.

**El nombre de la app en todos los textos es "SushiPro Club". Toda la UI va en
español chileno informal.**

## Stack

- Next.js 15 (App Router) · TypeScript strict · dev en `http://localhost:9002`
- Firebase: Auth (email/password) + Firestore + Cloud Messaging (FCM)
- Tailwind 3 + shadcn/ui (variables HSL) · Framer Motion · Recharts
- `html5-qrcode` (escanear) · `react-qr-code` (mostrar)
- Genkit + `@genkit-ai/google-genai` (Gemini 2.5 Flash) para mensajes IA
- Firebase Admin SDK para rutas API privilegiadas · Capacitor 7 (Android/iOS)
- Deploy en Vercel con cron jobs (`vercel.json`)

## Comandos

```bash
npm run dev         # next dev --turbopack -p 9002
npm run build       # build de producción
npm run typecheck   # tsc --noEmit  (correr antes de dar por terminado)
npm run lint
npm run genkit:dev  # Genkit dev UI para probar los flows de IA
```

## Configuración (antes de correr de verdad)

1. Copia `.env.local.example` → `.env.local` y completa:
   - `NEXT_PUBLIC_FIREBASE_*` (config web) y `NEXT_PUBLIC_FIREBASE_VAPID_KEY` (push)
   - `FIREBASE_ADMIN_*` (service account, solo servidor)
   - `NEXT_PUBLIC_ADMIN_EMAIL` → el email del dueño obtiene rol `admin` al registrarse
   - `NEXT_PUBLIC_MOD_PIN_ADMIN` → PIN del panel `/admin`
   - `CRON_SECRET` → protege los crons (Vercel manda `Authorization: Bearer <secret>`)
   - `GOOGLE_GENAI_API_KEY` → para los mensajes IA
2. Publica `firestore.rules` en Firebase.
3. (Capacitor) `npx cap add android` / `ios` cuando quieras empaquetar móvil.

> Sin `.env.local` el build igual compila (hay fallbacks demo en `firebase.ts` y el
> Admin SDK se inicializa de forma perezosa), pero la app no funcionará en runtime.

## Arquitectura

- `src/lib/firebase.ts` — cliente. `src/lib/firebaseAdmin.ts` — Admin SDK (proxies perezosos).
- `src/lib/vendors.ts` — registro de locales (multitenant) + helpers de QR
  (`buildVendorQRValue` / `buildClientQRValue` / `buildCanjeQRValue`).
- `src/lib/sellos.ts` — `calcularSellos(monto)` (tabla de montos del Handshake).
- `src/lib/rangos.ts` — Aprendiz / Roll Master / Omakase VIP (según sellos históricos).
- `src/lib/puntos.ts` — `registrarCompra()` (escaneo directo, cliente) y
  `canjearPremio()` (llama al API server-side).
- `src/lib/apiAuth.ts` — `requireUser(req, roles)` + rate limiter en memoria.
- `src/context/AuthContext.tsx` — sesión + doc de usuario en vivo. `useAuth()`.
- `src/components/RequireAuth.tsx` / `AdminGate.tsx` — guardas de ruta (rol + PIN).

### Roles (`src/lib/roles.ts`)

`cliente` (default) · `chef_partner` (caja/escaneo) · `gerente` (métricas) ·
`admin` (CRUD + PIN). El **RoleSwitcher** (🛠️ abajo a la derecha, solo en dev)
permite cambiar de rol para testear.

### Flujos de sellos

1. **Escaneo directo**: cliente en `/scan` lee el QR del local → `registrarCompra()`
   suma **1 sello** (transacción cliente) → confetti.
2. **Handshake** (caja): el chef en `/vendedor` escanea el QR del cliente (su `/perfil`),
   ingresa el monto → `POST /api/handshake/confirm` (Admin SDK, atómico, rate limit 15/min)
   calcula sellos con `calcularSellos()`.
3. **Canje**: `/premios` → `POST /api/canje` (Admin SDK) valida sellos+stock, genera
   `SUSHI-{ts}-{rand4}`, crea voucher (48h). El chef lo marca usado escaneándolo.

### Rutas API (`src/app/api`)

`handshake/confirm`, `handshake/create`, `canje`, `admin/usuarios`, `ai/promo`,
`cron/daily-notifications` (13:00 UTC), `cron/afternoon-notifications` (19:00 UTC).
Todas `runtime = "nodejs"`.

### Notificaciones

- FCM: `src/lib/fcmTokenManager.ts` + SW servido dinámicamente en
  `src/app/firebase-messaging-sw.js/route.ts` (inyecta la config desde env).
  `NotifBanner` ofrece activarlas tras el primer login.
- Crons: `src/lib/notificaciones.ts` segmenta por sellos (Omakase 10+ / Roll Master
  5-9 / Aprendiz <5), rota 3 variantes por día del año, envía en lotes de 500.
- IA: `src/ai/flows/generatePromoMessage.ts` (Genkit, con fallback si hay rate limit).

## Convenciones / cuidado

- **No** usar `output: 'export'` en `next.config.ts` (hay API routes + crons).
- `images.unoptimized = true` (las URLs de Firebase Storage no se optimizan).
- Evitar queries con múltiples filtros/`orderBy` (requieren índices compuestos):
  preferir un `where` simple y filtrar/ordenar en cliente (ya se hace en premios/canjes).
- Iconografía con **emojis de sushi** (🍣🍱🥢🍤🐟🫙), no íconos genéricos.
- Logo: círculo negro con "SP" serif (`<Logo />`).
- Los iconos PWA son SVG en `public/icons/` (reemplazar por PNG 192/512 para stores).

## Diferenciadores incluidos

Punch card temática (barra de nigiris), rangos gamificados con beneficios,
**menú digital** (`/menu`), **reserva por WhatsApp** (mensaje pre-armado, sin backend).
Omitidos a propósito: Google Wallet y geofencing.
