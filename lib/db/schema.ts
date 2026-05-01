import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

/* -------------------------------------------------------------------------- */
/*  Enums                                                                     */
/* -------------------------------------------------------------------------- */

export const roleEnum = pgEnum("role", [
  "OWNER",
  "ADMIN",
  "EHS_MANAGER",
  "SUPERVISOR",
  "INSPECTOR",
  "WORKER",
  "CONTRACTOR",
  "AUDITOR",
]);

export const planEnum = pgEnum("plan", ["FREE", "STARTER", "PRO", "ENTERPRISE"]);

export const subStatusEnum = pgEnum("sub_status", [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "incomplete",
  "unpaid",
  "paused",
]);

export const severityEnum = pgEnum("severity", ["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export const statusEnum = pgEnum("status", [
  "OPEN",
  "IN_PROGRESS",
  "UNDER_REVIEW",
  "CLOSED",
  "OVERDUE",
  "CANCELLED",
]);

export const inspectionStatusEnum = pgEnum("inspection_status", [
  "DRAFT",
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
]);

export const incidentTypeEnum = pgEnum("incident_type", [
  "INJURY",
  "ILLNESS",
  "NEAR_MISS",
  "PROPERTY_DAMAGE",
  "ENVIRONMENTAL",
  "SECURITY",
  "OTHER",
]);

export const observationTypeEnum = pgEnum("observation_type", [
  "SAFE",
  "UNSAFE_ACT",
  "UNSAFE_CONDITION",
  "NEAR_MISS",
  "POSITIVE",
]);

export const permitStatusEnum = pgEnum("permit_status", [
  "DRAFT",
  "REQUESTED",
  "APPROVED",
  "ACTIVE",
  "SUSPENDED",
  "CLOSED",
  "REJECTED",
]);

export const permitTypeEnum = pgEnum("permit_type", [
  "HOT_WORK",
  "CONFINED_SPACE",
  "WORKING_AT_HEIGHT",
  "ELECTRICAL",
  "EXCAVATION",
  "LOCKOUT_TAGOUT",
  "GENERAL",
]);

export const sourceTypeEnum = pgEnum("source_type", [
  "INSPECTION",
  "INCIDENT",
  "OBSERVATION",
  "RISK_ASSESSMENT",
  "AUDIT",
  "MANUAL",
]);

/* -------------------------------------------------------------------------- */
/*  Auth (Better Auth compatible shape)                                       */
/* -------------------------------------------------------------------------- */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  phone: text("phone"),
  superAdmin: boolean("super_admin").notNull().default(false),
  bannedAt: timestamp("banned_at"),
  banReason: text("ban_reason"),
  /** ISO 639-1 language code; falls back to cookie / Accept-Language when null. */
  locale: text("locale"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  activeOrganizationId: text("active_organization_id"),
  // Set by the impersonation flow to the original super-admin's user id.
  impersonatedBy: text("impersonated_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/* -------------------------------------------------------------------------- */
/*  Organizations & Membership                                                */
/* -------------------------------------------------------------------------- */

export const organization = pgTable(
  "organization",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    logo: text("logo"),
    plan: planEnum("plan").notNull().default("FREE"),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    subscriptionStatus: subStatusEnum("subscription_status"),
    trialEndsAt: timestamp("trial_ends_at"),
    currentPeriodEnd: timestamp("current_period_end"),
    suspendedAt: timestamp("suspended_at"),
    suspendedReason: text("suspended_reason"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    slugIdx: uniqueIndex("organization_slug_idx").on(t.slug),
  }),
);

export const member = pgTable(
  "member",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: roleEnum("role").notNull().default("WORKER"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    orgUserIdx: uniqueIndex("member_org_user_idx").on(t.organizationId, t.userId),
    orgIdx: index("member_org_idx").on(t.organizationId),
  }),
);

export const invitation = pgTable(
  "invitation",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: roleEnum("role").notNull().default("WORKER"),
    status: text("status").notNull().default("pending"),
    inviterId: text("inviter_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    orgEmailIdx: index("invitation_org_email_idx").on(t.organizationId, t.email),
  }),
);

/* -------------------------------------------------------------------------- */
/*  Locations                                                                 */
/* -------------------------------------------------------------------------- */

export const site = pgTable(
  "site",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    address: text("address"),
    city: text("city"),
    country: text("country"),
    timezone: text("timezone").default("UTC"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({ orgIdx: index("site_org_idx").on(t.organizationId) }),
);

export const department = pgTable(
  "department",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    siteId: text("site_id").references(() => site.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({ orgIdx: index("department_org_idx").on(t.organizationId) }),
);

/* -------------------------------------------------------------------------- */
/*  Companies (clients / business units being inspected)                      */
/*  and their Objects (branches, franchises, locations).                      */
/* -------------------------------------------------------------------------- */

/**
 * Risk levels — a *user-defined*, workspace-scoped dictionary of baseline
 * risk labels (e.g. "Low", "Medium", "High", "Critical", or anything the
 * workspace prefers). Every risk sector picks one of these as its
 * baseline, and UI reads the label / tone straight from this row rather
 * than a hard-coded enum.
 *
 * Defined BEFORE `risk_sector` because `risk_sector` references it.
 */
export const riskLevel = pgTable(
  "risk_level",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** Optional short code, handy for exports (e.g. "LOW", "H", "C1"). */
    code: text("code"),
    description: text("description"),
    /**
     * Semantic tone token for chips / pills. One of `muted | info | success |
     * warning | danger | critical`. UI maps this to a Tailwind palette so
     * customers don't have to know CSS classes.
     */
    tone: text("tone").notNull().default("muted"),
    /** Optional numeric weight so dashboards can rank / compare levels. */
    score: integer("score").notNull().default(0),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdById: text("created_by_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index("risk_level_org_idx").on(t.organizationId),
    orgNameIdx: uniqueIndex("risk_level_org_name_idx").on(
      t.organizationId,
      t.name,
    ),
  }),
);

/**
 * Inspect items — an industry / business-line classification used to tag
 * company objects (branches / sites). Previously carried a single baseline
 * risk level; that relation now lives on each inspection form's
 * applicability rules (see `inspectionItemApplicability`), so a form can
 * match any combination of inspect items × risk levels the workspace cares
 * about. Keeping the `risk_sector` table name for data-migration safety.
 */
export const riskSector = pgTable(
  "risk_sector",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** Short 2–6 char code, handy for dashboards (e.g. "CON", "OIL"). */
    code: text("code"),
    description: text("description"),
    /** Optional accent colour for chips / pills (e.g. "amber", "rose"). */
    color: text("color"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdById: text("created_by_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index("risk_sector_org_idx").on(t.organizationId),
    orgNameIdx: uniqueIndex("risk_sector_org_name_idx").on(
      t.organizationId,
      t.name,
    ),
  }),
);

export const company = pgTable(
  "company",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    code: text("code"),
    contactName: text("contact_name"),
    contactEmail: text("contact_email"),
    contactPhone: text("contact_phone"),
    address: text("address"),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    createdById: text("created_by_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index("company_org_idx").on(t.organizationId),
    orgNameIdx: uniqueIndex("company_org_name_idx").on(t.organizationId, t.name),
  }),
);

export const companyObject = pgTable(
  "company_object",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    code: text("code"),
    /** Free-form label e.g. "Branch", "Franchise", "Warehouse", "Office". */
    type: text("type"),
    /**
     * Risk sector for THIS specific branch / site. Sites of the same
     * company can have very different risk profiles (e.g. an office vs.
     * a refinery), so the FK lives on the object, not the company. NULL
     * means "unclassified".
     */
    riskSectorId: text("risk_sector_id").references(() => riskSector.id, {
      onDelete: "set null",
    }),
    address: text("address"),
    city: text("city"),
    country: text("country"),
    managerName: text("manager_name"),
    managerEmail: text("manager_email"),
    managerPhone: text("manager_phone"),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    createdById: text("created_by_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index("company_object_org_idx").on(t.organizationId),
    companyIdx: index("company_object_company_idx").on(t.companyId),
    riskSectorIdx: index("company_object_risk_sector_idx").on(t.riskSectorId),
  }),
);

/* -------------------------------------------------------------------------- */
/*  Inspection Items (workspace-managed master catalog of "what to inspect"). */
/*  Items belong to a Category (own table — unique per workspace) and are     */
/*  selected via checkboxes when planning an inspection.                      */
/* -------------------------------------------------------------------------- */

export const inspectionItemCategory = pgTable(
  "inspection_item_category",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    /**
     * Optional accent color for the category chip (Tailwind-friendly token,
     * e.g. "emerald", "violet"). Pure cosmetic.
     */
    color: text("color"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdById: text("created_by_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index("inspection_item_category_org_idx").on(t.organizationId),
    orgNameIdx: uniqueIndex("inspection_item_category_org_name_idx").on(
      t.organizationId,
      t.name,
    ),
  }),
);

/**
 * Form-builder field definitions, attached to a specific inspection item.
 * When an inspector finds something while inspecting that item, they fill
 * out one row using this schema (and they can add as many rows / findings
 * as they need — the form is intentionally repeatable).
 *
 * Field `type` is stored as plain text so we don't need a Postgres enum
 * migration when adding new field kinds. Allowed values are validated by
 * the Zod layer.
 */
export const inspectionItemField = pgTable(
  "inspection_item_field",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    inspectionItemId: text("inspection_item_id")
      .notNull()
      .references((): AnyPgColumn => inspectionItem.id, { onDelete: "cascade" }),
    /** Stable slug used as the JSON key in `finding.values`. */
    key: text("key").notNull(),
    label: text("label").notNull(),
    /** "text" | "textarea" | "number" | "select" | "checkbox" | "date" | "severity" */
    type: text("type").notNull().default("text"),
    /** For `select`: array of { value, label }. Otherwise null. */
    options: jsonb("options").$type<Array<{ value: string; label: string }>>(),
    /**
     * For `repeatable` group fields: array of nested sub-field definitions.
     * Each row in the inspector form will render this set of inputs and the
     * value is stored as an array of objects keyed by sub-field `key`.
     */
    subFields: jsonb("sub_fields").$type<
      Array<{
        key: string;
        label: string;
        type: string;
        options?: Array<{ value: string; label: string }> | null;
        required?: boolean;
        placeholder?: string | null;
        helpText?: string | null;
      }>
    >(),
    /**
     * For `repeatable` / `table` group fields: optional list of pre-defined
     * rows. Each entry is a partial row keyed by sub-field `key`. Columns
     * that have a preset value are rendered as read-only for the inspector,
     * and these rows cannot be deleted from the form.
     */
    presetRows: jsonb("preset_rows").$type<Array<Record<string, unknown>>>(),
    required: boolean("required").notNull().default(false),
    placeholder: text("placeholder"),
    helpText: text("help_text"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdById: text("created_by_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    itemIdx: index("inspection_item_field_item_idx").on(t.inspectionItemId, t.sortOrder),
    itemKeyIdx: uniqueIndex("inspection_item_field_item_key_idx").on(
      t.inspectionItemId,
      t.key,
    ),
  }),
);

export const inspectionItem = pgTable(
  "inspection_item",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    /**
     * FK to the workspace-managed category. Nullable so a freshly seeded
     * workspace can still load — actions will always resolve and write a
     * value going forward.
     */
    categoryId: text("category_id").references(() => inspectionItemCategory.id, {
      onDelete: "set null",
    }),
    /**
     * Snapshot of the category name at write-time. Kept in sync by server
     * actions and used as a stable label even when the underlying category
     * is renamed or archived. (Also relied on by `inspection_item_selection`
     * which copies it as a hard snapshot per inspection.)
     */
    category: text("category").notNull().default("General"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdById: text("created_by_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index("inspection_item_org_idx").on(t.organizationId),
    orgCategoryIdx: index("inspection_item_org_category_idx").on(t.organizationId, t.category, t.sortOrder),
    orgCategoryFkIdx: index("inspection_item_org_category_id_idx").on(t.organizationId, t.categoryId),
  }),
);

/**
 * Applicability matrix — a many-to-many join that links an inspection form
 * (`inspection_item`) to the (inspect-item × risk-level) pairs it should
 * surface for. Inspectors can filter their planning picker by matching
 * rows, so a "Fire extinguisher check" form can apply to "Construction at
 * High/Critical risk" without polluting picks for unrelated sites.
 *
 * (organization_id, inspection_item_id, risk_sector_id, risk_level_id) is
 * the natural key; we keep a surrogate `id` column so the row can be
 * referenced from downstream features without touching the composite key.
 */
export const inspectionItemApplicability = pgTable(
  "inspection_item_applicability",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    inspectionItemId: text("inspection_item_id")
      .notNull()
      .references(() => inspectionItem.id, { onDelete: "cascade" }),
    riskSectorId: text("risk_sector_id")
      .notNull()
      .references(() => riskSector.id, { onDelete: "cascade" }),
    riskLevelId: text("risk_level_id")
      .notNull()
      .references(() => riskLevel.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index("inspection_item_applicability_org_idx").on(t.organizationId),
    itemIdx: index("inspection_item_applicability_item_idx").on(
      t.inspectionItemId,
    ),
    sectorIdx: index("inspection_item_applicability_sector_idx").on(
      t.riskSectorId,
    ),
    levelIdx: index("inspection_item_applicability_level_idx").on(
      t.riskLevelId,
    ),
    uniqTriple: uniqueIndex("inspection_item_applicability_unique_triple").on(
      t.inspectionItemId,
      t.riskSectorId,
      t.riskLevelId,
    ),
  }),
);

/**
 * Inspection-item TEMPLATES. Distinct from `inspectionTemplate` (which is the
 * legacy questionnaire template). These let users save a fully-defined
 * inspection item (name + category + every form field, including subFields and
 * presetRows) so it can be re-applied later — either inside the same workspace
 * or, for super-admin–managed GLOBAL templates (organizationId IS NULL), into
 * any new workspace.
 *
 * `autoSeed` (only meaningful for global templates) instructs the org-create
 * flow to clone this template into a freshly created workspace's catalogue so
 * brand-new tenants get a sensible starting set out of the box.
 */
export const inspectionItemTemplate = pgTable(
  "inspection_item_template",
  {
    id: text("id").primaryKey(),
    /** NULL ⇒ global template (super-admin scope). Otherwise tenant-scoped. */
    organizationId: text("organization_id").references(() => organization.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    description: text("description"),
    /**
     * Stored as plain text. When applied to a workspace, the action will
     * find-or-create a category with this name in the target organization
     * (kept separate from the workspace's `inspection_item_category` table so
     * global templates don't have to reference per-tenant rows).
     */
    categoryName: text("category_name"),
    /**
     * Full snapshot of the source item's form fields. Each entry mirrors
     * `inspectionItemField` minus surrogate keys/timestamps — including
     * `subFields` and `presetRows` for repeatable / table types. This makes
     * the template self-contained: cloning it never has to walk back to the
     * original item (which may have been deleted in the meantime).
     */
    fields: jsonb("fields")
      .$type<
        Array<{
          key: string;
          label: string;
          type: string;
          options?: Array<{ value: string; label: string }> | null;
          subFields?: Array<{
            key: string;
            label: string;
            type: string;
            options?: Array<{ value: string; label: string }> | null;
            required?: boolean;
            placeholder?: string | null;
            helpText?: string | null;
          }> | null;
          presetRows?: Array<Record<string, unknown>> | null;
          required: boolean;
          placeholder?: string | null;
          helpText?: string | null;
          sortOrder: number;
        }>
      >()
      .notNull()
      .default(sql`'[]'::jsonb`),
    /**
     * Auto-seed flag — only honoured for GLOBAL templates. When a new
     * organization is created, every active global template with this flag
     * set is cloned into the org's `inspection_item` catalogue.
     */
    autoSeed: boolean("auto_seed").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdById: text("created_by_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index("inspection_item_template_org_idx").on(t.organizationId),
    autoSeedIdx: index("inspection_item_template_auto_seed_idx").on(t.autoSeed),
  }),
);

/* -------------------------------------------------------------------------- */
/*  Inspections                                                               */
/* -------------------------------------------------------------------------- */

export const inspectionTemplate = pgTable(
  "inspection_template",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    category: text("category"),
    schema: jsonb("schema")
      .$type<
        Array<{
          id: string;
          title: string;
          questions: Array<{
            id: string;
            label: string;
            type: "yes_no" | "score" | "text" | "photo" | "multi";
            options?: string[];
            weight?: number;
            required?: boolean;
          }>;
        }>
      >()
      .notNull()
      .default(sql`'[]'::jsonb`),
    createdById: text("created_by_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({ orgIdx: index("insp_tpl_org_idx").on(t.organizationId) }),
);

export const inspection = pgTable(
  "inspection",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    templateId: text("template_id").references(() => inspectionTemplate.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    status: inspectionStatusEnum("status").notNull().default("DRAFT"),
    companyId: text("company_id").references(() => company.id, { onDelete: "set null" }),
    objectId: text("object_id").references(() => companyObject.id, { onDelete: "set null" }),
    siteId: text("site_id").references(() => site.id, { onDelete: "set null" }),
    scheduledFor: timestamp("scheduled_for"),
    completedAt: timestamp("completed_at"),
    assigneeId: text("assignee_id").references(() => user.id, { onDelete: "set null" }),
    createdById: text("created_by_id").references(() => user.id, { onDelete: "set null" }),
    score: real("score"),
    maxScore: real("max_score"),
    answers: jsonb("answers").$type<Record<string, unknown>>(),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index("inspection_org_idx").on(t.organizationId, t.createdAt),
    statusIdx: index("inspection_status_idx").on(t.organizationId, t.status),
  }),
);

export const finding = pgTable(
  "finding",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    inspectionId: text("inspection_id")
      .notNull()
      .references(() => inspection.id, { onDelete: "cascade" }),
    /**
     * Optional link to the specific checklist row this finding belongs to.
     * When set, the finding renders inside that item's table on the inspection
     * detail page using the item's form-builder schema.
     */
    itemSelectionId: text("item_selection_id").references(
      (): AnyPgColumn => inspectionItemSelection.id,
      { onDelete: "cascade" },
    ),
    questionKey: text("question_key"),
    description: text("description").notNull(),
    severity: severityEnum("severity").notNull().default("LOW"),
    /**
     * Structured field values keyed by `inspection_item_field.key`. The shape
     * is owned by the form-builder definition for the item.
     */
    values: jsonb("values").$type<Record<string, unknown>>(),
    photoUrl: text("photo_url"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    inspIdx: index("finding_insp_idx").on(t.inspectionId),
    selIdx: index("finding_item_selection_idx").on(t.itemSelectionId),
  }),
);

/**
 * Per-inspection selection of items from the workspace catalog.
 * Snapshots the label and category so the inspection record stays meaningful
 * even if the underlying item is later renamed or archived.
 */
export const inspectionItemSelection = pgTable(
  "inspection_item_selection",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    inspectionId: text("inspection_id")
      .notNull()
      .references(() => inspection.id, { onDelete: "cascade" }),
    itemId: text("item_id").references(() => inspectionItem.id, { onDelete: "set null" }),
    label: text("label").notNull(),
    category: text("category").notNull().default("General"),
    checked: boolean("checked").notNull().default(false),
    notes: text("notes"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    inspIdx: index("inspection_item_sel_insp_idx").on(t.inspectionId),
  }),
);

/* -------------------------------------------------------------------------- */
/*  Incidents                                                                 */
/* -------------------------------------------------------------------------- */

export const incident = pgTable(
  "incident",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    type: incidentTypeEnum("type").notNull(),
    severity: severityEnum("severity").notNull().default("LOW"),
    status: statusEnum("status").notNull().default("OPEN"),
    description: text("description"),
    occurredAt: timestamp("occurred_at").notNull().defaultNow(),
    reportedById: text("reported_by_id").references(() => user.id, { onDelete: "set null" }),
    siteId: text("site_id").references(() => site.id, { onDelete: "set null" }),
    departmentId: text("department_id").references(() => department.id, { onDelete: "set null" }),
    injuredPersonName: text("injured_person_name"),
    bodyPart: text("body_part"),
    lostTimeDays: integer("lost_time_days").default(0),
    rootCause: jsonb("root_cause").$type<{ whys?: string[]; fishbone?: Record<string, string[]> }>(),
    witnesses: jsonb("witnesses").$type<Array<{ name: string; contact?: string; statement?: string }>>(),
    photoUrls: jsonb("photo_urls").$type<string[]>().default(sql`'[]'::jsonb`),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index("incident_org_idx").on(t.organizationId, t.occurredAt),
  }),
);

/* -------------------------------------------------------------------------- */
/*  Risk Assessments                                                          */
/* -------------------------------------------------------------------------- */

export const riskAssessment = pgTable(
  "risk_assessment",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    activity: text("activity"),
    siteId: text("site_id").references(() => site.id, { onDelete: "set null" }),
    assessorId: text("assessor_id").references(() => user.id, { onDelete: "set null" }),
    reviewDate: timestamp("review_date"),
    hazards: jsonb("hazards")
      .$type<
        Array<{
          id: string;
          hazard: string;
          whoAtRisk?: string;
          likelihood: number;
          severity: number;
          initialRisk: number;
          controls: string[];
          residualLikelihood: number;
          residualSeverity: number;
          residualRisk: number;
        }>
      >()
      .notNull()
      .default(sql`'[]'::jsonb`),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({ orgIdx: index("risk_org_idx").on(t.organizationId) }),
);

/* -------------------------------------------------------------------------- */
/*  CAPA (Corrective & Preventive Actions)                                    */
/* -------------------------------------------------------------------------- */

export const action = pgTable(
  "action",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    sourceType: sourceTypeEnum("source_type"),
    sourceId: text("source_id"),
    priority: severityEnum("priority").notNull().default("MEDIUM"),
    status: statusEnum("status").notNull().default("OPEN"),
    assigneeId: text("assignee_id").references(() => user.id, { onDelete: "set null" }),
    dueDate: timestamp("due_date"),
    completedAt: timestamp("completed_at"),
    evidence: text("evidence"),
    createdById: text("created_by_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index("action_org_idx").on(t.organizationId, t.dueDate),
    assigneeIdx: index("action_assignee_idx").on(t.assigneeId),
  }),
);

/* -------------------------------------------------------------------------- */
/*  Observations                                                              */
/* -------------------------------------------------------------------------- */

export const observation = pgTable(
  "observation",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    type: observationTypeEnum("type").notNull(),
    description: text("description").notNull(),
    location: text("location"),
    severity: severityEnum("severity").default("LOW"),
    siteId: text("site_id").references(() => site.id, { onDelete: "set null" }),
    photoUrl: text("photo_url"),
    reportedById: text("reported_by_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({ orgIdx: index("obs_org_idx").on(t.organizationId, t.createdAt) }),
);

/* -------------------------------------------------------------------------- */
/*  Training                                                                  */
/* -------------------------------------------------------------------------- */

export const trainingProgram = pgTable(
  "training_program",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    durationHours: real("duration_hours"),
    validityMonths: integer("validity_months"),
    mandatory: boolean("mandatory").default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({ orgIdx: index("tp_org_idx").on(t.organizationId) }),
);

export const certification = pgTable(
  "certification",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    programId: text("program_id").references(() => trainingProgram.id, { onDelete: "set null" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    issuedAt: timestamp("issued_at").notNull().defaultNow(),
    expiresAt: timestamp("expires_at"),
    certificateUrl: text("certificate_url"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index("cert_org_idx").on(t.organizationId),
    userIdx: index("cert_user_idx").on(t.userId),
  }),
);

/* -------------------------------------------------------------------------- */
/*  Documents                                                                 */
/* -------------------------------------------------------------------------- */

export const document = pgTable(
  "document",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: text("category"),
    description: text("description"),
    currentVersion: integer("current_version").notNull().default(1),
    fileUrl: text("file_url"),
    mimeType: text("mime_type"),
    requiresAck: boolean("requires_ack").default(false),
    expiresAt: timestamp("expires_at"),
    createdById: text("created_by_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({ orgIdx: index("doc_org_idx").on(t.organizationId) }),
);

export const documentAck = pgTable(
  "document_ack",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    documentId: text("document_id")
      .notNull()
      .references(() => document.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    ackedAt: timestamp("acked_at").notNull().defaultNow(),
  },
  (t) => ({
    docUserIdx: uniqueIndex("doc_ack_unique").on(t.documentId, t.userId, t.version),
  }),
);

/* -------------------------------------------------------------------------- */
/*  Chemicals & SDS                                                           */
/* -------------------------------------------------------------------------- */

export const chemical = pgTable(
  "chemical",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    casNumber: text("cas_number"),
    manufacturer: text("manufacturer"),
    hazardClass: text("hazard_class"),
    ghsPictograms: jsonb("ghs_pictograms").$type<string[]>().default(sql`'[]'::jsonb`),
    signalWord: text("signal_word"),
    sdsFileUrl: text("sds_file_url"),
    location: text("location"),
    quantity: real("quantity"),
    unit: text("unit"),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({ orgIdx: index("chem_org_idx").on(t.organizationId) }),
);

/* -------------------------------------------------------------------------- */
/*  PPE                                                                       */
/* -------------------------------------------------------------------------- */

export const ppeItem = pgTable(
  "ppe_item",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: text("category"),
    stockQuantity: integer("stock_quantity").notNull().default(0),
    minStock: integer("min_stock").default(0),
    unit: text("unit").default("pcs"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({ orgIdx: index("ppe_org_idx").on(t.organizationId) }),
);

export const ppeIssuance = pgTable(
  "ppe_issuance",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    ppeItemId: text("ppe_item_id")
      .notNull()
      .references(() => ppeItem.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(1),
    issuedAt: timestamp("issued_at").notNull().defaultNow(),
    returnedAt: timestamp("returned_at"),
    notes: text("notes"),
  },
  (t) => ({ orgIdx: index("ppe_iss_org_idx").on(t.organizationId) }),
);

/* -------------------------------------------------------------------------- */
/*  Permits to Work                                                           */
/* -------------------------------------------------------------------------- */

export const permit = pgTable(
  "permit",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    type: permitTypeEnum("type").notNull(),
    title: text("title").notNull(),
    status: permitStatusEnum("status").notNull().default("DRAFT"),
    siteId: text("site_id").references(() => site.id, { onDelete: "set null" }),
    location: text("location"),
    workDescription: text("work_description"),
    applicantId: text("applicant_id").references(() => user.id, { onDelete: "set null" }),
    approverId: text("approver_id").references(() => user.id, { onDelete: "set null" }),
    validFrom: timestamp("valid_from"),
    validTo: timestamp("valid_to"),
    approvedAt: timestamp("approved_at"),
    checklist: jsonb("checklist")
      .$type<Array<{ id: string; label: string; checked: boolean }>>()
      .default(sql`'[]'::jsonb`),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({ orgIdx: index("permit_org_idx").on(t.organizationId, t.status) }),
);

/* -------------------------------------------------------------------------- */
/*  Compliance                                                                */
/* -------------------------------------------------------------------------- */

export const regulation = pgTable(
  "regulation",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    code: text("code"),
    title: text("title").notNull(),
    jurisdiction: text("jurisdiction"),
    category: text("category"),
    description: text("description"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({ orgIdx: index("reg_org_idx").on(t.organizationId) }),
);

export const requirement = pgTable(
  "requirement",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    regulationId: text("regulation_id").references(() => regulation.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    status: statusEnum("status").notNull().default("OPEN"),
    ownerId: text("owner_id").references(() => user.id, { onDelete: "set null" }),
    dueDate: timestamp("due_date"),
    evidenceUrl: text("evidence_url"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({ orgIdx: index("req_org_idx").on(t.organizationId) }),
);

/* -------------------------------------------------------------------------- */
/*  Contractors                                                               */
/* -------------------------------------------------------------------------- */

export const contractor = pgTable(
  "contractor",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    contactEmail: text("contact_email"),
    contactPhone: text("contact_phone"),
    rating: real("rating"),
    insuranceExpiresAt: timestamp("insurance_expires_at"),
    status: text("status").default("active"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({ orgIdx: index("contractor_org_idx").on(t.organizationId) }),
);

/* -------------------------------------------------------------------------- */
/*  Analytics (daily KPI snapshots)                                           */
/* -------------------------------------------------------------------------- */

export const kpiSnapshot = pgTable(
  "kpi_snapshot",
  {
    id: serial("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    date: timestamp("date").notNull().defaultNow(),
    trir: real("trir"),
    ltifr: real("ltifr"),
    openCapaCount: integer("open_capa_count"),
    overdueCapaCount: integer("overdue_capa_count"),
    inspectionsCompleted: integer("inspections_completed"),
    observationsLogged: integer("observations_logged"),
    incidentsReported: integer("incidents_reported"),
    data: jsonb("data").$type<Record<string, unknown>>(),
  },
  (t) => ({ orgDateIdx: uniqueIndex("kpi_org_date_idx").on(t.organizationId, t.date) }),
);

/* -------------------------------------------------------------------------- */
/*  Audit log                                                                 */
/* -------------------------------------------------------------------------- */

export const auditLog = pgTable(
  "audit_log",
  {
    id: serial("id").primaryKey(),
    organizationId: text("organization_id").references(() => organization.id, {
      onDelete: "cascade",
    }),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    data: jsonb("data"),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({ orgIdx: index("audit_org_idx").on(t.organizationId, t.createdAt) }),
);

/* -------------------------------------------------------------------------- */
/*  App settings (singleton key-value store for platform-wide config)         */
/* -------------------------------------------------------------------------- */

export const appSetting = pgTable("app_setting", {
  key: text("key").primaryKey(),
  value: jsonb("value"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: text("updated_by").references(() => user.id, { onDelete: "set null" }),
});

/**
 * Admin-editable subscription plan definitions. The four canonical plan IDs
 * (FREE, STARTER, PRO, ENTERPRISE) are seeded on first migration and cannot be
 * deleted (Stripe price IDs are still bound to them via env vars), but every
 * other field on each row can be edited by a super-admin. The public
 * /pricing page and the in-app plan picker both read from this table.
 */
export const planDefinition = pgTable("plan_definition", {
  id: planEnum("id").primaryKey(),
  name: text("name").notNull(),
  tagline: text("tagline").notNull().default(""),
  priceMonthly: integer("price_monthly"),
  priceYearly: integer("price_yearly"),
  currency: text("currency").notNull().default("USD"),
  userLimit: integer("user_limit").notNull().default(5),
  storageLimitGb: integer("storage_limit_gb").notNull().default(1),
  features: jsonb("features").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  highlights: jsonb("highlights").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  cta: text("cta"),
  popular: boolean("popular").notNull().default(false),
  isPublic: boolean("is_public").notNull().default(true),
  isArchived: boolean("is_archived").notNull().default(false),
  displayOrder: integer("display_order").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: text("updated_by").references(() => user.id, { onDelete: "set null" }),
});

/* -------------------------------------------------------------------------- */
/*  Relations                                                                 */
/* -------------------------------------------------------------------------- */

export const userRelations = relations(user, ({ many }) => ({
  members: many(member),
  sessions: many(session),
}));

export const organizationRelations = relations(organization, ({ many }) => ({
  members: many(member),
  invitations: many(invitation),
  sites: many(site),
  inspections: many(inspection),
  incidents: many(incident),
  actions: many(action),
  observations: many(observation),
}));

export const memberRelations = relations(member, ({ one }) => ({
  organization: one(organization, {
    fields: [member.organizationId],
    references: [organization.id],
  }),
  user: one(user, { fields: [member.userId], references: [user.id] }),
}));

export const inspectionRelations = relations(inspection, ({ many, one }) => ({
  findings: many(finding),
  itemSelections: many(inspectionItemSelection),
  template: one(inspectionTemplate, {
    fields: [inspection.templateId],
    references: [inspectionTemplate.id],
  }),
  assignee: one(user, { fields: [inspection.assigneeId], references: [user.id] }),
  company: one(company, { fields: [inspection.companyId], references: [company.id] }),
  object: one(companyObject, { fields: [inspection.objectId], references: [companyObject.id] }),
}));

export const companyRelations = relations(company, ({ many }) => ({
  objects: many(companyObject),
  inspections: many(inspection),
}));

export const companyObjectRelations = relations(companyObject, ({ one, many }) => ({
  company: one(company, { fields: [companyObject.companyId], references: [company.id] }),
  inspections: many(inspection),
}));

export const inspectionItemCategoryRelations = relations(
  inspectionItemCategory,
  ({ many }) => ({
    items: many(inspectionItem),
  }),
);

export const inspectionItemRelations = relations(inspectionItem, ({ many, one }) => ({
  selections: many(inspectionItemSelection),
  fields: many(inspectionItemField),
  categoryRef: one(inspectionItemCategory, {
    fields: [inspectionItem.categoryId],
    references: [inspectionItemCategory.id],
  }),
}));

export const inspectionItemFieldRelations = relations(inspectionItemField, ({ one }) => ({
  item: one(inspectionItem, {
    fields: [inspectionItemField.inspectionItemId],
    references: [inspectionItem.id],
  }),
}));

export const inspectionItemSelectionRelations = relations(inspectionItemSelection, ({ one }) => ({
  inspection: one(inspection, {
    fields: [inspectionItemSelection.inspectionId],
    references: [inspection.id],
  }),
  item: one(inspectionItem, {
    fields: [inspectionItemSelection.itemId],
    references: [inspectionItem.id],
  }),
}));

/* ------------ Types --------------------------------------------------------- */

export type Organization = typeof organization.$inferSelect;
export type NewOrganization = typeof organization.$inferInsert;
export type Member = typeof member.$inferSelect;
export type User = typeof user.$inferSelect;
export type Role = (typeof roleEnum.enumValues)[number];
export type Plan = (typeof planEnum.enumValues)[number];
export type Inspection = typeof inspection.$inferSelect;
export type Incident = typeof incident.$inferSelect;
export type Observation = typeof observation.$inferSelect;
export type Action = typeof action.$inferSelect;
export type Permit = typeof permit.$inferSelect;
export type Document = typeof document.$inferSelect;
export type Chemical = typeof chemical.$inferSelect;
export type Contractor = typeof contractor.$inferSelect;
export type RiskAssessment = typeof riskAssessment.$inferSelect;
export type Regulation = typeof regulation.$inferSelect;
export type Requirement = typeof requirement.$inferSelect;
export type Company = typeof company.$inferSelect;
export type NewCompany = typeof company.$inferInsert;
export type CompanyObject = typeof companyObject.$inferSelect;
export type NewCompanyObject = typeof companyObject.$inferInsert;
export type InspectionItem = typeof inspectionItem.$inferSelect;
export type NewInspectionItem = typeof inspectionItem.$inferInsert;
export type InspectionItemCategory = typeof inspectionItemCategory.$inferSelect;
export type NewInspectionItemCategory = typeof inspectionItemCategory.$inferInsert;
export type InspectionItemField = typeof inspectionItemField.$inferSelect;
export type NewInspectionItemField = typeof inspectionItemField.$inferInsert;
export type InspectionItemSelection = typeof inspectionItemSelection.$inferSelect;
export type InspectionItemApplicability = typeof inspectionItemApplicability.$inferSelect;
export type NewInspectionItemApplicability = typeof inspectionItemApplicability.$inferInsert;
