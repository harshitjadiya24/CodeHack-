// Rule-based condition comparison. Runs on every return; the AI layer (when configured)
// adds a photo comparison on top, but this always works and is fully explainable.

const DAMAGE_WORDS = /\b(scratch|crack|broken|dent|missing|burn|chip|leak|loose|stuck|damage|bent|torn|stain)/i;

export type ConditionDiff = { flag: boolean; summary: string; regressions: string[] };

export function compareCondition(args: {
  items: string[];
  before: Record<string, boolean>;
  after: Record<string, boolean>;
  returnNotes: string;
}): ConditionDiff {
  const regressions = args.items.filter((item) => args.before[item] !== false && args.after[item] === false);
  const alreadyBad = args.items.filter((item) => args.before[item] === false);
  const notesMention = DAMAGE_WORDS.test(args.returnNotes);

  const parts: string[] = [];
  if (regressions.length) parts.push(`Worse than at check-in: ${regressions.join("; ")}.`);
  if (alreadyBad.length) parts.push(`Already noted at check-in (not the borrower's responsibility): ${alreadyBad.join("; ")}.`);
  if (notesMention) parts.push("Return notes mention possible damage.");
  if (!parts.length) parts.push("Every checklist item matches the check-in record.");

  return { flag: regressions.length > 0 || notesMention, summary: parts.join(" "), regressions };
}
