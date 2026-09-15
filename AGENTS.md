# Kizen — Guía para agentes

## Propósito

Kizen es una aplicación web para desarrollar hábitos con programación, registros diarios, rachas, constancia, calendario e historial. El MVP prioriza un producto simple y seguro; no es una lista de tareas genérica.

## Contexto de trabajo

1. Lee `docs/PROJECT_STATUS.md` antes de actuar.
2. Para cambios de arquitectura, datos o seguridad, consulta además `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md` y `docs/DECISIONS.md`.
3. Revisa `git status` y, si hay cambios, `git diff` antes de modificar archivos existentes. Los cambios locales ajenos se preservan.
4. Consulta CodeGraph antes de recorrer masivamente código o modificar módulos existentes, si está configurado en el entorno. Analiza relaciones, impacto y pruebas afectadas. Si no está disponible, indícalo; no inventes resultados.
5. Ejecuta pruebas y build proporcionales al cambio, revisa el diff y actualiza la documentación cuando cambie la realidad del sistema.

## Arquitectura objetivo del MVP

`GitHub → Cloudflare Workers → React + Vite + TypeScript → Supabase (Auth, PostgreSQL, RLS, API)`.

Kizen es independiente de Gasti: nunca modificar, reutilizar tablas, credenciales, infraestructura ni crear dependencias con ese proyecto.

## Estructura esperada

- `src/`: aplicación React cuando sea creada.
- `docs/`: arquitectura, datos, decisiones, despliegue, estado y roadmap.
- `supabase/`: migraciones y configuración de Supabase cuando se introduzcan.
- `.env.example`: nombres de variables públicas requeridas; nunca secretos.

## Convenciones y seguridad

- Preferir TypeScript, componentes pequeños y diseño responsive/mobile-first.
- Usar Supabase directamente para el MVP; no añadir backend propio sin una decisión documentada.
- La autorización se implementa con Supabase Row Level Security, no con filtros del frontend.
- El frontend puede usar únicamente `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (o equivalentes públicos). Nunca exponer service-role keys, contraseñas, tokens privados ni archivos `.env` reales.
- No hacer commits ni pushes salvo solicitud explícita del usuario.
- No implementar PWA, IA, gamificación o infraestructura de recordatorios antes de que el núcleo del MVP lo justifique.

## Roles sugeridos

El coordinador decide si delegar. Arquitectura/datos/seguridad, frontend, QA y DevOps son responsabilidades separables para cambios complejos; no se duplican análisis ni se editan concurrentemente los mismos archivos.

## Documentos

- `ARCHITECTURE.md`: qué componentes existen y cómo se comunican.
- `DATA_MODEL.md`: modelo propuesto/implementado, constraints y RLS.
- `DECISIONS.md`: decisiones arquitectónicas no triviales y sus consecuencias.
- `DEPLOYMENT.md`: flujo GitHub–Cloudflare, variables y operación.
- `PROJECT_STATUS.md`: estado real de implementación.
- `ROADMAP.md`: fases y alcance futuro.
