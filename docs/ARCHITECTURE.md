# Arquitectura

## Estado

La implementación aún no existe. Esta es la arquitectura objetivo aprobada para el MVP y debe actualizarse al materializarse.

## Componentes

```text
GitHub
  ↓ despliegue desde la rama configurada
Cloudflare Workers (worker: kizen, previsto)
  ↓ sirve la SPA
React + Vite + TypeScript
  ↓ cliente público de Supabase con sesión del usuario
Supabase
  ├─ Auth
  ├─ PostgreSQL
  ├─ Row Level Security
  └─ API
```

El frontend consume Supabase para el MVP. No se prevé un backend Node/NestJS ni una API propia mientras Auth, PostgreSQL y RLS cubran el caso de uso. Un Worker API solo se evaluará para lógica sensible o compleja que no deba estar en el cliente.

## Principios

- Kizen usa un proyecto Supabase independiente.
- La identidad la gestiona Supabase Auth; cada recurso de usuario se relaciona con `auth.users` a través de `profiles`.
- RLS protege el acceso por propietario en PostgreSQL.
- Cloudflare solo aloja la SPA inicialmente; no debe contener secretos administrativos del cliente.
- Recordatorios, PWA, IA y gamificación quedan fuera del núcleo inicial, pero el modelo debe permitir extensiones sin acoplamiento prematuro.

## Dependencias principales previstas

React, Vite, TypeScript y `@supabase/supabase-js`. Cualquier dependencia adicional requiere una necesidad concreta y una revisión de impacto.
