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

## En progreso

- Fase 5: pendiente validar el flujo completo desde la interfaz con una sesión real contra Supabase remoto.

## Pendiente

- Tras validar la Fase 5, implementar registro diario, métricas, calendario e historial.
- Configurar despliegue Cloudflare y CI/CD desde GitHub.

## Riesgos y restricciones actuales

- Los callbacks locales de Auth están configurados y validados. Al desplegar habrá que agregar la URL definitiva de Cloudflare antes de probarlos en producción.
- CodeGraph se ejecuta localmente como `codegraph.cmd`; la integración MCP de Codex se aplicará al recargar la sesión.
- No hay secretos versionados. El proyecto Supabase remoto existe, pero el Worker de Cloudflare aún no está configurado.
