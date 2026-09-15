# Despliegue

## Estado

La aplicación React + Vite existe y su build local está verificado. El proyecto Supabase independiente de Kizen está enlazado y tiene aplicada la migración inicial. Aún no hay Worker ni despliegue Cloudflare configurado. El flujo previsto es desarrollo local → Git → GitHub → Cloudflare → Kizen.

## Configuración prevista

- Repositorio: `jelsync/Kizen`.
- Worker: `kizen` si el nombre está disponible.
- URL prevista: `https://kizen.jelsync.workers.dev/`.
- Build command: `npm.cmd run build` en PowerShell local; Cloudflare ejecutará `npm run build`.
- Output: `dist`.

## Variables de frontend

Definir en Cloudflare y localmente, sin versionar valores reales:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

No definir ni exponer `SUPABASE_SERVICE_ROLE_KEY` en el frontend ni en el build público.

## Supabase local y migraciones

La configuración versionada está en `supabase/config.toml`; exige grants explícitos mediante `auto_expose_new_tables = false`. Las migraciones viven en `supabase/migrations/` y las pruebas SQL en `supabase/tests/`.

[PowerShell local]

```powershell
cd C:\Users\jelsy\IdeaProjects\Kizen
npx.cmd supabase start
npx.cmd supabase db reset
npx.cmd supabase test db
```

Docker Desktop debe estar ejecutándose. Para detener los servicios locales:

[PowerShell local]

```powershell
cd C:\Users\jelsy\IdeaProjects\Kizen
npx.cmd supabase stop
```

El vínculo remoto y `supabase db push` solo se ejecutan después de verificar el proyecto de destino. Nunca se versionan la contraseña de PostgreSQL, access tokens ni claves privadas.

Proyecto remoto de Kizen:

- Project ref: `mahsnwodlzyygkoxrrov`.
- Migración remota aplicada: `202609150001_initial_kizen_schema.sql`.
- Antes de cada aplicación remota se ejecutan `supabase db reset`, `supabase test db` y `supabase db push --dry-run`.

## Redirecciones de Supabase Auth

[Supabase Dashboard]

Authentication → URL Configuration

Durante desarrollo:

- Site URL: `http://localhost:5173`.
- Redirect URL: `http://localhost:5173/**`.
- Redirect URL alternativa: `http://127.0.0.1:5173/**`.

[Supabase Dashboard]

Authentication → configuración de contraseña

- Longitud mínima: `8`.
- Requerir al menos mayúscula, minúscula y número, si el plan/interfaz lo permite.
- Mantener confirmación de correo habilitada.

La política remota se configura por separado: la validación React mejora la experiencia, pero no sustituye la protección de Supabase Auth.

Al desplegar, cambiar Site URL a la URL definitiva de Cloudflare y agregarla como redirección exacta. Mantener las URL locales solo para desarrollo. Los enlaces de confirmación y recuperación dependen de esta lista permitida.

## Operación futura

Documentar aquí la configuración exacta de Workers, rama de despliegue, variables, configuración de SPA y errores confirmados cuando se configure Cloudflare.
