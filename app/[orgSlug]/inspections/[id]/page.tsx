import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { requireMembership } from "@/lib/auth/session";
import { can } from "@/lib/rbac/permissions";
import { db } from "@/lib/db/client";
import {
  finding,
  inspection,
  company,
  companyObject,
  inspectionItemField,
  inspectionItemSelection,
  user,
} from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { getT } from "@/lib/i18n";
import { updateInspection, deleteInspection } from "../actions";
import { InspectionActions } from "./inspection-actions";
import { InspectionHero } from "./_components/inspection-hero";
import { InspectionTabs, type DetailTab } from "./_components/inspection-tabs";
import { ChecklistTab } from "./_components/checklist-tab";
import { FindingsTab, type FindingWithMeta } from "./_components/findings-tab";
import { DetailsTab } from "./_components/details-tab";
import type {
  FieldDef,
  FieldType,
  FindingRow,
  Severity,
} from "./item-findings-section";

type StatusEnum =
  | "DRAFT"
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

const SEVERITY_RANK: Record<Severity, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

export default async function InspectionDetail({
  params,
  searchParams,
}: {
  params: { orgSlug: string; id: string };
  searchParams?: { tab?: string };
}) {
  const m = await requireMembership(params.orgSlug);
  const { t } = await getT();

  const [row] = await db
    .select({
      inspection,
      companyName: company.name,
      objectName: companyObject.name,
      objectType: companyObject.type,
      objectCity: companyObject.city,
      assigneeName: user.name,
      assigneeEmail: user.email,
    })
    .from(inspection)
    .leftJoin(company, eq(company.id, inspection.companyId))
    .leftJoin(companyObject, eq(companyObject.id, inspection.objectId))
    .leftJoin(user, eq(user.id, inspection.assigneeId))
    .where(
      and(
        eq(inspection.id, params.id),
        eq(inspection.organizationId, m.organization.id),
      ),
    )
    .limit(1);
  if (!row) notFound();

  const insp = row.inspection;

  // INSPECTORs can only view inspections that are assigned to them.
  if (m.role === "INSPECTOR" && insp.assigneeId !== m.user.id) {
    notFound();
  }

  const [findings, selections] = await Promise.all([
    db
      .select()
      .from(finding)
      .where(eq(finding.inspectionId, insp.id))
      .orderBy(desc(finding.createdAt)),
    db
      .select()
      .from(inspectionItemSelection)
      .where(eq(inspectionItemSelection.inspectionId, insp.id))
      .orderBy(
        asc(inspectionItemSelection.category),
        asc(inspectionItemSelection.sortOrder),
      ),
  ]);

  const itemIds = Array.from(
    new Set(selections.map((s) => s.itemId).filter((id): id is string => !!id)),
  );
  const fieldRows = itemIds.length
    ? await db
        .select()
        .from(inspectionItemField)
        .where(
          and(
            eq(inspectionItemField.organizationId, m.organization.id),
            inArray(inspectionItemField.inspectionItemId, itemIds),
          ),
        )
        .orderBy(
          asc(inspectionItemField.sortOrder),
          asc(inspectionItemField.label),
        )
    : [];

  // Fields keyed by inspectionItemId
  const fieldsByItemIdMap = new Map<string, FieldDef[]>();
  for (const f of fieldRows) {
    const list = fieldsByItemIdMap.get(f.inspectionItemId) ?? [];
    list.push({
      id: f.id,
      key: f.key,
      label: f.label,
      type: (f.type as FieldType) ?? "text",
      required: f.required,
      options: f.options ?? null,
      subFields: (f.subFields ?? null) as FieldDef["subFields"],
      presetRows: (f.presetRows ?? null) as FieldDef["presetRows"],
      placeholder: f.placeholder,
      helpText: f.helpText,
    });
    fieldsByItemIdMap.set(f.inspectionItemId, list);
  }
  const fieldsByItemId: Record<string, FieldDef[]> = {};
  for (const [k, v] of fieldsByItemIdMap) fieldsByItemId[k] = v;

  // Map selectionId -> fields[] (so the FindingsTab can reuse the same
  // schemas without recomputing).
  const fieldsByItemSelectionId: Record<string, FieldDef[]> = {};
  for (const s of selections) {
    if (s.itemId && fieldsByItemId[s.itemId]) {
      fieldsByItemSelectionId[s.id] = fieldsByItemId[s.itemId]!;
    }
  }

  // Map selectionId -> label so findings (across the inspection) can show
  // which checklist row they belong to.
  const labelBySelectionId = new Map<string, string>();
  for (const s of selections) labelBySelectionId.set(s.id, s.label);

  // Bucket findings by checklist row so each accordion gets just its own data.
  const findingsBySelection = new Map<string, FindingRow[]>();
  for (const f of findings) {
    const r: FindingRow = {
      id: f.id,
      description: f.description,
      severity: f.severity as Severity,
      values: (f.values as Record<string, unknown> | null) ?? null,
      createdAt: f.createdAt,
    };
    if (f.itemSelectionId) {
      const list = findingsBySelection.get(f.itemSelectionId) ?? [];
      list.push(r);
      findingsBySelection.set(f.itemSelectionId, list);
    }
  }
  const findingsBySelectionId: Record<string, FindingRow[]> = {};
  for (const [k, v] of findingsBySelection) findingsBySelectionId[k] = v;

  // All findings projected for the FindingsTab (including orphans).
  const allFindings: FindingWithMeta[] = findings.map((f) => ({
    id: f.id,
    description: f.description,
    severity: f.severity as Severity,
    values: (f.values as Record<string, unknown> | null) ?? null,
    createdAt: f.createdAt,
    selectionId: f.itemSelectionId,
    itemLabel: f.itemSelectionId
      ? labelBySelectionId.get(f.itemSelectionId) ?? null
      : null,
  }));

  const checklistTotal = selections.length;
  const checklistDone = selections.filter((s) => s.checked).length;
  const findingsCount = findings.length;

  // Maximum severity across all findings (for the hero severity hint).
  let maxSeverity: Severity | null = null;
  for (const f of findings) {
    const sev = f.severity as Severity | null;
    if (!sev) continue;
    if (!maxSeverity || SEVERITY_RANK[sev] > SEVERITY_RANK[maxSeverity]) {
      maxSeverity = sev;
    }
  }

  const canEdit = can(m.role, "inspections:edit");

  async function markStatus(formData: FormData) {
    "use server";
    await updateInspection(params.orgSlug, params.id, {
      status: String(formData.get("status")),
    });
  }

  async function remove() {
    "use server";
    await deleteInspection(params.orgSlug, params.id);
  }

  const initialTab: DetailTab = (() => {
    const v = searchParams?.tab;
    if (v === "findings" || v === "details") return v;
    return "checklist";
  })();

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Top bar */}
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2 h-8 px-2">
          <Link href={`/${params.orgSlug}/inspections`}>
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">
              {t("modules.inspections.backToList")}
            </span>
          </Link>
        </Button>
        <div className="ml-auto">
          <InspectionActions
            markStatus={markStatus}
            remove={remove}
            status={insp.status}
            canEdit={canEdit}
          />
        </div>
      </div>

      {/* Hero */}
      <InspectionHero
        title={insp.title}
        status={insp.status as StatusEnum}
        notes={insp.notes ?? null}
        scheduledFor={insp.scheduledFor}
        createdAt={insp.createdAt}
        score={insp.score}
        maxScore={insp.maxScore}
        companyName={row.companyName}
        objectName={row.objectName}
        objectCity={row.objectCity}
        objectType={row.objectType}
        assigneeName={row.assigneeName}
        assigneeEmail={row.assigneeEmail}
        checklistDone={checklistDone}
        checklistTotal={checklistTotal}
        findingsCount={findingsCount}
        maxSeverity={maxSeverity}
      />

      <InspectionTabs
        defaultTab={initialTab}
        findingsCount={findingsCount}
        checklistTotal={checklistTotal}
        checklist={
          <ChecklistTab
            orgSlug={params.orgSlug}
            organizationId={m.organization.id}
            inspectionId={insp.id}
            items={selections.map((s) => ({
              id: s.id,
              itemId: s.itemId,
              category: s.category,
              label: s.label,
              checked: s.checked,
              sortOrder: s.sortOrder,
            }))}
            fieldsByItemId={fieldsByItemId}
            findingsBySelectionId={findingsBySelectionId}
            canEdit={canEdit}
          />
        }
        findings={
          <FindingsTab
            orgSlug={params.orgSlug}
            fieldsByItemSelectionId={fieldsByItemSelectionId}
            findings={allFindings}
            canEdit={canEdit}
          />
        }
        details={
          <DetailsTab
            status={insp.status as StatusEnum}
            notes={insp.notes ?? null}
            scheduledFor={insp.scheduledFor}
            createdAt={insp.createdAt}
            completedAt={insp.completedAt}
            updatedAt={insp.updatedAt}
            score={insp.score}
            maxScore={insp.maxScore}
            companyName={row.companyName}
            objectName={row.objectName}
            objectCity={row.objectCity}
            objectType={row.objectType}
            assigneeName={row.assigneeName}
            assigneeEmail={row.assigneeEmail}
            findingsCount={findingsCount}
            checklistDone={checklistDone}
            checklistTotal={checklistTotal}
          />
        }
      />
    </div>
  );
}
