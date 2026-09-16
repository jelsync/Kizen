-- Phase 9: persisted reminder preferences. Delivery remains client-side for now.

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null,
  user_id uuid not null,
  channel text not null default 'browser',
  minutes_before smallint not null default 10,
  is_enabled boolean not null default true,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint reminders_owner_fk
    foreign key (habit_id, user_id)
    references public.habits (id, user_id)
    on update restrict on delete cascade,
  constraint reminders_channel_check
    check (channel in ('browser', 'push', 'email')),
  constraint reminders_minutes_before_check
    check (minutes_before between 0 and 1440),
  constraint reminders_habit_channel_key unique (habit_id, channel)
);

create index reminders_owner_enabled_idx
  on public.reminders (user_id, is_enabled);

create trigger reminders_touch_updated_at
before update on public.reminders
for each row execute function private.touch_updated_at();

alter table public.reminders enable row level security;

create policy reminders_select_own
on public.reminders for select to authenticated
using (user_id = (select auth.uid()));

create policy reminders_insert_own
on public.reminders for insert to authenticated
with check (user_id = (select auth.uid()));

create policy reminders_update_own
on public.reminders for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy reminders_delete_own
on public.reminders for delete to authenticated
using (user_id = (select auth.uid()));

revoke all on table public.reminders from anon, authenticated;
grant select on public.reminders to authenticated;
grant insert (habit_id, user_id, channel, minutes_before, is_enabled)
  on public.reminders to authenticated;
grant update (channel, minutes_before, is_enabled)
  on public.reminders to authenticated;
grant delete on public.reminders to authenticated;
