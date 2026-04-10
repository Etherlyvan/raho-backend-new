/// <reference types="node" />
import {
  PrismaClient,
  RoleName,
  PackageType,
  MemberPackageStatus,
  EncounterType,
  EncounterStatus,
  PelaksanaanType,
  SessionStatus,
  VitalSignType,
  VitalSignTiming,
  JenisBotol,
  MutationType,
  InventoryCategory,
  EMRNoteType,
  AuthorRole,
} from "../src/generated/prisma";
import bcrypt from "bcryptjs";
import { generateStaffCode } from "../src/utils/uniqueCode";
import { seedSprint6 } from './sprint6.seed';
import { seedSprint7 } from './sprint7.seed';
import { seedSprint8 } from './sprint8.seed';

const prisma = new PrismaClient();

// ─── Constants ────────────────────────────────────────────────────────────────

// Sesuai Prisma schema: TANPA underscore
const ALL_ROLES: RoleName[] = [
  "SUPER_ADMIN", "ADMIN_MANAGER", "ADMIN_CABANG",
  "ADMIN_LAYANAN", "DOCTOR", "NURSE", "MEMBER",
];

const ROLE_PERMISSIONS: Record<RoleName, string[]> = {
  SUPER_ADMIN:   ["*"],
  ADMIN_MANAGER: ["branch:*", "package-pricing:*", "shipment:read", "user:manage-branch", "report:read"],
  ADMIN_CABANG:  ["member:read", "inventory:*", "stock-request:create", "shipment:approve", "user:manage-branch", "branch:stats"],
  ADMIN_LAYANAN: ["member:*", "encounter:*", "session:*", "package:assign", "invoice:read", "notification:send"],
  DOCTOR:       ["session:read", "therapy-plan:*", "diagnosis:*", "evaluation:*", "vital-sign:read"],
  NURSE:        ["session:read", "vital-sign:*", "infusion:*", "material:*", "photo:*", "emr-note:create"],
  MEMBER:       ["me:read", "me:sessions", "me:invoices", "me:notifications", "me:chat"],
};

// ─── Sprint 1 ─────────────────────────────────────────────────────────────────

async function seedRoles() {
  console.log("📦 Seeding roles...");
  for (const roleName of ALL_ROLES) {
    await prisma.role.upsert({
      where:  { name: roleName },
      update: { permissions: ROLE_PERMISSIONS[roleName] },
      create: { name: roleName, permissions: ROLE_PERMISSIONS[roleName] },
    });
    console.log(`  ✅ Role: ${roleName}`);
  }
}

async function seedDefaultBranch() {
  console.log("🏢 Seeding default branch (Pusat)...");
  await prisma.branch.upsert({
    where:  { branchCode: "PUSAT" },
    update: {},
    create: {
      branchCode:     "PUSAT",
      name:           "RAHO Klinik Pusat",
      address:        "Jl. Raya Pusat No. 1",
      city:           "Jakarta",
      phone:          "02100000001",
      tipe:           "KLINIK",
      operatingHours: "Senin-Sabtu 08:00-17:00",
      isActive:       true,
    },
  });
  console.log("  ✅ Branch: PUSAT");
}

async function seedSUPER_ADMIN() {
  console.log("👤 Seeding Super Admin...");
  const SUPER_ADMINRole = await prisma.role.findUniqueOrThrow({ where: { name: "SUPER_ADMIN" } });
  const email          = "SUPER_ADMIN@raho.id";
  const existingUser   = await prisma.user.findUnique({ where: { email } });
  const staffCode      = existingUser?.staffCode ?? await generateStaffCode("SUPER_ADMIN");
  const passwordHash   = await bcrypt.hash("Admin@RAHO2024!", 12);

  const SUPER_ADMIN = await prisma.user.upsert({
    where:  { email },
    update: { passwordHash, isActive: true },
    create: { email, passwordHash, staffCode, roleId: SUPER_ADMINRole.roleId, isActive: true },
  });

  await prisma.userProfile.upsert({
    where:  { userId: SUPER_ADMIN.userId },
    update: {},
    create: { userId: SUPER_ADMIN.userId, fullName: "Super Administrator RAHO", phone: "081200000000" },
  });

  console.log(`  ✅ Super Admin: ${email} / Admin@RAHO2024!`);
}

async function seedTestUsers() {
  console.log("🧪 Seeding test users...");
  const branch = await prisma.branch.findUniqueOrThrow({ where: { branchCode: "PUSAT" } });

  const testUsers: Array<{ email: string; fullName: string; role: RoleName; withBranch: boolean }> = [
    { email: "manager@raho.id",    fullName: "Admin Manager Test", role: "ADMIN_MANAGER", withBranch: false },
    { email: "admcabang@raho.id",  fullName: "Admin Cabang Test",  role: "ADMIN_CABANG",  withBranch: true  },
    { email: "admlayn@raho.id",    fullName: "Admin Layanan Test", role: "ADMIN_LAYANAN", withBranch: true  },
    { email: "dokter@raho.id",     fullName: "dr. Test Dokter",    role: "DOCTOR",       withBranch: true  },
    { email: "nakes@raho.id",      fullName: "Nakes Test",         role: "NURSE",        withBranch: true  },
  ];

  for (const u of testUsers) {
    const role         = await prisma.role.findUniqueOrThrow({ where: { name: u.role } });
    const passwordHash = await bcrypt.hash("Test@1234!", 12);
    const existingUser = await prisma.user.findUnique({ where: { email: u.email } });
    const staffCode    = existingUser?.staffCode ?? await generateStaffCode(u.role);

    const user = await prisma.user.upsert({
      where:  { email: u.email },
      update: { passwordHash, isActive: true },
      create: {
        email: u.email, passwordHash, staffCode,
        roleId:   role.roleId,
        branchId: u.withBranch ? branch.branchId : null,
        isActive: true,
      },
    });

    await prisma.userProfile.upsert({
      where:  { userId: user.userId },
      update: {},
      create: { userId: user.userId, fullName: u.fullName },
    });

    console.log(`  ✅ ${u.role}: ${u.email}`);
  }
  console.log("  🔐 Password semua test user: Test@1234!");
}

// ─── Sprint 2 ─────────────────────────────────────────────────────────────────

const generateMemberNo = async (branchId: string): Promise<string> => {
  const branch     = await prisma.branch.findUniqueOrThrow({ where: { branchId } });
  const cabangKode = branch.branchCode.slice(0, 3).toUpperCase();
  const kotaKode   = branch.city.slice(0, 3).toUpperCase();
  const tahun      = new Date().getFullYear().toString().slice(-2);
  const prefix     = `${cabangKode}.${kotaKode}.${tahun}.`;
  const count      = await prisma.member.count({ where: { memberNo: { startsWith: prefix } } });
  return `${prefix}${String(count + 1).padStart(5, "0")}`;
};

async function seedSprint2() {
  console.log("\n📦 Seeding Sprint 2 — Tanda Vital...");

  const SUPER_ADMIN = await prisma.user.findUniqueOrThrow({ where: { email: "SUPER_ADMIN@raho.id" } });
  const doctor     = await prisma.user.findUniqueOrThrow({ where: { email: "dokter@raho.id" } });
  const nurse      = await prisma.user.findUniqueOrThrow({ where: { email: "nakes@raho.id" } });
  const branch     = await prisma.branch.findUniqueOrThrow({ where: { branchCode: "PUSAT" } });
  const memberRole = await prisma.role.findUniqueOrThrow({ where: { name: "MEMBER" } });

  // 1. PackagePricing
  const packagePricing = await prisma.packagePricing.upsert({
    where: {
      branchId_packageType_totalSessions: {
        branchId:      branch.branchId,
        packageType:   PackageType.BASIC,
        totalSessions: 7,
      },
    },
    create: {
      branchId:      branch.branchId,
      packageType:   PackageType.BASIC,
      packageName:   "Paket Basic 7 Sesi",
      totalSessions: 7,
      price:         1_500_000,
      isActive:      true,
      setBy:         SUPER_ADMIN.userId,
    },
    update: {},
  });
  console.log(`  ✅ PackagePricing: ${packagePricing.packageName}`);

  // 2. Member User
  const memberEmail = "member.test@raho.id";
  const memberUser  = await prisma.user.upsert({
    where:  { email: memberEmail },
    create: {
      email:        memberEmail,
      passwordHash: await bcrypt.hash("Member@Test123!", 12),
      roleId:       memberRole.roleId,
      branchId:     branch.branchId,
      isActive:     true,
      profile:      { create: { fullName: "Budi Santoso" } },
    },
    update: {},
  });

  const existingMember = await prisma.member.findFirst({ where: { userId: memberUser.userId } });
  const memberNo       = existingMember?.memberNo ?? await generateMemberNo(branch.branchId);

  const member = await prisma.member.upsert({
    where:  { userId: memberUser.userId },
    create: {
      memberNo,
      userId:               memberUser.userId,
      registrationBranchId: branch.branchId,
      fullName:             "Budi Santoso",
      phone:                "081234567890",
      voucherCount:         7,
      isConsentToPhoto:     true,
    },
    update: {},
  });
  console.log(`  ✅ Member: ${member.memberNo} — ${member.fullName}`);

  // 3. MemberPackage
  let memberPackage = await prisma.memberPackage.findFirst({
    where: { memberId: member.memberId },
  });
  if (!memberPackage) {
    memberPackage = await prisma.memberPackage.create({
      data: {
        memberId:         member.memberId,
        branchId:         branch.branchId,
        packagePricingId: packagePricing.packagePricingId,
        packageType:      PackageType.BASIC,
        packageName:      packagePricing.packageName,
        totalSessions:    7,
        usedSessions:     2,
        originalPrice:    1_500_000,
        discountPercent:  0,
        discountAmount:   0,
        finalPrice:       1_500_000,
        status:           MemberPackageStatus.ACTIVE,
        paidAt:           new Date("2026-04-01"),
        verifiedBy:       SUPER_ADMIN.userId,
        verifiedAt:       new Date("2026-04-01"),
        activatedAt:      new Date("2026-04-01"),
      },
    });
  }
  console.log(`  ✅ MemberPackage: ${memberPackage.packageName} (${memberPackage.status})`);

  // 4. Encounter — FIX: cari by memberPackageId, bukan by notes
  let encounter = await prisma.encounter.findFirst({
    where: { memberPackageId: memberPackage.memberPackageId },
  });
  if (!encounter) {
    encounter = await prisma.encounter.create({
      data: {
        memberId:        member.memberId,
        doctorId:        doctor.userId,
        branchId:        branch.branchId,
        memberPackageId: memberPackage.memberPackageId,
        type:            EncounterType.TREATMENT,
        status:          EncounterStatus.ONGOING,
        treatmentDate:   new Date("2026-04-01"),
      },
    });
  }
  console.log(`  ✅ Encounter: ${encounter.type} (${encounter.status})`);

  // 5. Session 1 — COMPLETED
  let session1 = await prisma.treatmentSession.findFirst({
    where: { encounterId: encounter.encounterId, infusKe: 1 },
  });
  if (!session1) {
    session1 = await prisma.treatmentSession.create({
      data: {
        encounterId:   encounter.encounterId,
        nurseId:       nurse.userId,
        pelaksanaan:   PelaksanaanType.KLINIK,
        infusKe:       1,
        treatmentDate: new Date("2026-04-01T09:00:00Z"),
        startedAt:     new Date("2026-04-01T09:10:00Z"),
        completedAt:   new Date("2026-04-01T11:00:00Z"),
        status:        SessionStatus.COMPLETED,   // ✅ COMPLETED bukan COMPLETE
        berhasilInfus: true,
      },
    });
  }

  const vitalSignsData: { pencatatan: VitalSignType; waktuCatat: VitalSignTiming; hasil: number }[] = [
    { pencatatan: "SISTOL",   waktuCatat: "SEBELUM", hasil: 148 },
    { pencatatan: "SISTOL",   waktuCatat: "SESUDAH", hasil: 128 },
    { pencatatan: "DIASTOL",  waktuCatat: "SEBELUM", hasil: 92  },
    { pencatatan: "DIASTOL",  waktuCatat: "SESUDAH", hasil: 82  },
    { pencatatan: "SATURASI", waktuCatat: "SEBELUM", hasil: 96  },
    { pencatatan: "SATURASI", waktuCatat: "SESUDAH", hasil: 99  },
    { pencatatan: "HR",       waktuCatat: "SEBELUM", hasil: 90  },
    { pencatatan: "HR",       waktuCatat: "SESUDAH", hasil: 72  },
    { pencatatan: "PI",       waktuCatat: "SEBELUM", hasil: 1.2 },
    { pencatatan: "PI",       waktuCatat: "SESUDAH", hasil: 2.8 },
  ];

  for (const vs of vitalSignsData) {
    await prisma.sessionVitalSign.upsert({
      where: {
        treatmentSessionId_pencatatan_waktuCatat: {
          treatmentSessionId: session1.treatmentSessionId,
          pencatatan:         vs.pencatatan,
          waktuCatat:         vs.waktuCatat,
        },
      },
      create: { treatmentSessionId: session1.treatmentSessionId, ...vs },
      update: { hasil: vs.hasil },
    });
  }
  console.log(`  ✅ Session 1 (COMPLETED) — ${vitalSignsData.length} tanda vital`);

  // 6. Session 2 — INPROGRESS (FIX: bukan IN_PROGRESS)
  let session2 = await prisma.treatmentSession.findFirst({
    where: { encounterId: encounter.encounterId, infusKe: 2 },
  });
  if (!session2) {
    session2 = await prisma.treatmentSession.create({
      data: {
        encounterId:   encounter.encounterId,
        nurseId:       nurse.userId,
        pelaksanaan:   PelaksanaanType.KLINIK,
        infusKe:       2,
        treatmentDate: new Date("2026-04-08T09:00:00Z"),
        startedAt:     new Date("2026-04-08T09:05:00Z"),
        status:        SessionStatus.IN_PROGRESS,  // ✅ INPROGRESS bukan IN_PROGRESS
      },
    });
  }
  console.log(`  ✅ Session 2 (INPROGRESS) — siap untuk test POST`);

  console.log(`\n  📋 Test IDs (Sprint 2):`);
  console.log(`  SESSION_1_ID = ${session1.treatmentSessionId}`);
  console.log(`  SESSION_2_ID = ${session2.treatmentSessionId}`);

  return { branch, nurse, doctor, SUPER_ADMIN, member, memberPackage, encounter, session1, session2 };
}

// ─── Sprint 3 ─────────────────────────────────────────────────────────────────

const findOrCreateMasterProduct = async (data: {
  name: string; category: InventoryCategory; unit: string;
}): Promise<string> => {
  const existing = await prisma.masterProduct.findFirst({ where: { name: data.name } });
  if (existing) return existing.masterProductId;
  const created  = await prisma.masterProduct.create({ data: { ...data, isActive: true } });
  return created.masterProductId;
};

async function seedSprint3(sprint2Data: Awaited<ReturnType<typeof seedSprint2>>) {
  console.log("\n📦 Seeding Sprint 3 — Infus Aktual...");

  const { branch, nurse, doctor, session1, session2 } = sprint2Data;

  // 1. MasterProducts
  const PRODUCTS: Array<{ name: string; category: InventoryCategory; unit: string }> = [
    { name: "IFA Mg", category: InventoryCategory.MEDICINE,   unit: "mg" },
    { name: "HHO",    category: InventoryCategory.MEDICINE,   unit: "ml" },
    { name: "H2",     category: InventoryCategory.MEDICINE,   unit: "ml" },
    { name: "NO",     category: InventoryCategory.MEDICINE,   unit: "ml" },
    { name: "GASO",   category: InventoryCategory.MEDICINE,   unit: "ml" },
    { name: "O2",     category: InventoryCategory.MEDICINE,   unit: "ml" },
    { name: "O3",     category: InventoryCategory.MEDICINE,   unit: "ml" },
    { name: "EDTA",   category: InventoryCategory.MEDICINE,   unit: "ml" },
    { name: "MB",     category: InventoryCategory.MEDICINE,   unit: "ml" },
    { name: "H2S",    category: InventoryCategory.MEDICINE,   unit: "ml" },
    { name: "KCL",    category: InventoryCategory.MEDICINE,   unit: "ml" },
    { name: "NaCl",   category: InventoryCategory.CONSUMABLE, unit: "ml" },
  ];

  const masterProductMap: Record<string, string> = {};
  for (const p of PRODUCTS) {
    masterProductMap[p.name] = await findOrCreateMasterProduct(p);
  }
  console.log(`  ✅ ${PRODUCTS.length} MasterProducts`);

  // 2. InventoryItems
  const INITIAL_STOCK: Record<string, number> = {
    "IFA Mg": 5000, HHO: 2000, H2: 2000,   NO:    1000,
    GASO:    1000, O2:  3000, O3: 1000,    EDTA:  1000,
    MB:       500, H2S:  500, KCL:  800,   NaCl: 10000,
  };

  for (const [name, stock] of Object.entries(INITIAL_STOCK)) {
    const masterProductId = masterProductMap[name];
    await prisma.inventoryItem.upsert({
      where:  { masterProductId_branchId: { masterProductId, branchId: branch.branchId } },
      create: { masterProductId, branchId: branch.branchId, stock, minThreshold: 100, isActive: true },
      update: {},
    });
  }
  console.log(`  ✅ ${Object.keys(INITIAL_STOCK).length} InventoryItems`);

  // 3. SessionTherapyPlan — Session 1
  await prisma.sessionTherapyPlan.upsert({
    where:  { treatmentSessionId: session1.treatmentSessionId },
    create: {
      treatmentSessionId: session1.treatmentSessionId,
      plannedBy:  doctor.userId,
      ifaMg: 200, hhoMl: 150, h2Ml: 100, noMl:   80,
      gasoMl: 60, o2Ml: 200,  o3Ml:  50, edtaMl: 30,
      mbMl:  10, h2sMl:  20,  kclMl: 15, jmlNbMl: 500,
      keterangan: "Sesi pertama — dosis standar",
    },
    update: {},
  });
  console.log(`  ✅ SessionTherapyPlan Session 1`);

  // 4. InfusionExecution — Session 1
  const session1Full = await prisma.treatmentSession.findUniqueOrThrow({
    where:   { treatmentSessionId: session1.treatmentSessionId },
    include: { infusionExecution: true },
  });

  if (!session1Full.infusionExecution) {
    await prisma.infusionExecution.create({
      data: {
        treatmentSessionId:    session1.treatmentSessionId,
        filledBy:              nurse.userId,
        ifaMgActual: 200, hhoMlActual: 150, h2MlActual: 100,
        noMlActual:   80, gasoMlActual: 60, o2MlActual: 200,
        o3MlActual:   50, edtaMlActual: 30, mbMlActual:  10,
        h2sMlActual:  20, kclMlActual:  15, jmlNbMlActual: 500,
        jenisBotol:           JenisBotol.IFA,
        jenisCairan:          "NaCl 0.9%",
        volumeCarrierMl:       500,
        jumlahPenggunaanJarum: 2,
        tglProduksiCairan:    new Date("2026-04-01"),
        keterangan:           "Pelaksanaan berjalan lancar",
        deviationNote:        null,
      },
    });

    // StockMutations
    const DEDUCTIONS: Array<{ name: string; qty: number }> = [
      { name: "IFA Mg", qty: 200 }, { name: "HHO",  qty: 150 },
      { name: "H2",     qty: 100 }, { name: "NO",    qty:  80 },
      { name: "GASO",   qty:  60 }, { name: "O2",    qty: 200 },
      { name: "O3",     qty:  50 }, { name: "EDTA",  qty:  30 },
      { name: "MB",     qty:  10 }, { name: "H2S",   qty:  20 },
      { name: "KCL",    qty:  15 }, { name: "NaCl",  qty: 500 },
    ];

    for (const { name, qty } of DEDUCTIONS) {
      const masterProductId = masterProductMap[name];
      const item = await prisma.inventoryItem.findUnique({
        where: { masterProductId_branchId: { masterProductId, branchId: branch.branchId } },
      });
      if (!item) continue;
      const stockBefore = item.stock;
      const stockAfter  = stockBefore - qty;
      await prisma.inventoryItem.update({
        where: { inventoryItemId: item.inventoryItemId },
        data:  { stock: stockAfter },
      });
      await prisma.stockMutation.create({
        data: {
          inventoryItemId: item.inventoryItemId,
          branchId:        branch.branchId,
          type:            MutationType.USED,
          quantity:        -qty,
          stockBefore,
          stockAfter,
          createdBy:       nurse.userId,
          notes:           `[SEED_S3] ${name} — sesi ${session1.treatmentSessionId}`,
        },
      });
    }
    console.log(`  ✅ InfusionExecution Session 1 + 12 StockMutations`);
  } else {
    console.log(`  ⏭️  InfusionExecution Session 1 sudah ada — skip`);
  }

  // 5. SessionTherapyPlan — Session 2
  await prisma.sessionTherapyPlan.upsert({
    where:  { treatmentSessionId: session2.treatmentSessionId },
    create: {
      treatmentSessionId: session2.treatmentSessionId,
      plannedBy:  doctor.userId,
      ifaMg: 250, hhoMl: 180, h2Ml: 120, noMl:  100,
      gasoMl: 80, o2Ml: 220,  o3Ml:  60, edtaMl:  40,
      mbMl:  15, h2sMl:  25,  kclMl: 20, jmlNbMl: 500,
      keterangan: "Sesi kedua — dosis ditingkatkan",
    },
    update: {},
  });
  console.log(`  ✅ SessionTherapyPlan Session 2`);

  return { masterProductMap };
}

// ─── Sprint 4 ─────────────────────────────────────────────────────────────────

async function seedSprint4(
  sprint2Data: Awaited<ReturnType<typeof seedSprint2>>,
  sprint3Data: Awaited<ReturnType<typeof seedSprint3>>,
) {
  console.log("\n📦 Seeding Sprint 4 — Foto, Pemakaian Bahan, EMR Note...");

  const { branch, nurse, doctor, member, encounter, session1 } = sprint2Data;
  const { masterProductMap } = sprint3Data;

  // 1. SessionPhoto
  const existingPhotos = await prisma.sessionPhoto.count({
    where: { treatmentSessionId: session1.treatmentSessionId },
  });

  if (existingPhotos === 0) {
    const photosData = [
      {
        photoUrl: "/uploads/photos/seed-foto-1-sebelum.jpg",
        fileName: "seed-foto-1-sebelum.jpg",
        fileSizeBytes: 102400,
        caption: "Kondisi sebelum terapi — lengan kiri",
        takenAt: new Date("2026-04-01T09:08:00Z"),
        takenBy: nurse.userId,
      },
      {
        photoUrl: "/uploads/photos/seed-foto-2-sesudah.jpg",
        fileName: "seed-foto-2-sesudah.jpg",
        fileSizeBytes: 98304,
        caption: "Kondisi sesudah terapi — lengan kiri",
        takenAt: new Date("2026-04-01T11:05:00Z"),
        takenBy: nurse.userId,
      },
    ];

    for (const photo of photosData) {
      await prisma.sessionPhoto.create({
        data: {
          treatmentSessionId: session1.treatmentSessionId,
          memberId:           member.memberId,
          ...photo,
        },
      });
    }
    console.log(`  ✅ 2 SessionPhoto`);
  } else {
    console.log(`  ⏭️  SessionPhoto sudah ada — skip`);
  }

  // 2. MaterialUsage
  const existingMaterials = await prisma.materialUsage.count({
    where: { treatmentSessionId: session1.treatmentSessionId },
  });

  if (existingMaterials === 0) {
    const USAGES: Array<{ productName: string; quantity: number; unit: string }> = [
      { productName: "IFA Mg", quantity: 10,  unit: "mg" },
      { productName: "HHO",    quantity: 5,   unit: "ml" },
      { productName: "O3",     quantity: 2.5, unit: "ml" },
    ];

    for (const { productName, quantity, unit } of USAGES) {
      const masterProductId = masterProductMap[productName];
      const item = await prisma.inventoryItem.findUnique({
        where: { masterProductId_branchId: { masterProductId, branchId: branch.branchId } },
      });
      if (!item) continue;

      await prisma.materialUsage.create({
        data: {
          treatmentSessionId: session1.treatmentSessionId,
          inventoryItemId:    item.inventoryItemId,
          quantity, unit,
          inputBy: nurse.userId,
        },
      });

      const stockBefore = item.stock;
      const stockAfter  = stockBefore - quantity;
      await prisma.inventoryItem.update({
        where: { inventoryItemId: item.inventoryItemId },
        data:  { stock: stockAfter },
      });
      await prisma.stockMutation.create({
        data: {
          inventoryItemId: item.inventoryItemId,
          branchId:        branch.branchId,
          type:            MutationType.USED,
          quantity:        -quantity,
          stockBefore, stockAfter,
          createdBy: nurse.userId,
          notes:    `[SEED_S4] MaterialUsage ${productName}`,
        },
      });
    }
    console.log(`  ✅ 3 MaterialUsage + StockMutations`);
  } else {
    console.log(`  ⏭️  MaterialUsage sudah ada — skip`);
  }

  // 3. EMRNote — FIX: CLINICALNOTE bukan CLINICAL_NOTE
  const existingNotes = await prisma.eMRNote.count({
    where: { sessionId: session1.treatmentSessionId },
  });

  if (existingNotes === 0) {
    await prisma.eMRNote.create({
      data: {
        sessionId:   session1.treatmentSessionId,
        encounterId: encounter.encounterId,
        authorId:    nurse.userId,
        authorRole:  AuthorRole.NURSE,
        type:        EMRNoteType.CLINICAL_NOTE,    // ✅ CLINICALNOTE bukan CLINICAL_NOTE
        content: {
          text: "Pasien kooperatif selama terapi. Infus berjalan lancar. Tanda vital membaik pasca terapi.",
          tags: ["kooperatif", "lancar", "tanda-vital-baik"],
        },
      },
    });

    await prisma.eMRNote.create({
      data: {
        sessionId:   session1.treatmentSessionId,
        encounterId: encounter.encounterId,
        authorId:    doctor.userId,
        authorRole:  AuthorRole.DOCTOR,
        type:        EMRNoteType.ASSESSMENT,
        content: {
          text: "Respons positif terhadap terapi sesi pertama. TD turun dari 148/92 → 128/82 mmHg. SpO2 meningkat ke 99%.",
          tags: ["respons-baik", "tekanan-darah", "saturasi-oksigen"],
        },
      },
    });
    console.log(`  ✅ 2 EMRNote (CLINICALNOTE + ASSESSMENT)`);
  } else {
    console.log(`  ⏭️  EMRNote sudah ada — skip`);
  }
}

// ─── Sprint 5 ─────────────────────────────────────────────────────────────────

async function seedSprint5() {
  console.log("\n📦 Seeding Sprint 5 — Diagnosa...");

  // FIX: email dokter@raho.id bukan doctor@raho.id
  const doctor = await prisma.user.findUniqueOrThrow({ where: { email: "dokter@raho.id" } });
  const branch  = await prisma.branch.findUniqueOrThrow({ where: { branchCode: "PUSAT" } });

  // FIX: cari encounter via memberPackage, bukan via notes
  const memberUser = await prisma.user.findUnique({ where: { email: "member.test@raho.id" } });
  if (!memberUser) {
    console.warn("  ⚠️  member.test@raho.id belum ada — skip Sprint 5 seed");
    return;
  }

  const member = await prisma.member.findFirst({ where: { userId: memberUser.userId } });
  if (!member) {
    console.warn("  ⚠️  Member belum ada — skip Sprint 5 seed");
    return;
  }

  const memberPackage = await prisma.memberPackage.findFirst({
    where: { memberId: member.memberId },
  });
  if (!memberPackage) {
    console.warn("  ⚠️  MemberPackage belum ada — skip Sprint 5 seed");
    return;
  }

  // FIX: cari encounter by memberPackageId
  const encounter = await prisma.encounter.findFirst({
    where: { memberPackageId: memberPackage.memberPackageId },
  });
  if (!encounter) {
    console.warn("  ⚠️  Encounter belum ada — skip Sprint 5 seed");
    return;
  }

  // Generate kode: DX-PST-2604-NNNNN
  const branchSlug = branch.branchCode.slice(0, 3).toUpperCase();
  const now        = new Date();
  const yy         = now.getFullYear().toString().slice(-2);
  const mm         = String(now.getMonth() + 1).padStart(2, "0");
  const prefix     = `DX-${branchSlug}-${yy}${mm}-`;

  // Diagnosis 1 — Hipertensi Grade II
  const dx1Code = `${prefix}00001`;
  const dx1 = await prisma.diagnosis.upsert({
    where:  { diagnosisCode: dx1Code },
    create: {
      diagnosisCode:            dx1Code,
      encounterId:              encounter.encounterId,
      doktorPemeriksa:          doctor.userId,
      diagnosa:                 "Hipertensi Grade II dengan disfungsi endotel",
      kategoriDiagnosa:         "Hipertensi",
      icdPrimer:                "I10",
      icdSekunder:              "I73.9",
      keluhanRiwayatSekarang:   "Kepala berat dan pusing sejak 2 minggu. TD 160/100 mmHg saat pertama datang.",
      riwayatPenyakitTerdahulu: "Hipertensi sejak 5 tahun. Pernah rawat inap 2021 (TD 180/110).",
      riwayatSosialKebiasaan:   "Merokok 1 bungkus/hari, kopi 3 cangkir/hari, jarang olahraga.",
      riwayatPengobatan:        "Amlodipine 5mg 1x1 — tidak teratur.",
      pemeriksaanFisik:         "TD: 158/98 mmHg, Nadi: 88x/mnt, SpO2: 97%, BMI: 27.6",
      pemeriksaanTambahan: {
        neurologis:   "Refleks fisiologis +/+, patologis -/-",
        laboratorium: { GDS: "102 mg/dL", kolesterolTotal: "210 mg/dL", LDL: "145 mg/dL" },
        ekg:          "Sinus ritme, LVH (+)",
      },
    },
    update: {},
  });

  // Diagnosis 2 — Neuropati Perifer
  const dx2Code = `${prefix}00002`;
  const dx2 = await prisma.diagnosis.upsert({
    where:  { diagnosisCode: dx2Code },
    create: {
      diagnosisCode:            dx2Code,
      encounterId:              encounter.encounterId,
      doktorPemeriksa:          doctor.userId,
      diagnosa:                 "Neuropati perifer ringan-sedang",
      kategoriDiagnosa:         "Neurologi",
      icdPrimer:                "G62.9",
      keluhanRiwayatSekarang:   "Kesemutan tangan & kaki terutama malam hari sejak 3 bulan.",
      riwayatPenyakitTerdahulu: "Tidak ada riwayat DM. Konsumsi statin 2019-2021.",
      pemeriksaanFisik:         "Sensasi raba berkurang di ujung jari. Refleks Achilles ↓ bilateral.",
      pemeriksaanTambahan: {
        neurologis:   "Monofilament test: tidak merasakan tekanan di 3/10 titik",
        laboratorium: { VitB12: "180 pg/mL (rendah)", HbA1c: "5.4%" },
      },
    },
    update: {},
  });

  console.log(`  ✅ Diagnosis 1: ${dx1.diagnosisCode} — ${dx1.kategoriDiagnosa}`);
  console.log(`  ✅ Diagnosis 2: ${dx2.diagnosisCode} — ${dx2.kategoriDiagnosa}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
// SATU main function, hapus semua duplikat di atas


async function main() {
  console.log('Starting RAHO Seed...');

  // Sprint 1
  await seedRoles();
  await seedDefaultBranch();
  await seedSUPER_ADMIN();
  await seedTestUsers();

  // Sprint 2
  const sprint2Data = await seedSprint2();

  // Sprint 3
  const sprint3Data = await seedSprint3(sprint2Data);

  // Sprint 4
  await seedSprint4(sprint2Data, sprint3Data);

  // Sprint 5
  await seedSprint5();

  // Sprint 6
  await seedSprint6();

  // Sprint 7 ← wajib di dalam main(), bukan di luar
  await seedSprint7();
  await seedSprint8();
  console.log('Seeding selesai!');
}

// ─── Jalankan ─────────────────────────────────────────────────────────────────

main()
  .catch(e => {
    console.error('Seed gagal', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());