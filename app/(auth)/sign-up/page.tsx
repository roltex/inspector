import Link from "next/link";
import { SignUpForm } from "./sign-up-form";
import { getT } from "@/lib/i18n";

export const metadata = { title: "Create account" };

export default async function SignUpPage() {
  const { t } = await getT();
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold tracking-tight">{t("auth.signUp.title")}</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">{t("auth.signUp.subtitle")}</p>
      <div className="mt-8">
        <SignUpForm />
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("auth.signUp.haveAccount")}{" "}
        <Link href="/sign-in" className="font-medium text-primary hover:underline">
          {t("auth.signUp.signInLink")}
        </Link>
      </p>
    </div>
  );
}
