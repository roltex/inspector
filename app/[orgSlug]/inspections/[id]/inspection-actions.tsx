"use client";

import * as React from "react";
import { useTransition } from "react";
import {
  Check,
  Loader2,
  MoreVertical,
  PlayCircle,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useT } from "@/components/i18n-provider";
import { DeleteDialog } from "./_components/delete-dialog";

interface Props {
  markStatus: (fd: FormData) => Promise<void>;
  remove: () => Promise<void>;
  status: string;
  canEdit: boolean;
}

const FINAL = ["COMPLETED", "FAILED", "CANCELLED"];

export function InspectionActions({ markStatus, remove, status, canEdit }: Props) {
  const t = useT();
  const [pending, start] = useTransition();
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  function set(newStatus: string) {
    const fd = new FormData();
    fd.set("status", newStatus);
    start(() => markStatus(fd));
  }

  function onDelete() {
    start(async () => {
      await remove();
      setDeleteOpen(false);
    });
  }

  if (!canEdit) return null;

  const isFinal = FINAL.includes(status);

  return (
    <>
      {/* Compact desktop: primary CTA + overflow menu */}
      <div className="flex items-center gap-2">
        {!isFinal && status !== "COMPLETED" && (
          <Button
            size="sm"
            onClick={() => set("COMPLETED")}
            disabled={pending}
            className="hidden sm:inline-flex"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {t("modules.inspections.markCompleted")}
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              className="px-2.5"
              aria-label="Actions"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {status !== "IN_PROGRESS" && !isFinal && (
              <DropdownMenuItem onSelect={() => set("IN_PROGRESS")}>
                <PlayCircle className="h-4 w-4" />
                {t("modules.inspections.statusLabel.IN_PROGRESS")}
              </DropdownMenuItem>
            )}
            {status !== "COMPLETED" && (
              <DropdownMenuItem onSelect={() => set("COMPLETED")}>
                <Check className="h-4 w-4" />
                {t("modules.inspections.markCompleted")}
              </DropdownMenuItem>
            )}
            {status !== "FAILED" && (
              <DropdownMenuItem onSelect={() => set("FAILED")}>
                <X className="h-4 w-4" />
                {t("modules.inspections.markFailed")}
              </DropdownMenuItem>
            )}
            {isFinal && (
              <DropdownMenuItem onSelect={() => set("IN_PROGRESS")}>
                <RotateCcw className="h-4 w-4" />
                {t("modules.inspections.reopen")}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => setDeleteOpen(true)}
              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              {t("modules.inspections.deleteInspection")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        pending={pending}
        onConfirm={onDelete}
      />
    </>
  );
}
