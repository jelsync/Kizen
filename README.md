# Kizen

Kizen es una aplicación web para crear y mantener hábitos mediante programación, progreso diario, rachas y constancia.

## Stack

- React + Vite + TypeScript
- Supabase para Auth, PostgreSQL, API y RLS
- Cloudflare Workers para el despliegue previsto

## Desarrollo local

[PowerShell local]

```powershell
cd C:\Users\jelsy\IdeaProjects\Kizen
Copy-Item .env.example .env.local
npm.cmd install
npm.cmd run dev
```

`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` son valores públicos para el navegador. Nunca agregues una service-role key a `.env.local` ni al código cliente.

## Comprobaciones

[PowerShell local]

```powershell
cd C:\Users\jelsy\IdeaProjects\Kizen
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
```

## Supabase local

Docker Desktop debe estar activo. La primera ejecución descarga las imágenes oficiales de Supabase.

[PowerShell local]

```powershell
cd C:\Users\jelsy\IdeaProjects\Kizen
npx.cmd supabase start
npx.cmd supabase db reset
npx.cmd supabase test db
```

Consulta [AGENTS.md](AGENTS.md), [CODEGRAPH.md](CODEGRAPH.md) y `docs/` antes de cambios relevantes.
