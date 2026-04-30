import { redirect } from "next/navigation";
import { getSession, getUserOrganizations } from "@/lib/auth/session";
import { OnboardingForm } from "./onboarding-form";

export const metadata = { title: "Welcome" };

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session?.user) redirect("/sign-in");
  const orgs = await getUserOrganizations();
  if (orgs.length > 0) {
    redirect(`/${orgs[0]!.organization.slug}/dashboard`);
  }
  return (
    <div className="relative min-h-dvh">
      <div className="pointer-events-none absolute inset-0 mesh-bg" aria-hidden />
      <div className="relative mx-auto max-w-xl px-5 py-16">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Create your workspace
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A workspace is where your team collects inspections, incidents, permits and more.
        </p>
        <div className="mt-8 rounded-2xl border bg-card p-6 shadow-sm">
          <OnboardingForm defaultName={session.user.name ?? ""} />
        </div>
      </div>
    </div>
  );
}
