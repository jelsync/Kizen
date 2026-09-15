create or replace function private.assert_schedule_has_days()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  checked_schedule_id uuid;
begin
  if tg_table_name = 'habit_schedules' then
    if tg_op = 'INSERT' then
      checked_schedule_id := new.id;
    else
      checked_schedule_id := old.id;
    end if;
  elsif tg_op = 'INSERT' then
    checked_schedule_id := new.schedule_id;
  elsif tg_op = 'DELETE' then
    checked_schedule_id := old.schedule_id;
  else
    checked_schedule_id := new.schedule_id;
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

  if tg_table_name = 'habit_schedule_days' and tg_op = 'UPDATE' then
    if old.schedule_id <> new.schedule_id
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
  end if;

  return null;
end;
$$;
