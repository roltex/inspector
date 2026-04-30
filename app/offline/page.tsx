import Link from "next/link";
import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="rounded-2xl bg-primary/10 p-4 text-primary">
        <WifiOff className="h-8 w-8" />
      </div>
      <h1 className="mt-6 font-display text-2xl font-semibold">You&apos;re offline</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Don&apos;t worry — your drafts are saved locally and will sync once you&apos;re back online.
      </p>
      <Button asChild className="mt-6" size="lg">
        <Link href="/">Try again</Link>
      </Button>
    </div>
  );
}
