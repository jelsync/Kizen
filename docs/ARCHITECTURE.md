# Arquitectura

## Estado

La base frontend existe: React + Vite + TypeScript y un cliente Supabase centralizado. El esquema PostgreSQL, Auth, RLS y RPC están aplicados en el proyecto Supabase independiente. Autenticación está validada y el módulo de gestión de hábitos está implementado; el despliegue aún no está configurado.

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

React, Vite, TypeScript, `@supabase/supabase-js`, Oxlint y Vitest. Cualquier dependencia adicional requiere una necesidad concreta y una revisión de impacto.

## Flujo de dominio del MVP

El frontend usa el cliente público de Supabase con la sesión autenticada. Las operaciones simples consultan tablas protegidas por RLS. Las operaciones que deben ser atómicas —crear hábito con programación, cambiar estado o programación y registrar progreso— usan funciones PostgreSQL RPC pequeñas dentro de Supabase; esto no introduce un backend independiente.

La programación semanal tendrá versiones con vigencia por fechas. Los registros diarios referencian la versión aplicable, por lo que editar días, meta, unidad u hora no cambia el historial. Rachas y constancia se calculan desde esas versiones y los logs; no se almacenan contadores derivados durante el MVP.

## Flujo de autenticación

El navegador usa únicamente la URL y clave pública de Supabase. Registro, inicio y cierre de sesión se realizan con `supabase.auth`; la sesión persistida y sus cambios se observan mediante `onAuthStateChange`. El registro envía `display_name` como metadata y el trigger PostgreSQL crea `profiles`.

La recuperación envía al usuario de vuelta al origen de Kizen. El evento `PASSWORD_RECOVERY` habilita el formulario para establecer la nueva contraseña con la sesión temporal entregada por Supabase. No se almacenan tokens manualmente ni se usa `service_role` en el navegador.

Las fechas de negocio son días civiles en la zona IANA del perfil. Los timestamps técnicos se almacenan como `timestamptz`. Esta separación mantiene estable el calendario histórico ante cambios de zona horaria.

## Base frontend actual

- `src/main.tsx` inicia React en modo estricto.
- `src/App.tsx` separa los flujos públicos de Auth del workspace autenticado.
- `src/features/auth/` contiene registro, sesión y recuperación.
- `src/features/habits/` contiene listado, formulario, estados, validación, mapeo y acceso a Supabase para la Fase 5.
- Las lecturas de hábitos traen sus versiones y días protegidos por RLS. El frontend deriva la versión abierta y la última versión histórica para edición o reactivación.
- Crear y editar detalles/programación usa una sola RPC por operación para que cada guardado sea atómico. Pausar, archivar y reactivar también pasan por RPC; el borrado directo queda limitado por RLS a hábitos ya archivados.
- Las mutaciones recargan el estado confirmado desde Supabase; no se usa actualización optimista en el MVP.
- El workspace carga los logs diarios propios junto con cada hábito. El registro y la
  actualización del total usan la RPC `set_daily_log`, que conserva la semántica
  idempotente y la validación de fecha/programación en PostgreSQL. La tarjeta muestra
  el estado de hoy y hasta siete registros históricos con la meta de su programación.
- Las métricas se calculan en el frontend a partir de todas las versiones de
  programación y sus `habit_logs`: las rachas recorren ocurrencias esperadas,
  las pausas no agregan días y el día actual pendiente no rompe la racha. La tarjeta
  muestra racha actual, mejor racha, constancia y progreso del periodo móvil de
  30 días, junto con el total histórico. No se almacenan contadores derivados.
- Cada tarjeta muestra un calendario mensual derivado de las mismas versiones y
  logs. Los días civiles se generan con UTC únicamente como representación
  estable de una fecha (`YYYY-MM-DD`); la fecha de hoy se obtiene previamente
  desde la zona IANA del perfil. No se persisten estados de calendario.
- `src/lib/supabase-config.ts` valida las dos variables públicas necesarias.
- `src/lib/supabase.ts` crea el cliente solo al solicitarlo, de modo que la pantalla base no falla antes de configurar Supabase.
- `.env.example` solo declara `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`; `.env*` está ignorado excepto el ejemplo.
