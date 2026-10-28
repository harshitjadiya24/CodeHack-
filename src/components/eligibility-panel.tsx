import { CheckCircle2, Info, XCircle } from "lucide-react";
import type { EligibilityResult } from "@/lib/domain/eligibility";

export function EligibilityPanel({ result }: { result: EligibilityResult }) {
  return (
    <ul className="space-y-3">
      {result.checks.map((c) => {
        const Icon = !c.blocking ? Info : c.passed ? CheckCircle2 : XCircle;
        const color = !c.blocking ? "text-info" : c.passed ? "text-ok" : "text-danger";
        return (
          <li key={c.id} className="flex gap-3">
            <Icon className={`mt-0.5 size-5 shrink-0 ${color}`} aria-hidden />
            <div className="text-sm">
              <p className="font-medium text-ink">
                <span className="sr-only">{!c.blocking ? "Note: " : c.passed ? "Passed: " : "Missing: "}</span>
                {c.label}
              </p>
              <p className="text-ink-2">{c.reason}</p>
              {c.howToFix && <p className="mt-0.5 text-accent">→ {c.howToFix}</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
