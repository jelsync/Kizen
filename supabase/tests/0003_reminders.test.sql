begin;

create extension if not exists pgtap with schema extensions;
create extension if not exists pgcrypto with schema extensions;
grant usage on schema extensions to authenticated;
grant execute on all functions in schema extensions to authenticated;
set search_path = extensions, public, pg_catalog;

select plan(25);

select has_table('public', 'reminders', 'reminders table exists');
select has_column('public', 'reminders', 'habit_id', 'reminders links a habit');
select has_column('public', 'reminders', 'user_id', 'reminders stores its owner');
select has_column('public', 'reminders', 'channel', 'reminders has an extensible channel');
select has_column('public', 'reminders', 'minutes_before', 'reminders stores anticipation');
select has_column('public', 'reminders', 'is_enabled', 'reminders can be paused');
select has_column('public', 'reminders', 'updated_at', 'reminders track updates');
select has_index('public', 'reminders', 'reminders_habit_channel_key', 'one reminder per channel and habit');

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  (
    '44444444-4444-4444-8444-444444444444', 'authenticated', 'authenticated',
    'reminders-one@kizen.test', crypt('TestPassword4', gen_salt('bf')), statement_timestamp(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    statement_timestamp(), statement_timestamp()
  ),
  (
    '55555555-5555-4555-8555-555555555555', 'authenticated', 'authenticated',
    'reminders-two@kizen.test', crypt('TestPassword5', gen_salt('bf')), statement_timestamp(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    statement_timestamp(), statement_timestamp()
  );

set local role authenticated;
select set_config('request.jwt.claim.sub', '44444444-4444-4444-8444-444444444444', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$select public.create_habit_with_schedule(
      'Reminder habit', null, null,
      (statement_timestamp() at time zone 'UTC')::date,
      30, 'duration', 'minute', '07:00'::time,
      array[1, 2, 3, 4, 5, 6, 7]::smallint[]
    )$$,
  'the owner can create a habit for reminder tests'
);
select set_config(
  'test.reminder_habit_id',
  (select id::text from public.habits where name = 'Reminder habit'),
  true
);

select lives_ok(
  $$insert into public.reminders (habit_id, user_id, channel, minutes_before)
    values (
      current_setting('test.reminder_habit_id')::uuid,
      '44444444-4444-4444-8444-444444444444', 'browser', 10
    )$$,
  'the owner can create a browser reminder'
);
select lives_ok(
  $$select public.set_browser_reminder(
      current_setting('test.reminder_habit_id')::uuid, 15::smallint, true
    )$$,
  'the owner can atomically update a browser reminder'
);
select is(
  (select minutes_before from public.reminders),
  15::smallint,
  'the atomic RPC stores the new anticipation'
);

select is(
  (select count(*) from public.reminders),
  1::bigint,
  'the owner can read its reminder'
);

select set_config('request.jwt.claim.sub', '55555555-5555-4555-8555-555555555555', true);
select is(
  (select count(*) from public.reminders),
  0::bigint,
  'another user cannot read the reminder'
);

select throws_ok(
  $$insert into public.reminders (habit_id, user_id, channel, minutes_before)
    values (
      current_setting('test.reminder_habit_id')::uuid,
      '55555555-5555-4555-8555-555555555555', 'push', 10
    )$$,
  '23503',
  NULL,
  'another user cannot attach a reminder to the habit'
);

select set_config('request.jwt.claim.sub', '44444444-4444-4444-8444-444444444444', true);
select throws_ok(
  $$insert into public.reminders (habit_id, user_id, channel, minutes_before)
    values ((select id from public.habits where name = 'Reminder habit'),
      '44444444-4444-4444-8444-444444444444', 'browser', -1)$$,
  '23514', NULL, 'negative anticipation is rejected'
);

select throws_ok(
  $$insert into public.reminders (habit_id, user_id, channel, minutes_before)
    values ((select id from public.habits where name = 'Reminder habit'),
      '44444444-4444-4444-8444-444444444444', 'sms', 10)$$,
  '23514', NULL, 'unsupported channels are rejected'
);

select throws_ok(
  $$insert into public.reminders (habit_id, user_id, channel, minutes_before)
    values ((select id from public.habits where name = 'Reminder habit'),
      '44444444-4444-4444-8444-444444444444', 'browser', 20)$$,
  '23505', NULL, 'a habit cannot have two reminders for one channel'
);

select lives_ok(
  $$update public.reminders set minutes_before = 5, is_enabled = false
    where habit_id = (select id from public.habits where name = 'Reminder habit')$$,
  'the owner can update anticipation and enabled state'
);

select is(
  (select minutes_before from public.reminders),
  5::smallint,
  'the update changes anticipation'
);
select is(
  (select is_enabled from public.reminders),
  false,
  'the update can pause delivery'
);

select set_config('request.jwt.claim.sub', '55555555-5555-4555-8555-555555555555', true);
select lives_ok(
  $$update public.reminders set minutes_before = 60 where true$$,
  'a cross-user update does not expose an error'
);
select set_config('request.jwt.claim.sub', '44444444-4444-4444-8444-444444444444', true);
select is(
  (select minutes_before from public.reminders),
  5::smallint,
  'a cross-user update changes no row'
);

select set_config('request.jwt.claim.sub', '44444444-4444-4444-8444-444444444444', true);
select lives_ok(
  $$delete from public.reminders where habit_id = (select id from public.habits where name = 'Reminder habit')$$,
  'the owner can delete its reminder'
);
select is(
  (select count(*) from public.reminders),
  0::bigint,
  'the reminder was deleted'
);

select * from finish();
rollback;
