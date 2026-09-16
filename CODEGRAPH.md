# CodeGraph de Kizen

Última actualización: 2026-09-15.

Este archivo es el índice de navegación breve para CodeGraph y agentes. Complementa `AGENTS.md`; las decisiones y el estado oficial viven en `docs/`.

## Vista general

```text
src/main.tsx
  └─ src/App.tsx
      ├─ src/features/auth/AuthPanel.tsx
      │   ├─ src/features/auth/auth-validation.ts
      │   ├─ src/features/auth/auth-redirects.ts
      │   └─ src/features/auth/AuthPanel.css
      ├─ src/features/auth/use-auth-session.ts
      │   └─ src/features/auth/auth-session-state.ts
      ├─ src/features/habits/HabitsPage.tsx
      │   ├─ src/features/habits/HabitForm.tsx
      │   ├─ src/features/habits/HabitCard.tsx
      │   │   └─ src/features/habits/habit-metrics.ts
      │   ├─ src/features/habits/habits-repository.ts
      │   ├─ src/features/habits/habit-mappers.ts
      │   ├─ src/features/habits/habit-validation.ts
      │   └─ src/features/habits/habit-dates.ts
      └─ src/App.css + src/index.css

PWA de compilación
  └─ vite.config.ts (VitePWA)
      └─ public/kizen-icon.svg

Recordatorios web
  └─ src/features/reminders/HabitReminderSettings.tsx
      ├─ src/features/reminders/reminders-repository.ts
      ├─ src/features/reminders/browser-reminders.ts
      └─ src/features/reminders/use-browser-reminders.ts

Integración con Supabase
  └─ src/lib/supabase.ts
      └─ src/lib/supabase-config.ts

Supabase local
  ├─ supabase/config.toml
  ├─ supabase/migrations/202609150001_initial_kizen_schema.sql
  ├─ supabase/migrations/202609150002_habit_mutation_guards.sql
  ├─ supabase/migrations/202609150005_reminders.sql
  ├─ supabase/migrations/202609150006_atomic_browser_reminder.sql
  └─ supabase/tests/*.test.sql
```

## Dónde empezar

| Tarea | Archivos iniciales |
| --- | --- |
| Bootstrap y UI base | `src/main.tsx`, `src/App.tsx`, `src/App.css`, `src/index.css` |
| Registro, sesión y recuperación | `src/features/auth/AuthPanel.tsx`, `src/features/auth/use-auth-session.ts`, `src/features/auth/auth-session-state.ts`, `src/features/auth/auth-redirects.ts`, `src/features/auth/auth-validation.ts` |
| CRUD, métricas y programación de hábitos | `src/features/habits/HabitsPage.tsx`, `src/features/habits/habits-repository.ts`, `src/features/habits/habit-types.ts`, `src/features/habits/habit-mappers.ts`, `src/features/habits/habit-metrics.ts` |
| Formulario y validación de hábitos | `src/features/habits/HabitForm.tsx`, `src/features/habits/habit-validation.ts`, `src/features/habits/habit-dates.ts` |
| Variables públicas y Supabase | `.env.example`, `src/lib/supabase-config.ts`, `src/lib/supabase.ts` |
| PWA, manifest y caché estática | `vite.config.ts`, `public/kizen-icon.svg`, `docs/DEPLOYMENT.md` |
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
codegraph.cmd sync
codegraph.cmd impact --base HEAD --head WORKTREE
codegraph.cmd review --base HEAD --head WORKTREE
```

Antes de cambios existentes, consulta el contexto y el impacto. Tras cambios relevantes, ejecuta `review` y actualiza este índice solo cuando cambie la estructura o los puntos de entrada.
