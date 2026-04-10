import { Router }       from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize }    from '../../middlewares/authorize';
// ✅ FIX: tambah RoleName
import { RoleName }     from '../../generated/prisma';
// ✅ FIX: tambah prisma
import { prisma }       from '../../config/prisma';
import {
  listMembers, lookupMember, grantAccess, createMember,
  getMemberById, getMemberSessions, updateMember, deleteMember,
  uploadMemberDocument, listMemberDocuments, deleteMemberDocument,
} from './members.controller';
import { photoUploadMiddleware } from '../../utils/fileUpload';

const router = Router();
router.use(authenticate);

const ALLSTAFF = ['NURSE', 'DOCTOR', 'ADMIN_LAYANAN', 'ADMIN_CABANG', 'ADMIN_MANAGER', 'SUPER_ADMIN'] as const;
const ADMINUP  = ['ADMIN_LAYANAN', 'ADMIN_CABANG', 'ADMIN_MANAGER', 'SUPER_ADMIN'] as const;
const BRANCHUP = ['ADMIN_CABANG', 'ADMIN_MANAGER', 'SUPER_ADMIN'] as const;
const SAONLY   = ['SUPER_ADMIN'] as const;

router.get   ('/',            authorize(...ALLSTAFF), listMembers);
router.get   ('/lookup',      authorize(...ALLSTAFF), lookupMember);
router.post  ('/grant-access',authorize(...ADMINUP),  grantAccess);
router.post  ('/',            authorize(...ADMINUP),  createMember);

router.get   ('/:memberId',            authorize(...ALLSTAFF), getMemberById);
router.get   ('/:memberId/sessions',   authorize(...ALLSTAFF), getMemberSessions);
router.patch ('/:memberId',            authorize(...SAONLY),   updateMember);
router.delete('/:memberId',            authorize(...SAONLY),   deleteMember);

router.get   ('/:memberId/documents',             authorize(...ALLSTAFF), listMemberDocuments);
router.post  ('/:memberId/documents',             authorize(...ADMINUP),  photoUploadMiddleware, uploadMemberDocument);
router.delete('/:memberId/documents/:documentId', authorize(...SAONLY),   deleteMemberDocument);

// ✅ FIX: tambah import RoleName + prisma + type d
router.get('/doctors', authorize(
  RoleName.ADMIN_LAYANAN, RoleName.ADMIN_CABANG,
  RoleName.ADMIN_MANAGER, RoleName.SUPER_ADMIN,
), async (req, res, next) => {
  try {
    const branchId = req.user!.branchId;
    const doctors  = await prisma.user.findMany({
      where:   { branchId, role: { name: 'DOCTOR' }, isActive: true },
      include: { profile: true },
    });
    // ✅ FIX: type explicit untuk d
    const data = doctors.map((d: typeof doctors[number]) => ({
      userId:   d.userId,
      fullName: d.profile?.fullName ?? d.email,
    }));
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

export default router;