import Link from "next/link";
import Image from "next/image";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { getT } from "@/lib/i18n";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const { t } = await getT();
  return (
    <div className="relative min-h-dvh">
      <div className="pointer-events-none absolute inset-0 mesh-bg" aria-hidden />
      <div className="relative mx-auto flex min-h-dvh max-w-md flex-col px-5 py-10">
        <div className="mb-10 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <Image src="/icons/logo.svg" alt="" width={32} height={32} />
            <span className="font-display text-xl font-semibold tracking-tight">Inspector</span>
          </Link>
          <LocaleSwitcher showLabel={false} />
        </div>
        <div className="flex-1">{children}</div>
        <p className="mt-10 text-center text-xs text-muted-foreground">
          {t("marketing.footer.copy", { year: new Date().getFullYear() })}
        </p>
      </div>
    </div>
  );
}
