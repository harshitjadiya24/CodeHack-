import "server-only";
import { GoogleGenAI } from "@google/genai";
import { allow, clientIp } from "@/lib/rate-limit";

// Gemini (free tier) behind a small advisory interface. Every caller has a rule-based
// fallback, so the product works with no key, and AI output is never a decision.

const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";
// The larger model is often busy at peak hours (503); the lite one usually still answers.
const MODELS = [MODEL, "gemini-3.5-flash-lite"];

export function aiEnabled(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

let client: GoogleGenAI | null = null;
function gemini() {
  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  return client;
}

/** Asks for JSON and parses it; returns null on any failure so callers fall back. */
export async function askJson<T>(prompt: string, image?: { data: string; mimeType: string }): Promise<T | null> {
  if (!aiEnabled()) return null;
  if (!(await allow("ai", await clientIp()))) return null;
  const parts: ({ text: string } | { inlineData: { data: string; mimeType: string } })[] = [{ text: prompt }];
  if (image) parts.push({ inlineData: image });
  for (const model of new Set(MODELS)) {
    try {
      const res = await Promise.race([
        gemini().models.generateContent({
          model,
          contents: [{ role: "user", parts }],
          config: { responseMimeType: "application/json", temperature: 0.2 },
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("AI timeout")), 8_000)),
      ]);
      return JSON.parse(res.text ?? "null") as T;
    } catch (e) {
      console.error(`[ai] ${model} failed:`, e instanceof Error ? e.message : e);
    }
  }
  return null;
}

// ── Smart match ───────────────────────────────────────────────────────────────
export type MatchCandidate = { id: string; name: string; category: string; description: string; location: string };
export type Match = { id: string; reason: string };
export type MatchResult = { matches: Match[]; source: "ai" | "keywords" };

const STOP = new Set(["i", "a", "an", "the", "to", "for", "and", "of", "my", "need", "want", "some", "with", "on", "in", "it", "is", "can", "use"]);

export function keywordMatch(query: string, candidates: MatchCandidate[]): Match[] {
  const words = query.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w));
  return candidates
    .map((c) => {
      const hay = `${c.name} ${c.category} ${c.description}`.toLowerCase();
      const hits = words.filter((w) => hay.includes(w));
      return { id: c.id, score: hits.length, reason: hits.length ? `Mentions ${hits.slice(0, 3).join(", ")}.` : "" };
    })
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ id, reason }) => ({ id, reason }));
}

export async function matchResources(query: string, candidates: MatchCandidate[]): Promise<MatchResult> {
  const catalogue = candidates.map((c) => `- id=${c.id} | ${c.name} | ${c.category} | ${c.description}`).join("\n");
  const ai = await askJson<{ matches: Match[] }>(
    `You help university students find campus equipment or spaces.
Need: """${query.slice(0, 500)}"""
Catalogue:
${catalogue}
Return JSON {"matches":[{"id":"<catalogue id>","reason":"<one sentence why it fits the need>"}]} with at most 3 best matches, best first. Use only ids from the catalogue. If nothing fits, return {"matches":[]}.`,
  );
  const valid = new Set(candidates.map((c) => c.id));
  if (ai?.matches) return { matches: ai.matches.filter((m) => valid.has(m.id)).slice(0, 3), source: "ai" };
  return { matches: keywordMatch(query, candidates), source: "keywords" };
}

// ── Listing draft from a photo ────────────────────────────────────────────────
export type ListingDraft = { name: string; category: string; description: string; rules: string; checklist: string[]; photoSlots: string[] };

export async function draftListingFromPhoto(image: { data: string; mimeType: string }): Promise<ListingDraft | null> {
  return askJson<ListingDraft>(
    `This photo shows a piece of equipment or a room that a university lab wants to lend to students.
Draft a listing as JSON: {"name": "...", "category": one of ["3D Printing","Laser Cutting","Test & Measurement","Electronics","Media","XR","Compute","Rooms","Workspace","Fabrication"],
"description": "1-2 factual sentences", "rules": "2-3 safety and care rules", "checklist": ["4 condition items checked at each handover"], "photoSlots": ["3 photo angles that reveal damage"]}.
Only describe what is visible or standard for this kind of item. The owner will review and edit everything.`,
    image,
  );
}

// ── Incident summary ──────────────────────────────────────────────────────────
export async function summariseIncident(text: string): Promise<{ summary: string; suggestedSeverity: "low" | "medium" | "high" } | null> {
  return askJson(
    `Summarise this lab incident report for a manager in at most 2 sentences and suggest a severity (low, medium or high).
Return JSON {"summary":"...","suggestedSeverity":"low|medium|high"}. Do not recommend penalties.
Report: """${text.slice(0, 2000)}"""`,
  );
}
