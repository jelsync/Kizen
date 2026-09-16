# Estado del proyecto

Última actualización: 2026-09-15

## Completado

- Repositorio Git inicializado y remoto `jelsync/Kizen` configurado.
- Base de contexto para agentes en `AGENTS.md` y `docs/`.
- Arquitectura objetivo del MVP y principios de independencia de Gasti documentados.
- Fase 1: modelo lógico, programación versionada, semántica temporal, métricas, constraints y estrategia RLS definidos.
- Fase 2: base React + Vite + TypeScript, configuración pública de Supabase, prueba inicial y comandos de calidad creados.
- CodeGraph instalado para Codex, inicializado en Kizen y documentado en `CODEGRAPH.md`.
- Supabase CLI inicializado localmente con exposición automática de tablas desactivada.
- Migración inicial creada con tablas, constraints, trigger de perfiles, RLS, privilegios mínimos y RPC transaccionales.
- Fase 3 completada: proyecto Supabase Kizen enlazado, migración inicial aplicada local y remotamente, y 54 pruebas pgTAP aprobadas.
- Variables públicas locales configuradas para el proyecto Supabase correcto.
- Fase 4 completada: registro, confirmación de correo, inicio/cierre de sesión y recuperación de contraseña implementados y validados contra Supabase remoto.
- Base de autenticación web verificada con TypeScript, lint, build, 13 pruebas automatizadas y una prueba funcional completa con correo real.
- Fase 5 implementada: listado, creación, edición, pausa, reactivación, archivado y borrado permanente de hábitos con programación semanal.
- Ciclo de vida, atomicidad y restricciones destructivas de hábitos validados localmente con 91 pruebas pgTAP; frontend cubierto por 27 pruebas automatizadas.
- Migración de edición atómica y borrado restringido aplicada al proyecto Supabase remoto; no quedan migraciones pendientes.
- Corrección del trigger de días de programación aplicada al proyecto Supabase remoto; la creación de hábitos ya no evalúa `OLD` durante un `INSERT`.
- Corrección adicional aplicada para evitar referencias a `OLD.schedule_id` en triggers de otra tabla.
- Fase 6 implementada: registro diario idempotente desde la interfaz, estado de hoy y
  historial reciente por hábito. La UI usa la zona horaria del perfil y la RPC
  `set_daily_log`; no fue necesaria una migración adicional.
- Fase 7 implementada: métricas derivadas de programaciones versionadas y logs,
  incluyendo racha actual, mejor racha, constancia, progreso del periodo móvil de
  30 días y totales históricos. Las pausas, el día actual pendiente y los cambios
  de meta respetan la semántica de fechas y versiones; no se guardan contadores
  derivados.
- Fase 8 implementada: calendario mensual por hábito con navegación, leyenda
  accesible y estados derivados de las versiones de programación y `habit_logs`
  (completado, incumplido, programado, no programado y hoy). La cuadrícula usa
  fechas civiles y no depende de la zona horaria del navegador.
- Fase 9 implementada: preferencias de recordatorio por hábito con canal
  `browser`, RLS, anticipación configurable y notificaciones del navegador
  evaluadas en la zona horaria del perfil. Las migraciones `202609150005` y
  `202609150006` fueron aplicadas al Supabase remoto de Kizen.
- Fase 10 implementada: manifest, icono, instalación y service worker generado
  durante el build para precachear los assets de la interfaz, sin cachear datos
  privados de Supabase.

## En progreso

- Fase 5: pendiente validar el flujo completo desde la interfaz con una sesión real contra Supabase remoto.
- Fase 6: pendiente validar el flujo completo de registro y actualización de progreso con una sesión real.
- Fase 9: pendiente validar con una sesión real el permiso del navegador y la
  entrega puntual de un recordatorio.
- Fase 10: pendiente validar instalación y recarga offline desde el despliegue
  HTTPS de Cloudflare en un dispositivo real.

## Pendiente

- Validar desde la interfaz el flujo completo de las Fases 5, 6, 7, 8 y 9 con
  una sesión real contra Supabase remoto.
- Mantener documentado el despliegue Cloudflare y CI/CD que ya fue realizado.

## Riesgos y restricciones actuales

- Los callbacks locales de Auth están configurados y validados. Al desplegar habrá que agregar la URL definitiva de Cloudflare antes de probarlos en producción.
- CodeGraph se ejecuta localmente como `codegraph.cmd`; la integración MCP de Codex se aplicará al recargar la sesión.
- No hay secretos versionados. El proyecto Supabase remoto existe y el usuario ya desplegó la aplicación en Cloudflare; falta consolidar la URL exacta si cambia.
