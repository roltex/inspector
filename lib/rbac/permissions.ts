import type { Role } from "@/lib/db/schema";

export const ROLES: Role[] = [
  "OWNER",
  "ADMIN",
  "EHS_MANAGER",
  "SUPERVISOR",
  "INSPECTOR",
  "WORKER",
  "CONTRACTOR",
  "AUDITOR",
];

export const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  EHS_MANAGER: "EHS Manager",
  SUPERVISOR: "Supervisor",
  INSPECTOR: "Inspector",
  WORKER: "Worker",
  CONTRACTOR: "Contractor",
  AUDITOR: "Auditor",
};

export const ROLE_COLORS: Record<Role, string> = {
  OWNER: "bg-primary/15 text-primary",
  ADMIN: "bg-primary/15 text-primary",
  EHS_MANAGER: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  SUPERVISOR: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  INSPECTOR: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  WORKER: "bg-muted text-foreground",
  CONTRACTOR: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  AUDITOR: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300",
};

export type Permission =
  | "org:manage"
  | "org:billing"
  | "members:manage"
  | "inspections:create"
  | "inspections:edit"
  | "inspections:delete"
  | "incidents:create"
  | "incidents:investigate"
  | "risk:manage"
  | "capa:create"
  | "capa:assign"
  | "capa:close"
  | "observations:create"
  | "training:manage"
  | "documents:manage"
  | "documents:ack"
  | "chemicals:manage"
  | "ppe:manage"
  | "permits:request"
  | "permits:approve"
  | "compliance:manage"
  | "contractors:manage"
  | "companies:manage"
  | "inspectionItems:manage"
  | "riskSectors:manage"
  | "riskLevels:manage"
  | "analytics:view"
  | "audit:view";

const P = (perms: Permission[]) => new Set(perms);

export const PERMISSIONS: Record<Role, Set<Permission>> = {
  OWNER: P([
    "org:manage", "org:billing", "members:manage",
    "inspections:create", "inspections:edit", "inspections:delete",
    "incidents:create", "incidents:investigate",
    "risk:manage", "capa:create", "capa:assign", "capa:close",
    "observations:create", "training:manage", "documents:manage", "documents:ack",
    "chemicals:manage", "ppe:manage", "permits:request", "permits:approve",
    "compliance:manage", "contractors:manage",
    "companies:manage", "inspectionItems:manage", "riskSectors:manage", "riskLevels:manage",
    "analytics:view", "audit:view",
  ]),
  ADMIN: P([
    "org:manage", "members:manage",
    "inspections:create", "inspections:edit", "inspections:delete",
    "incidents:create", "incidents:investigate",
    "risk:manage", "capa:create", "capa:assign", "capa:close",
    "observations:create", "training:manage", "documents:manage", "documents:ack",
    "chemicals:manage", "ppe:manage", "permits:request", "permits:approve",
    "compliance:manage", "contractors:manage",
    "companies:manage", "inspectionItems:manage", "riskSectors:manage", "riskLevels:manage",
    "analytics:view", "audit:view",
  ]),
  EHS_MANAGER: P([
    "inspections:create", "inspections:edit",
    "incidents:create", "incidents:investigate",
    "risk:manage", "capa:create", "capa:assign", "capa:close",
    "observations:create", "training:manage", "documents:manage",
    "chemicals:manage", "ppe:manage", "permits:approve",
    "compliance:manage", "contractors:manage",
    "companies:manage", "inspectionItems:manage", "riskSectors:manage", "riskLevels:manage",
    "analytics:view",
  ]),
  SUPERVISOR: P([
    "inspections:create", "inspections:edit",
    "incidents:create", "capa:create", "capa:assign", "capa:close",
    "observations:create", "documents:ack",
    "permits:request", "permits:approve",
    "companies:manage", "inspectionItems:manage",
    "analytics:view",
  ]),
  INSPECTOR: P([
    "inspections:create", "incidents:create", "observations:create",
    "documents:ack", "permits:request",
  ]),
  WORKER: P(["observations:create", "documents:ack"]),
  CONTRACTOR: P(["documents:ack", "permits:request"]),
  AUDITOR: P(["analytics:view", "audit:view"]),
};

export function can(role: Role | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  return PERMISSIONS[role].has(permission);
}

export function anyRole(role: Role | undefined | null, roles: Role[]): boolean {
  return !!role && roles.includes(role);
}
