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

## DEC-004 — Programación semanal versionada

- Fecha: 2026-09-14
- Decisión: el MVP modela recurrencia semanal mediante versiones de `habit_schedules` y días ISO asociados. Los rangos de vigencia son inclusivos al inicio y exclusivos al final, sin solapamientos por hábito.
- Motivo: editar días, meta, unidad u hora no debe recalcular retroactivamente calendario, rachas o constancia.
- Consecuencias: crear y cambiar programaciones requiere operaciones transaccionales. Reglas mensuales, intervalos y RRULE quedan fuera del MVP.

## DEC-005 — Fechas locales y zona horaria IANA

- Fecha: 2026-09-14
- Decisión: guardar la zona IANA en el perfil, fechas de actividad como `date` local, horas planificadas como `time` y auditoría como `timestamptz`.
- Motivo: los hábitos pertenecen a días civiles del usuario; convertir retrospectivamente cada log desde UTC produciría resultados inestables al viajar o cambiar de zona.
- Consecuencias: cambiar la zona afecta el cálculo de “hoy” futuro, pero nunca mueve logs históricos. Se requieren pruebas de medianoche y DST.

## DEC-006 — Métricas derivadas desde programación y logs

- Fecha: 2026-09-14
- Decisión: rachas, constancia y totales se calculan desde programaciones históricas y registros diarios; no se guardan contadores en el MVP.
- Motivo: evitar estados duplicados e inconsistentes mientras el volumen permite cálculo dinámico.
- Consecuencias: los incumplimientos son implícitos y las consultas generan fechas esperadas. Solo se materializarán métricas si mediciones reales lo justifican.

## DEC-007 — Un agregado diario por hábito

- Fecha: 2026-09-14
- Decisión: `habit_logs` almacena un total por hábito y fecha local con `UNIQUE (habit_id, log_date)`.
- Motivo: cubre completar y actualizar el progreso diario con una operación idempotente sencilla.
- Consecuencias: “sesiones” significa días con actividad durante el MVP. Múltiples eventos intradía exigirían una entidad futura `habit_log_entries`.

## DEC-008 — Propiedad explícita y RLS directa

- Fecha: 2026-09-14
- Decisión: las tablas privadas incluyen `user_id`; las hijas usan FK compuestas para asegurar que propietario, hábito y programación coincidan. RLS compara directamente con `(select auth.uid())`.
- Motivo: simplifica las políticas, evita asociaciones cruzadas y mantiene eficientes los filtros de autorización.
- Consecuencias: `user_id` se repite intencionalmente y su consistencia queda impuesta por claves foráneas, no por confianza en el cliente.

## DEC-009 — Unidades y concurrencia del progreso

- Fecha: 2026-09-14
- Decisión: las duraciones se almacenan canónicamente en minutos; otros valores se agregan solo por hábito y unidad exacta. El registro diario recibe un total absoluto idempotente y aplica última transacción confirmada.
- Motivo: evitar sumas ambiguas entre textos de unidad y evitar que un doble envío se interprete accidentalmente como incremento.
- Consecuencias: la UI convierte minutos para presentación. Una futura acción incremental requerirá una RPC atómica específica.
