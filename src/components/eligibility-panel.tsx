import { CheckCircle2, Info, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import type { EligibilityResult } from "@/lib/domain/eligibility";
import { checkFix, checkLabel, checkReason } from "@/i18n/explain";

export function EligibilityPanel({ result }: { result: EligibilityResult }) {
  const t = useTranslations();
  return (
    <ul className="space-y-3">
      {result.checks.map((c) => {
        const Icon = !c.blocking ? Info : c.passed ? CheckCircle2 : XCircle;
        const color = !c.blocking ? "text-info" : c.passed ? "text-ok" : "text-danger";
        const fix = checkFix(t, c);
        return (
          <li key={c.id} className="flex gap-3">
            <Icon className={`mt-0.5 size-5 shrink-0 ${color}`} aria-hidden />
            <div className="text-sm">
              <p className="font-medium text-ink">
                <span className="sr-only">{t(`Eligibility.${!c.blocking ? "note" : c.passed ? "passed" : "missing"}`)} </span>
                {checkLabel(t, c)}
              </p>
              <p className="text-ink-2">{checkReason(t, c)}</p>
              {fix && <p className="mt-0.5 text-accent">→ {fix}</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
