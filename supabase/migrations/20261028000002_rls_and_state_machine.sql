-- Security model:
--   * Browsers (anon/authenticated) get READ access only, filtered by RLS.
--   * Every write goes through Next.js server actions that authorise in TypeScript and
--     use the service role. Booking status changes go through apply_booking_transition(),
--     which enforces the state machine and writes audit + notification atomically.

-- ── Helpers ───────────────────────────────────────────────────────────────────
create function public.my_role() returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create function public.my_org() returns uuid
language sql stable security definer set search_path = public as $$
  select org_id from public.profiles where id = auth.uid()
$$;

create function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.my_role() in ('manager', 'admin'), false)
$$;

create function public.can_see_booking(p_booking uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.bookings b join public.resources r on r.id = b.resource_id
    where b.id = p_booking
      and (b.user_id = auth.uid() or r.owner_id = auth.uid()
           or (r.org_id = public.my_org() and public.my_role() in ('attendant', 'manager', 'admin')))
  )
$$;

-- ── Enable RLS everywhere ─────────────────────────────────────────────────────
alter table public.organizations enable row level security;
alter table public.departments enable row level security;
alter table public.profiles enable row level security;
alter table public.fairness_config enable row level security;
alter table public.skill_badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.resources enable row level security;
alter table public.resource_requirements enable row level security;
alter table public.availability_windows enable row level security;
alter table public.draw_windows enable row level security;
alter table public.bookings enable row level security;
alter table public.handovers enable row level security;
alter table public.incidents enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_log enable row level security;

-- Public catalogue data: any signed-in user.
create policy "read orgs" on public.organizations for select to authenticated using (true);
create policy "read departments" on public.departments for select to authenticated using (true);
create policy "read badges" on public.skill_badges for select to authenticated using (true);
create policy "read fairness config" on public.fairness_config for select to authenticated using (true);
create policy "read resources" on public.resources for select to authenticated using (true);
create policy "read requirements" on public.resource_requirements for select to authenticated using (true);
create policy "read availability" on public.availability_windows for select to authenticated using (true);
-- Draw windows are public on purpose: anyone can re-verify a Fair Draw.
create policy "read draws" on public.draw_windows for select to authenticated using (true);

-- People: names/departments visible within the org (needed for queues and receipts).
create policy "read profiles in org" on public.profiles for select to authenticated
  using (org_id = public.my_org() or id = auth.uid());

-- Passport: own badges, plus staff/owners/attendants who must check eligibility.
create policy "read badges of users" on public.user_badges for select to authenticated
  using (user_id = auth.uid() or public.my_role() in ('owner', 'attendant', 'manager', 'admin'));

create policy "read bookings" on public.bookings for select to authenticated
  using (public.can_see_booking(id));
create policy "read handovers" on public.handovers for select to authenticated
  using (public.can_see_booking(booking_id));
create policy "read incidents" on public.incidents for select to authenticated
  using (reported_by = auth.uid()
         or (booking_id is not null and public.can_see_booking(booking_id))
         or public.is_staff());

create policy "read own notifications" on public.notifications for select to authenticated
  using (user_id = auth.uid());

create policy "read audit" on public.audit_log for select to authenticated
  using (public.is_staff()
         or actor_id = auth.uid()
         or (entity = 'booking' and public.can_see_booking(entity_id)));

-- Realtime bell.
alter publication supabase_realtime add table public.notifications;

-- ── Booking state machine ─────────────────────────────────────────────────────
create function public.booking_transition_allowed(p_from public.booking_status, p_to public.booking_status)
returns boolean language sql immutable as $$
  select (p_from, p_to) in (
    ('requested', 'approved'), ('requested', 'rejected'), ('requested', 'waitlisted'), ('requested', 'cancelled'),
    ('in_draw', 'approved'), ('in_draw', 'waitlisted'), ('in_draw', 'cancelled'),
    ('waitlisted', 'requested'), ('waitlisted', 'approved'), ('waitlisted', 'cancelled'), ('waitlisted', 'rejected'),
    ('approved', 'checked_in'), ('approved', 'cancelled'),
    ('checked_in', 'returned'), ('checked_in', 'overdue'),
    ('overdue', 'returned'),
    ('returned', 'closed')
  )
$$;

create function public.apply_booking_transition(
  p_booking uuid,
  p_to public.booking_status,
  p_actor uuid,
  p_reason text default null,
  p_patch jsonb default '{}'::jsonb,
  p_notify_title text default null,
  p_notify_body text default ''
) returns public.bookings
language plpgsql security definer set search_path = public as $$
declare
  b public.bookings;
  v_org uuid;
begin
  select * into b from public.bookings where id = p_booking for update;
  if not found then
    raise exception 'booking % not found', p_booking;
  end if;
  if not public.booking_transition_allowed(b.status, p_to) then
    raise exception 'illegal transition % -> %', b.status, p_to using errcode = 'check_violation';
  end if;

  update public.bookings set
    status = p_to,
    decision_receipt = coalesce(p_patch -> 'decision_receipt', decision_receipt),
    priority_score = coalesce((p_patch ->> 'priority_score')::numeric, priority_score),
    priority_breakdown = coalesce(p_patch -> 'priority_breakdown', priority_breakdown),
    waitlist_position = case when p_to = 'waitlisted'
      then coalesce((p_patch ->> 'waitlist_position')::int, waitlist_position) else null end,
    decided_by = case when p_to in ('approved', 'rejected', 'waitlisted') then p_actor else decided_by end,
    decided_at = case when p_to in ('approved', 'rejected', 'waitlisted') then now() else decided_at end,
    checked_in_at = case when p_to = 'checked_in' then now() else checked_in_at end,
    returned_at = case when p_to = 'returned' then now() else returned_at end
  where id = p_booking
  returning * into b;

  select org_id into v_org from public.resources where id = b.resource_id;

  insert into public.audit_log (org_id, actor_id, action, entity, entity_id, reason, payload)
  values (v_org, p_actor, 'booking.' || p_to, 'booking', b.id, p_reason,
          jsonb_build_object('resource_id', b.resource_id, 'user_id', b.user_id,
                             'starts_at', b.starts_at, 'ends_at', b.ends_at) || p_patch);

  if p_notify_title is not null then
    insert into public.notifications (user_id, kind, title, body, link)
    values (b.user_id, 'booking.' || p_to, p_notify_title, coalesce(p_notify_body, ''), '/bookings/' || b.id);
  end if;

  return b;
end $$;

-- Only the server (service role) may call privileged functions.
revoke execute on function public.apply_booking_transition from public, anon, authenticated;
revoke execute on function public.verify_audit_chain from public, anon;
grant execute on function public.verify_audit_chain to authenticated;
