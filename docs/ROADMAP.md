# Roadmap

## Fase 0 — Contexto para agentes

Documentación persistente, inspección de repositorio y disponibilidad de CodeGraph.

## Fase 1 — Arquitectura y datos

Validar modelo de datos, constraints, RLS, alcance del MVP y decisiones necesarias antes de implementar.

## Fase 2 — Base del proyecto

Crear React + Vite + TypeScript, estructura inicial, variables de entorno de ejemplo y cliente Supabase.

## Fase 3 — Supabase

Crear proyecto independiente, migraciones, RLS, policies y base de Auth.

## Fase 4 — Autenticación

Registro, inicio/cierre de sesión y recuperación de contraseña.

## Fase 5 — Hábitos

CRUD, activación/desactivación, metas y programación.

## Fase 6 — Registro diario ✅

Registro de cantidad, completado y historial. La interfaz registra el total diario
mediante `set_daily_log`, respeta la fecha local del perfil y muestra el estado y
los últimos registros de cada hábito.

## Fase 7 — Métricas ✅

Rachas, constancia y estadísticas derivadas de las programaciones versionadas y
`habit_logs`, sin contadores persistidos. La interfaz muestra racha actual y
mejor racha, constancia y progreso de los últimos 30 días, además de totales
históricos.

## Fase 8 — Calendario ✅

Visualización mensual de días completados, incumplidos, programados,
no programados y hoy, derivada de las versiones de programación y
`habit_logs` sin almacenar estados adicionales.

## Fase 9 — Recordatorios

Preferencias y evaluación gradual de canales de notificación.

## Fase 10 — PWA

Evaluar instalabilidad y notificaciones una vez estable el núcleo web.

## Fase 11 — IA y gamificación

Evaluar interpretación de texto, recomendaciones, XP, niveles y logros sin incluirlos en el MVP inicial.
