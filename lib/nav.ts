import {
  LayoutDashboard,
  ClipboardCheck,
  AlertTriangle,
  ShieldAlert,
  ShieldHalf,
  Gauge,
  ListTodo,
  Eye,
  GraduationCap,
  FileText,
  FlaskConical,
  HardHat,
  FileSignature,
  Gavel,
  Users,
  BarChart3,
  Settings,
  Building2,
  ListChecks,
  type LucideIcon,
} from "lucide-react";
import type { FeatureKey } from "@/lib/billing/plans";

export interface NavGroup {
  /** Translation key (passed through `t()` at render time). */
  labelKey: string;
  items: NavItem[];
}

export interface NavItem {
  /** Translation key (passed through `t()` at render time). */
  labelKey: string;
  href: string;
  icon: LucideIcon;
  feature?: FeatureKey;
  badge?: string;
}

export function buildNav(orgSlug: string): NavGroup[] {
  const base = `/${orgSlug}`;
  return [
    {
      labelKey: "nav.overview",
      items: [
        { labelKey: "nav.dashboard", href: `${base}/dashboard`, icon: LayoutDashboard },
        { labelKey: "nav.analytics", href: `${base}/analytics`, icon: BarChart3, feature: "analytics" },
      ],
    },
    {
      labelKey: "nav.operations",
      items: [
        { labelKey: "nav.inspections", href: `${base}/inspections`, icon: ClipboardCheck, feature: "inspections" },
        { labelKey: "nav.observations", href: `${base}/observations`, icon: Eye, feature: "observations" },
        { labelKey: "nav.incidents", href: `${base}/incidents`, icon: AlertTriangle, feature: "incidents" },
        { labelKey: "nav.capa", href: `${base}/capa`, icon: ListTodo, feature: "capa" },
        { labelKey: "nav.riskAssessments", href: `${base}/risk-assessments`, icon: ShieldAlert, feature: "risk" },
        { labelKey: "nav.permits", href: `${base}/permits`, icon: FileSignature, feature: "permits" },
      ],
    },
    {
      labelKey: "nav.directory",
      items: [
        { labelKey: "nav.companies", href: `${base}/companies`, icon: Building2 },
        { labelKey: "nav.riskSectors", href: `${base}/risk-sectors`, icon: ShieldHalf },
        { labelKey: "nav.riskLevels", href: `${base}/risk-levels`, icon: Gauge },
        { labelKey: "nav.inspectionItems", href: `${base}/inspection-items`, icon: ListChecks },
      ],
    },
    {
      labelKey: "nav.library",
      items: [
        { labelKey: "nav.documents", href: `${base}/documents`, icon: FileText, feature: "documents" },
        { labelKey: "nav.training", href: `${base}/training`, icon: GraduationCap, feature: "training" },
        { labelKey: "nav.chemicals", href: `${base}/chemicals`, icon: FlaskConical, feature: "chemicals" },
        { labelKey: "nav.ppe", href: `${base}/ppe`, icon: HardHat, feature: "ppe" },
        { labelKey: "nav.compliance", href: `${base}/compliance`, icon: Gavel, feature: "compliance" },
        { labelKey: "nav.contractors", href: `${base}/contractors`, icon: Users, feature: "contractors" },
      ],
    },
    {
      labelKey: "nav.workspace",
      items: [{ labelKey: "nav.settings", href: `${base}/settings`, icon: Settings }],
    },
  ];
}

export interface MobileTab {
  labelKey: string;
  href: string;
  icon: LucideIcon;
  primary?: boolean;
}

export const MOBILE_TABS = (orgSlug: string): MobileTab[] => [
  { labelKey: "nav.dashboard", href: `/${orgSlug}/dashboard`, icon: LayoutDashboard },
  { labelKey: "nav.inspections", href: `/${orgSlug}/inspections`, icon: ClipboardCheck },
  { labelKey: "modules.observations.newObservation", href: `/${orgSlug}/observations/new`, icon: Eye, primary: true },
  { labelKey: "nav.capa", href: `/${orgSlug}/capa`, icon: ListTodo },
  { labelKey: "common.moreOptions", href: `/${orgSlug}/settings`, icon: Settings },
];
