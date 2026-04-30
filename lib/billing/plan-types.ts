// Client-safe plan types and fallback data. This file does NOT import the
// database client, so it can be safely imported from client components and
// edge runtimes. The server-only versions in `./plans` add DB-backed accessors
// on top of these definitions.

import type { Plan } from "@/lib/db/schema";

export type FeatureKey =
  | "inspections"
  | "observations"
  | "incidents"
  | "capa"
  | "risk"
  | "documents"
  | "training"
  | "chemicals"
  | "ppe"
  | "permits"
  | "compliance"
  | "contractors"
  | "analytics"
  | "web_push"
  | "sso"
  | "audit_export";

export const FEATURE_KEYS: FeatureKey[] = [
  "inspections", "observations", "incidents", "capa", "risk",
  "documents", "training", "chemicals", "ppe", "permits",
  "compliance", "contractors", "analytics", "web_push",
  "sso", "audit_export",
];

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  inspections: "Inspections",
  observations: "Observations",
  incidents: "Incidents",
  capa: "CAPA",
  risk: "Risk Assessments",
  documents: "Documents",
  training: "Training",
  chemicals: "Chemicals & SDS",
  ppe: "PPE",
  permits: "Permits to Work",
  compliance: "Compliance",
  contractors: "Contractors",
  analytics: "Analytics",
  web_push: "Web Push",
  sso: "SSO (SAML, OIDC)",
  audit_export: "Audit Export",
};

export interface PlanConfig {
  id: Plan;
  name: string;
  tagline: string;
  priceMonthly: number | null;
  priceYearly: number | null;
  currency: string;
  /** Resolved Stripe price IDs (env-driven, not stored in DB). */
  priceIdMonthly?: string;
  priceIdYearly?: string;
  userLimit: number;
  storageLimitGB: number;
  features: FeatureKey[];
  highlights: string[];
  popular: boolean;
  isPublic: boolean;
  isArchived: boolean;
  displayOrder: number;
  cta?: string | null;
}

export const PLAN_ORDER: Plan[] = ["FREE", "STARTER", "PRO", "ENTERPRISE"];

/** Hard-coded fallback. Used when the DB hasn't been migrated yet, and as the
 *  source of truth for synchronous (client-side, edge runtime) feature gating. */
export const FALLBACK_PLANS: Record<Plan, PlanConfig> = {
  FREE: {
    id: "FREE",
    name: "Free",
    tagline: "For small teams exploring safer operations.",
    priceMonthly: 0,
    priceYearly: 0,
    currency: "USD",
    userLimit: 5,
    storageLimitGB: 1,
    features: ["inspections", "observations"],
    highlights: ["Up to 5 users", "Inspections & Observations", "Mobile PWA access", "Email support"],
    popular: false,
    isPublic: true,
    isArchived: false,
    displayOrder: 1,
    cta: "Get started",
  },
  STARTER: {
    id: "STARTER",
    name: "Starter",
    tagline: "For operating teams replacing paper and spreadsheets.",
    priceMonthly: 29,
    priceYearly: 290,
    currency: "USD",
    userLimit: 25,
    storageLimitGB: 10,
    features: ["inspections", "observations", "incidents", "capa", "documents"],
    highlights: ["Up to 25 users", "Everything in Free, plus", "Incident reporting & CAPA", "Document library", "Standard analytics"],
    popular: false,
    isPublic: true,
    isArchived: false,
    displayOrder: 2,
    cta: "Start 14-day trial",
  },
  PRO: {
    id: "PRO",
    name: "Professional",
    tagline: "The complete EHS suite for growing organizations.",
    priceMonthly: 99,
    priceYearly: 990,
    currency: "USD",
    userLimit: 100,
    storageLimitGB: 100,
    features: [
      "inspections", "observations", "incidents", "capa", "risk",
      "documents", "training", "chemicals", "ppe", "permits",
      "compliance", "contractors", "analytics", "web_push",
    ],
    highlights: [
      "Up to 100 users", "All 13 EHS modules", "Advanced analytics & KPIs",
      "Permit to Work workflows", "Web push & reminders", "Priority support",
    ],
    popular: true,
    isPublic: true,
    isArchived: false,
    displayOrder: 3,
    cta: "Start 14-day trial",
  },
  ENTERPRISE: {
    id: "ENTERPRISE",
    name: "Enterprise",
    tagline: "Security, SSO and scale for regulated industries.",
    priceMonthly: null,
    priceYearly: null,
    currency: "USD",
    userLimit: 10_000,
    storageLimitGB: 1000,
    features: [
      "inspections", "observations", "incidents", "capa", "risk",
      "documents", "training", "chemicals", "ppe", "permits",
      "compliance", "contractors", "analytics", "web_push",
      "sso", "audit_export",
    ],
    highlights: [
      "Unlimited users", "SSO (SAML, OIDC)", "Custom retention & audit export",
      "Dedicated CSM", "SLA & DPA",
    ],
    popular: false,
    isPublic: true,
    isArchived: false,
    displayOrder: 4,
    cta: "Contact sales",
  },
};

/** Synchronous feature check using fallback definitions. Use this in places
 *  where awaiting the DB is impractical (client components, middleware). */
export function hasFeatureSync(plan: Plan | null | undefined, feature: FeatureKey): boolean {
  if (!plan) return false;
  return FALLBACK_PLANS[plan].features.includes(feature);
}
