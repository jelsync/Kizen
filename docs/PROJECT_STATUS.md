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
- Base de autenticación web verificada con TypeScript, lint, build y 13 pruebas de frontend.

## En progreso

- Fase 4: interfaz de registro, inicio/cierre de sesión y recuperación implementada; falta configurar las URL y política de contraseña remotas y validar el flujo real de correo.

## Pendiente

- Terminar autenticación y después implementar hábitos, registros diarios, métricas, calendario e historial.
- Configurar despliegue Cloudflare y CI/CD desde GitHub.

## Riesgos y restricciones actuales

- Los callbacks de confirmación y recuperación de Auth requieren configurar las URL permitidas del entorno local y, posteriormente, de Cloudflare.
- CodeGraph se ejecuta localmente como `codegraph.cmd`; la integración MCP de Codex se aplicará al recargar la sesión.
- No hay secretos versionados. El proyecto Supabase remoto existe, pero el Worker de Cloudflare aún no está configurado.
