-- Kizen MVP data model, ownership constraints, RLS and transactional write APIs.

create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users (id) on update restrict on delete cascade,
  display_name varchar(80),
  time_zone text not null default 'UTC',
  week_starts_on smallint not null default 1,
  locale varchar(16) not null default 'es',
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint profiles_display_name_check
    check (display_name is null or btrim(display_name) <> ''),
  constraint profiles_time_zone_length_check
    check (char_length(time_zone) between 1 and 255),
  constraint profiles_week_starts_on_check
    check (week_starts_on between 1 and 7),
  constraint profiles_locale_check
    check (btrim(locale) <> '')
);

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on update restrict on delete cascade,
  name varchar(120) not null,
  description varchar(1000),
  category varchar(60),
  status text not null default 'active',
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint habits_owner_key unique (id, user_id),
  constraint habits_name_check check (btrim(name) <> ''),
  constraint habits_description_check
    check (description is null or btrim(description) <> ''),
  constraint habits_category_check
    check (category is null or btrim(category) <> ''),
  constraint habits_status_check
    check (status in ('active', 'paused', 'archived'))
);

create table public.habit_schedules (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null,
  user_id uuid not null,
  effective_from date not null,
  effective_until date,
  target_amount numeric(12, 2) not null,
  measurement_type text not null,
  unit varchar(32) not null,
  scheduled_time time without time zone,
  created_at timestamptz not null default statement_timestamp(),
  valid_during daterange generated always as (
    daterange(effective_from, effective_until, '[)')
  ) stored,
  constraint habit_schedules_owner_fk
    foreign key (habit_id, user_id)
    references public.habits (id, user_id)
    on update restrict on delete cascade,
  constraint habit_schedules_identity_key unique (id, habit_id, user_id),
  constraint habit_schedules_dates_check
    check (effective_until is null or effective_until > effective_from),
  constraint habit_schedules_target_check check (target_amount > 0),
  constraint habit_schedules_measurement_check
    check (measurement_type in ('duration', 'count', 'custom')),
  constraint habit_schedules_unit_check check (btrim(unit) <> ''),
  constraint habit_schedules_duration_unit_check
    check (measurement_type <> 'duration' or unit = 'minute'),
  constraint habit_schedules_no_overlap
    exclude using gist (habit_id with =, valid_during with &&)
    deferrable initially immediate
);

create table public.habit_schedule_days (
  schedule_id uuid not null,
  habit_id uuid not null,
  user_id uuid not null,
  iso_weekday smallint not null,
  constraint habit_schedule_days_pk primary key (schedule_id, iso_weekday),
  constraint habit_schedule_days_schedule_fk
    foreign key (schedule_id, habit_id, user_id)
    references public.habit_schedules (id, habit_id, user_id)
    on update restrict on delete cascade,
  constraint habit_schedule_days_weekday_check
    check (iso_weekday between 1 and 7)
);

create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null,
  schedule_id uuid not null,
  user_id uuid not null,
  log_date date not null,
  amount numeric(12, 2) not null default 0,
  note varchar(1000),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint habit_logs_daily_key unique (habit_id, log_date),
  constraint habit_logs_amount_check check (amount >= 0),
  constraint habit_logs_note_check check (note is null or btrim(note) <> ''),
  constraint habit_logs_habit_owner_fk
    foreign key (habit_id, user_id)
    references public.habits (id, user_id)
    on update restrict on delete cascade,
  constraint habit_logs_schedule_fk
    foreign key (schedule_id, habit_id, user_id)
    references public.habit_schedules (id, habit_id, user_id)
    on update restrict on delete no action
    deferrable initially deferred
);

create index habits_owner_status_idx
  on public.habits (user_id, status);
create index habit_schedules_owner_history_idx
  on public.habit_schedules (user_id, habit_id, effective_from desc);
create index habit_schedule_days_owner_schedule_idx
  on public.habit_schedule_days (user_id, schedule_id);
create index habit_logs_owner_date_idx
  on public.habit_logs (user_id, log_date desc);

create function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := statement_timestamp();
  return new;
end;
$$;

create function private.validate_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.display_name := nullif(btrim(new.display_name), '');
  new.locale := btrim(new.locale);

  if not exists (
    select 1
    from pg_catalog.pg_timezone_names as zone
    where zone.name = new.time_zone
  ) then
    raise exception using
      errcode = '22023',
      message = 'Invalid IANA time zone';
  end if;

  return new;
end;
$$;

create function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(
      btrim(left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 80)),
      ''
    )
  );

  return new;
end;
$$;

create function private.assert_schedule_has_days()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  checked_schedule_id uuid;
begin
  if tg_table_name = 'habit_schedules' then
    checked_schedule_id := coalesce(new.id, old.id);
  else
    checked_schedule_id := coalesce(new.schedule_id, old.schedule_id);
  end if;

  if exists (
    select 1 from public.habit_schedules where id = checked_schedule_id
  ) and not exists (
    select 1 from public.habit_schedule_days where schedule_id = checked_schedule_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'A habit schedule must contain at least one weekday';
  end if;

  if tg_op = 'UPDATE'
    and tg_table_name = 'habit_schedule_days'
    and old.schedule_id <> new.schedule_id
    and exists (
      select 1 from public.habit_schedules where id = old.schedule_id
    )
    and not exists (
      select 1 from public.habit_schedule_days where schedule_id = old.schedule_id
    )
  then
    raise exception using
      errcode = '23514',
      message = 'A habit schedule must contain at least one weekday';
  end if;

  return null;
end;
$$;

create function private.validate_habit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_time_zone text;
  local_today date;
begin
  if tg_op = 'UPDATE' and (
    new.habit_id <> old.habit_id
    or new.schedule_id <> old.schedule_id
    or new.user_id <> old.user_id
    or new.log_date <> old.log_date
  ) then
    raise exception using
      errcode = '22023',
      message = 'Habit log identity fields are immutable';
  end if;

  new.note := nullif(btrim(new.note), '');

  if tg_op = 'INSERT' then
    select time_zone
    into profile_time_zone
    from public.profiles
    where id = new.user_id;

    if profile_time_zone is null then
      raise exception using
        errcode = '23503',
        message = 'Habit log owner profile does not exist';
    end if;

    local_today := (statement_timestamp() at time zone profile_time_zone)::date;

    if new.log_date > local_today then
      raise exception using
        errcode = '22023',
        message = 'Future habit logs are not allowed';
    end if;

    if not exists (
      select 1
      from public.habit_schedules as schedule
      join public.habit_schedule_days as schedule_day
        on schedule_day.schedule_id = schedule.id
       and schedule_day.habit_id = schedule.habit_id
       and schedule_day.user_id = schedule.user_id
      where schedule.id = new.schedule_id
        and schedule.habit_id = new.habit_id
        and schedule.user_id = new.user_id
        and schedule.effective_from <= new.log_date
        and (
          schedule.effective_until is null
          or new.log_date < schedule.effective_until
        )
        and schedule_day.iso_weekday = extract(isodow from new.log_date)::smallint
    ) then
      raise exception using
        errcode = '23514',
        message = 'Habit log date is not scheduled for this habit';
    end if;
  end if;

  return new;
end;
$$;

create trigger profiles_validate
before insert or update on public.profiles
for each row execute function private.validate_profile();

create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function private.touch_updated_at();

create trigger habits_touch_updated_at
before update on public.habits
for each row execute function private.touch_updated_at();

create trigger habit_logs_validate
before insert or update on public.habit_logs
for each row execute function private.validate_habit_log();

create trigger habit_logs_touch_updated_at
before update on public.habit_logs
for each row execute function private.touch_updated_at();

create constraint trigger habit_schedules_require_days
after insert or update on public.habit_schedules
deferrable initially deferred
for each row execute function private.assert_schedule_has_days();

create constraint trigger habit_schedule_days_preserve_one
after insert or update or delete on public.habit_schedule_days
deferrable initially deferred
for each row execute function private.assert_schedule_has_days();

create trigger kizen_on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_auth_user();

create function private.normalized_schedule_unit(
  target_amount numeric,
  measurement_type text,
  unit text,
  iso_weekdays smallint[]
)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  normalized_measurement_type text := lower(btrim(measurement_type));
  normalized_unit text := lower(btrim(unit));
begin
  if target_amount is null or target_amount <= 0 then
    raise exception using errcode = '22023', message = 'Target amount must be positive';
  end if;

  if normalized_measurement_type is null
    or normalized_measurement_type not in ('duration', 'count', 'custom')
  then
    raise exception using errcode = '22023', message = 'Invalid measurement type';
  end if;

  if normalized_unit is null or normalized_unit = '' then
    raise exception using errcode = '22023', message = 'Unit is required';
  end if;

  if normalized_measurement_type = 'duration' and normalized_unit <> 'minute' then
    raise exception using errcode = '22023', message = 'Duration must use minute as its unit';
  end if;

  if coalesce(cardinality(iso_weekdays), 0) = 0
    or exists (
      select 1
      from pg_catalog.unnest(iso_weekdays) as weekday(day_number)
      where weekday.day_number is null or weekday.day_number not between 1 and 7
    )
    or (
      select count(distinct weekday.day_number)
      from pg_catalog.unnest(iso_weekdays) as weekday(day_number)
    ) <> cardinality(iso_weekdays)
  then
    raise exception using errcode = '22023', message = 'Weekdays must be unique ISO values from 1 to 7';
  end if;

  return normalized_unit;
end;
$$;

create function public.create_habit_with_schedule(
  p_name text,
  p_description text,
  p_category text,
  p_effective_from date,
  p_target_amount numeric,
  p_measurement_type text,
  p_unit text,
  p_scheduled_time time without time zone,
  p_iso_weekdays smallint[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  profile_time_zone text;
  local_today date;
  normalized_unit text;
  new_habit_id uuid;
  new_schedule_id uuid;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  select time_zone
  into profile_time_zone
  from public.profiles
  where id = current_user_id
  for share;

  if profile_time_zone is null then
    raise exception using errcode = '23503', message = 'Profile does not exist';
  end if;

  if p_name is null or btrim(p_name) = '' then
    raise exception using errcode = '22023', message = 'Habit name is required';
  end if;

  local_today := (statement_timestamp() at time zone profile_time_zone)::date;
  if p_effective_from is null or p_effective_from <> local_today then
    raise exception using errcode = '22023', message = 'A new habit must start today';
  end if;

  normalized_unit := private.normalized_schedule_unit(
    p_target_amount,
    p_measurement_type,
    p_unit,
    p_iso_weekdays
  );

  insert into public.habits (user_id, name, description, category)
  values (
    current_user_id,
    btrim(p_name),
    nullif(btrim(p_description), ''),
    nullif(btrim(p_category), '')
  )
  returning id into new_habit_id;

  insert into public.habit_schedules (
    habit_id,
    user_id,
    effective_from,
    target_amount,
    measurement_type,
    unit,
    scheduled_time
  )
  values (
    new_habit_id,
    current_user_id,
    p_effective_from,
    p_target_amount,
    lower(btrim(p_measurement_type)),
    normalized_unit,
    p_scheduled_time
  )
  returning id into new_schedule_id;

  insert into public.habit_schedule_days (schedule_id, habit_id, user_id, iso_weekday)
  select new_schedule_id, new_habit_id, current_user_id, weekday.day_number
  from pg_catalog.unnest(p_iso_weekdays) as weekday(day_number);

  return new_habit_id;
end;
$$;

create function public.replace_habit_schedule(
  p_habit_id uuid,
  p_effective_from date,
  p_target_amount numeric,
  p_measurement_type text,
  p_unit text,
  p_scheduled_time time without time zone,
  p_iso_weekdays smallint[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  profile_time_zone text;
  local_today date;
  habit_status text;
  current_schedule_id uuid;
  current_effective_from date;
  normalized_unit text;
  new_schedule_id uuid;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  select time_zone
  into profile_time_zone
  from public.profiles
  where id = current_user_id
  for share;

  if profile_time_zone is null then
    raise exception using errcode = '23503', message = 'Profile does not exist';
  end if;

  select status
  into habit_status
  from public.habits
  where id = p_habit_id and user_id = current_user_id
  for update;

  if habit_status is null then
    raise exception using errcode = '42501', message = 'Habit not found or not owned by current user';
  end if;

  if habit_status = 'archived' then
    raise exception using errcode = '22023', message = 'Archived habits cannot receive a new schedule';
  end if;

  local_today := (statement_timestamp() at time zone profile_time_zone)::date;
  if p_effective_from is null or p_effective_from <> local_today then
    raise exception using errcode = '22023', message = 'Schedule changes must start today';
  end if;

  normalized_unit := private.normalized_schedule_unit(
    p_target_amount,
    p_measurement_type,
    p_unit,
    p_iso_weekdays
  );

  if exists (
    select 1
    from public.habit_schedules
    where habit_id = p_habit_id and effective_from > local_today
  ) then
    raise exception using errcode = '22023', message = 'A future schedule already exists for this habit';
  end if;

  if exists (
    select 1
    from public.habit_logs
    where habit_id = p_habit_id and log_date = local_today
  ) then
    raise exception using errcode = '22023', message = 'Today already has progress; apply the schedule tomorrow';
  end if;

  select id, effective_from
  into current_schedule_id, current_effective_from
  from public.habit_schedules
  where habit_id = p_habit_id and effective_until is null
  order by effective_from desc
  limit 1
  for update;

  if current_schedule_id is not null then
    if current_effective_from = local_today then
      delete from public.habit_schedules where id = current_schedule_id;
    else
      update public.habit_schedules
      set effective_until = local_today
      where id = current_schedule_id;
    end if;
  elsif habit_status = 'active' then
    raise exception using errcode = '23514', message = 'Active habit has no current schedule';
  end if;

  insert into public.habit_schedules (
    habit_id,
    user_id,
    effective_from,
    target_amount,
    measurement_type,
    unit,
    scheduled_time
  )
  values (
    p_habit_id,
    current_user_id,
    p_effective_from,
    p_target_amount,
    lower(btrim(p_measurement_type)),
    normalized_unit,
    p_scheduled_time
  )
  returning id into new_schedule_id;

  insert into public.habit_schedule_days (schedule_id, habit_id, user_id, iso_weekday)
  select new_schedule_id, p_habit_id, current_user_id, weekday.day_number
  from pg_catalog.unnest(p_iso_weekdays) as weekday(day_number);

  if habit_status = 'paused' then
    update public.habits set status = 'active' where id = p_habit_id;
  end if;

  return new_schedule_id;
end;
$$;

create function public.set_habit_status(
  p_habit_id uuid,
  p_status text,
  p_effective_on date
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  profile_time_zone text;
  local_today date;
  current_status text;
  current_schedule_id uuid;
  current_effective_from date;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  if p_status is null or p_status not in ('paused', 'archived') then
    raise exception using errcode = '22023', message = 'Status must be paused or archived';
  end if;

  select time_zone
  into profile_time_zone
  from public.profiles
  where id = current_user_id
  for share;

  if profile_time_zone is null then
    raise exception using errcode = '23503', message = 'Profile does not exist';
  end if;

  select status
  into current_status
  from public.habits
  where id = p_habit_id and user_id = current_user_id
  for update;

  if current_status is null then
    raise exception using errcode = '42501', message = 'Habit not found or not owned by current user';
  end if;

  if current_status = 'archived' then
    raise exception using errcode = '22023', message = 'Archived habit status cannot be changed';
  end if;

  local_today := (statement_timestamp() at time zone profile_time_zone)::date;
  if p_effective_on is null or p_effective_on <> local_today then
    raise exception using errcode = '22023', message = 'Status changes must take effect today';
  end if;

  if exists (
    select 1
    from public.habit_logs
    where habit_id = p_habit_id and log_date = local_today
  ) then
    raise exception using errcode = '22023', message = 'Today already has progress; apply the status tomorrow';
  end if;

  select id, effective_from
  into current_schedule_id, current_effective_from
  from public.habit_schedules
  where habit_id = p_habit_id and effective_until is null
  order by effective_from desc
  limit 1
  for update;

  if current_schedule_id is not null then
    if current_effective_from = local_today then
      delete from public.habit_schedules where id = current_schedule_id;
    else
      update public.habit_schedules
      set effective_until = local_today
      where id = current_schedule_id;
    end if;
  elsif current_status = 'active' then
    raise exception using errcode = '23514', message = 'Active habit has no current schedule';
  end if;

  update public.habits set status = p_status where id = p_habit_id;
end;
$$;

create function public.set_daily_log(
  p_habit_id uuid,
  p_log_date date,
  p_amount numeric,
  p_note text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  profile_time_zone text;
  local_today date;
  matching_schedule_id uuid;
  saved_log_id uuid;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  if p_log_date is null or p_amount is null or p_amount < 0 then
    raise exception using errcode = '22023', message = 'Log date and a non-negative amount are required';
  end if;

  select time_zone
  into profile_time_zone
  from public.profiles
  where id = current_user_id
  for share;

  if profile_time_zone is null then
    raise exception using errcode = '23503', message = 'Profile does not exist';
  end if;

  perform 1
  from public.habits
  where id = p_habit_id and user_id = current_user_id
  for update;

  if not found then
    raise exception using errcode = '42501', message = 'Habit not found or not owned by current user';
  end if;

  local_today := (statement_timestamp() at time zone profile_time_zone)::date;
  if p_log_date > local_today then
    raise exception using errcode = '22023', message = 'Future habit logs are not allowed';
  end if;

  select schedule.id
  into matching_schedule_id
  from public.habit_schedules as schedule
  join public.habit_schedule_days as schedule_day
    on schedule_day.schedule_id = schedule.id
   and schedule_day.habit_id = schedule.habit_id
   and schedule_day.user_id = schedule.user_id
  where schedule.habit_id = p_habit_id
    and schedule.user_id = current_user_id
    and schedule.effective_from <= p_log_date
    and (schedule.effective_until is null or p_log_date < schedule.effective_until)
    and schedule_day.iso_weekday = extract(isodow from p_log_date)::smallint
  limit 1;

  if matching_schedule_id is null then
    raise exception using errcode = '23514', message = 'Habit is not scheduled for this date';
  end if;

  insert into public.habit_logs (
    habit_id,
    schedule_id,
    user_id,
    log_date,
    amount,
    note
  )
  values (
    p_habit_id,
    matching_schedule_id,
    current_user_id,
    p_log_date,
    p_amount,
    nullif(btrim(p_note), '')
  )
  on conflict (habit_id, log_date) do update
    set amount = excluded.amount,
        note = excluded.note
  returning id into saved_log_id;

  return saved_log_id;
end;
$$;

alter table public.profiles enable row level security;
alter table public.habits enable row level security;
alter table public.habit_schedules enable row level security;
alter table public.habit_schedule_days enable row level security;
alter table public.habit_logs enable row level security;

create policy profiles_select_own
on public.profiles for select to authenticated
using (id = (select auth.uid()));

create policy profiles_update_own
on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy habits_select_own
on public.habits for select to authenticated
using (user_id = (select auth.uid()));

create policy habits_update_own
on public.habits for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy habits_delete_own
on public.habits for delete to authenticated
using (user_id = (select auth.uid()));

create policy habit_schedules_select_own
on public.habit_schedules for select to authenticated
using (user_id = (select auth.uid()));

create policy habit_schedule_days_select_own
on public.habit_schedule_days for select to authenticated
using (user_id = (select auth.uid()));

create policy habit_logs_select_own
on public.habit_logs for select to authenticated
using (user_id = (select auth.uid()));

create policy habit_logs_delete_own
on public.habit_logs for delete to authenticated
using (user_id = (select auth.uid()));

revoke all on table
  public.profiles,
  public.habits,
  public.habit_schedules,
  public.habit_schedule_days,
  public.habit_logs
from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (display_name, time_zone, week_starts_on, locale)
  on public.profiles to authenticated;

grant select, delete on public.habits to authenticated;
grant update (name, description, category)
  on public.habits to authenticated;

grant select on public.habit_schedules to authenticated;
grant select on public.habit_schedule_days to authenticated;

grant select, delete on public.habit_logs to authenticated;

revoke all on function private.touch_updated_at() from public, anon, authenticated;
revoke all on function private.validate_profile() from public, anon, authenticated;
revoke all on function private.handle_new_auth_user() from public, anon, authenticated;
revoke all on function private.assert_schedule_has_days() from public, anon, authenticated;
revoke all on function private.validate_habit_log() from public, anon, authenticated;
revoke all on function private.normalized_schedule_unit(numeric, text, text, smallint[])
  from public, anon, authenticated;

revoke all on function public.create_habit_with_schedule(
  text, text, text, date, numeric, text, text, time without time zone, smallint[]
) from public, anon;
grant execute on function public.create_habit_with_schedule(
  text, text, text, date, numeric, text, text, time without time zone, smallint[]
) to authenticated;

revoke all on function public.replace_habit_schedule(
  uuid, date, numeric, text, text, time without time zone, smallint[]
) from public, anon;
grant execute on function public.replace_habit_schedule(
  uuid, date, numeric, text, text, time without time zone, smallint[]
) to authenticated;

revoke all on function public.set_habit_status(uuid, text, date) from public, anon;
grant execute on function public.set_habit_status(uuid, text, date) to authenticated;

revoke all on function public.set_daily_log(uuid, date, numeric, text) from public, anon;
grant execute on function public.set_daily_log(uuid, date, numeric, text) to authenticated;
