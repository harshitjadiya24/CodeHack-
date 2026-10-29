import type { Metadata } from "next";
import QRCode from "qrcode";
import { BadgeCheck, Clock, XCircle } from "lucide-react";
import { Card, PageHeader, Pill } from "@/components/ui";
import { BadgeRequestForm } from "@/components/governance-forms";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MAX_STRIKES } from "@/lib/domain/eligibility";
import { siteOrigin } from "@/lib/site";
import { PassportOffline } from "@/components/passport-offline";
import { getLocale, getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("Passport"))("title") };
}

export default async function PassportPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { welcome } = await searchParams;
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: badges }, { data: mine }, { data: unlocks }] = await Promise.all([
    supabase.from("skill_badges").select("*").eq("org_id", user.org_id).order("name"),
    supabase.from("user_badges").select("*").eq("user_id", user.id),
    supabase.from("resource_requirements").select("badge_id, resource:resources(name)"),
  ]);

  const qrUrl = `${await siteOrigin()}/verify/passport/${user.id}`;
  const qrSvg = await QRCode.toString(qrUrl, { type: "svg", margin: 0, color: { dark: "#1d1b16", light: "#00000000" } });
  const now = new Date();
  const t = await getTranslations("Passport");
  const dateLocale = (await getLocale()) === "hi" ? "hi-IN" : "en-IN";

  return (
    <>
      <PassportOffline />
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} />
      {welcome && (
        <div role="status" className="mb-8 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[22px] border border-rule bg-board-soft px-5 py-4">
          <span className="board-chip chart-code rounded-full px-2 py-0.5 text-sm">{t("welcomeTag")}</span>
          <p className="flex-1 text-[15px] text-ink">
            {t("welcome", { name: user.full_name.split(" ")[0] })}
          </p>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <ul className="gap-4 sm:columns-2">
          {(badges ?? []).map((badge) => {
            const held = mine?.find((m) => m.badge_id === badge.id);
            const expired = held?.expires_at ? new Date(held.expires_at) <= now : false;
            const state = !held ? "none" : held.status === "verified" && !expired ? "verified" : expired ? "expired" : held.status;
            const opens = (unlocks ?? []).filter((u) => u.badge_id === badge.id).map((u) => u.resource?.name).filter(Boolean);
            return (
              <li key={badge.id} className="mb-4 break-inside-avoid">
                <Card className={`p-5 ${state === "verified" ? "border-ok/40" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-bold">{badge.name}</h2>
                    {state === "verified" && (
                      <Pill tone="ok">
                        <BadgeCheck className="size-3" aria-hidden /> {t("verified")}
                      </Pill>
                    )}
                    {state === "pending" && (
                      <Pill tone="warn">
                        <Clock className="size-3" aria-hidden /> {t("review")}
                      </Pill>
                    )}
                    {(state === "rejected" || state === "expired") && (
                      <Pill tone="danger">
                        <XCircle className="size-3" aria-hidden /> {state === "expired" ? t("expired") : t("rejected")}
                      </Pill>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-ink-2">{badge.description}</p>
                  {opens.length > 0 && <p className="mt-2 text-xs text-subtle">{t("unlocks", { list: opens.join(", ") })}</p>}
                  {state === "verified" && held?.expires_at && <p className="mt-2 text-xs text-ok">
                      {t("validUntil", {
                        date: new Intl.DateTimeFormat(dateLocale, { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" }).format(new Date(held.expires_at)),
                      })}
                    </p>}
                  {state === "rejected" && held?.note && <p className="mt-2 text-sm text-danger">{t("reviewer", { note: held.note })}</p>}
                  {["none", "rejected", "expired"].includes(state) && <BadgeRequestForm badgeId={badge.id} />}
                </Card>
              </li>
            );
          })}
        </ul>

        <aside className="space-y-4">
          <figure className="overflow-hidden rounded-[22px] border border-rule bg-card text-center">
            <figcaption className="chart-code flex justify-between bg-board px-4 py-3 text-[15px] text-board-ink">
              <span>{t("labPass")}</span>
              <span className="tab">{user.roll_no}</span>
            </figcaption>
            <div className="p-5">
              <div className="mx-auto w-44 rounded-xl bg-white p-2" dangerouslySetInnerHTML={{ __html: qrSvg }} />
              <p className="type-h3 mt-4">{user.full_name}</p>
              <p className="mt-2 text-sm text-subtle">{t("scanNote")}</p>
            </div>
          </figure>
          <Card className="p-5">
            <h2 className="font-bold">{t("standing")}</h2>
            <p className="mt-1 text-sm text-ink-2">
              {t("strikes", { count: user.strikes, max: MAX_STRIKES })}
            </p>
          </Card>
        </aside>
      </div>
    </>
  );
}
