import { hashSync }               from 'bcryptjs';
import { prisma }                  from '../../config/prisma';
import { AppError }                from '../../utils/AppError';
import { assertMemberAccess }      from '../../utils/memberAccess';
import { generateMemberNo, generateStaffCode } from '../../utils/uniqueCode';
import { logAudit }                from '../../utils/auditLog.helper';
// SESUDAH — tambah DocumentType
import { RoleName, MemberStatus, Prisma, DocumentType } from '../../generated/prisma';
import type { RequestUser }        from '../../types/express';
import type {
  ListMembersQuery, CreateMemberDto,
  UpdateMemberDto, GrantAccessDto,
} from './members.validator';
import { uploadFile, deleteFile } from '../../utils/storage';


const GLOBAL_ROLES: RoleName[] = ['SUPER_ADMIN', 'ADMIN_MANAGER'];

// ─── List Members ─────────────────────────────────────────────────────────────

export const listMembersService = async (
  query: ListMembersQuery,
  user: RequestUser,
) => {
  const isGlobal = GLOBAL_ROLES.includes(user.roleName);
  const { search, status, page, limit } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.MemberWhereInput = {};

  // Scope: non-global hanya lihat member cabangnya sendiri atau yang sudah di-grant
  if (!isGlobal) {
    where.OR = [
      { registrationBranchId: user.branchId! },
      { branchAccesses: { some: { branchId: user.branchId!, isActive: true } } },
    ];
  }

  if (search) {
    const searchFilter: Prisma.MemberWhereInput = {
      OR: [
        { fullName: { contains: search, mode: 'insensitive' } },
        { memberNo: { contains: search, mode: 'insensitive' } },
        { phone:    { contains: search } },
        { nik:      { contains: search } },
      ],
    };
    where.AND = [searchFilter];
  }

  if (status) where.status = status as MemberStatus;

  const [items, total] = await prisma.$transaction([
    prisma.member.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        memberId           : true,
        memberNo           : true,
        fullName           : true,
        phone              : true,
        status             : true,
        voucherCount       : true,
        isConsentToPhoto   : true,
        createdAt          : true,
        registrationBranch : { select: { name: true, branchCode: true } },
        branchAccesses     : {
          where  : { isActive: true },
          select : { accessId: true, branch: { select: { name: true } } },
        },
      },
    }),
    prisma.member.count({ where }),
  ]);

  return {
    items: items.map(m => ({
      ...m,
      isLintasCabang : m.branchAccesses.length > 0,
      createdAt      : m.createdAt.toISOString(),
    })),
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// ─── Lookup member lintas cabang via memberNo ─────────────────────────────────

export const lookupMemberService = async (memberNo: string, user: RequestUser) => {
  const member = await prisma.member.findUnique({
    where: { memberNo },
    select: {
      memberId             : true,
      memberNo             : true,
      fullName             : true,
      phone                : true,
      status               : true,
      registrationBranchId : true,
      registrationBranch   : { select: { name: true, branchCode: true } },
      branchAccesses       : {
        where  : { branchId: user.branchId!, isActive: true },
        select : { accessId: true },
      },
    },
  });

  if (!member) throw new AppError('Member tidak ditemukan.', 404);

  return {
    memberId             : member.memberId,
    memberNo             : member.memberNo,
    fullName             : member.fullName,
    phone                : member.phone,
    status               : member.status,
    registrationBranch   : member.registrationBranch,
    sudahAdaAkses        : member.branchAccesses.length > 0,
    isRegistrationBranch : member.registrationBranchId === user.branchId,
  };
};

// ─── Grant akses cabang ───────────────────────────────────────────────────────

export const grantBranchAccessService = async (
  dto: GrantAccessDto,
  user: RequestUser,
) => {
  const { memberId, notes } = dto;

  const member = await prisma.member.findUnique({
    where   : { memberId },
    include : { branchAccesses: { where: { branchId: user.branchId!, isActive: true } } },
  });

  if (!member) throw new AppError('Member tidak ditemukan.', 404);

  if (member.registrationBranchId === user.branchId) {
    throw new AppError('Member sudah terdaftar di cabang ini.', 400);
  }

  if (member.branchAccesses.length > 0) {
    throw new AppError('Member sudah memiliki akses di cabang ini.', 409);
  }

  const access = await prisma.branchMemberAccess.create({
    data: {
      memberId,
      branchId  : user.branchId!,
      grantedBy : user.userId,
      isActive  : true,
      notes,
    },
  });

  await logAudit({
    userId    : user.userId,
    action    : 'CREATE',
    resource  : 'BranchMemberAccess',
    resourceId: access.accessId,
    meta      : { memberId, branchId: user.branchId, notes },
  });

  return { accessId: access.accessId, message: 'Akses berhasil diberikan.' };
};

// ─── Create member baru ───────────────────────────────────────────────────────

export const createMemberService = async (
  dto: CreateMemberDto,
  user: RequestUser,
) => {
  const branchId = user.branchId!;

  const [existEmail, existNik] = await Promise.all([
    prisma.user.findUnique({ where: { email: dto.memberEmail }, select: { userId: true } }),
    dto.nik
      ? prisma.member.findUnique({ where: { nik: dto.nik }, select: { memberId: true } })
      : Promise.resolve(null),
  ]);

  if (existEmail) throw new AppError('Email sudah terdaftar.', 409);
  if (existNik)   throw new AppError('NIK sudah terdaftar.', 409);

  if (dto.referralCodeId) {
    const ref = await prisma.referralCode.findUnique({
      where: { referralCodeId: dto.referralCodeId },
    });
    if (!ref || !ref.isActive) throw new AppError('Referral code tidak valid atau sudah nonaktif.', 400);
  }

  const [memberRole, memberNo, staffCode] = await Promise.all([
    prisma.role.findUniqueOrThrow({ where: { name: 'MEMBER' } }),
    generateMemberNo(branchId),
    generateStaffCode('MEMBER'),
  ]);

  const passwordHash = hashSync(dto.memberPassword, 12);

  const newMember = await prisma.$transaction(async tx => {
    const newUser = await tx.user.create({
      data: {
        email        : dto.memberEmail,
        passwordHash,
        staffCode,
        roleId   : memberRole.roleId,
        branchId,
        isActive : true,
      },
    });

    await tx.userProfile.create({
      data: { userId: newUser.userId, fullName: dto.fullName },
    });

    return tx.member.create({
      data: {
        memberNo,
        userId               : newUser.userId,
        registrationBranchId : branchId,
        fullName             : dto.fullName,
        nik                  : dto.nik,
        tempatLahir          : dto.tempatLahir,
        dateOfBirth          : dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        jenisKelamin         : dto.jenisKelamin,
        phone                : dto.phone,
        email                : dto.email,
        address              : dto.address,
        pekerjaan            : dto.pekerjaan,
        statusNikah          : dto.statusNikah,
        emergencyContact     : dto.emergencyContact,
        sumberInfoRaho       : dto.sumberInfoRaho,
        postalCode           : dto.postalCode,
        referralCodeId       : dto.referralCodeId,
        isConsentToPhoto     : dto.isConsentToPhoto,
        status               : 'ACTIVE',
        voucherCount         : 0,
      },
      select: { memberId: true, memberNo: true, fullName: true },
    });
  });

  await logAudit({
    userId    : user.userId,
    action    : 'CREATE',
    resource  : 'Member',
    resourceId: newMember.memberId,
    meta      : { memberNo, fullName: dto.fullName, branchId },
  });

  return { ...newMember, message: 'Member berhasil dibuat.' };
};

// ─── Detail member ────────────────────────────────────────────────────────────

export const getMemberByIdService = async (memberId: string, user: RequestUser) => {
  await assertMemberAccess(memberId, user);

  const member = await prisma.member.findUnique({
    where  : { memberId },
    include: {
      registrationBranch : { select: { name: true, branchCode: true } },
      referralCode       : { select: { code: true, referrerName: true } },
      branchAccesses     : {
        where  : { isActive: true },
        include: { branch: { select: { name: true } } },
      },
      packages: {
        orderBy: { createdAt: 'desc' },
        select : {
          memberPackageId : true,
          packageType     : true,
          packageName     : true,
          totalSessions   : true,
          usedSessions    : true,
          finalPrice      : true,
          status          : true,
          activatedAt     : true,
          expiredAt       : true,
        },
      },
      documents: {
        orderBy: { uploadedAt: 'desc' },
        select : {
          memberDocumentId: true,
          documentType    : true,
          fileName        : true,
          fileUrl         : true,
          uploadedAt      : true,
        },
      },
    },
  });

  if (!member) throw new AppError('Member tidak ditemukan.', 404);

  return {
    ...member,
    dateOfBirth : member.dateOfBirth?.toISOString() ?? null,
    createdAt   : member.createdAt.toISOString(),
    updatedAt   : member.updatedAt.toISOString(),
  };
};

// ─── Sesi per member — dipakai di tab Sesi halaman member ────────────────────

export const getMemberSessionsService = async (memberId: string, user: RequestUser) => {
  await assertMemberAccess(memberId, user);

  const encounters = await prisma.encounter.findMany({
    where  : { memberId },
    orderBy: { createdAt: 'desc' },
    include: {
      branch: { select: { name: true } },
      sessions: {
        orderBy: { infusKe: 'asc' },
        select : {
          treatmentSessionId : true,
          infusKe            : true,
          status             : true,
          treatmentDate      : true,
          pelaksanaan        : true,
          startedAt          : true,
          completedAt        : true,
        },
      },
    },
  });

  return encounters.map(e => ({
    encounterId  : e.encounterId,
    type         : e.type,
    status       : e.status,
    treatmentDate: e.treatmentDate?.toISOString() ?? null,
    completedAt  : e.completedAt?.toISOString() ?? null,
    createdAt    : e.createdAt.toISOString(),
    branch       : e.branch,
    sessions     : e.sessions.map(s => ({
      ...s,
      treatmentDate: s.treatmentDate.toISOString(),
      startedAt    : s.startedAt?.toISOString() ?? null,
      completedAt  : s.completedAt?.toISOString() ?? null,
    })),
  }));
};

// ─── Update member (SUPERADMIN) ───────────────────────────────────────────────

export const updateMemberService = async (
  memberId: string,
  dto: UpdateMemberDto,
  user: RequestUser,
) => {
  await assertMemberAccess(memberId, user);

  const updated = await prisma.member.update({
    where : { memberId },
    data  : {
      ...dto,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
    },
    select: { memberId: true, memberNo: true, fullName: true, updatedAt: true },
  });

  await logAudit({
    userId    : user.userId,
    action    : 'UPDATE',
    resource  : 'Member',
    resourceId: memberId,
    meta      : { changes: dto },
  });

  return updated;
};

// ─── Delete member (SUPERADMIN) ───────────────────────────────────────────────

export const deleteMemberService = async (memberId: string, user: RequestUser) => {
  const member = await prisma.member.findUnique({
    where : { memberId },
    select: { memberId: true, memberNo: true, userId: true },
  });

  if (!member) throw new AppError('Member tidak ditemukan.', 404);

  // Soft-delete: nonaktifkan user saja, jangan hapus data klinis
  await prisma.user.update({
    where: { userId: member.userId },
    data : { isActive: false },
  });

  await prisma.member.update({
    where: { memberId },
    data : { status: 'INACTIVE' },
  });

  await logAudit({
    userId    : user.userId,
    action    : 'DELETE',
    resource  : 'Member',
    resourceId: memberId,
    meta      : { memberNo: member.memberNo },
  });

  return { message: 'Member berhasil dinonaktifkan.' };
};

// ─── Upload dokumen ───────────────────────────────────────────────────────────

export const uploadMemberDocumentService = async (
  memberId : string,
  file     : Express.Multer.File,
  docType  : string,
  user     : RequestUser,
) => {
  await assertMemberAccess(memberId, user);

  const folder  = `members/${memberId}/documents`;
  const fileUrl = await uploadFile(file, folder);

  const doc = await prisma.memberDocument.create({
    data: {
      memberId,
      documentType  : docType as DocumentType,
      fileUrl,
      fileName      : file.originalname,
      mimeType      : file.mimetype,
      fileSizeBytes : file.size,
      uploadedBy    : user.userId,
    },
    select: {
      memberDocumentId : true,
      documentType     : true,
      fileName         : true,
      fileUrl          : true,
      mimeType         : true,
      fileSizeBytes    : true,
      uploadedAt       : true,
    },
  });

  await logAudit({
    userId    : user.userId,
    action    : 'CREATE',
    resource  : 'MemberDocument',
    resourceId: doc.memberDocumentId,
    meta      : { memberId, documentType: docType, fileName: file.originalname },
  });

  return doc;
};

// ─── List dokumen ─────────────────────────────────────────────────────────────

export const listMemberDocumentsService = async (
  memberId : string,
  user     : RequestUser,
) => {
  await assertMemberAccess(memberId, user);

  return prisma.memberDocument.findMany({
    where  : { memberId },
    orderBy: { uploadedAt: 'desc' },
    select : {
      memberDocumentId : true,
      documentType     : true,
      fileName         : true,
      fileUrl          : true,
      mimeType         : true,
      fileSizeBytes    : true,
      uploadedAt       : true,
      uploader         : {
        select: { profile: { select: { fullName: true } } },
      },
    },
  });
};

// ─── Hapus dokumen (SUPERADMIN) ───────────────────────────────────────────────

export const deleteMemberDocumentService = async (
  documentId : string,
  user       : RequestUser,
) => {
  const doc = await prisma.memberDocument.findUnique({
    where : { memberDocumentId: documentId },
    select: { memberDocumentId: true, fileUrl: true, memberId: true },
  });

  if (!doc) throw new AppError('Dokumen tidak ditemukan.', 404);

  await deleteFile(doc.fileUrl);

  await prisma.memberDocument.delete({ where: { memberDocumentId: documentId } });

  await logAudit({
    userId    : user.userId,
    action    : 'DELETE',
    resource  : 'MemberDocument',
    resourceId: documentId,
    meta      : { memberId: doc.memberId },
  });

  return { message: 'Dokumen berhasil dihapus.' };
};