import Link from "next/link";
import { SignInForm } from "./sign-in-form";
import { getT } from "@/lib/i18n";

export const metadata = { title: "Sign in" };

export default async function SignInPage() {
  const { t } = await getT();
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold tracking-tight">{t("auth.signIn.title")}</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">{t("auth.signIn.subtitle")}</p>
      <div className="mt-8">
        <SignInForm />
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("auth.signIn.noAccount")}{" "}
        <Link href="/sign-up" className="font-medium text-primary hover:underline">
          {t("auth.signIn.createAccount")}
        </Link>
      </p>
    </div>
  );
}
