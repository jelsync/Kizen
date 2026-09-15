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

## DEC-010 — Cliente Supabase diferido y variables públicas

- Fecha: 2026-09-15
- Decisión: centralizar la lectura de `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en un módulo validable, y crear el cliente Supabase solo cuando un flujo lo requiera.
- Motivo: conservar una pantalla base funcional antes de que exista el proyecto Supabase y evitar dispersar la configuración o exponer secretos.
- Consecuencias: las funcionalidades que consulten datos deben usar `getSupabaseClient()`. Las únicas variables admitidas en frontend son públicas y `.env.local` nunca se versiona.

## DEC-011 — Migraciones versionadas, exposición explícita y escrituras atómicas

- Fecha: 2026-09-15
- Decisión: administrar PostgreSQL mediante migraciones de Supabase versionadas, desactivar la exposición automática de tablas y conceder privilegios explícitos. Las operaciones que deben mantener varias invariantes se realizan con RPC `SECURITY DEFINER` endurecidas.
- Motivo: RLS filtra filas, pero no garantiza por sí sola que hábito, programación, estado y logs cambien atómicamente ni limita automáticamente los privilegios del Data API.
- Consecuencias: el frontend no inserta ni actualiza directamente hábitos o logs ni modifica estados o programaciones. Las RPC obtienen el propietario desde `auth.uid()`, usan `search_path = ''`, verifican propiedad y se conceden solo a `authenticated`.

## DEC-012 — Cambios de programación efectivos en el día actual

- Fecha: 2026-09-15
- Decisión: crear, reemplazar, pausar, archivar o reactivar se aplica en la fecha local actual. Si hoy ya tiene progreso, la operación se rechaza y el usuario debe repetirla al día siguiente; no se almacenan cambios de estado futuros en el MVP.
- Motivo: evita que `habits.status` diga una cosa mientras la vigencia de la programación todavía dice otra.
- Consecuencias: una versión creada hoy sin logs puede sustituirse o retirarse de forma atómica porque aún no tiene historia. Una versión con historia se cierra y nunca se reescribe.

## DEC-013 — Sesión y recuperación administradas por Supabase Auth

- Fecha: 2026-09-15
- Decisión: usar las APIs cliente de Supabase Auth y `onAuthStateChange` para sesión, confirmación y recuperación; no crear un almacén propio de tokens ni un backend de autenticación.
- Motivo: Supabase ya resuelve persistencia, renovación y callbacks para el MVP, mientras RLS aplica la autorización en PostgreSQL.
- Consecuencias: las URL de desarrollo y producción deben estar permitidas en Supabase Auth. `PASSWORD_RECOVERY` abre un formulario específico y actualiza la contraseña mediante la sesión temporal del usuario.

## DEC-014 — Fecha de hábitos basada en la zona del perfil

- Fecha: 2026-09-15
- Decisión: las mutaciones de hábitos calculan el día civil con `profiles.time_zone`. Mientras no exista una pantalla de preferencias, un perfil que conserva el valor inicial `UTC` adopta una vez la zona IANA detectada por el navegador.
- Motivo: las RPC validan “hoy” en PostgreSQL y `toISOString()` puede representar otro día cerca de medianoche. El perfil debe ser la fuente de verdad compartida para programación y calendario.
- Consecuencias: el frontend consulta el perfil antes de cargar el workspace y usa `Intl.DateTimeFormat` con esa zona. Una futura pantalla de preferencias deberá permitir seleccionar la zona explícitamente y evitar sobrescribir decisiones del usuario.

## DEC-015 — Archivado como eliminación normal

- Fecha: 2026-09-15
- Decisión: la acción normal de retirar un hábito lo archiva mediante `set_habit_status`; el borrado físico aparece solo en la vista de archivados y exige confirmación explícita.
- Motivo: conservar el historial es el comportamiento seguro y esperado para métricas futuras, mientras el usuario mantiene una vía clara para eliminar sus datos definitivamente.
- Consecuencias: un hábito archivado no se reactiva. El borrado permanente usa el `DELETE` protegido por RLS y aplica las cascadas definidas en PostgreSQL.

## DEC-016 — Edición completa de hábitos en una transacción

- Fecha: 2026-09-15
- Decisión: editar detalles y, opcionalmente, reemplazar la programación se realiza mediante `update_habit_with_schedule`. Se revoca la actualización directa de columnas de `habits` al cliente.
- Motivo: dos solicitudes independientes podían confirmar la programación y fallar después al guardar los detalles, dejando un éxito parcial presentado como error.
- Consecuencias: la RPC bloquea y verifica el hábito, rechaza archivados, llama internamente al reemplazo endurecido cuando corresponde y actualiza los detalles dentro de la misma transacción. Cualquier error revierte el guardado completo.
