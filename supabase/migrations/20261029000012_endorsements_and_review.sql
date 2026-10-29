-- Two things a network of campuses needs:
-- 1. Saajha's own team, who check that a newly registered institute is real before other campuses see it.
-- 2. Cross-campus endorsements: a student's home institute vouches for them at a partner campus,
--    for a stated purpose and for a limited time. Only then can they request that campus's equipment.

create table public.platform_staff (
  user_id uuid primary key references auth.users on delete cascade,
  added_at timestamptz not null default now()
);
alter table public.platform_staff enable row level security;

create table public.endorsements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  home_org_id uuid not null references public.organizations,
  host_org_id uuid not null references public.organizations,
  purpose text not null check (char_length(purpose) between 10 and 500),
  status text not null default 'requested' check (status in ('requested', 'approved', 'declined', 'revoked')),
  decision_reason text,
  decided_by uuid references public.profiles,
  decided_at timestamptz,
  valid_until date,
  created_at timestamptz not null default now(),
  check (home_org_id <> host_org_id),
  check (status <> 'approved' or valid_until is not null)
);
-- At most one open request or live endorsement per person per partner campus.
create unique index endorsements_one_open on public.endorsements (user_id, host_org_id) where status in ('requested', 'approved');
create index endorsements_home_status on public.endorsements (home_org_id, status);
create index endorsements_host on public.endorsements (host_org_id);
alter table public.endorsements enable row level security;

-- The person themselves, and staff at either campus. Writes go through the server only.
create policy "read endorsements" on public.endorsements for select to authenticated
  using (
    user_id = auth.uid()
    or (public.my_org() in (home_org_id, host_org_id) and public.my_role() in ('owner', 'attendant', 'manager', 'admin'))
  );
