import { ButtonLink, Card } from "@/components/ui";
import { requireUser, homeFor } from "@/lib/auth";

export default async function ForbiddenPage() {
  const user = await requireUser();
  return (
    <Card className="mx-auto max-w-lg p-8 text-center">
      <p className="text-sm text-danger">403 · Not permitted</p>
      <h1 className="mt-2 font-display text-3xl">This area is for another role</h1>
      <p className="mt-2 text-ink-2">
        Baanto checks your role on every page and in the database, so this view stays private to the people responsible for it.
      </p>
      <ButtonLink href={homeFor(user.role)} className="mt-6">
        Go to my home
      </ButtonLink>
    </Card>
  );
}
