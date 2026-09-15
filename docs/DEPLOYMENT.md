# Despliegue

## Estado

La aplicación React + Vite existe y su build local está verificado. El proyecto Supabase independiente de Kizen está enlazado y tiene aplicada la migración inicial. Aún no hay Worker ni despliegue Cloudflare configurado. El flujo previsto es desarrollo local → Git → GitHub → Cloudflare → Kizen.

## Cloudflare Workers con despliegue por push

Kizen debe configurarse como **Cloudflare Workers Builds**, igual que Gasti. El archivo `wrangler.jsonc` publica `dist/` como assets estáticos y activa el fallback de SPA:

1. En Cloudflare abrir **Workers & Pages → Create application → Workers → Import from Git** (o conectar el repositorio desde el Worker existente).
2. Seleccionar GitHub y el repositorio `jelsync/Kizen`.
3. Elegir la rama `main`.
4. Configurar:
   - Build command: `npm run build`
   - Deploy command: `npm run deploy`
   - Root directory: `/`
   - Node version: `22`
5. En las variables de producción agregar:
   - `VITE_SUPABASE_URL=https://mahsnwodlzyygkoxrrov.supabase.co`
   - `VITE_SUPABASE_ANON_KEY=<la clave pública del proyecto>`
6. Guardar y ejecutar el primer despliegue.

Después, cada `push` a `main` ejecutará `npm run build` y `npx wrangler deploy`. Los pull requests pueden configurarse como previews si el plan y la configuración lo permiten.

Cuando Cloudflare asigne la URL pública, registrar esa URL en Supabase en **Authentication → URL Configuration** como `Site URL` y agregar también `https://<dominio>/**` en `Redirect URLs`. No subir `.env.local` ni claves privadas al repositorio.

## Configuración prevista

- Repositorio: `jelsync/Kizen`.
- Worker: `kizen` si el nombre está disponible.
- URL prevista: `https://kizen.<tu-subdominio>.workers.dev/` o el dominio personalizado.
- Build command: `npm.cmd run build` en PowerShell local; Cloudflare ejecutará `npm run build`.
- Deploy command: `npm.cmd run deploy` en PowerShell local; Cloudflare ejecutará `npm run deploy`.
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
- Migraciones remotas aplicadas: `202609150001_initial_kizen_schema.sql`, `202609150002_habit_mutation_guards.sql`, `202609150003_fix_schedule_day_trigger.sql` y `202609150004_fix_schedule_trigger_old_reference.sql`.
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

Estado verificado el 2026-09-15: las URL locales, la política de contraseña y la confirmación por correo quedaron configuradas; registro, confirmación, login, logout y recuperación funcionaron correctamente contra el proyecto remoto de Kizen.

Al desplegar, cambiar Site URL a la URL definitiva de Cloudflare y agregarla como redirección exacta. Mantener las URL locales solo para desarrollo. Los enlaces de confirmación y recuperación dependen de esta lista permitida.

## Operación futura

Documentar aquí la configuración exacta de Workers, rama de despliegue, variables, configuración de SPA y errores confirmados cuando se configure Cloudflare.
