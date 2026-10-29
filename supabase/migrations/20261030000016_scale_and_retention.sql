-- Ready for real traffic: indexes on every foreign key the advisor flagged, RLS policies that call auth
-- functions once per query instead of once per row, and a daily job that forgets what we promised to forget.

create index if not exists audit_log_actor_idx on public.audit_log (actor_id);
create index if not exists audit_log_org_idx on public.audit_log (org_id);
create index if not exists availability_windows_resource_idx on public.availability_windows (resource_id);
create index if not exists booking_feedback_user_idx on public.booking_feedback (user_id);
create index if not exists bookings_decided_by_idx on public.bookings (decided_by);
create index if not exists bookings_draw_idx on public.bookings (draw_id);
create index if not exists endorsements_decided_by_idx on public.endorsements (decided_by);
create index if not exists handovers_attendant_idx on public.handovers (attendant_id);
create index if not exists handovers_recorded_by_idx on public.handovers (recorded_by);
create index if not exists incidents_booking_idx on public.incidents (booking_id);
create index if not exists incidents_decided_by_idx on public.incidents (decided_by);
create index if not exists incidents_reported_by_idx on public.incidents (reported_by);
create index if not exists incidents_resource_idx on public.incidents (resource_id);
create index if not exists maintenance_windows_created_by_idx on public.maintenance_windows (created_by);
create index if not exists organizations_created_by_idx on public.organizations (created_by);
create index if not exists profiles_dept_idx on public.profiles (dept_id);
create index if not exists profiles_org_idx on public.profiles (org_id);
create index if not exists resource_requirements_badge_idx on public.resource_requirements (badge_id);
create index if not exists resources_dept_idx on public.resources (dept_id);
create index if not exists resources_owner_idx on public.resources (owner_id);
create index if not exists user_badges_badge_idx on public.user_badges (badge_id);
create index if not exists user_badges_issued_by_idx on public.user_badges (issued_by);

-- Same rules as before; `(select …)` lets Postgres evaluate the caller's id, org and role once per query.
alter policy "read profiles in org" on public.profiles
  using (org_id = (select public.my_org()) or id = (select auth.uid()));
alter policy "read badges of users" on public.user_badges
  using (user_id = (select auth.uid()) or (select public.my_role()) = any (array['owner', 'attendant', 'manager', 'admin']::public.user_role[]));
alter policy "read incidents" on public.incidents
  using (reported_by = (select auth.uid()) or (booking_id is not null and public.can_see_booking(booking_id)) or (select public.is_staff()));
alter policy "read own notifications" on public.notifications
  using (user_id = (select auth.uid()));
alter policy "read audit" on public.audit_log
  using ((select public.is_staff()) or actor_id = (select auth.uid()) or (entity = 'booking' and public.can_see_booking(entity_id)));
alter policy "read endorsements" on public.endorsements
  using (
    user_id = (select auth.uid())
    or (((select public.my_org()) = home_org_id or (select public.my_org()) = host_org_id)
        and (select public.my_role()) = any (array['owner', 'attendant', 'manager', 'admin']::public.user_role[]))
  );
alter policy "read own feedback" on public.booking_feedback
  using (user_id = (select auth.uid()));

-- What the privacy notice promises: notifications go after six months, rate-limit counters after two days.
-- Handover photos live in Storage, which SQL may not delete; /api/cron/retention removes those.
create or replace function public.forget_old_records()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_notifications int;
  v_counters int;
begin
  delete from public.notifications where created_at < now() - interval '6 months';
  get diagnostics v_notifications = row_count;
  delete from public.rate_limits where window_start < now() - interval '2 days';
  get diagnostics v_counters = row_count;
  return jsonb_build_object('notifications', v_notifications, 'rate_limits', v_counters);
end;
$$;

revoke execute on function public.forget_old_records() from public, anon, authenticated;
grant execute on function public.forget_old_records() to service_role;

-- 03:00 IST every day.
select cron.schedule('baanto-forget-old-records', '30 21 * * *', 'select public.forget_old_records()');
