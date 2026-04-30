"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Loader2, Building2, MapPin, Calendar, ListChecks, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/components/i18n-provider";
import { cn } from "@/lib/utils";

interface CompanyOption {
  id: string;
  name: string;
  isActive: boolean;
}

interface ObjectOption {
  id: string;
  companyId: string;
  name: string;
  type: string | null;
  city: string | null;
  isActive: boolean;
}

interface ItemOption {
  id: string;
  name: string;
  description: string | null;
  category: string;
  sortOrder: number;
}

interface ItemGroup {
  category: string;
  items: ItemOption[];
}

interface MemberOption {
  userId: string;
  name: string | null;
  email: string;
  role: string;
}

export function NewInspectionForm({
  companies,
  objects,
  itemGroups,
  members,
  orgSlug,
  currentUserId,
  lockInspector,
  action,
}: {
  companies: CompanyOption[];
  objects: ObjectOption[];
  itemGroups: ItemGroup[];
  members: MemberOption[];
  orgSlug: string;
  /** The signed-in user's id — used to pre-select the inspector. */
  currentUserId: string;
  /**
   * When true, the inspector field is locked to `currentUserId` (e.g. for
   * users with the INSPECTOR role who can only create their own inspections).
   */
  lockInspector: boolean;
  action: (input: {
    companyId: string;
    objectId: string;
    assigneeId: string;
    scheduledFor: string | null;
    itemIds: string[];
  }) => Promise<void>;
}) {
  const t = useT();
  const [pending, start] = useTransition();
  const [companyId, setCompanyId] = useState<string>("");
  const [objectId, setObjectId] = useState<string>("");
  // INSPECTORs are always the assignee on inspections they create.
  const [assigneeId, setAssigneeId] = useState<string>(
    lockInspector ? currentUserId : "",
  );
  const [scheduledFor, setScheduledFor] = useState<string>("");
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  const lockedSelfMember = lockInspector
    ? members.find((p) => p.userId === currentUserId)
    : undefined;

  const filteredObjects = useMemo(
    () => objects.filter((o) => o.companyId === companyId),
    [objects, companyId],
  );

  const totalItems = useMemo(
    () => itemGroups.reduce((sum, g) => sum + g.items.length, 0),
    [itemGroups],
  );

  function toggleItem(id: string) {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleCategory(items: ItemOption[]) {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      const allSelected = items.every((it) => next.has(it.id));
      if (allSelected) {
        items.forEach((it) => next.delete(it.id));
      } else {
        items.forEach((it) => next.add(it.id));
      }
      return next;
    });
  }

  function selectAll() {
    setSelectedItemIds(new Set(itemGroups.flatMap((g) => g.items.map((it) => it.id))));
  }

  function clearAll() {
    setSelectedItemIds(new Set());
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId) {
      toast.error(t("modules.inspections.selectCompanyError"));
      return;
    }
    if (!objectId) {
      toast.error(t("modules.inspections.selectObjectError"));
      return;
    }
    if (!assigneeId) {
      toast.error(t("modules.inspections.selectInspectorError"));
      return;
    }
    start(async () => {
      try {
        await action({
          companyId,
          objectId,
          assigneeId,
          scheduledFor: scheduledFor || null,
          itemIds: [...selectedItemIds],
        });
      } catch (err) {
        if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) return;
        toast.error(err instanceof Error ? err.message : "Error");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Step 1 — Company */}
      <Section icon={Building2} title={t("modules.inspections.stepCompany")}>
        <Select
          value={companyId}
          onValueChange={(v) => {
            setCompanyId(v);
            setObjectId("");
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("modules.inspections.selectCompany")} />
          </SelectTrigger>
          <SelectContent>
            {companies.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Section>

      {/* Step 2 — Object */}
      <Section icon={MapPin} title={t("modules.inspections.stepObject")}>
        <Select value={objectId} onValueChange={setObjectId} disabled={!companyId}>
          <SelectTrigger>
            <SelectValue
              placeholder={
                companyId
                  ? filteredObjects.length === 0
                    ? t("modules.inspections.noObjectsForCompany")
                    : t("modules.inspections.selectObject")
                  : t("modules.inspections.pickCompanyFirst")
              }
            />
          </SelectTrigger>
          <SelectContent>
            {filteredObjects.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.name}
                {o.type ? ` · ${o.type}` : ""}
                {o.city ? ` · ${o.city}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Section>

      {/* Step 3 — Inspector (workspace member) */}
      <Section
        icon={UserCheck}
        title={t("modules.inspections.stepInspector")}
        right={
          !lockInspector ? (
            <Link
              href={`/${orgSlug}/settings/members`}
              className="text-xs font-medium text-primary hover:underline"
            >
              {t("modules.inspections.manageMembers")}
            </Link>
          ) : null
        }
      >
        {lockInspector ? (
          <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {lockedSelfMember?.name || lockedSelfMember?.email || t("modules.inspections.you")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("modules.inspections.assigneeLockedHint")}
              </p>
            </div>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
              {t("modules.inspections.you")}
            </span>
          </div>
        ) : (
          <Select
            value={assigneeId}
            onValueChange={setAssigneeId}
            disabled={members.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("modules.inspections.selectInspector")} />
            </SelectTrigger>
            <SelectContent>
              {members.map((p) => (
                <SelectItem key={p.userId} value={p.userId}>
                  {p.name || p.email}
                  {p.role ? ` · ${p.role.replace("_", " ")}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </Section>

      {/* Step 4 — Date */}
      <Section icon={Calendar} title={t("modules.inspections.stepDate")}>
        <div className="space-y-1.5">
          <Label htmlFor="scheduledFor">
            {t("modules.inspections.scheduledFor")}{" "}
            <span className="text-xs font-normal text-muted-foreground">
              ({t("common.optional")})
            </span>
          </Label>
          <Input
            id="scheduledFor"
            name="scheduledFor"
            type="datetime-local"
            value={scheduledFor}
            onChange={(e) => setScheduledFor(e.target.value)}
          />
        </div>
      </Section>

      {/* Step 5 — Items checklist */}
      <Section
        icon={ListChecks}
        title={t("modules.inspections.stepItems")}
        right={
          totalItems > 0 ? (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>
                {t("modules.inspections.itemsSelected", {
                  selected: selectedItemIds.size,
                  total: totalItems,
                })}
              </span>
              <button
                type="button"
                onClick={selectAll}
                className="font-medium text-primary hover:underline"
              >
                {t("modules.inspections.selectAll")}
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={clearAll}
                className="font-medium hover:underline"
              >
                {t("modules.inspections.clearAll")}
              </button>
            </div>
          ) : null
        }
      >
        {itemGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("modules.inspections.noItemsHint")}</p>
        ) : (
          <div className="space-y-3">
            {itemGroups.map(({ category, items }) => {
              const allSelected = items.every((it) => selectedItemIds.has(it.id));
              const someSelected = items.some((it) => selectedItemIds.has(it.id));
              return (
                <div key={category} className="overflow-hidden rounded-xl border">
                  <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-2.5">
                    <p className="font-medium">{category}</p>
                    <button
                      type="button"
                      onClick={() => toggleCategory(items)}
                      className={cn(
                        "text-xs font-medium hover:underline",
                        allSelected ? "text-muted-foreground" : "text-primary",
                      )}
                    >
                      {allSelected
                        ? t("modules.inspections.deselectCategory")
                        : someSelected
                          ? t("modules.inspections.selectRest")
                          : t("modules.inspections.selectCategory")}
                    </button>
                  </div>
                  <ul className="divide-y">
                    {items.map((it) => {
                      const checked = selectedItemIds.has(it.id);
                      return (
                        <li key={it.id}>
                          <label
                            className={cn(
                              "flex cursor-pointer items-start gap-3 px-4 py-3 transition hover:bg-muted/30",
                              checked && "bg-primary/5",
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleItem(it.id)}
                              className="mt-0.5 h-4 w-4 rounded border-input text-primary"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium">{it.name}</p>
                              {it.description && (
                                <p className="text-xs text-muted-foreground">{it.description}</p>
                              )}
                            </div>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" size="lg" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}{" "}
          {t("modules.inspections.create")}
        </Button>
      </div>
    </form>
  );
}

function Section({
  icon: Icon,
  title,
  right,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="rounded-lg bg-primary/10 p-1.5 text-primary">
            <Icon className="h-4 w-4" />
          </span>
          {title}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}
