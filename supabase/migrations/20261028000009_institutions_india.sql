-- Any institute in India can join. An institute is "domain_verified" when its admin's email
-- is on the institute's own web domain; otherwise it stays "pending" until the Saajha team reviews it.
alter table public.organizations
  add column kind text not null default 'engineering'
    check (kind in ('engineering', 'university', 'polytechnic', 'medical', 'arts_science', 'management', 'research', 'school', 'community')),
  add column state text,
  add column aishe_code text,
  add column website text,
  add column email_domain text,
  add column status text not null default 'active' check (status in ('pending', 'domain_verified', 'active', 'suspended')),
  add column created_by uuid references auth.users on delete set null;

create unique index organizations_aishe_code_key on public.organizations (upper(aishe_code)) where aishe_code is not null;
create index organizations_state_idx on public.organizations (state);

update public.organizations set state = 'Maharashtra', email_domain = 'northfield.demo', status = 'active' where slug = 'northfield';
update public.organizations set state = 'Maharashtra', email_domain = 'riverside.demo', status = 'active' where slug = 'riverside';
