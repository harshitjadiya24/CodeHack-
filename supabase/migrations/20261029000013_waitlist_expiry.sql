-- The sweep also closes waitlist entries once their slot is nearly over: nothing is left to wait for, and the person
-- shouldn't see "Waitlisted" forever. The 30 minutes matches MIN_USEFUL_MINUTES in src/lib/domain/waitlist.ts,
-- the point after which a freed slot is no longer offered down the queue.
create or replace function public.sweep_bookings() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  b record;
  v_overdue int := 0;
  v_reminded int := 0;
  v_expired int := 0;
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

  -- Waitlist entries whose slot is (nearly) over.
  for b in
    select bk.id, r.name
    from bookings bk join resources r on r.id = bk.resource_id
    where bk.status = 'waitlisted' and bk.ends_at < now() + interval '30 minutes'
  loop
    perform apply_booking_transition(b.id, 'cancelled', null, 'Waitlist closed: the slot passed before a place opened up',
      jsonb_build_object('decision_receipt', jsonb_build_object(
        'outcome', 'cancelled',
        'headline', 'The slot passed while you were on the waitlist',
        'reasons', jsonb_build_array('Nobody ahead of you cancelled in time.', 'No credits were used and nothing counts against you.'),
        'decidedBy', jsonb_build_object('kind', 'system'),
        'at', now())),
      'Waitlist closed: ' || b.name, 'The slot passed before a place opened up. No credits were used.');
    v_expired := v_expired + 1;
  end loop;

  return jsonb_build_object('overdue', v_overdue, 'reminded', v_reminded, 'waitlist_expired', v_expired);
end $$;

revoke execute on function public.sweep_bookings() from public, anon, authenticated;
