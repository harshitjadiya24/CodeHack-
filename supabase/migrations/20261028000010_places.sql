-- Where things are, so Discover can show the closest open slots on a map.
-- An institute has one point (geocoded from OpenStreetMap at registration); a resource may have its own
-- building point, and falls back to its institute's.

alter table public.organizations
  add column lat double precision check (lat between -90 and 90),
  add column lng double precision check (lng between -180 and 180);

alter table public.resources
  add column lat double precision check (lat between -90 and 90),
  add column lng double precision check (lng between -180 and 180);
