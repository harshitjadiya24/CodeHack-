-- Running Baanto at a real college: sharing with partner campuses as a choice, planned maintenance, feedback
-- after a return, a private calendar feed per person, and a weekly nudge about equipment nobody is using.

-- 1. Partner campuses see a resource only when its owner allows it. Everything listed so far stays shared.
alter table public.resources add column open_to_partners boolean not null default true;

-- 2. Planned downtime. Requests that overlap a window are refused; people already booked are told.
create table public.maintenance_windows (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text not null check (length(reason) between 5 and 300),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index maintenance_windows_resource on public.maintenance_windows (resource_id, ends_at);
alter table public.maintenance_windows enable row level security;
create policy "read maintenance" on public.maintenance_windows for select to authenticated using (true);

-- 3. One rating per booking, by the person who borrowed.
create table public.booking_feedback (
  booking_id uuid primary key references public.bookings (id) on delete cascade,
  resource_id uuid not null references public.resources (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  rating int not null check (rating between 1 and 5),
  comment text check (length(comment) <= 500),
  created_at timestamptz not null default now()
);
create index booking_feedback_resource on public.booking_feedback (resource_id, created_at desc);
alter table public.booking_feedback enable row level security;
-- Ratings are public inside Baanto; who gave them is not, so the page reads them through the server.
create policy "read own feedback" on public.booking_feedback for select to authenticated using (user_id = auth.uid());

-- 4. Calendar feeds. The token is the only key a calendar app has, so it lives apart from profiles
--    (which colleagues can read) and only the server reads it.
create table public.calendar_feeds (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now()
);
alter table public.calendar_feeds enable row level security;

-- 5. Every Monday morning: tell owners which of their resources were used for under 10% of open hours in the
--    last four weeks, and each admin office how many there were. Resources listed in the last fortnight are skipped.
create or replace function public.weekly_nudges() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  r record;
  v_owners int := 0;
  v_admins int := 0;
begin
  for r in
    select res.id, res.name, res.owner_id, res.org_id,
      coalesce(sum(extract(epoch from (b.ends_at - b.starts_at)) / 3600), 0) as hours
    from resources res
    left join bookings b on b.resource_id = res.id
      and b.status in ('checked_in', 'overdue', 'returned', 'closed')
      and b.starts_at >= now() - interval '28 days'
    where res.status = 'active' and res.created_at < now() - interval '14 days'
    group by res.id
    having coalesce(sum(extract(epoch from (b.ends_at - b.starts_at)) / 3600), 0) < 18
  loop
    if not exists (
      select 1 from notifications n
      where n.user_id = r.owner_id and n.kind = 'nudge.idle' and n.link = '/owner/resources/' || r.id || '/edit'
        and n.created_at > now() - interval '6 days'
    ) then
      insert into notifications (user_id, kind, title, body, link)
      values (r.owner_id, 'nudge.idle', 'Mostly idle: ' || r.name,
        'Used ' || round(r.hours) || ' of 180 open hours in the last four weeks. Turning on instant approval or opening it to partner campuses usually helps.',
        '/owner/resources/' || r.id || '/edit');
      v_owners := v_owners + 1;
    end if;
  end loop;

  for r in
    select p.id as admin_id, count(res.id) as idle
    from profiles p
    join resources res on res.org_id = p.org_id and res.status = 'active' and res.created_at < now() - interval '14 days'
    where p.role = 'admin'
      and coalesce((select sum(extract(epoch from (b.ends_at - b.starts_at)) / 3600) from bookings b
        where b.resource_id = res.id and b.status in ('checked_in', 'overdue', 'returned', 'closed')
          and b.starts_at >= now() - interval '28 days'), 0) < 18
    group by p.id
  loop
    if not exists (
      select 1 from notifications n where n.user_id = r.admin_id and n.kind = 'nudge.idle_summary' and n.created_at > now() - interval '6 days'
    ) then
      insert into notifications (user_id, kind, title, body, link)
      values (r.admin_id, 'nudge.idle_summary', r.idle || ' resources were mostly idle this month',
        'Open Insights to see them and act in one click.', '/admin#idle');
      v_admins := v_admins + 1;
    end if;
  end loop;

  return jsonb_build_object('owners', v_owners, 'admins', v_admins);
end $$;

revoke execute on function public.weekly_nudges() from public, anon, authenticated;

-- Monday 09:00 IST.
select cron.schedule('baanto-weekly-nudges', '30 3 * * 1', 'select public.weekly_nudges()');
