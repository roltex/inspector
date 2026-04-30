import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans, Noto_Sans_Georgian } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { PWARegister } from "@/components/pwa-register";
import { MaintenanceGate } from "@/components/maintenance-gate";
import { ImpersonationBanner } from "@/components/impersonation-banner";
import { Toaster } from "sonner";
import { I18nProvider } from "@/components/i18n-provider";
import { getLocale, getMessages } from "@/lib/i18n";
import { enMessages } from "@/lib/i18n/messages/en";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

// Loaded for Georgian glyphs; the browser only pulls the file when Georgian
// characters are actually rendered (unicode-range cascade).
const notoGeorgian = Noto_Sans_Georgian({
  subsets: ["georgian"],
  variable: "--font-georgian",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "Inspector — Modern EHS Management Platform",
    template: "%s · Inspector",
  },
  description:
    "Inspector is a mobile-first EHS platform for inspections, incidents, risk, CAPA, permits, training, SDS and more — designed for the field.",
  applicationName: "Inspector",
  keywords: [
    "EHS",
    "Environmental Health Safety",
    "Inspections",
    "Incident Reporting",
    "CAPA",
    "Permit to Work",
    "Risk Assessment",
    "Safety Software",
  ],
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    title: "Inspector — EHS platform built for the field",
    description:
      "Run inspections, report incidents, track CAPAs, and stay compliant — from any tablet or phone.",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Inspector",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = getMessages(locale);

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${inter.variable} ${jakarta.variable} ${notoGeorgian.variable}`}
    >
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <I18nProvider locale={locale} messages={messages} fallback={enMessages}>
            <ImpersonationBanner />
            <MaintenanceGate>{children}</MaintenanceGate>
            <Toaster richColors position="top-right" closeButton />
            <PWARegister />
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
