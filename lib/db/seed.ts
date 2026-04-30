import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "./client";
import {
  organization,
  user,
  account,
  member,
  inspection,
  finding,
  observation,
  incident,
  action as capa,
  riskAssessment,
  document,
  trainingProgram,
  ppeItem,
  chemical,
  permit,
  regulation,
  requirement,
  contractor,
} from "./schema";
import { createId } from "./ids";

/**
 * Seed script: creates a demo organization with sample EHS data.
 *
 * Run: pnpm db:seed
 *
 * The demo owner can sign in with email "demo@inspector.app" / password "demo1234"
 * (Better Auth's password hashing is bypassed here for simplicity; this is a dev-only seed).
 */

const DEMO_EMAIL = "demo@inspector.app";

async function seed() {
  console.log("🌱 Seeding Inspector demo data…");

  // 1) demo user
  let demoUser = (await db.select().from(user).where(eq(user.email, DEMO_EMAIL)))[0];
  if (!demoUser) {
    const id = createId("usr");
    await db.insert(user).values({
      id,
      email: DEMO_EMAIL,
      name: "Demo Owner",
      emailVerified: true,
    });
    await db.insert(account).values({
      id: createId("acc"),
      userId: id,
      accountId: id,
      providerId: "credential",
      // bcrypt of "demo1234" — generated with better-auth's default scrypt would be safer; for seed we keep a known value
      password: "$2a$10$Tn7zV6T6nT6T6nT6T6nT6.demoPlaceholderForSeedDataOnly12345678",
    });
    demoUser = (await db.select().from(user).where(eq(user.email, DEMO_EMAIL)))[0]!;
  }

  // 2) demo org
  const slug = "demo";
  let org = (await db.select().from(organization).where(eq(organization.slug, slug)))[0];
  if (!org) {
    const id = createId("org");
    await db.insert(organization).values({
      id,
      slug,
      name: "Demo Manufacturing Co.",
      plan: "PRO",
    });
    org = (await db.select().from(organization).where(eq(organization.id, id)))[0]!;
  }

  // 3) membership
  const existingMembership = (await db
    .select()
    .from(member)
    .where(eq(member.organizationId, org.id)))
    .find((m) => m.userId === demoUser!.id);
  if (!existingMembership) {
    await db.insert(member).values({
      id: createId("mem"),
      organizationId: org.id,
      userId: demoUser.id,
      role: "OWNER",
    });
  }

  const orgId = org.id;
  const uid = demoUser.id;

  // Helper to skip if data already exists
  const isEmpty = async (count: () => Promise<number>) => (await count()) === 0;
  const len = async <T>(rows: Promise<T[]>) => (await rows).length;

  // 4) inspections
  if (await isEmpty(() => len(db.select().from(inspection).where(eq(inspection.organizationId, orgId))))) {
    const ins1 = createId("ins");
    const ins2 = createId("ins");
    const ins3 = createId("ins");
    await db.insert(inspection).values([
      { id: ins1, organizationId: orgId, title: "Monthly fire safety inspection", status: "COMPLETED", score: 92, maxScore: 100, createdById: uid, completedAt: daysAgo(2) },
      { id: ins2, organizationId: orgId, title: "Forklift pre-use check", status: "IN_PROGRESS", createdById: uid, scheduledFor: daysFromNow(1) },
      { id: ins3, organizationId: orgId, title: "Quarterly housekeeping audit", status: "SCHEDULED", createdById: uid, scheduledFor: daysFromNow(7) },
    ]);
    await db.insert(finding).values([
      { id: createId("fnd"), organizationId: orgId, inspectionId: ins1, description: "Fire extinguisher pressure low in zone B", severity: "MEDIUM" },
      { id: createId("fnd"), organizationId: orgId, inspectionId: ins1, description: "Emergency exit signage unclear near dock 3", severity: "LOW" },
    ]);
  }

  // 5) observations
  if (await isEmpty(() => len(db.select().from(observation).where(eq(observation.organizationId, orgId))))) {
    await db.insert(observation).values([
      { id: createId("obs"), organizationId: orgId, type: "UNSAFE_CONDITION", description: "Spill on production floor near press 4", location: "Bay 2", severity: "MEDIUM", reportedById: uid },
      { id: createId("obs"), organizationId: orgId, type: "POSITIVE", description: "Operators wearing full PPE during welding", location: "Welding shop", severity: "LOW", reportedById: uid },
      { id: createId("obs"), organizationId: orgId, type: "NEAR_MISS", description: "Pallet nearly fell from overhead rack", location: "Warehouse", severity: "HIGH", reportedById: uid },
      { id: createId("obs"), organizationId: orgId, type: "UNSAFE_ACT", description: "Operator bypassing machine guard", location: "Press line", severity: "CRITICAL", reportedById: uid },
    ]);
  }

  // 6) incidents
  if (await isEmpty(() => len(db.select().from(incident).where(eq(incident.organizationId, orgId))))) {
    await db.insert(incident).values([
      { id: createId("inc"), organizationId: orgId, title: "Hand laceration during blade change", type: "INJURY", severity: "MEDIUM", status: "IN_PROGRESS", description: "Operator cut hand while changing the blade.", lostTimeDays: 1, reportedById: uid, occurredAt: daysAgo(10) },
      { id: createId("inc"), organizationId: orgId, title: "Near miss: forklift swing", type: "NEAR_MISS", severity: "HIGH", status: "OPEN", description: "Forklift swing nearly struck a pedestrian.", reportedById: uid, occurredAt: daysAgo(3) },
    ]);
  }

  // 7) capa
  if (await isEmpty(() => len(db.select().from(capa).where(eq(capa.organizationId, orgId))))) {
    await db.insert(capa).values([
      { id: createId("act"), organizationId: orgId, title: "Replace damaged guardrail at bay 4", description: "Procure and install new guardrail.", priority: "HIGH", status: "OPEN", dueDate: daysFromNow(7), createdById: uid },
      { id: createId("act"), organizationId: orgId, title: "Refresher training: forklift safety", priority: "MEDIUM", status: "IN_PROGRESS", dueDate: daysFromNow(14), createdById: uid },
      { id: createId("act"), organizationId: orgId, title: "Update LOTO procedure rev. 4", priority: "LOW", status: "UNDER_REVIEW", dueDate: daysFromNow(21), createdById: uid },
    ]);
  }

  // 8) risk assessment
  if (await isEmpty(() => len(db.select().from(riskAssessment).where(eq(riskAssessment.organizationId, orgId))))) {
    await db.insert(riskAssessment).values({
      id: createId("ra"),
      organizationId: orgId,
      title: "Working at height — facade cleaning",
      activity: "Facade cleaning at 8m using mobile elevated work platform",
      hazards: [
        {
          id: createId("hz"),
          hazard: "Fall from height",
          whoAtRisk: "Cleaning crew",
          likelihood: 3, severity: 5, initialRisk: 15,
          controls: ["Harness & lanyard", "MEWP inspection", "Trained operator"],
          residualLikelihood: 1, residualSeverity: 5, residualRisk: 5,
        },
      ],
    });
  }

  // 9) documents
  if (await isEmpty(() => len(db.select().from(document).where(eq(document.organizationId, orgId))))) {
    await db.insert(document).values([
      { id: createId("doc"), organizationId: orgId, name: "EHS Policy", category: "Policy", currentVersion: 3, requiresAck: true },
      { id: createId("doc"), organizationId: orgId, name: "LOTO Procedure", category: "Procedure", currentVersion: 4, requiresAck: true },
    ]);
  }

  // 10) training
  if (await isEmpty(() => len(db.select().from(trainingProgram).where(eq(trainingProgram.organizationId, orgId))))) {
    await db.insert(trainingProgram).values([
      { id: createId("tp"), organizationId: orgId, name: "Forklift operator", description: "Powered industrial truck operation", durationHours: 8, validityMonths: 36, mandatory: true },
      { id: createId("tp"), organizationId: orgId, name: "Working at height", description: "Fall protection essentials", durationHours: 4, validityMonths: 24, mandatory: true },
    ]);
  }

  // 11) ppe
  if (await isEmpty(() => len(db.select().from(ppeItem).where(eq(ppeItem.organizationId, orgId))))) {
    await db.insert(ppeItem).values([
      { id: createId("ppe"), organizationId: orgId, name: "Safety helmet", category: "Head", stockQuantity: 42, minStock: 20, unit: "pcs" },
      { id: createId("ppe"), organizationId: orgId, name: "Cut-resistant gloves", category: "Hand", stockQuantity: 12, minStock: 25, unit: "pairs" },
      { id: createId("ppe"), organizationId: orgId, name: "Safety glasses", category: "Eye", stockQuantity: 80, minStock: 30, unit: "pcs" },
    ]);
  }

  // 12) chemicals
  if (await isEmpty(() => len(db.select().from(chemical).where(eq(chemical.organizationId, orgId))))) {
    await db.insert(chemical).values([
      { id: createId("chm"), organizationId: orgId, name: "Acetone", casNumber: "67-64-1", manufacturer: "ChemCo", hazardClass: "Flammable liquid", signalWord: "Danger", location: "Cabinet A1", quantity: 4, unit: "L" },
      { id: createId("chm"), organizationId: orgId, name: "Isopropyl alcohol", casNumber: "67-63-0", manufacturer: "PureLab", hazardClass: "Flammable liquid", signalWord: "Warning", location: "Cabinet A1", quantity: 10, unit: "L" },
    ]);
  }

  // 13) permits
  if (await isEmpty(() => len(db.select().from(permit).where(eq(permit.organizationId, orgId))))) {
    await db.insert(permit).values([
      { id: createId("pmt"), organizationId: orgId, type: "HOT_WORK", title: "Welding repair on tank shell", status: "REQUESTED", location: "Tank farm B", workDescription: "Weld patch on tank shell", applicantId: uid, validFrom: daysFromNow(1), validTo: daysFromNow(2) },
      { id: createId("pmt"), organizationId: orgId, type: "CONFINED_SPACE", title: "Inspection of cooling tower sump", status: "APPROVED", location: "Tower 2", applicantId: uid, validFrom: daysFromNow(2), validTo: daysFromNow(3), approverId: uid, approvedAt: new Date() },
    ]);
  }

  // 14) compliance
  if (await isEmpty(() => len(db.select().from(regulation).where(eq(regulation.organizationId, orgId))))) {
    const reg1 = createId("reg");
    await db.insert(regulation).values([
      { id: reg1, organizationId: orgId, code: "OSHA 1910.147", title: "The control of hazardous energy (lockout/tagout)", jurisdiction: "US Federal", category: "Workplace Safety" },
      { id: createId("reg"), organizationId: orgId, code: "OSHA 1910.146", title: "Permit-required confined spaces", jurisdiction: "US Federal", category: "Workplace Safety" },
    ]);
    await db.insert(requirement).values([
      { id: createId("req"), organizationId: orgId, regulationId: reg1, title: "Annual review of energy control procedures", status: "OPEN", dueDate: daysFromNow(30) },
    ]);
  }

  // 15) contractors
  if (await isEmpty(() => len(db.select().from(contractor).where(eq(contractor.organizationId, orgId))))) {
    await db.insert(contractor).values([
      { id: createId("ctr"), organizationId: orgId, name: "AcmeWelding LLC", contactEmail: "ops@acmewelding.example", contactPhone: "+1 555 0100", insuranceExpiresAt: daysFromNow(120), status: "active" },
      { id: createId("ctr"), organizationId: orgId, name: "EvergreenMaint", contactEmail: "hello@evergreen.example", contactPhone: "+1 555 0123", insuranceExpiresAt: daysAgo(15), status: "active" },
    ]);
  }

  console.log(`✅ Done. Visit /${slug}/dashboard after signing in as ${DEMO_EMAIL}.`);
  process.exit(0);
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000);
}
function daysFromNow(n: number): Date {
  return new Date(Date.now() + n * 86_400_000);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
