"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { slugify } from "@/lib/utils";
import { seedNewOrganization } from "./actions";

export function OnboardingForm({ defaultName }: { defaultName: string }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [name, setName] = React.useState(defaultName ? `${defaultName}'s workspace` : "");
  const [slug, setSlug] = React.useState("");

  React.useEffect(() => {
    setSlug(slugify(name));
  }, [name]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await authClient.organization.create({
        name,
        slug,
      });
      if (error || !data) {
        toast.error(error?.message ?? "Failed to create workspace");
        return;
      }
      await authClient.organization.setActive({ organizationId: data.id });
      // Best-effort: seed the new workspace from any active global
      // inspection-item templates flagged with autoSeed. We don't block
      // navigation if this errors — the user can still set up items
      // manually.
      try {
        await seedNewOrganization(data.id);
      } catch (err) {
        console.warn("Auto-seed templates failed:", err);
      }
      toast.success("Workspace created!");
      router.push(`/${slug}/dashboard`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="org-name">Workspace name</Label>
        <Input
          id="org-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Acme Corporation"
          required
          minLength={2}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="org-slug">URL slug</Label>
        <div className="flex items-center rounded-xl border border-input bg-background">
          <span className="pl-3.5 text-sm text-muted-foreground">inspector.app/</span>
          <Input
            id="org-slug"
            value={slug}
            onChange={(e) => setSlug(slugify(e.target.value))}
            className="border-0 pl-1 focus-visible:ring-0 focus-visible:ring-offset-0"
            required
            minLength={2}
            pattern="[a-z0-9-]+"
          />
        </div>
      </div>
      <Button type="submit" className="w-full" size="lg" disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Create workspace
      </Button>
    </form>
  );
}
