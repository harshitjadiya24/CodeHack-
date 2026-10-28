-- Extensions: lengthen an approved or running booking. The exclusion constraint on
-- bookings still guarantees the extra time never overlaps someone else's slot.
create or replace function public.extend_booking(p_booking uuid, p_new_end timestamptz, p_actor uuid, p_reason text)
returns public.bookings
language plpgsql security definer set search_path = public as $$
declare
  b public.bookings;
  v_old timestamptz;
  v_org uuid;
  v_rate int;
begin
  select * into b from bookings where id = p_booking for update;
  if not found then raise exception 'booking % not found', p_booking; end if;
  if b.status not in ('approved', 'checked_in') then
    raise exception 'only approved or in-use bookings can be extended' using errcode = 'check_violation';
  end if;
  if p_new_end <= b.ends_at then
    raise exception 'new end must be later than the current end' using errcode = 'check_violation';
  end if;

  v_old := b.ends_at;
  select org_id, credit_rate into v_org, v_rate from resources where id = b.resource_id;
  update bookings
  set ends_at = p_new_end,
      credits = credits + ceil(extract(epoch from (p_new_end - v_old)) / 3600)::int * v_rate
  where id = p_booking
  returning * into b;

  insert into audit_log (org_id, actor_id, action, entity, entity_id, reason, payload)
  values (v_org, p_actor, 'booking.extended', 'booking', b.id, p_reason,
          jsonb_build_object('from', v_old, 'to', p_new_end, 'credits', b.credits));
  insert into notifications (user_id, kind, title, body, link)
  values (b.user_id, 'booking.extended', 'Extension approved',
          'Your slot now ends at ' || to_char(p_new_end at time zone 'Asia/Kolkata', 'HH24:MI') || '.', '/bookings/' || b.id);
  return b;
end $$;

revoke execute on function public.extend_booking(uuid, timestamptz, uuid, text) from public, anon, authenticated;

-- Disputes: the borrower's side of an incident, seen by the manager before deciding.
alter table public.incidents
  add column borrower_response text,
  add column disputed_at timestamptz;
