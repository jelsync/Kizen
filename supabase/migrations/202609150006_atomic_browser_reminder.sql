-- Keep reminder creation/update atomic when two tabs save the same preference.

create function public.set_browser_reminder(
  p_habit_id uuid,
  p_minutes_before smallint,
  p_is_enabled boolean
)
returns public.reminders
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  saved_reminder public.reminders;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  if p_minutes_before is null or p_minutes_before not between 0 and 1440 then
    raise exception using errcode = '22023', message = 'Reminder anticipation must be between 0 and 1440 minutes';
  end if;

  perform 1
  from public.habits
  where id = p_habit_id and user_id = current_user_id
  for share;

  if not found then
    raise exception using errcode = '42501', message = 'Habit not found or not owned by current user';
  end if;

  insert into public.reminders (
    habit_id, user_id, channel, minutes_before, is_enabled
  )
  values (
    p_habit_id, current_user_id, 'browser', p_minutes_before, coalesce(p_is_enabled, false)
  )
  on conflict (habit_id, channel) do update
    set minutes_before = excluded.minutes_before,
        is_enabled = excluded.is_enabled
  returning * into saved_reminder;

  return saved_reminder;
end;
$$;

revoke all on function public.set_browser_reminder(uuid, smallint, boolean) from public, anon;
grant execute on function public.set_browser_reminder(uuid, smallint, boolean) to authenticated;
