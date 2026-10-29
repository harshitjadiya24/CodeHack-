import type { Metadata } from "next";
import { ButtonLink, Card, PageHeader, Pill } from "@/components/ui";
import { requirePageRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { VerifyUserForm } from "./verify-form";
import { RoleForm } from "./role-form";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("People"))("title") };
}

export default async function PeoplePage() {
  const admin = await requirePageRole(["admin"]);
  const db = createAdminClient();
  const [{ data: people }, { data: badges }] = await Promise.all([
    db.from("profiles").select("id, full_name, roll_no, role, verified, strikes, dept:departments(code)").eq("org_id", admin.org_id).order("role").order("full_name"),
    db.from("user_badges").select("user_id, status, expires_at").eq("status", "verified"),
  ]);
  const [t, roles] = await Promise.all([getTranslations("People"), getTranslations("Shell.roles")]);
  const now = new Date();
  const live = new Map<string, number>();
  for (const b of badges ?? []) if (!b.expires_at || new Date(b.expires_at) > now) live.set(b.user_id, (live.get(b.user_id) ?? 0) + 1);

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")}>
        <ButtonLink href="/admin/import#register" variant="secondary">
          {t("fromRegister")}
        </ButtonLink>
      </PageHeader>
      <p className="-mt-4 mb-6 max-w-2xl text-ink-2">
        {t("intro")}
      </p>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[1040px] text-sm">
          <thead className="border-b border-rule text-left text-xs text-subtle">
            <tr>
              <th className="px-4 py-2 font-normal">{t("name")}</th>
              <th className="px-4 py-2 font-normal">{t("role")}</th>
              <th className="px-4 py-2 font-normal">{t("badges")}</th>
              <th className="px-4 py-2 font-normal">{t("strikes")}</th>
              <th className="px-4 py-2 font-normal">{t("identity")}</th>
              <th className="px-4 py-2 font-normal">{t("action")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {(people ?? []).map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-2">
                  {p.full_name}
                  <span className="block text-xs text-subtle">
                    {p.roll_no ?? t("staff")} {p.dept?.code && `· ${p.dept.code}`}
                  </span>
                </td>
                <td className="px-4 py-2 text-ink-2">{p.id === admin.id ? roles(p.role) : <RoleForm userId={p.id} role={p.role} />}</td>
                <td className="px-4 py-2 font-mono">{live.get(p.id) ?? 0}</td>
                <td className="px-4 py-2 font-mono">{p.strikes}</td>
                <td className="px-4 py-2">
                  <Pill tone={p.verified ? "ok" : "warn"}>{p.verified ? t("verified") : t("unverified")}</Pill>
                </td>
                <td className="px-4 py-2">{p.id !== admin.id && <VerifyUserForm userId={p.id} verified={p.verified} />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
