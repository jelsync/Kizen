# Modelo de datos

## Estado

No hay base de datos ni migraciones implementadas. Este documento describe el punto de partida a validar antes de ejecutar SQL.

## Entidades propuestas

| Entidad | Propósito | Relación principal |
| --- | --- | --- |
| `profiles` | Datos de aplicación de cada cuenta. | PK/FK `id` → `auth.users.id`. |
| `habits` | Definición, meta y estado de un hábito. | `user_id` → `profiles.id`. |
| `habit_schedules` | Días/frecuencia programados. | `habit_id` → `habits.id`. |
| `habit_logs` | Registro diario de progreso. | `habit_id` → `habits.id`; propietario derivado del hábito. |
| `reminders` | Preferencias de recordatorio futuras. | `habit_id` → `habits.id`. |

## Dirección de diseño

- `habits` debe contener nombre, descripción opcional, categoría opcional, unidad, meta numérica positiva, hora opcional, estado y timestamps.
- `habit_schedules` debe modelar los días aplicables de un hábito sin duplicados por día/hábito.
- `habit_logs` debe guardar una fecha local de actividad, cantidad realizada, estado/resultados y timestamps. La regla inicial es un único registro diario por hábito: `UNIQUE (habit_id, log_date)`.
- Las rachas, totales y porcentajes se derivarán inicialmente de logs y programación; no se desnormalizarán sin justificar rendimiento o necesidades de producto.
- Se definirán `CHECK` constraints para cantidades no negativas, metas positivas, valores enumerados válidos y coherencia de frecuencia.

## Seguridad requerida

Todas las tablas de aplicación tendrán RLS habilitado. Las políticas permitirán `SELECT`, `INSERT`, `UPDATE` y `DELETE` solo a la cuenta autenticada propietaria. Las escrituras deberán validar la propiedad con `auth.uid()`; el frontend nunca empleará una service-role key.

Antes de implementar el esquema, concretar tipos SQL, semántica de frecuencia, zona horaria y las políticas exactas en una decisión y migración revisable.
