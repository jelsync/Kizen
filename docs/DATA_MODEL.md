# Modelo de datos

## Estado y alcance

Implementado mediante las migraciones versionadas en `supabase/migrations/`, aplicadas al proyecto Supabase remoto de Kizen y validadas con 91 pruebas pgTAP. Las pruebas incluyen el ciclo crear–pausar–reactivar–archivar–eliminar, atomicidad de edición y el rechazo de cambios de programación después de registrar progreso diario.

El MVP usa recurrencia semanal. “Todos los días” son los siete días de la semana; no se implementan todavía intervalos, reglas mensuales ni RRULE. Los nombres físicos definitivos se conservarán en inglés y `snake_case`.

## Relaciones

```text
auth.users
  └─ profiles
      └─ habits
          ├─ habit_schedules
          │   └─ habit_schedule_days
          └─ habit_logs

reminders (planificado para una fase posterior)
  └─ habits
```

`habits` conserva la identidad y presentación del hábito. Meta, unidad, hora y días pertenecen a una versión de programación para que sus cambios no reescriban el historial.

## `profiles`

Configuración de aplicación asociada uno a uno con Supabase Auth.

| Campo | Tipo propuesto | Reglas |
| --- | --- | --- |
| `id` | `uuid` | PK y FK a `auth.users(id) ON DELETE CASCADE`. |
| `display_name` | `varchar(80)` | Opcional; vacío se normaliza a `NULL`. |
| `time_zone` | `text` | No nula; IANA válida; el navegador la propone y `UTC` es fallback. |
| `week_starts_on` | `smallint` | No nulo, default `1`; `CHECK` entre 1 y 7, convención ISO. |
| `locale` | `varchar(16)` | No nulo, default `es`; preferencia de presentación. |
| `created_at` | `timestamptz` | No nulo, default `now()`. |
| `updated_at` | `timestamptz` | No nulo, default `now()`; trigger controlado. |

Un trigger `AFTER INSERT` sobre `auth.users` crea el perfil. La función será `SECURITY DEFINER`, con `search_path = ''`, referencias calificadas y privilegios mínimos. Un fallo debe probarse porque bloquearía el registro del usuario.

## `habits`

Identidad estable y estado de ciclo de vida.

| Campo | Tipo propuesto | Reglas |
| --- | --- | --- |
| `id` | `uuid` | PK, default `gen_random_uuid()`. |
| `user_id` | `uuid` | No nulo; FK a `profiles(id) ON DELETE CASCADE`. |
| `name` | `varchar(120)` | No nulo; `btrim(name) <> ''`. |
| `description` | `varchar(1000)` | Opcional. |
| `category` | `varchar(60)` | Opcional; texto en el MVP. |
| `status` | `text` | No nulo, default `active`; `CHECK` en `active`, `paused`, `archived`. |
| `created_at` | `timestamptz` | No nulo, default `now()`. |
| `updated_at` | `timestamptz` | No nulo, default `now()`; trigger controlado. |

Además de la PK se declara `UNIQUE (id, user_id)`. Esta clave permite que tablas hijas validen con una FK compuesta que el hábito y el propietario coinciden.

Pausar o archivar cierra la programación vigente y conserva el historial. En el MVP el cambio surte efecto hoy si todavía no hay log; si ya existe progreso, debe ejecutarse al comenzar el siguiente día local. Archivar es la acción normal de “eliminar” de la vista activa. El borrado permanente será explícito, con confirmación, y eliminará por cascada programaciones, días, logs y recordatorios.

## `habit_schedules`

Versiones inmutables de la programación de un hábito.

| Campo | Tipo propuesto | Reglas |
| --- | --- | --- |
| `id` | `uuid` | PK, default `gen_random_uuid()`. |
| `habit_id` | `uuid` | No nulo; parte de FK compuesta a `habits(id, user_id) ON DELETE CASCADE`. |
| `user_id` | `uuid` | No nulo; propietario explícito para RLS. |
| `effective_from` | `date` | No nulo; inicio inclusivo en fecha local. |
| `effective_until` | `date` | Fin exclusivo; `NULL` significa vigente. |
| `target_amount` | `numeric(12,2)` | No nulo; `CHECK (target_amount > 0)`. |
| `measurement_type` | `text` | No nulo; `CHECK` en `duration`, `count`, `custom`. |
| `unit` | `varchar(32)` | No nula ni vacía; canónica según las reglas inferiores. |
| `scheduled_time` | `time without time zone` | Opcional; se interpreta en `profiles.time_zone`. |
| `created_at` | `timestamptz` | No nulo, default `now()`. |

Reglas:

- `effective_until IS NULL OR effective_until > effective_from`.
- No existen rangos de vigencia solapados para un mismo hábito. La migración lo impondrá con exclusión sobre un `daterange [)` o una solución transaccional equivalente.
- `UNIQUE (id, habit_id, user_id)` permite que un log referencie exactamente la versión y propiedad correctas.
- Una versión que ya entró en vigor no se edita. Cambiar días, meta, unidad u hora cierra la versión y crea otra.
- Crear un hábito, su primera programación y sus días debe ser una operación PostgreSQL atómica expuesta como RPC pequeña.
- En el MVP un hábito nuevo comienza en la fecha local de creación; no se programan altas futuras.
- Un constraint trigger diferible garantiza que cada versión tenga al menos un día antes del commit.
- `authenticated` solo lee directamente programaciones y días. Crear, cerrar o reemplazar versiones pasa por RPC `SECURITY DEFINER` endurecidas: `search_path = ''`, nombres calificados, ejecución revocada a `public`/`anon`, concedida a `authenticated`, verificación explícita de `auth.uid()` y bloqueo del hábito. Las RPC nunca editan ni borran una versión histórica; solo cierran la vigente y crean otra. La única eliminación histórica es la cascada de un hábito borrado explícitamente.

Los cambios se aplican en el día local actual y solo si no existe un log de hoy. Si la versión actual también comenzó hoy y todavía no tiene historial, puede reemplazarse de forma atómica; después de entrar en el historial nunca se edita ni elimina. No se mantienen cambios pendientes con fecha futura en el MVP.

## `habit_schedule_days`

Días seleccionados dentro de una versión.

| Campo | Tipo propuesto | Reglas |
| --- | --- | --- |
| `schedule_id` | `uuid` | No nulo; parte de PK/FK hacia la programación. |
| `habit_id` | `uuid` | No nulo; conservado para FK compuesta y consultas. |
| `user_id` | `uuid` | No nulo; propietario explícito para RLS. |
| `iso_weekday` | `smallint` | No nulo; `CHECK` entre 1 (lunes) y 7 (domingo). |

PK propuesta: `(schedule_id, iso_weekday)`. La FK compuesta `(schedule_id, habit_id, user_id)` impide asociar días a otra programación o usuario. Toda programación debe tener al menos un día; esta regla se valida dentro de la operación transaccional de creación/edición.

## `habit_logs`

Agregado total de progreso de un hábito en un día civil del usuario.

| Campo | Tipo propuesto | Reglas |
| --- | --- | --- |
| `id` | `uuid` | PK, default `gen_random_uuid()`. |
| `habit_id` | `uuid` | No nulo; parte de FK compuesta a `habits(id, user_id) ON DELETE CASCADE`. |
| `schedule_id` | `uuid` | No nulo; versión histórica aplicable y FK compuesta a `habit_schedules`. |
| `user_id` | `uuid` | No nulo; propietario explícito para RLS. |
| `log_date` | `date` | No nula; fecha civil en la zona del perfil, no timestamp. |
| `amount` | `numeric(12,2)` | No nulo, default `0`; `CHECK (amount >= 0)`. |
| `note` | `varchar(1000)` | Opcional. |
| `created_at` | `timestamptz` | No nulo, default `now()`. |
| `updated_at` | `timestamptz` | No nulo, default `now()`; trigger controlado. |

`UNIQUE (habit_id, log_date)` garantiza un único agregado diario y hace determinista el `upsert`. La versión referenciada aporta meta, unidad y hora históricas. “Completado” se deriva de `amount >= habit_schedules.target_amount`; no se almacena como valor editable.

El MVP permite logs solo para fechas programadas, desde el inicio de la primera programación hasta hoy local. No permite fechas futuras. Un trigger valida la versión, el día ISO y el “hoy” calculado con `profiles.time_zone`; la API no depende únicamente del frontend. La zona IANA del perfil también se valida en base de datos contra las zonas disponibles en PostgreSQL.

El formulario envía el total absoluto del día. El `upsert` usa semántica de última transacción confirmada y repetir el mismo valor es idempotente; no se interpreta como incremento. Si más adelante se añade “+5”, será una RPC atómica separada y no una lectura seguida de escritura desde el cliente.

En el MVP, “sesiones” significa días registrados con `amount > 0`. Si después se necesitan múltiples eventos dentro de un día se agregará `habit_log_entries`; no se incluye ahora.

## `reminders` — diseño diferido

No se creará en las migraciones iniciales. En la Fase 9 se validará una entidad con `id`, `habit_id`, `user_id`, `channel`, `minutes_before`, `is_enabled` y timestamps. La hora objetivo provendrá de la programación vigente y se interpretará en la zona IANA del perfil. No se implementan aún colas, push, email ni workers programados.

## Índices iniciales

- `habits (user_id, status)`.
- `habit_schedules (user_id, habit_id, effective_from DESC)`.
- Restricción/índice para impedir vigencias solapadas por hábito.
- `habit_schedule_days (user_id, schedule_id)` además de su PK.
- `habit_logs (user_id, log_date DESC)`.
- `habit_logs (habit_id, log_date)` queda cubierto por su `UNIQUE`.

Se indexa toda columna que encabeza filtros de RLS y las consultas principales. No se añadirán índices especulativos adicionales antes de observar consultas reales.

## Row Level Security y privilegios

Todas las tablas en `public` tendrán RLS habilitado. Primero se revocan privilegios de `anon` y `authenticated`; después se conceden a `authenticated` solo las operaciones requeridas. `anon` no recibe acceso a datos de Kizen.

Se crean políticas separadas por cada operación concedida:

| Tabla | Acceso directo de `authenticated` | Expresión de propiedad |
| --- | --- | --- |
| `profiles` | SELECT y UPDATE. | `id = (select auth.uid())` en `USING` y `WITH CHECK`. |
| `habits` | SELECT y DELETE únicamente cuando el hábito propio ya está archivado. Crear, editar detalles/programación y cambiar estado usa RPC. | SELECT usa `user_id = (select auth.uid())`; DELETE exige además `status = 'archived'`. |
| `habit_schedules` | Solo SELECT. | `user_id = (select auth.uid())` en `USING`; mutaciones sin grant ni policy directa. |
| `habit_schedule_days` | Solo SELECT. | `user_id = (select auth.uid())` en `USING`; mutaciones sin grant ni policy directa. |
| `habit_logs` | SELECT y DELETE. Crear o reemplazar el total diario usa RPC. | `user_id = (select auth.uid())` en `USING`. |

Las FK compuestas complementan RLS: aunque un usuario falsifique `user_id`, no puede enlazar una fila hija a un hábito o programación ajenos. Una actualización tampoco puede reasignar recursos a otro usuario.

El cliente tendrá SELECT/UPDATE de su perfil. Su INSERT lo realiza el trigger de alta y la eliminación completa de cuenta requerirá un flujo privilegiado posterior; borrar solo `profiles` dejaría una cuenta Auth incoherente. La creación atómica usa `create_habit_with_schedule`; la edición completa usa `update_habit_with_schedule`; el reemplazo o reactivación interno usa `replace_habit_schedule`; pausar o archivar usa `set_habit_status`; y el progreso usa `set_daily_log`. Estas RPC calculan el propietario con `auth.uid()`, bloquean las filas relevantes y no aceptan un `user_id` del cliente. `habit_schedules` y `habit_schedule_days` conceden SELECT directo, pero ninguna mutación directa.

Cualquier vista expuesta usará comportamiento `security_invoker` o una alternativa que preserve RLS. No se usarán service-role keys en el frontend.

## Semántica de fechas y métricas

- Zona: identificador IANA del perfil; un offset fijo no es válido.
- Fecha de negocio: `date` local. Cambiar de zona no mueve logs históricos.
- Auditoría: `timestamptz` en UTC.
- Día esperado: fecha dentro de `[effective_from, effective_until)` cuyo ISO weekday está seleccionado.
- Día completado: día esperado con log cuyo total alcanza la meta de su versión.
- Día incumplido: día esperado anterior a hoy sin cumplimiento.
- Constancia: `días esperados completados / días esperados transcurridos`. Si el denominador es cero, el resultado es “sin datos”, no 0 %.
- La constancia semanal usa `week_starts_on`; la mensual usa el mes calendario local; la histórica empieza con la primera programación y excluye pausas y futuro.
- Para constancia, hoy entra como día transcurrido. El dashboard mostrará por separado el progreso de hoy.
- Una racha recorre ocurrencias programadas consecutivas, no días calendario. Días no programados no la rompen. Hoy pendiente no rompe la racha hasta que finaliza el día local.
- Mejor racha y total completado se derivan; no se almacenan contadores.
- La interfaz calcula un resumen móvil de 30 días (días esperados,
  completados, registrados, incumplidos, constancia y progreso parcial) y un
  resumen histórico con las mismas ocurrencias. El progreso parcial se pondera
  por `amount / target_amount`, limitado a 100 % por ocurrencia, para no sumar
  unidades incompatibles entre versiones.
- Para `measurement_type = duration`, la cantidad se almacena siempre en minutos y `unit = 'minute'`; la UI puede mostrar horas. `count` y `custom` se agregan solo dentro del mismo hábito/unidad exacta. Unidades incompatibles nunca se suman entre hábitos.

Los días incumplidos son implícitos: se generan fechas esperadas y se cruzan con logs. No se crean filas vacías por cada ausencia.

## Pruebas requeridas para la migración

- Dos usuarios no pueden leer ni mutar datos cruzados en ninguna operación.
- Un usuario no puede enlazar hijos con un hábito o programación ajenos.
- Alta Auth crea exactamente un perfil; un fallo del trigger es detectable.
- Nombre vacío, meta no positiva, cantidad negativa, weekday inválido y vigencias solapadas fallan.
- Envíos simultáneos producen un único log diario.
- Cambiar días/meta/unidad no modifica resultados históricos.
- Pausar y reactivar preserva intervalos y métricas.
- Fechas futuras y fuera de programación se rechazan.
- Zona IANA inválida y `NULL` en todo campo obligatorio se rechazan.
- UPDATE/DELETE directos de programaciones o días, especialmente históricos, se rechazan.
- Dos escrituras idénticas concurrentes dejan una fila con el total enviado; escrituras diferentes siguen la política de última transacción confirmada. Cualquier incremento futuro se prueba como operación atómica.
- Se cubren domingo/lunes, cambio de mes/año, año bisiesto, DST y cambio de zona.
- Cada tabla tiene pruebas allow/deny separadas para SELECT, INSERT, UPDATE y DELETE, además del rol `anon`.
