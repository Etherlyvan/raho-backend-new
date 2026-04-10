import { Response, NextFunction }     from 'express';
import { sendSuccess }                from '../../utils/response';
import { AppError }                   from '../../utils/AppError';
import type { AuthRequest }           from '../../middlewares/authenticate';
import {
  listMembersSchema,
  createMemberSchema,
  updateMemberSchema,
  grantAccessSchema,
  lookupSchema,
} from './members.validator';
import {
  listMembersService,
  lookupMemberService,
  grantBranchAccessService,
  createMemberService,
  getMemberByIdService,
  getMemberSessionsService,
  updateMemberService,
  deleteMemberService,
} from './members.service';

export const listMembers = async (
  req: AuthRequest, res: Response, next: NextFunction,
) => {
  try {
    const query = listMembersSchema.parse(req.query);
    const data  = await listMembersService(query, req.user!);
    sendSuccess(res, data, 'Daftar member berhasil diambil');
  } catch (err) { next(err); }
};

export const lookupMember = async (
  req: AuthRequest, res: Response, next: NextFunction,
) => {
  try {
    const { memberNo } = lookupSchema.parse(req.query);
    const data = await lookupMemberService(memberNo, req.user!);
    sendSuccess(res, data, 'Member ditemukan');
  } catch (err) { next(err); }
};

export const grantAccess = async (
  req: AuthRequest, res: Response, next: NextFunction,
) => {
  try {
    const dto  = grantAccessSchema.parse(req.body);
    const data = await grantBranchAccessService(dto, req.user!);
    sendSuccess(res, data, 'Akses berhasil diberikan', 201);
  } catch (err) { next(err); }
};

export const createMember = async (
  req: AuthRequest, res: Response, next: NextFunction,
) => {
  try {
    const dto  = createMemberSchema.parse(req.body);
    const data = await createMemberService(dto, req.user!);
    sendSuccess(res, data, 'Member berhasil dibuat', 201);
  } catch (err) { next(err); }
};

export const getMemberById = async (
  req: AuthRequest, res: Response, next: NextFunction,
) => {
  try {
    const data = await getMemberByIdService(req.params.memberId, req.user!);
    sendSuccess(res, data, 'Detail member berhasil diambil');
  } catch (err) { next(err); }
};

export const getMemberSessions = async (
  req: AuthRequest, res: Response, next: NextFunction,
) => {
  try {
    const data = await getMemberSessionsService(req.params.memberId, req.user!);
    sendSuccess(res, data, 'Sesi member berhasil diambil');
  } catch (err) { next(err); }
};

export const updateMember = async (
  req: AuthRequest, res: Response, next: NextFunction,
) => {
  try {
    const dto  = updateMemberSchema.parse(req.body);
    const data = await updateMemberService(req.params.memberId, dto, req.user!);
    sendSuccess(res, data, 'Member berhasil diperbarui');
  } catch (err) { next(err); }
};

export const deleteMember = async (
  req: AuthRequest, res: Response, next: NextFunction,
) => {
  try {
    const data = await deleteMemberService(req.params.memberId, req.user!);
    sendSuccess(res, data, 'Member berhasil dinonaktifkan');
  } catch (err) { next(err); }
};

// Tambahkan import service baru:
import {
  uploadMemberDocumentService,
  listMemberDocumentsService,
  deleteMemberDocumentService,
} from './members.service';

export const uploadMemberDocument = async (
  req: AuthRequest, res: Response, next: NextFunction,
) => {
  try {
    if (!req.file) throw new AppError('File wajib diupload.', 400);
    const docType = (req.body.documentType as string) ?? 'OTHER';
    const data = await uploadMemberDocumentService(
      req.params.memberId, req.file, docType, req.user!,
    );
    sendSuccess(res, data, 'Dokumen berhasil diupload', 201);
  } catch (err) { next(err); }
};

export const listMemberDocuments = async (
  req: AuthRequest, res: Response, next: NextFunction,
) => {
  try {
    const data = await listMemberDocumentsService(req.params.memberId, req.user!);
    sendSuccess(res, data, 'Daftar dokumen berhasil diambil');
  } catch (err) { next(err); }
};

export const deleteMemberDocument = async (
  req: AuthRequest, res: Response, next: NextFunction,
) => {
  try {
    const data = await deleteMemberDocumentService(req.params.documentId, req.user!);
    sendSuccess(res, data, 'Dokumen berhasil dihapus');
  } catch (err) { next(err); }
};