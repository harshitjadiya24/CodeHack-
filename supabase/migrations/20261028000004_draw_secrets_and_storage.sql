-- Fair Draw seeds must stay secret until the draw runs. draw_windows is publicly readable
-- (anyone can verify a draw), so the seed lives here until it is revealed into draw_windows.seed.
create table public.draw_secrets (
  draw_id uuid primary key references public.draw_windows on delete cascade,
  seed text not null
);
alter table public.draw_secrets enable row level security;
-- No policies: only the server (service role) can read or write.

-- Private buckets. Files are uploaded by server actions and served through short-lived signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('handovers', 'handovers', false, 8388608, array['image/jpeg', 'image/png', 'image/webp']),
  ('evidence', 'evidence', false, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;
