-- Security deposits as records, not just a line of text: who took it, how, and whether it went back in full or
-- part was kept, by whom and why. Keeping any of it is a penalty, so it always has a named person and a reason.

create table public.deposits (
  booking_id uuid primary key references public.bookings on delete cascade,
  amount_inr int not null check (amount_inr > 0),
  method text not null check (method in ('cash', 'upi', 'card', 'other')),
  reference text not null default '',
  collected_by uuid not null references public.profiles,
  collected_at timestamptz not null default now(),
  status text not null default 'held' check (status in ('held', 'refunded', 'withheld')),
  withheld_inr int not null default 0,
  settled_by uuid references public.profiles,
  settled_at timestamptz,
  settle_reason text,
  check (withheld_inr >= 0 and withheld_inr <= amount_inr),
  check ((status = 'held') = (settled_at is null)),
  check (status <> 'withheld' or (withheld_inr > 0 and length(coalesce(settle_reason, '')) >= 10))
);

create index deposits_collected_by_idx on public.deposits (collected_by);
create index deposits_settled_by_idx on public.deposits (settled_by);

alter table public.deposits enable row level security;

-- The same people who can see the booking can see its deposit. Writes go through the server only.
create policy "read deposits" on public.deposits for select to authenticated using (public.can_see_booking(booking_id));
