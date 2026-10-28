// Reference data for institutes across India: states and UTs, institute types, and the departments and
// starter training badges a new institute gets on day one (admins can add more later).

export const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh",
  "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha",
  "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  // Union territories
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir",
  "Ladakh", "Lakshadweep", "Puducherry",
] as const;

export const INSTITUTE_KINDS = {
  engineering: "Engineering college",
  university: "University",
  polytechnic: "Polytechnic",
  medical: "Medical, dental or nursing college",
  arts_science: "Arts, science and commerce college",
  management: "Management institute",
  research: "Research institute or lab",
  school: "School",
  community: "Makerspace or community organisation",
} as const;

export type InstituteKind = keyof typeof INSTITUTE_KINDS;

type Dept = [code: string, name: string];
type Group = [label: string, depts: Dept[]];

const COMPUTING: Group = ["Computing", [["CSE", "Computer Science"], ["IT", "Information Technology"], ["AIDS", "Artificial Intelligence & Data Science"], ["AIML", "Artificial Intelligence & Machine Learning"], ["CSCY", "Computer Science (Cyber Security)"], ["MCA", "Computer Applications (MCA)"]]];
const ELECTRICAL: Group = ["Electronics and electrical", [["ECE", "Electronics & Communication"], ["EEE", "Electrical & Electronics"], ["EE", "Electrical Engineering"], ["EIE", "Electronics & Instrumentation"], ["ENTC", "Electronics & Telecommunication"], ["VLSI", "VLSI Design & Technology"]]];
const MECHANICAL: Group = ["Mechanical and production", [["ME", "Mechanical Engineering"], ["MCT", "Mechatronics"], ["RA", "Robotics & Automation"], ["AU", "Automobile Engineering"], ["AE", "Aeronautical Engineering"], ["ASE", "Aerospace Engineering"], ["PIE", "Production & Industrial Engineering"], ["MAR", "Marine Engineering"]]];
const CIVIL: Group = ["Civil and architecture", [["CE", "Civil Engineering"], ["ENV", "Environmental Engineering"], ["ARCH", "Architecture"]]];
const CHEMBIO: Group = ["Chemical, bio and food", [["CHE", "Chemical Engineering"], ["BT", "Biotechnology"], ["BME", "Biomedical Engineering"], ["FT", "Food Technology"], ["AGE", "Agricultural Engineering"]]];
const MATERIALS: Group = ["Materials and earth", [["MME", "Metallurgical & Materials Engineering"], ["MN", "Mining Engineering"], ["PE", "Petroleum Engineering"], ["TT", "Textile Technology"]]];
const SCIENCES: Group = ["Sciences and humanities", [["PHY", "Physics"], ["CHEM", "Chemistry"], ["MATH", "Mathematics"], ["HSS", "Humanities & Social Sciences"]]];
const MGMT_DESIGN: Group = ["Management and design", [["MBA", "Management Studies (MBA)"], ["DES", "Design"], ["MDS", "Media & Design Studio"]]];
const FACILITIES: Group = ["Campus facilities", [["MKS", "Central Makerspace"], ["LIB", "Central Library"], ["SPE", "Sports & Physical Education"]]];

const LIFE_SCIENCES: Group = ["Life sciences", [["BOT", "Botany"], ["ZOO", "Zoology"], ["MICRO", "Microbiology"], ["BT", "Biotechnology"], ["BIOCHEM", "Biochemistry"]]];
const PHYSICAL_SCIENCES: Group = ["Physical and mathematical sciences", [["PHY", "Physics"], ["CHEM", "Chemistry"], ["MATH", "Mathematics"], ["STAT", "Statistics"], ["CSE", "Computer Science"], ["ELEC", "Electronics"]]];
const ARTS: Group = ["Arts and humanities", [["ENG", "English"], ["HIN", "Hindi"], ["HIST", "History"], ["POL", "Political Science"], ["SOC", "Sociology"], ["PSY", "Psychology"], ["GEO", "Geography"], ["ECO", "Economics"], ["JMC", "Journalism & Mass Communication"], ["FA", "Fine Arts"], ["MUS", "Music"]]];
const COMMERCE: Group = ["Commerce and management", [["COM", "Commerce"], ["BBA", "Business Administration"], ["MBA", "Management Studies (MBA)"]]];

const PRECLINICAL: Group = ["Pre-clinical and para-clinical", [["ANAT", "Anatomy"], ["PHYSIO", "Physiology"], ["BIOCHEM", "Biochemistry"], ["PATH", "Pathology"], ["PHARMA", "Pharmacology"], ["MICRO", "Microbiology"], ["FMT", "Forensic Medicine"], ["CM", "Community Medicine"]]];
const CLINICAL: Group = ["Clinical", [["MED", "General Medicine"], ["SURG", "General Surgery"], ["PAED", "Paediatrics"], ["OBG", "Obstetrics & Gynaecology"], ["ORTHO", "Orthopaedics"], ["OPHTH", "Ophthalmology"], ["ENT", "ENT"], ["DERM", "Dermatology"], ["PSYCH", "Psychiatry"], ["RADIO", "Radiology"], ["ANAES", "Anaesthesiology"]]];
const ALLIED: Group = ["Dental, nursing and allied", [["DENT", "Dentistry"], ["NURS", "Nursing"], ["PHARM", "Pharmacy"], ["PT", "Physiotherapy"], ["SKILL", "Clinical Skills Lab"], ["CRL", "Central Research Lab"]]];

const MANAGEMENT: Group = ["Management areas", [["FIN", "Finance"], ["MKT", "Marketing"], ["HR", "Human Resources"], ["OPS", "Operations"], ["BA", "Business Analytics"], ["ECELL", "Entrepreneurship Cell"]]];
const RESEARCH: Group = ["Research facilities", [["CIF", "Central Instrumentation Facility"], ["CRL", "Central Research Lab"], ["COMP", "High-Performance Computing"], ["FAB", "Fabrication Facility"], ["BIOLAB", "Biology Labs"], ["CHEMLAB", "Chemistry Labs"]]];
const SCHOOL: Group = ["School", [["SCI", "Science Labs"], ["COMPLAB", "Computer Lab"], ["ATL", "Atal Tinkering Lab"], ["ART", "Art Room"], ["MUSR", "Music Room"], ["LIB", "Library"], ["SPE", "Sports"]]];
const COMMUNITY: Group = ["Spaces and workshops", [["MKS", "Makerspace"], ["WKS", "Workshop"], ["MEDIA", "Media Studio"], ["HALL", "Community Hall"], ["LIB", "Library"]]];
const BASIC_FACILITIES: Group = ["Campus facilities", [["LIB", "Central Library"], ["SPE", "Sports & Physical Education"]]];

const TEMPLATES: Record<InstituteKind, Group[]> = {
  engineering: [COMPUTING, ELECTRICAL, MECHANICAL, CIVIL, CHEMBIO, MATERIALS, SCIENCES, MGMT_DESIGN, FACILITIES],
  university: [COMPUTING, ELECTRICAL, MECHANICAL, CIVIL, CHEMBIO, LIFE_SCIENCES, PHYSICAL_SCIENCES, ARTS, COMMERCE, FACILITIES],
  polytechnic: [["Diploma branches", [["CE", "Civil Engineering"], ["ME", "Mechanical Engineering"], ["EE", "Electrical Engineering"], ["ECE", "Electronics Engineering"], ["CSE", "Computer Engineering"], ["IT", "Information Technology"], ["AU", "Automobile Engineering"], ["CHE", "Chemical Engineering"]]], ["Workshops", [["WKS", "Central Workshop"]]], BASIC_FACILITIES],
  medical: [PRECLINICAL, CLINICAL, ALLIED, BASIC_FACILITIES],
  arts_science: [PHYSICAL_SCIENCES, LIFE_SCIENCES, ARTS, COMMERCE, BASIC_FACILITIES],
  management: [MANAGEMENT, ["Facilities", [["MEDIA", "Media Lab"], ["LIB", "Library"]]]],
  research: [RESEARCH, BASIC_FACILITIES],
  school: [SCHOOL],
  community: [COMMUNITY],
};

/** The departments a new institute of this kind starts with. */
export function departmentTemplate(kind: InstituteKind): { code: string; name: string }[] {
  const seen = new Set<string>();
  return TEMPLATES[kind].flatMap(([, depts]) => depts).filter(([code]) => !seen.has(code) && !!seen.add(code)).map(([code, name]) => ({ code, name }));
}

/** Group label for a department code, for the picker. First template that lists the code wins. */
const GROUP_OF = new Map<string, string>();
for (const groups of Object.values(TEMPLATES)) for (const [label, depts] of groups) for (const [code] of depts) if (!GROUP_OF.has(code)) GROUP_OF.set(code, label);
const GROUP_ORDER = [...new Set([...GROUP_OF.values()])];

export function groupOf(code: string) {
  return GROUP_OF.get(code) ?? "Other";
}
export function groupRank(label: string) {
  const i = GROUP_ORDER.indexOf(label);
  return i < 0 ? GROUP_ORDER.length : i;
}

/** Training every institute starts with. Admins and owners attach these to resources and verify them per student. */
export function starterBadges(kind: InstituteKind): { code: string; name: string; description: string; validity_days: number }[] {
  const common = [
    { code: "SAFE", name: "Lab Safety Induction", description: "Fire exits, first aid, PPE and reporting accidents.", validity_days: 365 },
    { code: "EQUIP", name: "Equipment Handling", description: "Booking etiquette, care of shared equipment and how to report damage.", validity_days: 365 },
  ];
  const extra: Partial<Record<InstituteKind, typeof common>> = {
    engineering: [
      { code: "3DP", name: "3D Printer Safety Induction", description: "Filament handling, bed levelling, heated-nozzle safety and print monitoring.", validity_days: 365 },
      { code: "ELEC", name: "Electronics Lab Basics", description: "ESD precautions, probe handling, bench power limits.", validity_days: 365 },
    ],
    polytechnic: [{ code: "WKS", name: "Workshop Machine Safety", description: "Lathe, drill and grinder safety; guards and stop switches.", validity_days: 365 }],
    medical: [{ code: "BSL2", name: "Biosafety Level 2", description: "Sample handling, biohazard disposal and spill response.", validity_days: 365 }],
    arts_science: [{ code: "CHEMSAFE", name: "Chemistry Lab Safety", description: "Chemical storage, fume hoods and waste disposal.", validity_days: 365 }],
    research: [{ code: "INSTR", name: "Instrument Operator Training", description: "Operating the facility’s instruments under the lab’s SOPs.", validity_days: 365 }],
    school: [{ code: "ATL", name: "Tinkering Lab Induction", description: "Tools, soldering and 3D printer basics under a teacher.", validity_days: 365 }],
    community: [{ code: "WKS", name: "Workshop Machine Safety", description: "Power tools, guards and stop switches.", validity_days: 365 }],
  };
  return [...common, ...(extra[kind] ?? [])];
}
