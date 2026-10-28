-- Advisor hardening: pin search_path and keep anonymous callers out of every function.
-- RLS helpers (my_role, my_org, is_staff, can_see_booking) stay executable by signed-in
-- users because policies run them as the caller; they only reveal the caller's own role/org.

alter function public.booking_transition_allowed(public.booking_status, public.booking_status) set search_path = public;
alter function public.audit_digest_input(text, uuid, text, text, uuid, text, jsonb, timestamptz) set search_path = public;
alter function public.audit_log_immutable() set search_path = public;

revoke execute on function public.my_role() from public, anon;
revoke execute on function public.my_org() from public, anon;
revoke execute on function public.is_staff() from public, anon;
revoke execute on function public.can_see_booking(uuid) from public, anon;
grant execute on function public.my_role() to authenticated;
grant execute on function public.my_org() to authenticated;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.can_see_booking(uuid) to authenticated;

-- Trigger functions never need to be called through the API.
revoke execute on function public.audit_chain_before_insert() from public, anon, authenticated;
