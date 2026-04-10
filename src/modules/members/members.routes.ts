import { Router }       from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize }    from '../../middlewares/authorize';
import {
  listMembers,
  lookupMember,
  grantAccess,
  createMember,
  getMemberById,
  getMemberSessions,
  updateMember,
  deleteMember,
} from './members.controller';
// Tambahkan import:
import { photoUploadMiddleware } from '../../utils/fileUpload';
import {
  uploadMemberDocument,
  listMemberDocuments,
  deleteMemberDocument,
} from './members.controller';

const router = Router();
router.use(authenticate);

const ALL_STAFF  = ['NURSE', 'DOCTOR', 'ADMIN_LAYANAN', 'ADMIN_CABANG', 'ADMIN_MANAGER', 'SUPER_ADMIN'] as const;
const ADMIN_UP   = ['ADMIN_LAYANAN', 'ADMIN_CABANG', 'ADMIN_MANAGER', 'SUPER_ADMIN'] as const;
const BRANCH_UP  = ['ADMIN_CABANG', 'ADMIN_MANAGER', 'SUPER_ADMIN'] as const;
const SA_ONLY    = ['SUPER_ADMIN'] as const;

// ─── Collection routes ────────────────────────────────────────────────────────

router.get  ('/',               authorize(...ALL_STAFF),  listMembers);   // list + search
router.get  ('/lookup',         authorize(...ALL_STAFF),  lookupMember);  // ?memberNo=XXX lintas cabang
router.post ('/grant-access',   authorize(...ADMIN_UP),   grantAccess);   // beri akses lintas cabang
router.post ('/',               authorize(...ADMIN_UP),   createMember);  // buat member baru

// ─── Member-scoped routes ─────────────────────────────────────────────────────

router.get  ('/:memberId',          authorize(...ALL_STAFF), getMemberById);
router.get  ('/:memberId/sessions', authorize(...ALL_STAFF), getMemberSessions);
router.patch('/:memberId',          authorize(...SA_ONLY),   updateMember);
router.delete('/:memberId',         authorize(...SA_ONLY),   deleteMember);

// Tambahkan setelah route /:memberId yang sudah ada:
router.get   ('/:memberId/documents',                  authorize(...ALL_STAFF),  listMemberDocuments);
router.post  ('/:memberId/documents',
              authorize('ADMIN_LAYANAN', 'ADMIN_CABANG', 'ADMIN_MANAGER', 'SUPER_ADMIN'),
              photoUploadMiddleware,
              uploadMemberDocument);
router.delete('/:memberId/documents/:documentId',      authorize('SUPER_ADMIN'),  deleteMemberDocument);
export default router;