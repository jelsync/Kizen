begin;

create extension if not exists pgtap with schema extensions;
create extension if not exists pgcrypto with schema extensions;
grant usage on schema extensions to authenticated, anon;
grant execute on all functions in schema extensions to authenticated, anon;
set search_path = extensions, public, pg_catalog;

select plan(54);

select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'habits', 'habits table exists');
select has_table('public', 'habit_schedules', 'habit_schedules table exists');
select has_table('public', 'habit_schedule_days', 'habit_schedule_days table exists');
select has_table('public', 'habit_logs', 'habit_logs table exists');

insert into auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'authenticated',
    'authenticated',
    'owner-one@kizen.test',
    crypt('TestPassword1', gen_salt('bf')),
    statement_timestamp(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Owner One"}'::jsonb,
    statement_timestamp(),
    statement_timestamp()
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'authenticated',
    'authenticated',
    'owner-two@kizen.test',
    crypt('TestPassword2', gen_salt('bf')),
    statement_timestamp(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    statement_timestamp(),
    statement_timestamp()
  );

select is(
  (select count(*) from public.profiles),
  2::bigint,
  'Auth inserts create exactly one profile per user'
);

select throws_ok(
  $$update public.profiles
    set time_zone = 'Definitely/Not_A_Time_Zone'
    where id = '11111111-1111-4111-8111-111111111111'$$,
  '22023',
  'Invalid IANA time zone',
  'invalid IANA zones are rejected'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$select public.create_habit_with_schedule(
      'English',
      'Daily language study',
      'Learning',
      (statement_timestamp() at time zone 'UTC')::date,
      60,
      'duration',
      'minute',
      '19:00'::time,
      array[1, 2, 3, 4, 5, 6, 7]::smallint[]
    )$$,
  'an authenticated user creates a habit and schedule atomically'
);

select is(
  (select count(*) from public.habits),
  1::bigint,
  'owner can see the created habit'
);

select is(
  (select count(*) from public.habit_schedule_days),
  7::bigint,
  'the schedule contains all requested weekdays'
);

select set_config(
  'kizen.test.owner_habit_id',
  (select id::text from public.habits where name = 'English'),
  true
);

select lives_ok(
  $$select public.create_habit_with_schedule(
      'Exercise',
      null,
      'Health',
      (statement_timestamp() at time zone 'UTC')::date,
      30,
      'duration',
      'minute',
      null,
      array[1, 3, 5]::smallint[]
    )$$,
  'a second habit can be created without optional values'
);

select lives_ok(
  $$select public.replace_habit_schedule(
      (select id from public.habits where name = 'Exercise'),
      (statement_timestamp() at time zone 'UTC')::date,
      45,
      'duration',
      'minute',
      null,
      array[1, 2, 3, 4, 5]::smallint[]
    )$$,
  'a same-day schedule without history can be replaced atomically'
);

select is(
  (
    select schedule.target_amount
    from public.habit_schedules as schedule
    join public.habits as habit on habit.id = schedule.habit_id
    where habit.name = 'Exercise'
  ),
  45.00::numeric,
  'same-day replacement leaves only the corrected target'
);

select lives_ok(
  $$select public.set_habit_status(
      (select id from public.habits where name = 'Exercise'),
      'paused',
      (statement_timestamp() at time zone 'UTC')::date
    )$$,
  'a same-day habit without progress can be paused'
);

select is(
  (select status from public.habits where name = 'Exercise'),
  'paused',
  'pause updates status on its effective date'
);

select is(
  (
    select count(*)
    from public.habit_schedules as schedule
    join public.habits as habit on habit.id = schedule.habit_id
    where habit.name = 'Exercise' and schedule.effective_until is null
  ),
  0::bigint,
  'pause leaves no open schedule for that habit'
);

select lives_ok(
  $$select public.update_habit_with_schedule(
      (select id from public.habits where name = 'English'),
      'English study',
      'Daily language study',
      'Learning',
      false,
      (statement_timestamp() at time zone 'UTC')::date,
      60,
      'duration',
      'minute',
      '19:00'::time,
      array[1, 2, 3, 4, 5, 6, 7]::smallint[]
    )$$,
  'owner updates presentation fields through the atomic RPC'
);

select throws_ok(
  $$update public.habits set status = 'paused' where name = 'English study'$$,
  '42501',
  null,
  'direct status changes have no column privilege'
);

select throws_ok(
  $$update public.habit_schedules set target_amount = 30$$,
  '42501',
  null,
  'direct schedule changes are forbidden'
);

select lives_ok(
  $$select public.set_daily_log(
      (select id from public.habits where name = 'English study'),
      (statement_timestamp() at time zone 'UTC')::date,
      70,
      'First entry'
    )$$,
  'owner records progress through the hardened RPC'
);

select is(
  (select count(*) from public.habit_logs),
  1::bigint,
  'one daily log exists after the first write'
);

select lives_ok(
  $$select public.set_daily_log(
      (select id from public.habits where name = 'English study'),
      (statement_timestamp() at time zone 'UTC')::date,
      75,
      'Corrected total'
    )$$,
  'repeating a date performs an idempotent upsert'
);

select is(
  (select amount from public.habit_logs),
  75.00::numeric,
  'the upsert stores the latest absolute total'
);

select throws_ok(
  $$select public.set_daily_log(
      (select id from public.habits where name = 'English study'),
      ((statement_timestamp() at time zone 'UTC')::date + 1),
      10,
      null
    )$$,
  '22023',
  'Future habit logs are not allowed',
  'future progress is rejected'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (select count(*) from public.habits),
  0::bigint,
  'RLS hides another user habits'
);

select is(
  (select count(*) from public.profiles),
  1::bigint,
  'RLS exposes only the current user profile'
);

select is(
  (select count(*) from public.habit_schedules),
  0::bigint,
  'RLS hides another user schedules'
);

select is(
  (select count(*) from public.habit_schedule_days),
  0::bigint,
  'RLS hides another user schedule days'
);

select is(
  (select count(*) from public.habit_logs),
  0::bigint,
  'RLS hides another user logs'
);

select throws_ok(
  $$select public.set_daily_log(
      current_setting('kizen.test.owner_habit_id')::uuid,
      (statement_timestamp() at time zone 'UTC')::date,
      10,
      null
    )$$,
  '42501',
  'Habit not found or not owned by current user',
  'RPC rejects a habit not owned by the caller'
);

select throws_ok(
  $$select public.replace_habit_schedule(
      current_setting('kizen.test.owner_habit_id')::uuid,
      (statement_timestamp() at time zone 'UTC')::date,
      30,
      'duration',
      'minute',
      null,
      array[1]::smallint[]
    )$$,
  '42501',
  'Habit not found or not owned by current user',
  'schedule replacement rejects a cross-owner habit'
);

select throws_ok(
  $$select public.set_habit_status(
      current_setting('kizen.test.owner_habit_id')::uuid,
      'paused',
      (statement_timestamp() at time zone 'UTC')::date
    )$$,
  '42501',
  'Habit not found or not owned by current user',
  'status changes reject a cross-owner habit'
);

select throws_ok(
  $$select public.create_habit_with_schedule(
      '   ', null, null,
      (statement_timestamp() at time zone 'UTC')::date,
      10, 'count', 'page', null, array[1]::smallint[]
    )$$,
  '22023',
  'Habit name is required',
  'empty habit names are rejected'
);

select throws_ok(
  $$select public.create_habit_with_schedule(
      'Invalid target', null, null,
      (statement_timestamp() at time zone 'UTC')::date,
      0, 'count', 'page', null, array[1]::smallint[]
    )$$,
  '22023',
  'Target amount must be positive',
  'non-positive targets are rejected'
);

select throws_ok(
  $$select public.create_habit_with_schedule(
      'Invalid weekdays', null, null,
      (statement_timestamp() at time zone 'UTC')::date,
      1, 'count', 'page', null, array[1, 1]::smallint[]
    )$$,
  '22023',
  'Weekdays must be unique ISO values from 1 to 7',
  'duplicate weekdays are rejected'
);

select lives_ok(
  $$delete from public.habits
    where id in (
      select id from public.habits where user_id = '11111111-1111-4111-8111-111111111111'
    )$$,
  'cross-owner delete is harmless under RLS'
);

reset role;

select is(
  (select count(*) from public.habits),
  2::bigint,
  'cross-owner delete removed no rows'
);

select throws_ok(
  $$insert into public.habit_schedules (
      habit_id,
      user_id,
      effective_from,
      target_amount,
      measurement_type,
      unit
    )
    select
      id,
      user_id,
      (statement_timestamp() at time zone 'UTC')::date,
      30,
      'duration',
      'minute'
    from public.habits
    where name = 'English study'$$,
  '23P01',
  null,
  'overlapping schedule ranges are rejected'
);

select is(
  (
    select count(*)
    from pg_catalog.pg_class
    where oid in (
      'public.profiles'::regclass,
      'public.habits'::regclass,
      'public.habit_schedules'::regclass,
      'public.habit_schedule_days'::regclass,
      'public.habit_logs'::regclass,
      'public.reminders'::regclass
    )
      and relrowsecurity
  ),
  6::bigint,
  'RLS is enabled on every public Kizen table'
);

select is(
  (select count(*) from pg_catalog.pg_policies where schemaname = 'public'),
  12::bigint,
  'the expected operation-specific RLS policies exist'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.create_habit_with_schedule(text,text,text,date,numeric,text,text,time without time zone,smallint[])',
    'EXECUTE'
  ),
  'anon cannot execute habit creation RPC'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.create_habit_with_schedule(text,text,text,date,numeric,text,text,time without time zone,smallint[])',
    'EXECUTE'
  ),
  'authenticated can execute habit creation RPC'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.replace_habit_schedule(uuid,date,numeric,text,text,time without time zone,smallint[])',
    'EXECUTE'
  ),
  'anon cannot execute schedule replacement RPC'
);

select ok(
  not has_function_privilege('anon', 'public.set_habit_status(uuid,text,date)', 'EXECUTE'),
  'anon cannot execute status RPC'
);

select ok(
  not has_function_privilege('anon', 'public.set_daily_log(uuid,date,numeric,text)', 'EXECUTE'),
  'anon cannot execute daily log RPC'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.replace_habit_schedule(uuid,date,numeric,text,text,time without time zone,smallint[])',
    'EXECUTE'
  ),
  'authenticated can execute schedule replacement RPC'
);

select ok(
  has_function_privilege('authenticated', 'public.set_habit_status(uuid,text,date)', 'EXECUTE'),
  'authenticated can execute status RPC'
);

select ok(
  has_function_privilege('authenticated', 'public.set_daily_log(uuid,date,numeric,text)', 'EXECUTE'),
  'authenticated can execute daily log RPC'
);

select ok(
  not has_table_privilege('anon', 'public.profiles', 'SELECT'),
  'anon has no profile table privilege'
);

select ok(
  not has_table_privilege('anon', 'public.habits', 'SELECT'),
  'anon has no habits table privilege'
);

select ok(
  not has_table_privilege('anon', 'public.habit_schedules', 'SELECT'),
  'anon has no schedules table privilege'
);

select ok(
  not has_table_privilege('anon', 'public.habit_schedule_days', 'SELECT'),
  'anon has no schedule days table privilege'
);

select ok(
  not has_table_privilege('anon', 'public.habit_logs', 'SELECT'),
  'anon has no logs table privilege'
);

set local role anon;
select throws_ok(
  $$select count(*) from public.profiles$$,
  '42501',
  null,
  'anon cannot read Kizen profiles'
);
reset role;

select * from finish();
rollback;
