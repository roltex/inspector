"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Pencil, Power, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/i18n-provider";
import {
  deleteGlobalTemplate,
  setGlobalTemplateAutoSeed,
  updateGlobalTemplate,
} from "./actions";

export function GlobalTemplateRowActions({
  template,
}: {
  template: {
    id: string;
    name: string;
    autoSeed: boolean;
    isActive: boolean;
  };
}) {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();

  function onToggleAutoSeed() {
    start(async () => {
      try {
        await setGlobalTemplateAutoSeed(template.id, !template.autoSeed);
        toast.success(
          t(
            template.autoSeed
              ? "admin.inspectionItemTemplates.autoSeedDisabled"
              : "admin.inspectionItemTemplates.autoSeedEnabled",
          ),
        );
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error");
      }
    });
  }

  function onToggleActive() {
    start(async () => {
      try {
        await updateGlobalTemplate(template.id, {
          isActive: !template.isActive,
        });
        toast.success(
          t(
            template.isActive
              ? "modules.inspectionItemTemplates.deactivated"
              : "modules.inspectionItemTemplates.activated",
          ),
        );
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error");
      }
    });
  }

  function onDelete() {
    if (!confirm(t("admin.inspectionItemTemplates.deleteConfirm"))) return;
    start(async () => {
      try {
        await deleteGlobalTemplate(template.id);
        toast.success(t("modules.inspectionItemTemplates.deleted"));
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error");
      }
    });
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleAutoSeed}
        disabled={pending}
        title={t(
          template.autoSeed
            ? "admin.inspectionItemTemplates.disableAutoSeed"
            : "admin.inspectionItemTemplates.enableAutoSeed",
        )}
      >
        <Sparkles
          className={
            template.autoSeed
              ? "h-4 w-4 text-primary"
              : "h-4 w-4 text-muted-foreground"
          }
        />
      </Button>
      <Button
        asChild
        variant="ghost"
        size="sm"
        title={t("common.edit")}
      >
        <Link href={`/admin/inspection-item-templates/${template.id}`}>
          <Pencil className="h-4 w-4" />
        </Link>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleActive}
        disabled={pending}
        title={t(
          template.isActive
            ? "modules.inspectionItemTemplates.deactivate"
            : "modules.inspectionItemTemplates.activate",
        )}
      >
        <Power
          className={
            template.isActive
              ? "h-4 w-4 text-success"
              : "h-4 w-4 text-muted-foreground"
          }
        />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onDelete}
        disabled={pending}
        title={t("common.delete")}
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4 text-destructive" />
        )}
      </Button>
    </div>
  );
}
