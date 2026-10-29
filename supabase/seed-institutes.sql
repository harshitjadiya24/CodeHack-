-- More fictional demo institutes, so "My city" and "My state" in Discover, the map, and cross-campus endorsements
-- have something to show. Safe to run again: every row has a fixed id and conflicts are skipped.
-- All names, people and numbers are fictional. Every account here uses the password: Saajha@2026

-- ── Institutes ────────────────────────────────────────────────────────────────
insert into public.organizations (id, name, slug, city, state, kind, email_domain, status, lat, lng) values
  ('11111111-0000-0000-0000-000000000010', 'Lakeview Institute of Science',     'lakeview',    'Pune',      'Maharashtra', 'university',   'lakeview.demo',    'active',  18.5302, 73.8712),
  ('11111111-0000-0000-0000-000000000011', 'Harbourside Polytechnic',           'harbourside', 'Mumbai',    'Maharashtra', 'polytechnic',  'harbourside.demo', 'active',  19.0331, 72.8652),
  ('11111111-0000-0000-0000-000000000012', 'Banyan School of Design',           'banyan',      'Ahmedabad', 'Gujarat',     'arts_science', 'banyan.demo',      'active',  23.0335, 72.5601),
  ('11111111-0000-0000-0000-000000000013', 'Silverline Institute of Technology', 'silverline',  'Bengaluru', 'Karnataka',   'engineering',  'silverline.demo',  'active',  12.9352, 77.6203),
  ('11111111-0000-0000-0000-000000000014', 'Pearl City College of Engineering', 'pearlcity',   'Hyderabad', 'Telangana',   'engineering',  'pearlcity.demo',   'active',  17.4401, 78.3802),
  -- Waiting in the Baanto review console (/ops), so the approve flow has something to approve.
  ('11111111-0000-0000-0000-000000000015', 'Tea Garden Institute of Technology', 'teagarden',  'Guwahati',  'Assam',       'engineering',  'teagarden.demo',   'pending', 26.1402, 91.6604)
on conflict (id) do nothing;

insert into public.fairness_config (org_id)
select id from public.organizations where id in (
  '11111111-0000-0000-0000-000000000010', '11111111-0000-0000-0000-000000000011', '11111111-0000-0000-0000-000000000012',
  '11111111-0000-0000-0000-000000000013', '11111111-0000-0000-0000-000000000014', '11111111-0000-0000-0000-000000000015')
on conflict do nothing;

insert into public.departments (org_id, name, code)
select o.id, d.name, d.code
from (values
  ('lakeview', 'Biotechnology', 'BT'), ('lakeview', 'Computer Science', 'CSE'), ('lakeview', 'Media & Communication', 'MC'), ('lakeview', 'Physics', 'PHY'),
  ('harbourside', 'Mechanical Engineering', 'ME'), ('harbourside', 'Electronics & Telecommunication', 'ENTC'), ('harbourside', 'Civil Engineering', 'CE'),
  ('banyan', 'Communication Design', 'CD'), ('banyan', 'Product Design', 'PD'), ('banyan', 'Film & Video', 'FV'),
  ('silverline', 'Electronics & Communication', 'ECE'), ('silverline', 'Aerospace Engineering', 'ASE'), ('silverline', 'Central Makerspace', 'MKS'), ('silverline', 'Computer Science', 'CSE'),
  ('pearlcity', 'Electronics & Communication', 'ECE'), ('pearlcity', 'Artificial Intelligence & Data Science', 'AIDS'), ('pearlcity', 'Computer Science', 'CSE'),
  ('teagarden', 'Civil Engineering', 'CE'), ('teagarden', 'Computer Science', 'CSE')
) d(org, name, code)
join public.organizations o on o.slug = d.org
on conflict (org_id, code) do nothing;

-- ── People: a lab in-charge and an admin office at each campus ───────────────
with demo (id, email, full_name, role, org) as (values
  ('33333333-0000-0000-0000-000000000101'::uuid, 'owner@riverside.demo',    'Dr. Sunil Patil',          'owner'::public.user_role, 'riverside'),
  ('33333333-0000-0000-0000-000000000102'::uuid, 'owner@lakeview.demo',     'Dr. Kavita Deshpande',     'owner'::public.user_role, 'lakeview'),
  ('33333333-0000-0000-0000-000000000103'::uuid, 'admin@lakeview.demo',     'Lakeview Admin Office',    'admin'::public.user_role, 'lakeview'),
  ('33333333-0000-0000-0000-000000000104'::uuid, 'owner@harbourside.demo',  'Mr. Joseph D’Souza',       'owner'::public.user_role, 'harbourside'),
  ('33333333-0000-0000-0000-000000000105'::uuid, 'admin@harbourside.demo',  'Harbourside Admin Office', 'admin'::public.user_role, 'harbourside'),
  ('33333333-0000-0000-0000-000000000106'::uuid, 'owner@banyan.demo',       'Ms. Hetal Parikh',         'owner'::public.user_role, 'banyan'),
  ('33333333-0000-0000-0000-000000000107'::uuid, 'admin@banyan.demo',       'Banyan Admin Office',      'admin'::public.user_role, 'banyan'),
  ('33333333-0000-0000-0000-000000000108'::uuid, 'owner@silverline.demo',   'Dr. Ramesh Gowda',         'owner'::public.user_role, 'silverline'),
  ('33333333-0000-0000-0000-000000000109'::uuid, 'admin@silverline.demo',   'Silverline Admin Office',  'admin'::public.user_role, 'silverline'),
  ('33333333-0000-0000-0000-000000000110'::uuid, 'owner@pearlcity.demo',    'Dr. Lakshmi Reddy',        'owner'::public.user_role, 'pearlcity'),
  ('33333333-0000-0000-0000-000000000111'::uuid, 'admin@pearlcity.demo',    'Pearl City Admin Office',  'admin'::public.user_role, 'pearlcity'),
  ('33333333-0000-0000-0000-000000000112'::uuid, 'admin@teagarden.demo',    'Tea Garden Admin Office',  'admin'::public.user_role, 'teagarden')
), users as (
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token)
  select '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', email,
    extensions.crypt('Saajha@2026', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('full_name', full_name),
    now(), now(), '', '', '', ''
  from demo
  on conflict (id) do nothing
  returning id
), identities as (
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  select gen_random_uuid(), d.id, d.id::text, jsonb_build_object('sub', d.id::text, 'email', d.email, 'email_verified', true),
    'email', now(), now(), now()
  from demo d
  on conflict do nothing
  returning user_id
)
insert into public.profiles (id, org_id, full_name, role, verified)
select d.id, o.id, d.full_name, d.role, true
from demo d join public.organizations o on o.slug = d.org
on conflict (id) do nothing;

-- ── Badges the controlled machines ask for ───────────────────────────────────
insert into public.skill_badges (id, org_id, code, name, description, validity_days) values
  ('44444444-0000-0000-0000-000000000101', '11111111-0000-0000-0000-000000000002', 'CNC',   'CNC Machine Induction',       'Work holding, tool changes, feeds and speeds, emergency stop drill.', 365),
  ('44444444-0000-0000-0000-000000000102', '11111111-0000-0000-0000-000000000011', 'WELD',  'Welding Safety',              'PPE, fume extraction, gas cylinder handling and fire watch.', 180),
  ('44444444-0000-0000-0000-000000000103', '11111111-0000-0000-0000-000000000012', 'LASER', 'Laser Cutter Certification',  'Material whitelist, fire watch, extraction and emergency stop drill.', 180),
  ('44444444-0000-0000-0000-000000000104', '11111111-0000-0000-0000-000000000013', 'ELEC',  'Electronics Lab Basics',      'ESD precautions, probe handling, bench power limits.', 365),
  ('44444444-0000-0000-0000-000000000105', '11111111-0000-0000-0000-000000000013', 'DRONE', 'Drone Flight Safety',         'Pre-flight checks, LiPo handling, cage rules and the kill switch.', 365)
on conflict (id) do nothing;

-- ── Resources ────────────────────────────────────────────────────────────────
-- dlat/dlng place each building a few hundred metres from its campus point.
insert into public.resources (id, org_id, dept_id, owner_id, name, kind, category, description, location, rules,
  demand, credit_rate, deposit_inr, rental_value_inr_per_hour, requires_supervision, auto_approve, max_hours, checklist, photo_slots, lat, lng)
select v.id::uuid, o.id, d.id, v.owner::uuid, v.name, v.kind::public.resource_kind, v.category, v.description, v.location, v.rules,
  v.demand::public.demand_tier, v.credit, v.deposit, v.rent, v.sup, v.auto, v.maxh, v.checklist::jsonb, v.photos::jsonb, o.lat + v.dlat, o.lng + v.dlng
from (values
  -- Riverside College of Engineering, Pune
  ('55555555-0000-0000-0000-000000000101', 'riverside', 'ME', '33333333-0000-0000-0000-000000000101', 'Haas Mini Mill CNC', 'equipment', 'Fabrication',
   'Three-axis vertical mill, 406 × 305 × 254 mm travel. Aluminium, brass and engineering plastics only.', 'Mechanical Workshop, Bay 3',
   'Supervised use. Bring a verified CAM file and your own stock. Clean chips off the table before you leave.', 'high', 3, 3000, 1200, true, false, 3,
   '["Table free of chips", "Tool holders returned", "Coolant level OK"]', '["Machine front", "Work table", "Tool rack"]', 0.0012, -0.0008),
  ('55555555-0000-0000-0000-000000000102', 'riverside', 'ME', '33333333-0000-0000-0000-000000000101', 'Universal Testing Machine (100 kN)', 'equipment', 'Test & Measurement',
   'Tensile, compression and flexural tests with extensometer and data export.', 'Mechanical Workshop, Materials Lab',
   'An attendant mounts the grips. Specimens must follow ASTM sizes.', 'normal', 2, 1000, 1500, true, false, 2,
   '["Grips clean", "Load cell zeroed"]', '["Machine overview", "Grips"]', 0.0010, -0.0004),
  ('55555555-0000-0000-0000-000000000103', 'riverside', 'ME', '33333333-0000-0000-0000-000000000101', 'Seminar Hall A (120 seats)', 'space', 'Rooms',
   'Tiered hall with projector, two wireless mics and a podium.', 'Main Building, First Floor',
   'Switch off the projector and AC. Leave the seating as you found it.', 'normal', 1, 0, 800, false, true, 4,
   '["Projector off", "AC off", "Seats in rows"]', '["Hall from the back"]', -0.0006, 0.0005),
  ('55555555-0000-0000-0000-000000000104', 'riverside', 'ME', '33333333-0000-0000-0000-000000000101', 'Prusa MK4 3D Printer', 'equipment', '3D Printing',
   'FDM printer, 250 × 210 × 220 mm build volume. PLA and PETG stocked.', 'Main Building, Innovation Cell',
   'Watch the first layer. Remove prints once the bed is cool.', 'high', 2, 0, 300, false, false, 4,
   '["Build plate clean", "No filament jam"]', '["Printer front", "Build plate"]', -0.0004, 0.0009),

  -- Lakeview Institute of Science, Pune
  ('55555555-0000-0000-0000-000000000111', 'lakeview', 'BT', '33333333-0000-0000-0000-000000000102', 'Stereo Microscope with Camera', 'equipment', 'Test & Measurement',
   'Zoom stereo microscope, 0.8–5×, with a 12 MP camera and image capture on the attached PC.', 'Life Sciences Block, Lab 1',
   'Lowest zoom before lifting the stage. Cover after use.', 'normal', 1, 0, 400, false, true, 3,
   '["Dust cover on", "Lenses clean"]', '["Microscope"]', 0.0009, 0.0007),
  ('55555555-0000-0000-0000-000000000112', 'lakeview', 'CSE', '33333333-0000-0000-0000-000000000102', 'GPU Workstation (2 × RTX 6000)', 'equipment', 'Compute',
   '96 GB of GPU memory, 256 GB RAM, Ubuntu with CUDA. Remote access by SSH during your slot.', 'Computing Centre, Server Room',
   'Save your data to your own storage. Scratch space is wiped every Sunday.', 'high', 3, 0, 1500, false, false, 4,
   '["Jobs stopped", "Scratch cleared"]', '["Rack"]', -0.0008, 0.0011),
  ('55555555-0000-0000-0000-000000000113', 'lakeview', 'MC', '33333333-0000-0000-0000-000000000102', 'Recording Studio Booth', 'space', 'Media',
   'Treated vocal booth with a condenser mic, audio interface and monitor headphones.', 'Media Centre, Ground Floor',
   'No food or drinks inside. Log out of the studio PC.', 'normal', 2, 0, 600, false, true, 3,
   '["Mic capped", "PC logged out"]', '["Booth"]', 0.0004, -0.0010),
  ('55555555-0000-0000-0000-000000000114', 'lakeview', 'PHY', '33333333-0000-0000-0000-000000000102', 'VR Headset Kit (2 headsets)', 'equipment', 'XR',
   'Two standalone headsets with controllers, charging dock and a play-space mat.', 'Physics Block, Room 12',
   'Wipe the face pads. Charge before return.', 'normal', 1, 1000, 200, false, true, 4,
   '["Both headsets present", "Controllers charged", "Face pads wiped"]', '["Kit laid out"]', -0.0011, -0.0003),

  -- Harbourside Polytechnic, Mumbai
  ('55555555-0000-0000-0000-000000000121', 'harbourside', 'ME', '33333333-0000-0000-0000-000000000104', 'TIG Welding Bay', 'space', 'Fabrication',
   'AC/DC TIG welder, fume extractor and a steel bench. Stainless and aluminium.', 'Workshop Block, Bay 1',
   'Supervised. Full PPE. Close the gas cylinder when you finish.', 'normal', 2, 1000, 700, true, false, 2,
   '["Gas cylinder closed", "Extractor off", "Bench cleared"]', '["Bay overview", "Welder panel"]', 0.0007, 0.0006),
  ('55555555-0000-0000-0000-000000000122', 'harbourside', 'ENTC', '33333333-0000-0000-0000-000000000104', 'Function Generator, 25 MHz', 'equipment', 'Test & Measurement',
   'Two-channel arbitrary waveform generator with BNC leads.', 'ENTC Block, Lab 3',
   'Return the leads to the hook.', 'normal', 1, 0, 150, false, true, 4,
   '["Leads present"]', '["Front panel"]', -0.0005, 0.0008),
  ('55555555-0000-0000-0000-000000000123', 'harbourside', 'ENTC', '33333333-0000-0000-0000-000000000104', 'Electronics Project Lab (20 benches)', 'space', 'Workspace',
   'Twenty benches with soldering stations, bench supplies and multimeters.', 'ENTC Block, Lab 5',
   'Switch off every iron. Sweep your bench.', 'normal', 1, 0, 300, false, true, 3,
   '["Irons off", "Benches swept"]', '["Lab overview"]', -0.0007, 0.0010),

  -- Banyan School of Design, Ahmedabad
  ('55555555-0000-0000-0000-000000000131', 'banyan', 'CD', '33333333-0000-0000-0000-000000000106', 'Large-Format Printer (44 inch)', 'equipment', 'Media',
   'Pigment inkjet for posters and photo prints up to 44 inches wide. Matte and gloss rolls stocked.', 'Studio Block, Print Room',
   'Send files as PDF/X. Paper is charged by the metre at the desk.', 'high', 2, 0, 500, false, false, 2,
   '["Roll loaded", "No paper jam"]', '["Printer front"]', 0.0006, 0.0004),
  ('55555555-0000-0000-0000-000000000132', 'banyan', 'PD', '33333333-0000-0000-0000-000000000106', 'Laser Engraver, 60 W', 'equipment', 'Laser Cutting',
   '600 × 400 mm bed. Plywood, MDF, acrylic and card.', 'Studio Block, Model Shop',
   'Supervised. Never leave a running job. PVC is banned.', 'high', 3, 2000, 800, true, false, 2,
   '["Lens clean", "Bed free of debris", "Extraction working"]', '["Machine front", "Bed"]', 0.0003, 0.0009),
  ('55555555-0000-0000-0000-000000000133', 'banyan', 'FV', '33333333-0000-0000-0000-000000000106', 'Photo Studio with Lighting Kit', 'space', 'Media',
   'Cyclorama wall, three strobes, softboxes and a backdrop stand.', 'Film Block, Studio 1',
   'Lights off and cooled before you pack them away.', 'normal', 2, 0, 900, false, true, 4,
   '["Strobes off", "Backdrops rolled"]', '["Studio overview"]', -0.0009, -0.0005),
  ('55555555-0000-0000-0000-000000000134', 'banyan', 'FV', '33333333-0000-0000-0000-000000000106', 'Cinema Camera Kit', 'equipment', 'Media',
   'Full-frame cinema camera, 24–70 mm lens, gimbal, three batteries and two cards.', 'Film Block, Equipment Store',
   'Offload your footage before return. Cards are formatted at the desk.', 'high', 3, 5000, 1200, false, false, 8,
   '["Body clean", "Lens cap on", "Three batteries", "Two cards"]', '["Kit laid out", "Sensor"]', -0.0006, -0.0008),

  -- Silverline Institute of Technology, Bengaluru
  ('55555555-0000-0000-0000-000000000141', 'silverline', 'MKS', '33333333-0000-0000-0000-000000000108', 'Resin 3D Printer (SLA)', 'equipment', '3D Printing',
   'Stereolithography printer for fine detail, 145 × 145 × 185 mm. Standard grey and clear resin.', 'Makerspace, Ground Floor',
   'Gloves on for resin. Wash and cure parts at the post-processing station.', 'high', 3, 0, 700, false, false, 4,
   '["Tank covered", "Platform clean"]', '["Printer", "Resin tank"]', 0.0008, -0.0006),
  ('55555555-0000-0000-0000-000000000142', 'silverline', 'ASE', '33333333-0000-0000-0000-000000000108', 'Drone Test Cage', 'space', 'Workspace',
   'Netted indoor cage, 6 × 6 × 4 m, with a LiPo safety bag and charging bench.', 'Aerospace Hangar',
   'Supervised. Batteries charge in the bag only.', 'normal', 2, 0, 600, true, false, 2,
   '["Net intact", "Batteries bagged"]', '["Cage"]', -0.0010, 0.0007),
  ('55555555-0000-0000-0000-000000000143', 'silverline', 'ECE', '33333333-0000-0000-0000-000000000108', 'Microcontroller & Sensor Kit', 'equipment', 'Electronics',
   'Single-board computer, microcontroller, breadboard and 30 sensors in a labelled case.', 'ECE Block, Store 2',
   'Every part back in its slot. Report anything missing.', 'normal', 1, 500, 100, false, true, 8,
   '["All slots full", "Case latched"]', '["Open case"]', 0.0005, 0.0010),
  ('55555555-0000-0000-0000-000000000144', 'silverline', 'ECE', '33333333-0000-0000-0000-000000000108', 'Spectrum Analyzer, 1.5 GHz', 'equipment', 'Test & Measurement',
   'Spectrum analyzer with tracking generator and an SMA cable set.', 'ECE Block, RF Lab',
   'Never exceed +20 dBm at the input. Cap the ports after use.', 'normal', 2, 1500, 600, false, false, 3,
   '["Port caps on", "Cables coiled"]', '["Front panel"]', 0.0002, 0.0012),

  -- Pearl City College of Engineering, Hyderabad
  ('55555555-0000-0000-0000-000000000151', 'pearlcity', 'ECE', '33333333-0000-0000-0000-000000000110', 'PCB Milling Machine', 'equipment', 'Electronics',
   'Desktop PCB mill for double-sided prototype boards, 229 × 305 mm.', 'ECE Block, Prototyping Lab',
   'Vacuum the bed after milling. Bits are issued at the desk.', 'normal', 2, 1000, 500, false, false, 3,
   '["Bed vacuumed", "Bit removed"]', '["Machine", "Bed"]', 0.0007, -0.0009),
  ('55555555-0000-0000-0000-000000000152', 'pearlcity', 'CSE', '33333333-0000-0000-0000-000000000110', 'Hackathon Hall (60 seats)', 'space', 'Rooms',
   'Open hall with power at every seat, Wi-Fi 6 and two displays.', 'Innovation Centre, First Floor',
   'Clear your tables. Lock the display remotes in the box.', 'normal', 1, 0, 700, false, true, 6,
   '["Tables clear", "Remotes in box"]', '["Hall overview"]', -0.0005, 0.0006),
  ('55555555-0000-0000-0000-000000000153', 'pearlcity', 'AIDS', '33333333-0000-0000-0000-000000000110', 'Edge AI Developer Kit', 'equipment', 'Compute',
   'Embedded AI board with a camera module, power supply and a 256 GB card.', 'AI Lab, Cabinet 4',
   'Wipe the card back to the stock image before return.', 'high', 2, 2000, 350, false, false, 8,
   '["Board, camera and supply present", "Card re-imaged"]', '["Kit laid out"]', 0.0010, 0.0003)
) v(id, org, dept, owner, name, kind, category, description, location, rules, demand, credit, deposit, rent, sup, auto, maxh, checklist, photos, dlat, dlng)
join public.organizations o on o.slug = v.org
left join public.departments d on d.org_id = o.id and d.code = v.dept
on conflict (id) do nothing;

insert into public.resource_requirements (resource_id, badge_id) values
  ('55555555-0000-0000-0000-000000000101', '44444444-0000-0000-0000-000000000101'),
  ('55555555-0000-0000-0000-000000000121', '44444444-0000-0000-0000-000000000102'),
  ('55555555-0000-0000-0000-000000000132', '44444444-0000-0000-0000-000000000103'),
  ('55555555-0000-0000-0000-000000000144', '44444444-0000-0000-0000-000000000104'),
  ('55555555-0000-0000-0000-000000000142', '44444444-0000-0000-0000-000000000105')
on conflict do nothing;

-- Weekdays 9–18, plus Saturday mornings at the makerspace and design studios.
insert into public.availability_windows (resource_id, weekday, start_time, end_time)
select r.id, d, '09:00', '18:00'
from public.resources r, generate_series(1, 5) d
where r.id::text between '55555555-0000-0000-0000-000000000100' and '55555555-0000-0000-0000-000000000199'
  and not exists (select 1 from public.availability_windows w where w.resource_id = r.id);
insert into public.availability_windows (resource_id, weekday, start_time, end_time)
select r.id, 6, '10:00', '14:00'
from public.resources r
where r.id in ('55555555-0000-0000-0000-000000000141', '55555555-0000-0000-0000-000000000133', '55555555-0000-0000-0000-000000000131')
  and not exists (select 1 from public.availability_windows w where w.resource_id = r.id and w.weekday = 6);

-- The registration record the review console reads for the pending institute.
update public.organizations set created_by = '33333333-0000-0000-0000-000000000112', website = 'https://teagarden.demo'
where id = '11111111-0000-0000-0000-000000000015' and created_by is null;
insert into public.audit_log (org_id, actor_id, action, entity, entity_id, reason, payload)
select '11111111-0000-0000-0000-000000000015', '33333333-0000-0000-0000-000000000112', 'org.registered', 'organization', '11111111-0000-0000-0000-000000000015',
  'Dr. Bhaskar Bora, Registrar', '{"kind": "engineering", "state": "Assam", "city": "Guwahati", "website": "https://teagarden.demo", "domainMatch": true}'::jsonb
where not exists (select 1 from public.audit_log where action = 'org.registered' and entity_id = '11111111-0000-0000-0000-000000000015');
