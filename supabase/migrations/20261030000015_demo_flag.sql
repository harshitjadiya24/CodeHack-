-- The demo campus and real colleges share one database. Each institute belongs to one world:
-- demo people never see real colleges, and real people never see the demo.

alter table public.organizations add column is_demo boolean not null default false;

-- The fictional institutes from seed.sql and seed-institutes.sql.
update public.organizations set is_demo = true where id::text like '11111111-0000-0000-0000-0000000000%';

create index organizations_world_idx on public.organizations (is_demo, status);

-- A booking, endorsement or partner request never crosses worlds, even if the UI is bypassed.
create or replace function public.same_world(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select is_demo from public.organizations where id = a) is not distinct from (select is_demo from public.organizations where id = b);
$$;

revoke execute on function public.same_world(uuid, uuid) from public, anon, authenticated;
grant execute on function public.same_world(uuid, uuid) to service_role;

create or replace function public.endorsement_same_world()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.same_world(new.home_org_id, new.host_org_id) then
    raise exception 'The demo campus and real institutes are kept apart.';
  end if;
  return new;
end;
$$;

create trigger endorsements_same_world before insert or update on public.endorsements
  for each row execute function public.endorsement_same_world();
