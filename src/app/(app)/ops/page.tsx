import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { Card, EmptyState, PageHeader, Pill, type Tone } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { INSTITUTE_KINDS, type InstituteKind } from "@/lib/india";
import { formatCampus } from "@/lib/domain/time";
import { institutesForReview, isPlatformStaff } from "@/lib/services/review";
import { ReviewForm } from "./review-form";

export const metadata: Metadata = { title: "Institutes" };

const STATUS: Record<string, { label: string; tone: Tone }> = {
  pending: { label: "Pending review", tone: "warn" },
  domain_verified: { label: "Domain matched", tone: "info" },
  active: { label: "Approved", tone: "ok" },
  suspended: { label: "Suspended", tone: "danger" },
};

export default async function OpsPage() {
  const user = await requireUser();
  if (!(await isPlatformStaff(user.id))) redirect("/forbidden");
  const institutes = await institutesForReview();
  const waiting = institutes.filter((i) => i.status === "pending" || i.status === "domain_verified");
  const rest = institutes.filter((i) => !waiting.includes(i));

  return (
    <>
      <PageHeader eyebrow="Baanto team" title="Institutes on Baanto" />
      <p className="-mt-4 mb-8 max-w-2xl text-ink-2">
        A new institute works for its own campus at once, but other campuses only see it after someone here has checked it is real. Check the website, the
        AISHE code on aishe.gov.in, and whether the person registering plausibly works there.
      </p>

      <section aria-labelledby="waiting" className="mb-12">
        <h2 id="waiting" className="mb-3 text-base font-bold">
          Waiting for review ({waiting.length})
        </h2>
        {waiting.length === 0 ? (
          <EmptyState title="Nothing to review">Newly registered institutes appear here.</EmptyState>
        ) : (
          <div className="space-y-3">
            {waiting.map((i) => (
              <Card key={i.id} className="space-y-4 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold">{i.name}</h3>
                    <p className="text-sm text-subtle">
                      {INSTITUTE_KINDS[i.kind as InstituteKind] ?? i.kind} · {i.city}, {i.state} · registered {formatCampus(i.created_at)}
                    </p>
                  </div>
                  <Pill tone={STATUS[i.status]?.tone ?? "neutral"}>{STATUS[i.status]?.label ?? i.status}</Pill>
                </div>
                <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <dt className="text-subtle">Website</dt>
                    <dd>
                      {i.website ? (
                        <a href={`https://${i.website}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold underline underline-offset-4">
                          {i.website} <ExternalLink className="size-3.5" aria-hidden />
                        </a>
                      ) : (
                        "None given"
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-subtle">AISHE code</dt>
                    <dd className="font-semibold">{i.aishe_code ?? "None given"}</dd>
                  </div>
                  <div>
                    <dt className="text-subtle">Registered by</dt>
                    <dd className="font-semibold">{i.registeredBy ?? "Unknown"}</dd>
                  </div>
                  <div>
                    <dt className="text-subtle">Their email</dt>
                    <dd className="font-semibold">
                      <span className="break-all">{i.email ?? "Unknown"}</span>{" "}
                      <span className={`font-normal ${i.emailOnDomain ? "text-ok" : "text-warn"}`}>
                        ({i.emailOnDomain ? "on the website’s domain" : "not on the website’s domain"})
                      </span>
                    </dd>
                  </div>
                </dl>
                <p className="text-sm text-subtle">
                  {i.counts.people} {i.counts.people === 1 ? "person" : "people"} · {i.counts.departments} departments · {i.counts.resources} resources listed. The
                  email isn’t checked by Baanto, so treat a matching domain as a hint, not proof.
                </p>
                <ReviewForm orgId={i.id} status={i.status} />
              </Card>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="all">
        <h2 id="all" className="mb-3 text-base font-bold">
          Everyone else ({rest.length})
        </h2>
        <Card className="divide-y divide-rule">
          {rest.map((i) => (
            <div key={i.id} className="grid gap-3 px-5 py-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  {i.name} <Pill tone={STATUS[i.status]?.tone ?? "neutral"}>{STATUS[i.status]?.label ?? i.status}</Pill>
                </p>
                <p className="text-sm text-subtle">
                  {i.city}, {i.state} · {i.counts.people} people · {i.counts.resources} resources
                </p>
              </div>
              <div className="lg:w-[460px]">
                <ReviewForm orgId={i.id} status={i.status} />
              </div>
            </div>
          ))}
        </Card>
      </section>
    </>
  );
}
