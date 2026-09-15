# Decisiones arquitectónicas

Las decisiones no triviales se registran como `DEC-xxx`, con fecha, motivo y consecuencias.

## DEC-001 — Arquitectura serverless para el MVP

- Fecha: 2026-09-14
- Decisión: usar React + Vite + TypeScript desplegado en Cloudflare Workers y Supabase para Auth, PostgreSQL, API y RLS.
- Motivo: cubre el MVP con bajo coste operativo y evita un backend propio prematuro.
- Consecuencias: el cliente consume Supabase con clave anónima pública; la seguridad depende de constraints y RLS correctamente diseñados. Lógica privilegiada se evaluará por separado si aparece una necesidad real.

## DEC-002 — Independencia de Gasti

- Fecha: 2026-09-14
- Decisión: Kizen tendrá repositorio, Worker, proyecto Supabase, esquema, credenciales e infraestructura propios.
- Motivo: evitar acoplamiento funcional, operativo y de seguridad con una aplicación de referencia.
- Consecuencias: Gasti puede orientar decisiones generales, pero su código, datos e infraestructura no se modifican ni se reutilizan directamente.

## DEC-003 — Persistencia de contexto en el repositorio

- Fecha: 2026-09-14
- Decisión: usar `AGENTS.md` como índice y `docs/` como fuente oficial para decisiones y estado.
- Motivo: permitir que personas y agentes entiendan el proyecto sin reconstruir el contexto desde conversaciones previas.
- Consecuencias: las implementaciones relevantes deben actualizar la documentación afectada; CodeGraph complementa, no reemplaza, estos documentos.
