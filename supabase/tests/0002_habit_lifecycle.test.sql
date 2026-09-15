begin;

create extension if not exists pgtap with schema extensions;
create extension if not exists pgcrypto with schema extensions;
grant usage on schema extensions to authenticated;
grant execute on all functions in schema extensions to authenticated;
set search_path = extensions, public, pg_catalog;

select plan(37);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values (
  '33333333-3333-4333-8333-333333333333',
  'authenticated',
  'authenticated',
  'lifecycle@kizen.test',
  crypt('TestPassword3', gen_salt('bf')),
  statement_timestamp(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Lifecycle User"}'::jsonb,
  statement_timestamp(),
  statement_timestamp()
);

select is(
  (select count(*) from public.profiles where id = '33333333-3333-4333-8333-333333333333'),
  1::bigint,
  'the lifecycle user receives a profile'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$select public.create_habit_with_schedule(
      'Lifecycle habit', null, 'Test',
      (statement_timestamp() at time zone 'UTC')::date,
      30, 'duration', 'minute', null,
      array[1, 2, 3, 4, 5, 6, 7]::smallint[]
    )$$,
  'an active habit is created for lifecycle tests'
);

select is(
  (select status from public.habits where name = 'Lifecycle habit'),
  'active',
  'a new habit is active'
);

select lives_ok(
  $$delete from public.habits where name = 'Lifecycle habit'$$,
  'deleting an active habit is harmless under the archived-only policy'
);

select is(
  (select count(*) from public.habits where name = 'Lifecycle habit'),
  1::bigint,
  'the database preserves an active habit from permanent deletion'
);

select lives_ok(
  $$select public.set_habit_status(
      (select id from public.habits where name = 'Lifecycle habit'),
      'paused',
      (statement_timestamp() at time zone 'UTC')::date
    )$$,
  'an active habit can be paused'
);

select is(
  (select status from public.habits where name = 'Lifecycle habit'),
  'paused',
  'pause persists the paused status'
);

select is(
  (
    select count(*)
    from public.habit_schedules as schedule
    join public.habits as habit on habit.id = schedule.habit_id
    where habit.name = 'Lifecycle habit' and schedule.effective_until is null
  ),
  0::bigint,
  'a paused habit has no open schedule'
);

select lives_ok(
  $$select public.replace_habit_schedule(
      (select id from public.habits where name = 'Lifecycle habit'),
      (statement_timestamp() at time zone 'UTC')::date,
      45, 'duration', 'minute', '18:30'::time,
      array[1, 3, 5]::smallint[]
    )$$,
  'saving a schedule reactivates a paused habit'
);

select is(
  (select status from public.habits where name = 'Lifecycle habit'),
  'active',
  'reactivation restores active status'
);

select is(
  (
    select count(*)
    from public.habit_schedules as schedule
    join public.habits as habit on habit.id = schedule.habit_id
    where habit.name = 'Lifecycle habit' and schedule.effective_until is null
  ),
  1::bigint,
  'reactivation creates one open schedule'
);

select is(
  (
    select schedule.target_amount
    from public.habit_schedules as schedule
    join public.habits as habit on habit.id = schedule.habit_id
    where habit.name = 'Lifecycle habit' and schedule.effective_until is null
  ),
  45.00::numeric,
  'reactivation stores the new target'
);

select lives_ok(
  $$select public.set_habit_status(
      (select id from public.habits where name = 'Lifecycle habit'),
      'archived',
      (statement_timestamp() at time zone 'UTC')::date
    )$$,
  'an active habit can be archived'
);

select is(
  (select status from public.habits where name = 'Lifecycle habit'),
  'archived',
  'archive persists the archived status'
);

select is(
  (
    select count(*)
    from public.habit_schedules as schedule
    join public.habits as habit on habit.id = schedule.habit_id
    where habit.name = 'Lifecycle habit' and schedule.effective_until is null
  ),
  0::bigint,
  'an archived habit has no open schedule'
);

select throws_ok(
  $$select public.replace_habit_schedule(
      (select id from public.habits where name = 'Lifecycle habit'),
      (statement_timestamp() at time zone 'UTC')::date,
      45, 'duration', 'minute', null,
      array[1]::smallint[]
    )$$,
  '22023',
  'Archived habits cannot receive a new schedule',
  'archived habits cannot be reactivated'
);

select lives_ok(
  $$delete from public.habits where name = 'Lifecycle habit'$$,
  'an owner can permanently delete an archived habit'
);

select is((select count(*) from public.habits where name = 'Lifecycle habit'), 0::bigint,
  'permanent deletion removes the habit');
select is((select count(*) from public.habit_schedules), 0::bigint,
  'permanent deletion cascades to schedules');
select is((select count(*) from public.habit_schedule_days), 0::bigint,
  'permanent deletion cascades to schedule days');

select lives_ok(
  $$select public.create_habit_with_schedule(
      'Protected today', null, null,
      (statement_timestamp() at time zone 'UTC')::date,
      10, 'count', 'repetition', null,
      array[1, 2, 3, 4, 5, 6, 7]::smallint[]
    )$$,
  'a habit is created for same-day progress protection'
);

select lives_ok(
  $$select public.set_daily_log(
      (select id from public.habits where name = 'Protected today'),
      (statement_timestamp() at time zone 'UTC')::date,
      10,
      null
    )$$,
  'today progress is recorded'
);

select lives_ok(
  $$select public.update_habit_with_schedule(
      (select id from public.habits where name = 'Protected today'),
      'Protected today renamed',
      null,
      null,
      false,
      (statement_timestamp() at time zone 'UTC')::date,
      10, 'count', 'repetition', null,
      array[1, 2, 3, 4, 5, 6, 7]::smallint[]
    )$$,
  'metadata can be updated atomically without replacing the schedule'
);

select is(
  (select count(*) from public.habits where name = 'Protected today renamed'),
  1::bigint,
  'the atomic RPC persists metadata changes'
);

select throws_ok(
  $$update public.habits
      set name = 'Direct update forbidden'
      where name = 'Protected today renamed'$$,
  '42501',
  null,
  'direct metadata updates have no column privilege'
);

select throws_ok(
  $$select public.update_habit_with_schedule(
      (select id from public.habits where name = 'Protected today renamed'),
      'Should roll back',
      null,
      null,
      true,
      (statement_timestamp() at time zone 'UTC')::date,
      15, 'count', 'repetition', null,
      array[1, 2, 3, 4, 5]::smallint[]
    )$$,
  '22023',
  'Today already has progress; apply the schedule tomorrow',
  'a failed schedule replacement aborts the complete edit'
);

select is(
  (select count(*) from public.habits where name = 'Protected today renamed'),
  1::bigint,
  'a failed complete edit preserves the previous name'
);

select throws_ok(
  $$select public.set_habit_status(
      (select id from public.habits where name = 'Protected today renamed'),
      'paused',
      (statement_timestamp() at time zone 'UTC')::date
    )$$,
  '22023',
  'Today already has progress; apply the status tomorrow',
  'a habit with today progress cannot be paused'
);

select throws_ok(
  $$select public.replace_habit_schedule(
      (select id from public.habits where name = 'Protected today renamed'),
      (statement_timestamp() at time zone 'UTC')::date,
      15, 'count', 'repetition', null,
      array[1, 2, 3, 4, 5]::smallint[]
    )$$,
  '22023',
  'Today already has progress; apply the schedule tomorrow',
  'a habit with today progress cannot replace its schedule'
);

select is(
  (select status from public.habits where name = 'Protected today renamed'),
  'active',
  'rejected changes preserve active status'
);

select is(
  (select count(*) from public.habit_logs where amount = 10),
  1::bigint,
  'rejected changes preserve the daily log'
);

select is(
  (select count(*) from public.habit_schedules where effective_until is null),
  1::bigint,
  'rejected changes preserve the open schedule'
);

select is(
  (select count(*) from public.habit_schedule_days),
  7::bigint,
  'rejected changes preserve scheduled weekdays'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.update_habit_with_schedule(uuid,text,text,text,boolean,date,numeric,text,text,time without time zone,smallint[])',
    'EXECUTE'
  ),
  'anon cannot execute the complete habit update RPC'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.update_habit_with_schedule(uuid,text,text,text,boolean,date,numeric,text,text,time without time zone,smallint[])',
    'EXECUTE'
  ),
  'authenticated can execute the complete habit update RPC'
);

select lives_ok(
  $$delete from public.habits where name = 'Protected today renamed'$$,
  'deleting an active habit with logs is harmless under the archived-only policy'
);

select is(
  (select count(*) from public.habits where name = 'Protected today renamed'),
  1::bigint,
  'the archived-only policy preserves an active habit and its logs'
);

select * from finish();
rollback;
