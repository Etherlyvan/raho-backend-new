import { z } from 'zod';

export const listMembersSchema = z.object({
  search : z.string().optional(),
  status : z.enum(['ACTIVE', 'INACTIVE', 'LEAD']).optional(),
  page   : z.coerce.number().int().positive().default(1),
  limit  : z.coerce.number().int().positive().max(100).default(20),
});

export const createMemberSchema = z.object({
  // Data member
  fullName         : z.string().min(2).max(100),
  nik              : z.string().length(16).optional(),
  tempatLahir      : z.string().max(50).optional(),
  dateOfBirth      : z.string().datetime().optional(),
  jenisKelamin     : z.enum(['L', 'P']).optional(),
  phone            : z.string().max(20).optional(),
  email            : z.string().email().optional(),
  address          : z.string().max(255).optional(),
  pekerjaan        : z.string().max(100).optional(),
  statusNikah      : z.string().max(30).optional(),
  emergencyContact : z.string().max(100).optional(),
  sumberInfoRaho   : z.string().max(100).optional(),
  postalCode       : z.string().max(10).optional(),
  referralCodeId   : z.string().cuid().optional(),
  isConsentToPhoto : z.boolean().default(false),
  // Akun User MEMBER
  memberEmail      : z.string().email(),
  memberPassword   : z.string().min(8),
});

export const updateMemberSchema = z.object({
  fullName         : z.string().min(2).max(100).optional(),
  nik              : z.string().length(16).optional(),
  phone            : z.string().max(20).optional(),
  email            : z.string().email().optional(),
  address          : z.string().max(255).optional(),
  dateOfBirth      : z.string().datetime().optional(),
  jenisKelamin     : z.enum(['L', 'P']).optional(),
  statusNikah      : z.string().max(30).optional(),
  emergencyContact : z.string().max(100).optional(),
  postalCode       : z.string().max(10).optional(),
  tempatLahir      : z.string().max(50).optional(),
  pekerjaan        : z.string().max(100).optional(),
  isConsentToPhoto : z.boolean().optional(),
});

export const grantAccessSchema = z.object({
  memberId : z.string().cuid(),
  notes    : z.string().max(255).optional(),
});

export const lookupSchema = z.object({
  memberNo: z.string().min(3),
});

export type ListMembersQuery  = z.infer<typeof listMembersSchema>;
export type CreateMemberDto   = z.infer<typeof createMemberSchema>;
export type UpdateMemberDto   = z.infer<typeof updateMemberSchema>;
export type GrantAccessDto    = z.infer<typeof grantAccessSchema>;