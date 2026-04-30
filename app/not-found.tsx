import Link from "next/link";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-background p-6">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
          <Shield className="h-7 w-7" />
        </div>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">Page not found</h1>
        <p className="mt-2 text-muted-foreground">
          The page you are looking for doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button asChild>
            <Link href="/">Go home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/sign-in">Sign in</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
