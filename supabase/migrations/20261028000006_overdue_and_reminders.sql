-- Runs inside the database every 10 minutes, independent of the web tier.
create extension if not exists pg_cron;

create or replace function public.sweep_bookings() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  b record;
  v_overdue int := 0;
  v_reminded int := 0;
begin
  -- Late returns: overdue 10 minutes after the slot ends.
  for b in
    select bk.id, bk.user_id, bk.ends_at, r.owner_id, r.name, r.org_id
    from bookings bk join resources r on r.id = bk.resource_id
    where bk.status = 'checked_in' and bk.ends_at < now() - interval '10 minutes'
  loop
    perform apply_booking_transition(b.id, 'overdue', null, 'Not returned 10 minutes after the slot ended',
      '{}'::jsonb, 'Overdue: please return ' || b.name, 'Your slot ended at ' || to_char(b.ends_at at time zone 'Asia/Kolkata', 'HH24:MI') || '. Others may be waiting.');
    insert into notifications (user_id, kind, title, body, link)
    values (b.owner_id, 'booking.overdue', 'Overdue: ' || b.name, 'Not yet returned.', '/bookings/' || b.id);
    insert into incidents (booking_id, resource_id, type, severity, description, proposed_action)
    select b.id, bk.resource_id, 'delay', 'low', 'Not returned within 10 minutes of the booked end time.', 'Reminder only unless it repeats.'
    from bookings bk where bk.id = b.id;
    v_overdue := v_overdue + 1;
  end loop;

  -- One reminder per approved booking starting within the hour.
  for b in
    select bk.id, bk.user_id, bk.starts_at, r.name
    from bookings bk join resources r on r.id = bk.resource_id
    where bk.status = 'approved' and bk.starts_at between now() and now() + interval '1 hour'
      and not exists (select 1 from notifications n where n.kind = 'booking.reminder' and n.link = '/bookings/' || bk.id)
  loop
    insert into notifications (user_id, kind, title, body, link)
    values (b.user_id, 'booking.reminder', 'Starting soon: ' || b.name,
      'Your slot starts at ' || to_char(b.starts_at at time zone 'Asia/Kolkata', 'HH24:MI') || '. Scan the QR tag to check in.', '/bookings/' || b.id);
    v_reminded := v_reminded + 1;
  end loop;

  return jsonb_build_object('overdue', v_overdue, 'reminded', v_reminded);
end $$;

revoke execute on function public.sweep_bookings() from public, anon, authenticated;

select cron.schedule('saajha-sweep', '*/10 * * * *', 'select public.sweep_bookings()');
