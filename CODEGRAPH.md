# CodeGraph de Kizen

Última actualización: 2026-09-15.

Este archivo es el índice de navegación breve para CodeGraph y agentes. Complementa `AGENTS.md`; las decisiones y el estado oficial viven en `docs/`.

## Vista general

```text
src/main.tsx
  └─ src/App.tsx
      └─ src/App.css + src/index.css

Integración futura con Supabase
  └─ src/lib/supabase.ts
      └─ src/lib/supabase-config.ts

Supabase local
  ├─ supabase/config.toml
  ├─ supabase/migrations/202609150001_initial_kizen_schema.sql
  └─ supabase/tests/0001_initial_schema.test.sql
```

## Dónde empezar

| Tarea | Archivos iniciales |
| --- | --- |
| Bootstrap y UI base | `src/main.tsx`, `src/App.tsx`, `src/App.css`, `src/index.css` |
| Variables públicas y Supabase | `.env.example`, `src/lib/supabase-config.ts`, `src/lib/supabase.ts` |
| Validación de configuración | `src/lib/supabase-config.test.ts` |
| PostgreSQL, Auth, RLS y RPC | `supabase/migrations/`, `supabase/tests/`, `docs/DATA_MODEL.md` |
| Arquitectura, datos y seguridad | `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/DECISIONS.md` |
| Estado y siguiente trabajo | `docs/PROJECT_STATUS.md`, `docs/ROADMAP.md` |

## Uso

En Windows, ejecuta `codegraph.cmd` porque la política local bloquea la envoltura `codegraph.ps1`.

[PowerShell local]

```powershell
cd C:\Users\jelsy\IdeaProjects\Kizen
codegraph.cmd orient --root . --budget small
codegraph.cmd impact --base HEAD --head WORKTREE
codegraph.cmd review --base HEAD --head WORKTREE
```

Antes de cambios existentes, consulta el contexto y el impacto. Tras cambios relevantes, ejecuta `review` y actualiza este índice solo cuando cambie la estructura o los puntos de entrada.
