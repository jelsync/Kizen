# Despliegue

## Estado

La aplicación React + Vite existe y su build local está verificado. Aún no hay Worker, proyecto Supabase ni despliegue configurado. El flujo previsto es desarrollo local → Git → GitHub → Cloudflare → Kizen.

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

## Operación futura

Documentar aquí la configuración exacta de Workers, rama de despliegue, variables, configuración de SPA y errores confirmados cuando se configure Cloudflare.
