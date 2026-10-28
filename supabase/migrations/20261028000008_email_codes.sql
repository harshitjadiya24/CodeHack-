-- One-time email verification codes for self-service sign-up.
-- Only a hash of the code is stored. No RLS policies: only the server (secret key) reads or writes it.
create table public.email_codes (
  user_id uuid primary key references auth.users on delete cascade,
  email text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0 check (attempts >= 0),
  last_sent_at timestamptz not null default now()
);

create index email_codes_email_idx on public.email_codes (lower(email));

alter table public.email_codes enable row level security;
