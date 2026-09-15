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
- Pruebas pgTAP creadas para esquema, aislamiento, permisos, constraints y registro diario.

## En progreso

- Fase 3: validación local de la migración y creación/vinculación del proyecto Supabase independiente.

## Pendiente

- Terminar de crear y vincular el proyecto Supabase independiente, validar la migración local/remota y configurar las variables públicas.
- Implementar autenticación, hábitos, registros diarios, métricas, calendario e historial.
- Configurar despliegue Cloudflare y CI/CD desde GitHub.

## Riesgos y restricciones actuales

- El esquema existe como migración local, pero todavía no se ha aplicado a un proyecto Supabase remoto.
- La primera descarga de Supabase local sufrió timeouts y Docker Desktop dejó de responder; las pruebas pgTAP están creadas pero aún no tienen una ejecución completa confirmada.
- CodeGraph se ejecuta localmente como `codegraph.cmd`; la integración MCP de Codex se aplicará al recargar la sesión.
- No hay secretos, proyecto Supabase ni Worker configurados en el repositorio.
