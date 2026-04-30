"use client";

import * as React from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BookOpen, Globe2, Loader2, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useT } from "@/components/i18n-provider";
import { applyTemplate, listAvailableTemplates } from "./actions";

interface TemplateOption {
  id: string;
  name: string;
  description: string | null;
  categoryName: string | null;
  fieldCount: number;
  scope: "global" | "workspace";
}

export function TemplatePickerDialog({
  orgSlug,
  trigger,
}: {
  orgSlug: string;
  trigger?: React.ReactNode;
}) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [templates, setTemplates] = React.useState<TemplateOption[]>([]);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [q, setQ] = React.useState("");
  const [pending, start] = useTransition();

  // Load templates lazily on first open so the items page stays cheap.
  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    listAvailableTemplates(orgSlug)
      .then((rows) => {
        setTemplates(rows);
        setSelected(rows[0]?.id ?? null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Error");
      })
      .finally(() => setLoading(false));
  }, [open, orgSlug]);

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return templates;
    return templates.filter((t) => {
      const haystack = [t.name, t.categoryName ?? "", t.description ?? ""]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [templates, q]);

  function onApply() {
    if (!selected) return;
    start(async () => {
      try {
        await applyTemplate(orgSlug, { templateId: selected });
        toast.success(t("modules.inspectionItemTemplates.appliedToast"));
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="lg">
            <BookOpen className="h-4 w-4" />
            {t("modules.inspectionItemTemplates.useTemplate")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("modules.inspectionItemTemplates.pickTitle")}</DialogTitle>
          <DialogDescription>
            {t("modules.inspectionItemTemplates.pickDescription")}
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("modules.inspectionItemTemplates.searchPlaceholder")}
            className="pl-9"
          />
        </div>

        {/* List */}
        <div className="max-h-[55vh] min-h-[12rem] overflow-y-auto rounded-xl border">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("common.loading")}
            </div>
          ) : error ? (
            <div className="py-10 text-center text-sm text-destructive">
              {error}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              {templates.length === 0
                ? t("modules.inspectionItemTemplates.emptyTitle")
                : t("modules.inspectionItemTemplates.noMatches")}
            </div>
          ) : (
            <ul className="divide-y">
              {filtered.map((tpl) => {
                const isSelected = selected === tpl.id;
                return (
                  <li
                    key={tpl.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelected(tpl.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelected(tpl.id);
                      }
                    }}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 px-3 py-3 text-sm transition focus:outline-none",
                      isSelected
                        ? "bg-primary/10"
                        : "hover:bg-muted/40 focus-visible:bg-muted/40",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input",
                      )}
                      aria-hidden="true"
                    >
                      {isSelected && <span className="h-2 w-2 rounded-full bg-primary-foreground" />}
                    </span>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{tpl.name}</span>
                        {tpl.scope === "global" ? (
                          <Badge
                            variant="secondary"
                            className="gap-1 bg-primary/10 text-primary"
                          >
                            <Globe2 className="h-3 w-3" />
                            {t("modules.inspectionItemTemplates.scopeGlobal")}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <Sparkles className="h-3 w-3" />
                            {t("modules.inspectionItemTemplates.scopeWorkspace")}
                          </Badge>
                        )}
                        {tpl.categoryName && (
                          <span className="text-xs text-muted-foreground">
                            {tpl.categoryName}
                          </span>
                        )}
                      </div>
                      {tpl.description && (
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {tpl.description}
                        </p>
                      )}
                      <p className="text-[11px] text-muted-foreground">
                        {tpl.fieldCount}{" "}
                        {tpl.fieldCount === 1
                          ? t("modules.inspectionItemTemplates.field")
                          : t("modules.inspectionItemTemplates.fields")}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            onClick={onApply}
            disabled={!selected || pending}
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("modules.inspectionItemTemplates.apply")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
