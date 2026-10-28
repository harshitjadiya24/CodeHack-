-- A pending request joins a Fair Draw when a competing request for the same slot arrives.
create or replace function public.booking_transition_allowed(p_from public.booking_status, p_to public.booking_status)
returns boolean language sql immutable set search_path = public as $$
  select (p_from, p_to) in (
    ('requested', 'approved'), ('requested', 'rejected'), ('requested', 'waitlisted'), ('requested', 'cancelled'),
    ('requested', 'in_draw'),
    ('in_draw', 'approved'), ('in_draw', 'waitlisted'), ('in_draw', 'cancelled'),
    ('waitlisted', 'requested'), ('waitlisted', 'approved'), ('waitlisted', 'cancelled'), ('waitlisted', 'rejected'),
    ('approved', 'checked_in'), ('approved', 'cancelled'),
    ('checked_in', 'returned'), ('checked_in', 'overdue'),
    ('overdue', 'returned'),
    ('returned', 'closed')
  )
$$;
