"use client";

import * as React from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/components/i18n-provider";
import { promoteWorkspaceTemplateToGlobal } from "../actions";

interface Candidate {
  id: string;
  name: string;
  categoryName: string | null;
  orgName: string;
  orgSlug: string;
}

export function ImportFromWorkspaceTemplate({
  candidates,
}: {
  candidates: Candidate[];
}) {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [selected, setSelected] = React.useState<string>(candidates[0]?.id ?? "");
  const [name, setName] = React.useState("");
  const [autoSeed, setAutoSeed] = React.useState(false);

  const current = candidates.find((c) => c.id === selected) ?? null;

  function onPromote() {
    if (!selected) return;
    start(async () => {
      try {
        const { id } = await promoteWorkspaceTemplateToGlobal(selected, {
          name: name.trim() || undefined,
          autoSeed,
        });
        toast.success(t("admin.inspectionItemTemplates.promoted"));
        router.push(`/admin/inspection-item-templates/${id}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error");
      }
    });
  }

  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="sourceTemplate">
          {t("admin.inspectionItemTemplates.sourceLabel")}
        </Label>
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger id="sourceTemplate">
            <SelectValue
              placeholder={t("admin.inspectionItemTemplates.sourcePlaceholder")}
            />
          </SelectTrigger>
          <SelectContent>
            {candidates.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
                <span className="ml-1 text-xs text-muted-foreground">
                  · {c.orgName}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="overrideName">
          {t("admin.inspectionItemTemplates.overrideNameLabel")}
        </Label>
        <Input
          id="overrideName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={current?.name ?? ""}
          maxLength={160}
        />
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border bg-muted/20 p-3 sm:col-span-2">
        <input
          type="checkbox"
          checked={autoSeed}
          onChange={(e) => setAutoSeed(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-input"
        />
        <div>
          <div className="text-sm font-medium">
            {t("admin.inspectionItemTemplates.autoSeedLabelLong")}
          </div>
          <div className="text-xs text-muted-foreground">
            {t("admin.inspectionItemTemplates.autoSeedHint")}
          </div>
        </div>
      </label>

      <div className="sm:col-span-2 flex items-center justify-end">
        <Button onClick={onPromote} disabled={pending || !selected}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("admin.inspectionItemTemplates.promoteAction")}
        </Button>
      </div>
    </div>
  );
}
