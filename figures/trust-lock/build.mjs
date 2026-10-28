// Fig 1 · Trust lock. Saajha's eligibility check drawn as a real lab locker:
// a Trust Passport card goes into the reader, each verified badge lifts one pin,
// and only when every pin reaches the shear line does the drawer open and the
// printer issue a hash-chained receipt. Built with the Anatomy kit.
//   node figures/trust-lock/build.mjs          → public/figures/trust-lock.html (light)
//   node figures/trust-lock/build.mjs --dark   → public/figures/trust-lock-dark.html
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../.agents/skills/anatomy/kit/iso-kit.mjs";
import { kitScript } from "../../.agents/skills/anatomy/scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "..", "public", "figures");
const theme = process.argv.includes("--dark") ? "dark" : "light";

// ── The model: the same rule Saajha's eligibility engine applies ─────────────
const BADGES = ["Verified identity", "3D Printer Safety Induction", "Good standing"];
const PEOPLE = [
  { name: "Aarav", holds: [true, false, true] },
  { name: "Meera", holds: [true, true, true] },
];

const WIDTH = 640;
const HEIGHT = 440;

// World layout, about 1 unit per px. x right-back, y left-back, z up; the viewer sits at +x +y.
const BASE = { x: -112, y: -78, w: 232, d: 168, r: 8 };
const BASE_H = 10;
const FOOT_H = 5;
const CAB = { x: -76, y: -56, w: 104, d: 86, r: 3 };
const CAB_TOP = 92;
const FRONT_Y = CAB.y + CAB.d; // drawer face plane
const DRAWER = { x: -66, w: 84, z: 14, h: 30 };
const DRAWER_OPEN = 46;
const READER = { x: -62, y: -40, w: 58, d: 44, r: 2.5 };
const READER_H = 16;
const SLOT_Z = CAB_TOP + 7;
const CARD = { y: -30, d: 26, h: 1.6 };
const CARD_OUT = 46; // visible length when ejected
const CARD_IN = 10; // visible length when seated
const PINS = [-52, -38, -24].map((x) => [x, -18]);
const PIN_R = 3.2;
const PIN_UP = 11;
const PIN_DOWN = 3;
const PRN = { x: 42, y: -50, w: 44, d: 40, r: 3 };
const PRN_H = 30;
const PAPER = { x: 54, y: -32, w: 20, d: 1.2 };
const PAPER_MAX = 54;

const READER_RIGHT = READER.x + READER.w;
const READER_TOP = CAB_TOP + READER_H;

const P = k.fitProjection(
  [
    ...k.boxCorners(BASE, -BASE_H - FOOT_H, 0),
    ...k.boxCorners(CAB, 0, CAB_TOP),
    [READER.x, READER.y, READER_TOP + PIN_UP + 2],
    [READER_RIGHT + CARD_OUT, CARD.y + CARD.d, SLOT_Z],
    [PAPER.x + PAPER.w, PAPER.y, PRN_H + PAPER_MAX],
    [DRAWER.x + DRAWER.w, FRONT_Y + DRAWER_OPEN, DRAWER.z],
  ],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 40 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (pts) => [...pts].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

// ── Static parts ─────────────────────────────────────────────────────────────
function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BASE, -BASE_H - FOOT_H, BASE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(BASE, 20))) {
    out.push(S(k.cylinder(x, y, 7, -BASE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.2, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(BASE, -BASE_H, BASE_H, P, 8, 1.4), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(BASE, 5), 0, P), { tone: "faint" }));
  const screws = k.corners(BASE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // Ruler strip along the front edge: the drawer's travel is read against it.
  const strip = { x: BASE.x + 14, y: BASE.y + BASE.d - 14, w: 120, d: 7, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [2, 3.6], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2, strip.y + 3.5, 0.6]), at([strip.x + strip.w - 2, strip.y + 3.5, 0.6])], { size: 0.45 }));
  // Label plate with three rule lines (printed text).
  const label = { x: BASE.x + BASE.w - 58, y: BASE.y + BASE.d - 26, w: 42, d: 16, r: 1.5 };
  out.push(S(k.slabOf(label, 0, 0.8, P, 3, 0.3), { tone: "lo" }));
  [4, 8, 12].forEach((dy, i) => out.push(L(k.lineOnTop([label.x + 5, label.y + dy], [label.x + (i === 2 ? 22 : 36), label.y + dy], 0.8, P), { tone: "lo", free: true })));
  out.push(D(k.corners(label, 2).map(([x, y]) => at([x, y, 0.8])), { size: 0.4 }));
  return out.join("");
}

function cabinet() {
  const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(CAB, -2), 0, 0.1, P)}" style="filter:blur(3px)"/>`];
  // Plinth, body, cap.
  out.push(S(k.slabOf(k.insetPlan(CAB, -2), 0, 4, P, 4, 0.5), { tone: "lo" }));
  out.push(S(k.slabOf(CAB, 4, CAB_TOP - 8, P, 4, 0), { tone: "mid", inner: L(k.sideSeam(CAB, 60, P, 4), { tone: "faint" }) }));
  out.push(S(k.slabOf(k.insetPlan(CAB, -1.5), CAB_TOP - 4, 4, P, 4, 0.6), { tone: "mid" }));
  // Front face: drawer opening frame and the panel above it.
  const face = (x, z) => [x, FRONT_Y, z];
  const opening = [face(DRAWER.x - 2, DRAWER.z - 2), face(DRAWER.x + DRAWER.w + 2, DRAWER.z - 2), face(DRAWER.x + DRAWER.w + 2, DRAWER.z + DRAWER.h + 2), face(DRAWER.x - 2, DRAWER.z + DRAWER.h + 2)];
  out.push(`<path class="iso-line" data-tone="lo" d="M${opening.map((p) => at(p).join(" ")).join("L")}Z"/>`);
  // Vents: closed slots on the upper front panel.
  for (let i = 0; i < 6; i++) {
    const x0 = DRAWER.x + 8 + i * 12;
    const slot = [face(x0, 58), face(x0 + 7, 58), face(x0 + 7, 76), face(x0, 76)];
    out.push(`<path class="iso-line" data-tone="lo" d="M${slot.map((p) => at(p).join(" ")).join("L")}Z"/>`);
  }
  // Rivets down the front corners.
  const rivets = [];
  for (const x of [CAB.x + 4, CAB.x + CAB.w - 4]) for (const z of [10, 30, 50, 70, 84]) rivets.push(at(face(x, z)));
  out.push(D(rivets, { size: 0.45, tone: "lo" }));
  // Hinge knuckles on the right side face.
  for (const z of [22, 66]) {
    out.push(S(k.cylinder(CAB.x + CAB.w + 1.2, FRONT_Y - 6, 1.6, z, 10, P, 16), { tone: "mid" }));
  }
  // Lock bolt housing beside the drawer: where the pins' verdict becomes motion.
  out.push(S(k.slabOf({ x: DRAWER.x + DRAWER.w + 4, y: FRONT_Y - 2, w: 6, d: 3, r: 0.8 }, DRAWER.z + 8, 14, P, 2, 0.3), { tone: "mid" }));
  return out.join("");
}

function reader() {
  const out = [];
  out.push(S(k.slabOf(READER, CAB_TOP, READER_H, P, 4, 0.8), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(READER, 3.5), READER_TOP, P, 4), { tone: "faint" }));
  // Card slot on the right face, and its bezel.
  const slot = [[READER_RIGHT, CARD.y - 2, SLOT_Z - 1.4], [READER_RIGHT, CARD.y + CARD.d + 2, SLOT_Z - 1.4], [READER_RIGHT, CARD.y + CARD.d + 2, SLOT_Z + CARD.h + 1.4], [READER_RIGHT, CARD.y - 2, SLOT_Z + CARD.h + 1.4]];
  out.push(`<path class="iso-line" data-tone="mid" d="M${slot.map((p) => at(p).join(" ")).join("L")}Z"/>`);
  // Pin bores with their shear-line rings.
  for (const [x, y] of PINS) {
    out.push(L(k.ring(x, y, PIN_R + 1.6, READER_TOP, P, 24), { tone: "lo" }));
  }
  // Status lamp and screws.
  out.push(S(k.cylinder(READER.x + READER.w - 9, READER.y + READER.d - 9, 2.4, READER_TOP, 1.2, P, 20), { tone: "lo" }));
  out.push(D(k.corners(READER, 2.6).map(([x, y]) => at([x, y, READER_TOP])), { size: 0.45 }));
  return out.join("");
}

function pin(i) {
  const [x, y] = PINS[i];
  return [
    S(k.cylinder(x, y, PIN_R, READER_TOP - 6, 6, P, 24), { tone: "mid" }),
    S(k.cylinder(x, y, PIN_R + 0.6, READER_TOP, 1.4, P, 24, 0.3), { tone: "hi" }),
    L(k.sideArc(x, y, PIN_R, READER_TOP - 2, P, 16), { tone: "faint" }),
  ].join("");
}

function printer() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PRN, 0, 0.1, P)}" style="filter:blur(3px)"/>`];
  out.push(S(k.slabOf(PRN, 0, PRN_H, P, 4, 0.8), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PRN, 3.5), PRN_H, P, 4), { tone: "faint" }));
  // Paper exit slot on top and the tear bar.
  out.push(L(k.onTop([[PAPER.x - 2, PAPER.y - 1.4], [PAPER.x + PAPER.w + 2, PAPER.y - 1.4], [PAPER.x + PAPER.w + 2, PAPER.y + 2.6], [PAPER.x - 2, PAPER.y + 2.6]], PRN_H, P, true), { tone: "lo" }));
  out.push(S(k.slabOf({ x: PAPER.x - 3, y: PAPER.y + 3.4, w: PAPER.w + 6, d: 2, r: 0.6 }, PRN_H, 1.2, P, 2), { tone: "mid" }));
  // Roll cover seam, feed knob with knurl, screws.
  out.push(L(k.lineOnTop([PRN.x + 4, PRN.y + 12], [PRN.x + PRN.w - 4, PRN.y + 12], PRN_H, P), { tone: "faint" }));
  const knob = [PRN.x + PRN.w - 2, PRN.y + PRN.d - 12];
  out.push(S(k.cylinder(knob[0] + 2, knob[1], 4, 10, 5, P, 24), { tone: "mid" }));
  out.push(L(k.knurl(knob[0] + 2, knob[1], 4, 10, 15, 24, P), { tone: "lo" }));
  out.push(D(k.corners(PRN, 3).map(([x, y]) => at([x, y, PRN_H])), { size: 0.45 }));
  // Cable from printer to cabinet: a wire with terminal dots on both bodies.
  out.push(k.wireSvg(at([PRN.x, PRN.y + 30, 8]), at([CAB.x + CAB.w, CAB.y + 64, 8]), { tone: "lo", size: 1.1 }));
  return out.join("");
}

// ── Live parts (rebuilt by the page script with the same functions) ──────────
const CAM = { x: -48, w: 34, d: 22 };
function drawerSvg(open) {
  const body = Math.max(0.01, open - 3);
  const out = [];
  if (open > 3.2) {
    out.push(S(k.slabOf({ x: DRAWER.x, y: FRONT_Y, w: DRAWER.w, d: body, r: 1 }, DRAWER.z, DRAWER.h, P, 2, 0), { tone: "mid", inner: L(k.planOutline({ x: DRAWER.x + 3, y: FRONT_Y, w: DRAWER.w - 6, d: Math.max(0.01, body), r: 0.8 }, DRAWER.z + DRAWER.h, P, 2), { tone: "lo" }) }));
  }
  // Camera kit in the tray: only the part already out of the cabinet is visible.
  const reveal = Math.min(1, Math.max(0, (open - 30) / 12));
  if (reveal > 0) {
    const cy = FRONT_Y + open - 3 - CAM.d - 3;
    out.push(`<g opacity="${reveal.toFixed(2)}">`);
    out.push(S(k.slabOf({ x: CAM.x, y: cy, w: CAM.w, d: CAM.d, r: 2 }, DRAWER.z + DRAWER.h - 18, 12, P, 4, 0.5), { tone: "hi", lit: true }));
    out.push(S(k.cylinder(CAM.x + CAM.w * 0.62, cy + CAM.d / 2, 6.5, DRAWER.z + DRAWER.h - 6, 5, P, 32, 0.4), { tone: "hi", lit: true }));
    out.push(L(k.ring(CAM.x + CAM.w * 0.62, cy + CAM.d / 2, 3.6, DRAWER.z + DRAWER.h - 1, P, 24), { tone: "mid" }));
    out.push(`</g>`);
  }
  // Drawer front panel and handle ride with the drawer.
  const front = { x: DRAWER.x, y: FRONT_Y + open - 3, w: DRAWER.w, d: 3, r: 0.8 };
  out.push(S(k.slabOf(front, DRAWER.z, DRAWER.h, P, 2, 0.4), { tone: "mid" }));
  out.push(S(k.slabOf({ x: DRAWER.x + 24, y: front.y + 3, w: 36, d: 3, r: 1.2 }, DRAWER.z + 18, 4, P, 3, 0.3), { tone: "mid" }));
  const card = { x: DRAWER.x + 6, z: DRAWER.z + 6 };
  const plate = [[card.x, front.y + 3, card.z], [card.x + 14, front.y + 3, card.z], [card.x + 14, front.y + 3, card.z + 7], [card.x, front.y + 3, card.z + 7]];
  out.push(`<path class="iso-line" data-tone="lo" d="M${plate.map((p) => k.iso(p, P).join(" ")).join("L")}Z"/>`);
  return out.join("");
}

function cardSvg(visible) {
  const plan = { x: READER_RIGHT, y: CARD.y, w: visible, d: CARD.d, r: 1.2 };
  return [
    S(k.slabOf(plan, SLOT_Z, CARD.h, P, 3, 0.3), { tone: "hi", lit: true }),
    L(k.lineOnTop([READER_RIGHT + Math.max(2, visible - 14), CARD.y + 6], [READER_RIGHT + visible - 4, CARD.y + 6], SLOT_Z + CARD.h, P), { tone: "lo", free: true }),
    L(k.planOutline({ x: READER_RIGHT + Math.max(1, visible - 12), y: CARD.y + 11, w: 8, d: 10, r: 1 }, SLOT_Z + CARD.h, P, 2), { tone: "lo" }),
  ].join("");
}

function paperSvg(len) {
  if (len < 0.5) return "";
  const top = PRN_H + len;
  const out = [S(k.slabOf({ ...PAPER, r: 0.3 }, PRN_H, len, P, 2, 0), { tone: "hi", crease: "none" })];
  // Printed lines: entry rows with a hash tail (rule lines that stand for text).
  for (let z = top - 5, row = 0; z > PRN_H + 3; z -= 5, row++) {
    const from = [PAPER.x + 3, PAPER.y + PAPER.d, z];
    const to = [PAPER.x + (row % 3 === 2 ? 11 : 17), PAPER.y + PAPER.d, z];
    out.push(`<path class="iso-line" data-tone="${row === 0 ? "mid" : "lo"}" data-free="" d="M${k.iso(from, P).join(" ")}L${k.iso(to, P).join(" ")}"/>`);
  }
  return out.join("");
}

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A lab equipment locker with a Trust Passport card reader on top. When a card is inserted, one pin rises for each verified badge on it. If every pin reaches the shear line, the drawer holding a camera kit slides open and a small printer beside the locker issues a receipt; if any badge is missing, that pin stays down and the drawer stays locked.",
  body: [
    base(),
    cabinet(),
    reader(),
    ...PINS.map((_, i) => `<g data-part="pin-${i}" transform="${k.translateAlong(P, [0, 0, PIN_DOWN])}">${pin(i)}</g>`),
    printer(),
    `<g data-part="paper"></g>`,
    `<g data-part="card">${cardSvg(CARD_OUT)}</g>`,
    `<g data-part="drawer">${drawerSvg(0)}</g>`,
  ],
});

// ── Live behaviour: a calm tour that alternates the two passports ────────────
const live = `
const P = ${JSON.stringify(P)};
const PEOPLE = ${JSON.stringify(PEOPLE)};
const BADGES = ${JSON.stringify(BADGES)};
const DRAWER = ${JSON.stringify(DRAWER)}, FRONT_Y = ${FRONT_Y}, DRAWER_OPEN = ${DRAWER_OPEN}, CAM = ${JSON.stringify(CAM)};
const READER_RIGHT = ${READER_RIGHT}, CARD = ${JSON.stringify(CARD)}, SLOT_Z = ${SLOT_Z}, CARD_IN = ${CARD_IN}, CARD_OUT = ${CARD_OUT};
const PAPER = ${JSON.stringify(PAPER)}, PRN_H = ${PRN_H}, PAPER_MAX = ${PAPER_MAX}, PIN_UP = ${PIN_UP}, PIN_DOWN = ${PIN_DOWN};
const S = (paths, style) => solidSvg(paths, style);
const L = (d, style) => lineSvg(d, style);
const k = { slabOf, cylinder, ring, planOutline, lineOnTop, iso };
${drawerSvg.toString()}
${cardSvg.toString()}
${paperSvg.toString()}
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const part = (n) => svg.querySelector('[data-part="' + n + '"]');
const pins = [0, 1, 2].map((i) => part("pin-" + i));
const drawerEl = part("drawer"), cardEl = part("card"), paperEl = part("paper");
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const follow = (v, t, dt, s) => (still.matches ? t : v + (t - v) * (1 - Math.exp(-dt / s)));

let who = 0, phase = "eject", clock = 0, last = 0, frame = 0, visible = false, manual = 0;
const s = { card: CARD_OUT, pins: [PIN_DOWN, PIN_DOWN, PIN_DOWN], drawer: 0, paper: 0 };
const drawn = { card: -1, drawer: -1, paper: -1, pins: [-1, -1, -1] };
const person = () => PEOPLE[who];
const granted = () => person().holds.every(Boolean);

function targets() {
  const seated = phase === "check" || phase === "hold";
  return {
    card: seated ? CARD_IN : CARD_OUT,
    pins: person().holds.map((h) => (seated && h ? PIN_UP : PIN_DOWN)),
    drawer: seated && granted() ? DRAWER_OPEN : 0,
    paper: seated && granted() ? PAPER_MAX : 0,
  };
}
function say() {
  const p = person();
  let text = p.name + " · card out";
  if (phase === "check" || phase === "hold") {
    const missing = p.holds.map((h, i) => (h ? null : BADGES[i])).filter(Boolean);
    text = p.name + " · " + p.holds.filter(Boolean).length + "/3 pins · " + (missing.length ? "no induction · locked" : "open · receipt printed");
  }
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuetext", text);
}
function draw() {
  if (Math.abs(drawn.card - s.card) > 0.05) { cardEl.innerHTML = cardSvg(s.card); drawn.card = s.card; }
  if (Math.abs(drawn.drawer - s.drawer) > 0.05) { drawerEl.innerHTML = drawerSvg(s.drawer); drawn.drawer = s.drawer; }
  if (Math.abs(drawn.paper - s.paper) > 0.05) { paperEl.innerHTML = paperSvg(s.paper); drawn.paper = s.paper; }
  s.pins.forEach((z, i) => { if (Math.abs(drawn.pins[i] - z) > 0.02) { pins[i].setAttribute("transform", translateAlong(P, [0, 0, z])); drawn.pins[i] = z; } });
  pins.forEach((el, i) => el.toggleAttribute("data-lit", s.pins[i] > PIN_UP - 0.6));
  say();
}
const SCRIPT = [["eject", 1.4], ["check", 1.6], ["hold", 3.6]];
function advance(dt) {
  if (manual > 0) { manual -= dt; return; }
  clock += dt;
  const step = SCRIPT.find(([name]) => name === phase);
  if (clock < step[1]) return;
  clock = 0;
  const i = SCRIPT.indexOf(step);
  if (i === SCRIPT.length - 1) { phase = "eject"; who = (who + 1) % PEOPLE.length; }
  else phase = SCRIPT[i + 1][0];
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (!still.matches) advance(dt);
  const t = targets();
  s.card = follow(s.card, t.card, dt, 0.32);
  s.pins = s.pins.map((z, i) => follow(z, t.pins[i], dt, 0.16 + i * 0.05));
  const pinsSet = s.pins.every((z, i) => Math.abs(z - t.pins[i]) < 0.3);
  s.drawer = follow(s.drawer, pinsSet ? t.drawer : 0, dt, 0.45);
  s.paper = follow(s.paper, s.drawer > DRAWER_OPEN * 0.6 ? t.paper : t.paper ? s.paper : 0, dt, 0.6);
  draw();
  frame = visible ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
const swap = () => { who = (who + 1) % PEOPLE.length; phase = "check"; clock = 0; manual = 6; run(); };
stage.addEventListener("click", swap);
stage.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); swap(); } });
if (still.matches) { who = 1; phase = "hold"; }
draw();
`;

const body = k.plateHtml({
  fig: "Fig 1",
  title: "Trust lock",
  hint: "Click to swap passport",
  readout: "Aarav · card out",
  keys: [
    { mark: "lit", label: "Passport card, and the camera kit it unlocks" },
    { mark: "raised", label: "Three pins: verified identity, induction badge, good standing" },
  ],
  caption:
    "Saajha's eligibility check as a lab locker. Each verified badge on a Trust Passport lifts one pin; the drawer opens only when all three reach the shear line, and the printer issues a receipt whose lines are chained to the one before. Aarav has no induction badge, so his middle pin stays down.",
  body: `<div class="iso-stage" tabindex="0" role="button" aria-label="Trust lock: press Enter to swap between Aarav's and Meera's passport">${svg}</div>`,
});

mkdirSync(OUT, { recursive: true });
const file = theme === "light" ? "trust-lock.html" : "trust-lock-dark.html";
const page = k.pageHtml({ title: "Trust lock · Saajha", theme, body, script: kitScript() + live });
writeFileSync(join(OUT, file), page.replace("</style>", `body{background:transparent!important}.iso-page{margin:16px auto}[data-part^="pin-"][data-lit] .iso-top{fill:var(--anatomy-lit-top)}[data-part^="pin-"][data-lit] .iso-edge{stroke:var(--anatomy-lit)}</style>`));
console.log("wrote", join("public/figures", file));
