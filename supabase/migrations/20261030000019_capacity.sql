-- How many people a space holds, so a club can find a room big enough. Equipment leaves it empty.
alter table public.resources add column capacity int check (capacity is null or capacity > 0);

-- The demo campus's rooms, from their descriptions.
update public.resources r set capacity = v.capacity from (values
  ('55555555-0000-0000-0000-000000000015'::uuid, 8), ('55555555-0000-0000-0000-000000000004'::uuid, 6),
  ('55555555-0000-0000-0000-000000000007'::uuid, 6), ('55555555-0000-0000-0000-000000000011'::uuid, 3),
  ('55555555-0000-0000-0000-000000000014'::uuid, 80), ('55555555-0000-0000-0000-000000000103'::uuid, 120),
  ('55555555-0000-0000-0000-000000000113'::uuid, 2), ('55555555-0000-0000-0000-000000000123'::uuid, 20),
  ('55555555-0000-0000-0000-000000000121'::uuid, 2), ('55555555-0000-0000-0000-000000000133'::uuid, 6),
  ('55555555-0000-0000-0000-000000000142'::uuid, 4), ('55555555-0000-0000-0000-000000000152'::uuid, 60)
) v(id, capacity)
where r.id = v.id;
