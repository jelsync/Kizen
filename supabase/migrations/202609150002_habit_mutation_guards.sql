create function public.update_habit_with_schedule(
  p_habit_id uuid,
  p_name text,
  p_description text,
  p_category text,
  p_replace_schedule boolean,
  p_effective_from date,
  p_target_amount numeric,
  p_measurement_type text,
  p_unit text,
  p_scheduled_time time without time zone,
  p_iso_weekdays smallint[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_status text;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
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
    raise exception using errcode = '22023', message = 'Archived habits cannot be edited';
  end if;

  if p_name is null or btrim(p_name) = '' then
    raise exception using errcode = '22023', message = 'Habit name is required';
  end if;

  if coalesce(p_replace_schedule, false) then
    perform public.replace_habit_schedule(
      p_habit_id,
      p_effective_from,
      p_target_amount,
      p_measurement_type,
      p_unit,
      p_scheduled_time,
      p_iso_weekdays
    );
  end if;

  update public.habits
  set name = btrim(p_name),
      description = nullif(btrim(p_description), ''),
      category = nullif(btrim(p_category), '')
  where id = p_habit_id and user_id = current_user_id;
end;
$$;

revoke all on function public.update_habit_with_schedule(
  uuid, text, text, text, boolean, date, numeric, text, text, time without time zone, smallint[]
) from public, anon;
grant execute on function public.update_habit_with_schedule(
  uuid, text, text, text, boolean, date, numeric, text, text, time without time zone, smallint[]
) to authenticated;

revoke update (name, description, category) on public.habits from authenticated;
drop policy if exists habits_update_own on public.habits;

drop policy if exists habits_delete_own on public.habits;
create policy habits_delete_archived_own
on public.habits for delete to authenticated
using (
  user_id = (select auth.uid())
  and status = 'archived'
);
