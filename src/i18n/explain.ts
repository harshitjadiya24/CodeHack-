import type { EligibilityCheck } from "@/lib/domain/eligibility";
import type { RuleViolation } from "@/lib/domain/fairness";

// The domain explains itself in English and also hands over message codes. These turn the codes into the
// reader's language. `t` is a root translator: getTranslations() on the server, useTranslations() in a component.
type T = (key: string, values?: Record<string, string | number>) => string;

export function checkLabel(t: T, c: EligibilityCheck): string {
  return c.labelKey ? t(`Eligibility.labels.${c.labelKey}`) : c.label;
}

export function checkReason(t: T, c: EligibilityCheck): string {
  return t(`Eligibility.reasons.${c.code}`, c.values);
}

export function checkFix(t: T, c: EligibilityCheck): string | undefined {
  return c.fixCode ? t(`Eligibility.fixes.${c.fixCode}`, c.values) : undefined;
}

/** One line for an error list: what's wrong, then what to do about it. */
export function explainCheck(t: T, c: EligibilityCheck): string {
  return [checkReason(t, c), checkFix(t, c)].filter(Boolean).join(" ");
}

export function explainViolation(t: T, v: RuleViolation): string {
  return t(`Rules.${v.rule}`, v.values);
}
