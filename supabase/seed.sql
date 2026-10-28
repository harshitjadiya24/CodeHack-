-- Saajha demo seed. All people, institutions and numbers are fictional.
-- Every demo account uses the password: Saajha@2026

-- ── Organisations & departments ───────────────────────────────────────────────
insert into public.organizations (id, name, slug, city, state, kind, email_domain, status) values
  ('11111111-0000-0000-0000-000000000001', 'Northfield Institute of Technology', 'northfield', 'Pune', 'Maharashtra', 'engineering', 'northfield.demo', 'active'),
  ('11111111-0000-0000-0000-000000000002', 'Riverside College of Engineering', 'riverside', 'Pune', 'Maharashtra', 'engineering', 'riverside.demo', 'active');

insert into public.departments (id, org_id, name, code) values
  ('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Central Makerspace', 'MKS'),
  ('22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'Electronics & Communication', 'ECE'),
  ('22222222-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', 'Computer Science', 'CSE'),
  ('22222222-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000001', 'Media & Design Studio', 'MDS'),
  ('22222222-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000002', 'Mechanical Engineering', 'ME');

-- Every department a typical Indian engineering college has, on both campuses.
-- Existing rows (same campus + code) are left alone.
insert into public.departments (org_id, name, code)
select o.id, d.name, d.code
from public.organizations o
cross join (values
  ('Computer Science', 'CSE'),
  ('Information Technology', 'IT'),
  ('Artificial Intelligence & Data Science', 'AIDS'),
  ('Artificial Intelligence & Machine Learning', 'AIML'),
  ('Computer Science (Cyber Security)', 'CSCY'),
  ('Computer Applications (MCA)', 'MCA'),
  ('Electronics & Communication', 'ECE'),
  ('Electrical & Electronics', 'EEE'),
  ('Electrical Engineering', 'EE'),
  ('Electronics & Instrumentation', 'EIE'),
  ('Electronics & Telecommunication', 'ENTC'),
  ('VLSI Design & Technology', 'VLSI'),
  ('Mechanical Engineering', 'ME'),
  ('Mechatronics', 'MCT'),
  ('Robotics & Automation', 'RA'),
  ('Automobile Engineering', 'AU'),
  ('Aeronautical Engineering', 'AE'),
  ('Aerospace Engineering', 'ASE'),
  ('Production & Industrial Engineering', 'PIE'),
  ('Civil Engineering', 'CE'),
  ('Environmental Engineering', 'ENV'),
  ('Architecture', 'ARCH'),
  ('Chemical Engineering', 'CHE'),
  ('Biotechnology', 'BT'),
  ('Biomedical Engineering', 'BME'),
  ('Metallurgical & Materials Engineering', 'MME'),
  ('Mining Engineering', 'MN'),
  ('Petroleum Engineering', 'PE'),
  ('Textile Technology', 'TT'),
  ('Agricultural Engineering', 'AGE'),
  ('Food Technology', 'FT'),
  ('Marine Engineering', 'MAR'),
  ('Physics', 'PHY'),
  ('Chemistry', 'CHEM'),
  ('Mathematics', 'MATH'),
  ('Humanities & Social Sciences', 'HSS'),
  ('Management Studies (MBA)', 'MBA'),
  ('Design', 'DES'),
  ('Central Makerspace', 'MKS'),
  ('Media & Design Studio', 'MDS'),
  ('Central Library', 'LIB'),
  ('Sports & Physical Education', 'SPE')
) as d(name, code)
on conflict (org_id, code) do nothing;

insert into public.fairness_config (org_id) values
  ('11111111-0000-0000-0000-000000000001'),
  ('11111111-0000-0000-0000-000000000002');

-- ── Demo accounts ─────────────────────────────────────────────────────────────
with demo (id, email, full_name, roll_no, role, org, dept) as (values
  ('33333333-0000-0000-0000-000000000001'::uuid, 'aarav@northfield.demo',  'Aarav Mehta',      'NIT22CS041', 'student'::public.user_role,    '11111111-0000-0000-0000-000000000001'::uuid, '22222222-0000-0000-0000-000000000003'::uuid),
  ('33333333-0000-0000-0000-000000000002'::uuid, 'meera@northfield.demo',  'Meera Iyer',       'NIT22EC017', 'student'::public.user_role,    '11111111-0000-0000-0000-000000000001'::uuid, '22222222-0000-0000-0000-000000000002'::uuid),
  ('33333333-0000-0000-0000-000000000003'::uuid, 'kabir@northfield.demo',  'Kabir Singh',      'NIT21RS003', 'researcher'::public.user_role, '11111111-0000-0000-0000-000000000001'::uuid, '22222222-0000-0000-0000-000000000002'::uuid),
  ('33333333-0000-0000-0000-000000000004'::uuid, 'priya@northfield.demo',  'Dr. Priya Nair',   null,         'owner'::public.user_role,      '11111111-0000-0000-0000-000000000001'::uuid, '22222222-0000-0000-0000-000000000001'::uuid),
  ('33333333-0000-0000-0000-000000000005'::uuid, 'ravi@northfield.demo',   'Ravi Kulkarni',    null,         'attendant'::public.user_role,  '11111111-0000-0000-0000-000000000001'::uuid, '22222222-0000-0000-0000-000000000001'::uuid),
  ('33333333-0000-0000-0000-000000000006'::uuid, 'sharma@northfield.demo', 'Prof. Anil Sharma','',           'manager'::public.user_role,    '11111111-0000-0000-0000-000000000001'::uuid, null::uuid),
  ('33333333-0000-0000-0000-000000000007'::uuid, 'admin@northfield.demo',  'IQAC Office',      null,         'admin'::public.user_role,      '11111111-0000-0000-0000-000000000001'::uuid, null::uuid),
  ('33333333-0000-0000-0000-000000000008'::uuid, 'zoya@riverside.demo',    'Zoya Khan',        'RCE23ME088', 'student'::public.user_role,    '11111111-0000-0000-0000-000000000002'::uuid, '22222222-0000-0000-0000-000000000005'::uuid)
), users as (
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token)
  select '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', email,
    extensions.crypt('Saajha@2026', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('full_name', full_name),
    now(), now(), '', '', '', ''
  from demo
  returning id
), identities as (
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  select gen_random_uuid(), d.id, d.id::text, jsonb_build_object('sub', d.id::text, 'email', d.email, 'email_verified', true),
    'email', now(), now(), now()
  from demo d
  returning user_id
)
insert into public.profiles (id, org_id, dept_id, full_name, roll_no, role, verified)
select id, org, dept, full_name, nullif(roll_no, ''), role, true from demo;

-- ── Trust Passport badges ─────────────────────────────────────────────────────
insert into public.skill_badges (id, org_id, code, name, description, validity_days) values
  ('44444444-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', '3DP',   '3D Printer Safety Induction', 'Filament handling, bed levelling, heated-nozzle safety and print monitoring.', 365),
  ('44444444-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'LASER', 'Laser Cutter Certification',  'Material whitelist, fire watch, extraction and emergency stop drill.', 180),
  ('44444444-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', 'ELEC',  'Electronics Lab Basics',      'ESD precautions, probe handling, bench power limits.', 365),
  ('44444444-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000001', 'CAM',   'Camera Kit Handling',         'Sensor care, battery logistics, lens swaps and data offload.', 365),
  ('44444444-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000001', 'PCB',   'PCB Fabrication Safety',      'Etchant handling, fume extraction, PPE and waste disposal.', 180);

-- Meera has a full passport; Kabir has electronics + 3D; Aarav starts with none (demo of the gap).
insert into public.user_badges (user_id, badge_id, status, issued_by, issued_at, expires_at, note) values
  ('33333333-0000-0000-0000-000000000002', '44444444-0000-0000-0000-000000000001', 'verified', '33333333-0000-0000-0000-000000000006', now() - interval '60 days', now() + interval '305 days', 'Induction batch 7'),
  ('33333333-0000-0000-0000-000000000002', '44444444-0000-0000-0000-000000000003', 'verified', '33333333-0000-0000-0000-000000000006', now() - interval '200 days', now() + interval '165 days', 'Lab course EC204 passed'),
  ('33333333-0000-0000-0000-000000000002', '44444444-0000-0000-0000-000000000004', 'verified', '33333333-0000-0000-0000-000000000006', now() - interval '30 days', now() + interval '335 days', 'Media club workshop'),
  ('33333333-0000-0000-0000-000000000003', '44444444-0000-0000-0000-000000000001', 'verified', '33333333-0000-0000-0000-000000000006', now() - interval '90 days', now() + interval '275 days', 'Induction batch 5'),
  ('33333333-0000-0000-0000-000000000003', '44444444-0000-0000-0000-000000000003', 'verified', '33333333-0000-0000-0000-000000000006', now() - interval '300 days', now() + interval '65 days', 'Research onboarding'),
  ('33333333-0000-0000-0000-000000000003', '44444444-0000-0000-0000-000000000005', 'verified', '33333333-0000-0000-0000-000000000006', now() - interval '20 days', now() + interval '160 days', 'PCB lab training');

-- ── Resources ─────────────────────────────────────────────────────────────────
insert into public.resources (id, org_id, dept_id, owner_id, name, kind, category, description, location, image_url, rules,
  demand, credit_rate, deposit_inr, rental_value_inr_per_hour, requires_supervision, auto_approve, max_hours, checklist, photo_slots) values
  ('55555555-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000004',
   'Ultimaker S5 3D Printer', 'equipment', '3D Printing', 'Dual-extrusion FDM printer, 330×240×300 mm build volume. PLA, PETG and Tough PLA stocked.',
   'Central Makerspace, Ground Floor, Bay 2', null,
   'Bring your sliced .ufp file. Stay within sight for the first layer. Remove prints only after the bed cools below 40°C.',
   'high', 2, 0, 450, false, false, 4,
   '["Nozzle clean, no filament residue", "Build plate clean and undamaged", "Filament spool loaded and dry", "Touchscreen responsive"]',
   '["Front view", "Build plate", "Nozzle close-up"]'),
  ('55555555-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000004',
   'Prusa MK4 3D Printer', 'equipment', '3D Printing', 'Reliable single-extruder FDM printer for quick prototypes.',
   'Central Makerspace, Ground Floor, Bay 3', null,
   'PLA and PETG only. Clean the sheet with IPA after use.', 'normal', 1, 0, 250, false, true, 4,
   '["Nozzle clean", "Steel sheet clean", "No loose parts"]', '["Front view", "Print sheet"]'),
  ('55555555-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000004',
   'Epilog Fusion Laser Cutter', 'equipment', 'Laser Cutting', '60W CO₂ laser, 610×305 mm bed. Acrylic, plywood, cardboard, leather.',
   'Central Makerspace, Fabrication Room', null,
   'Supervised use only. Never leave a running job. PVC and polycarbonate are strictly banned.', 'high', 3, 2000, 900, true, false, 2,
   '["Lens clean", "Honeycomb bed free of debris", "Extraction fan working", "Fire extinguisher present"]',
   '["Front view", "Cutting bed", "Control panel"]'),
  ('55555555-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000004',
   'Makerspace Workbench Zone', 'space', 'Workspace', 'Six-seat workbench with hand tools, ESD mats and power strips.',
   'Central Makerspace, Ground Floor', null,
   'Return every tool to its shadow board.', 'normal', 1, 0, 150, false, true, 4,
   '["All tools on shadow board", "Bench surface clean"]', '["Bench overview", "Tool board"]'),
  ('55555555-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000004',
   'Rigol DS1054Z Oscilloscope', 'equipment', 'Test & Measurement', '4-channel, 50 MHz digital storage oscilloscope with 2 passive probes.',
   'ECE Block, Lab 204, Bench 1', null,
   'Never exceed probe voltage rating. Return probes coiled in the drawer.', 'normal', 1, 0, 200, false, true, 4,
   '["Both probes present", "Screen undamaged", "Power cord intact"]', '["Front panel", "Probes"]'),
  ('55555555-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000004',
   'Keysight Function Generator', 'equipment', 'Test & Measurement', '20 MHz arbitrary waveform generator.',
   'ECE Block, Lab 204, Bench 3', null,
   'Output must be disabled before connecting a load.', 'normal', 1, 0, 150, false, true, 4,
   '["BNC cables present", "Display working"]', '["Front panel"]'),
  ('55555555-0000-0000-0000-000000000007', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000004',
   'PCB Prototyping Lab', 'space', 'Fabrication', 'UV exposure unit, etching tank, drill press and fume extraction.',
   'ECE Block, Lab 210', null,
   'Supervised only. Full PPE. Etchant waste goes in the labelled drum.', 'normal', 2, 500, 600, true, false, 3,
   '["Etchant tank sealed", "PPE returned", "Fume hood off", "Drill bits counted"]', '["Etch station", "Drill press"]'),
  ('55555555-0000-0000-0000-000000000008', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000004',
   'Soldering Station Kit', 'equipment', 'Electronics', 'Hakko FX-888D with fume extractor, helping hands and solder.',
   'ECE Block, Lab 204, Bench 5', null,
   'Switch off and tin the tip after use.', 'normal', 1, 0, 80, false, true, 4,
   '["Tip tinned", "Station switched off", "Sponge wet"]', '["Station"]'),
  ('55555555-0000-0000-0000-000000000009', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000004', '33333333-0000-0000-0000-000000000004',
   'Sony A7 IV Camera Kit', 'equipment', 'Media', 'Full-frame mirrorless body, 24-70 mm f/2.8 lens, 3 batteries, 2 SD cards, tripod.',
   'Media & Design Studio, Equipment Cage', null,
   'Format cards only after offloading. Return all batteries charged.', 'high', 2, 5000, 700, false, false, 4,
   '["Body and lens free of scratches", "3 batteries", "2 SD cards", "Tripod plate attached"]',
   '["Body front", "Lens glass", "Accessories laid out"]'),
  ('55555555-0000-0000-0000-000000000010', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000004', '33333333-0000-0000-0000-000000000004',
   'Rode Wireless Mic Kit', 'equipment', 'Media', 'Two transmitters and one receiver with lavalier mics.',
   'Media & Design Studio, Equipment Cage', null,
   'Charge the case before returning.', 'normal', 1, 1000, 200, false, true, 4,
   '["2 transmitters", "1 receiver", "2 lavaliers", "Charging case"]', '["Kit laid out"]'),
  ('55555555-0000-0000-0000-000000000011', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000004', '33333333-0000-0000-0000-000000000004',
   'Podcast Studio', 'space', 'Media', 'Acoustically treated room with 3 mics, interface and monitors.',
   'Media & Design Studio, Room 3', null,
   'No food or drink inside.', 'normal', 1, 0, 500, false, true, 3,
   '["Mics on stands", "Headphones hung", "Lights off"]', '["Room overview"]'),
  ('55555555-0000-0000-0000-000000000012', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000003', '33333333-0000-0000-0000-000000000004',
   'Meta Quest 3 VR Headset', 'equipment', 'XR', 'Standalone mixed-reality headset with two controllers and link cable.',
   'CSE Block, Innovation Lab', null,
   'Wipe the face pad with the provided wipes.', 'normal', 1, 2000, 300, false, false, 3,
   '["Lenses clean and unscratched", "2 controllers", "Link cable"]', '["Headset lenses", "Controllers"]'),
  ('55555555-0000-0000-0000-000000000013', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000003', '33333333-0000-0000-0000-000000000004',
   'GPU Workstation (RTX 4090)', 'equipment', 'Compute', '24 GB GPU, 64 GB RAM, 2 TB NVMe. CUDA, PyTorch preinstalled.',
   'CSE Block, Innovation Lab, Desk 1', null,
   'Store data only under /scratch/<your-roll-no>. Scratch is wiped weekly.', 'high', 2, 0, 350, false, false, 4,
   '["Logged out", "Scratch folder cleared"]', '["Desk overview"]'),
  ('55555555-0000-0000-0000-000000000014', '11111111-0000-0000-0000-000000000001', null, '33333333-0000-0000-0000-000000000004',
   'Seminar Hall B (80 seats)', 'space', 'Rooms', 'Projector, PA system, 80 seats. Ideal for club events and workshops.',
   'Admin Block, First Floor', null,
   'Restore seating layout after use.', 'normal', 2, 0, 1200, false, true, 4,
   '["Projector off", "Seats restored", "Mic returned"]', '["Hall overview"]'),
  ('55555555-0000-0000-0000-000000000015', '11111111-0000-0000-0000-000000000001', null, '33333333-0000-0000-0000-000000000004',
   'Discussion Room 2', 'space', 'Rooms', '8-seat room with whiteboard and TV.',
   'Library, Second Floor', null,
   'Wipe the whiteboard.', 'normal', 1, 0, 150, false, true, 2,
   '["Whiteboard wiped", "TV off"]', '["Room overview"]');

insert into public.resource_requirements (resource_id, badge_id) values
  ('55555555-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001'),
  ('55555555-0000-0000-0000-000000000002', '44444444-0000-0000-0000-000000000001'),
  ('55555555-0000-0000-0000-000000000003', '44444444-0000-0000-0000-000000000002'),
  ('55555555-0000-0000-0000-000000000005', '44444444-0000-0000-0000-000000000003'),
  ('55555555-0000-0000-0000-000000000006', '44444444-0000-0000-0000-000000000003'),
  ('55555555-0000-0000-0000-000000000007', '44444444-0000-0000-0000-000000000005'),
  ('55555555-0000-0000-0000-000000000008', '44444444-0000-0000-0000-000000000003'),
  ('55555555-0000-0000-0000-000000000009', '44444444-0000-0000-0000-000000000004');

-- Weekdays 9–18 for everything; makerspace also Saturday 10–14.
insert into public.availability_windows (resource_id, weekday, start_time, end_time)
select r.id, d, '09:00', '18:00' from public.resources r, generate_series(1, 5) d;
insert into public.availability_windows (resource_id, weekday, start_time, end_time)
select id, 6, '10:00', '14:00' from public.resources where dept_id = '22222222-0000-0000-0000-000000000001';

-- ── Six weeks of closed history (feeds utilisation + fairness dashboards) ────
-- Deliberately skewed: a few heavy users on high-demand items, many assets nearly idle.
select setseed(0.42);
insert into public.bookings (resource_id, user_id, starts_at, ends_at, purpose, status, credits, checked_in_at, returned_at, decided_by, decided_at, created_at)
select r.id,
  (array['33333333-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000003',
         '33333333-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000003',
         '33333333-0000-0000-0000-000000000001'])[1 + floor(random() * 5)::int]::uuid,
  s.start_at, s.start_at + make_interval(hours => s.hrs),
  (array['Capstone prototype', 'Club workshop', 'Research experiment', 'Course assignment', 'Hackathon build'])[1 + floor(random() * 5)::int],
  'closed', s.hrs * r.credit_rate, s.start_at, s.start_at + make_interval(hours => s.hrs),
  '33333333-0000-0000-0000-000000000004', s.start_at - interval '1 day', s.start_at - interval '2 days'
from public.resources r
cross join lateral (
  -- Midnight on the campus (IST) clock, so history lands inside 09:00–18:00 opening hours.
  select (date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata')
           - make_interval(days => 1 + floor(random() * 42)::int) + make_interval(hours => 9 + floor(random() * 6)::int) as start_at,
         1 + floor(random() * 3)::int as hrs
  from generate_series(1, case
    when r.demand = 'high' then 18
    when r.category in ('Rooms', 'Media') then 6
    else 2 end)
) s;

-- Twelve more fictional students (random passwords, no demo login) so fairness metrics
-- describe a real cohort: a few heavy users and a long tail.
with names(n, full_name, roll) as (values
  (1,'Ishaan Rao','NIT23ME012'),(2,'Ananya Kulkarni','NIT23EC044'),(3,'Rohan Das','NIT22CS077'),(4,'Sneha Pillai','NIT24CS008'),
  (5,'Vikram Joshi','NIT23ME031'),(6,'Fatima Sheikh','NIT22EC090'),(7,'Arjun Nambiar','NIT24EC015'),(8,'Diya Kapoor','NIT23CS052'),
  (9,'Harsh Vardhan','NIT22ME066'),(10,'Nikita Bose','NIT24ME003'),(11,'Siddharth Menon','NIT23CS019'),(12,'Tanvi Shah','NIT22CS101')
), ins as (
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
  select '00000000-0000-0000-0000-000000000000', ('66666666-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid, 'authenticated', 'authenticated',
    'cohort' || n || '@northfield.demo', extensions.crypt(encode(extensions.gen_random_bytes(16), 'hex'), extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('full_name', full_name), now(), now(), '', '', '', ''
  from names returning id
)
insert into public.profiles (id, org_id, dept_id, full_name, roll_no, role, verified)
select ('66666666-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid, '11111111-0000-0000-0000-000000000001',
  (array['22222222-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000003','22222222-0000-0000-0000-000000000004'])[1 + n % 3]::uuid,
  full_name, roll, 'student', true
from names;

select setseed(0.17);
update public.bookings
set user_id = ('66666666-0000-0000-0000-' || lpad((1 + floor(power(random(), 2.2) * 12))::int::text, 12, '0'))::uuid
where status = 'closed' and random() < 0.6;

-- One historical damage incident, resolved by a human.
insert into public.incidents (resource_id, reported_by, type, severity, description, status, decision, strike_applied, decided_by, decided_at, created_at)
values ('55555555-0000-0000-0000-000000000009', '33333333-0000-0000-0000-000000000004', 'damage', 'low',
  'Lens cap missing on return; lens glass undamaged.', 'resolved',
  'Replacement cap issued from spares. Warning recorded, no strike.', false,
  '33333333-0000-0000-0000-000000000006', now() - interval '10 days', now() - interval '11 days');

insert into public.audit_log (org_id, actor_id, action, entity, entity_id, reason, payload) values
  ('11111111-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000007', 'org.seeded', 'organization',
   '11111111-0000-0000-0000-000000000001', 'Demo environment created', '{"resources": 15, "users": 8}');

-- Map points: each institute, and the demo campus's buildings.
update public.organizations set lat = 18.5913, lng = 73.7389 where slug = 'northfield';
update public.organizations set lat = 18.4575, lng = 73.8508 where slug = 'riverside';
update public.resources r set lat = v.lat, lng = v.lng from (values
  ('Central Makerspace', 18.5918, 73.7383), ('ECE Block', 18.5921, 73.7396), ('CSE Block', 18.5909, 73.7399),
  ('Media & Design Studio', 18.5904, 73.7381), ('Library', 18.5913, 73.7389), ('Admin Block', 18.5911, 73.7375)) v(building, lat, lng)
where split_part(r.location, ',', 1) = v.building and r.org_id = '11111111-0000-0000-0000-000000000001';
