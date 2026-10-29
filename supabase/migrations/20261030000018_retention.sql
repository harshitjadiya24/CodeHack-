-- A daily job that forgets what the privacy notice promises to forget.

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
