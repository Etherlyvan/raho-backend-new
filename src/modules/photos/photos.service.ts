import fs from "fs";
import path from "path";
import { PrismaClient } from "../../generated/prisma";
import { AppError } from "../../utils/AppError";
import { assertMemberAccess } from "../../utils/memberAccess";
import type { RequestUser } from "../../types/express";

const prisma = new PrismaClient();

// ─── Helper: resolve URL foto dari path disk ──────────────────────────────────
const toPhotoUrl = (relativePath: string): string => {
  // Kembalikan path relatif — frontend yang prefix dengan BASE_URL
  return relativePath.startsWith("/uploads")
    ? relativePath
    : `/uploads/photos/${path.basename(relativePath)}`;
};

// ─── Helper: ambil detail sesi + cek consent member ─────────────────────────
async function getSessionWithConsent(sessionId: string) {
  const session = await prisma.treatmentSession.findUnique({
    where: { treatmentSessionId: sessionId },
    include: {
      encounter: {
        include: {
          member: {
            select: {
              memberId: true,
              memberNo: true,
              fullName: true,
              isConsentToPhoto: true, // ← fix TS2339
            },
          },
          branch: {
            select: { branchId: true, name: true },
          },
        },
      },
    },
  });

  if (!session) throw new AppError("Sesi tidak ditemukan", 404);
  return session;
}

// ─── Service ─────────────────────────────────────────────────────────────────
export class PhotoService {
  // ── GET /treatment-sessions/:sessionId/photos ────────────────────────────
  async listBySession(sessionId: string, actor: RequestUser) {
    // Validasi sesi ada + akses cabang
    const session = await getSessionWithConsent(sessionId);
    await assertMemberAccess(session.encounter.member.memberId, actor);

    const photos = await prisma.sessionPhoto.findMany({
      where: { treatmentSessionId: sessionId },
      orderBy: { createdAt: "desc" },
      include: {
        takenByUser: {
          select: {
            userId: true,
            profile: { select: { fullName: true } },
          },
        },
      },
    });

    return photos.map((p) => ({
      ...p,
      photoUrl: toPhotoUrl(p.photoUrl),
    }));
  }

  // ── POST /treatment-sessions/:sessionId/photos ───────────────────────────
  async upload(
    sessionId: string,
    actor: RequestUser,
    file: Express.Multer.File,
    caption?: string
  ) {
    // 1. Ambil sesi + cek akses
    const session = await getSessionWithConsent(sessionId);
    await assertMemberAccess(session.encounter.member.memberId, actor);

    // 2. Cek consent foto member
    if (!session.encounter.member.isConsentToPhoto) {
      // Hapus file yang sudah terlanjur diupload ke disk
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      throw new AppError(
        "Member belum memberikan consent foto. Upload tidak diizinkan.",
        403
      );
    }

    // 3. Bangun URL relatif untuk disimpan ke DB
    const relativeUrl = `/uploads/photos/${file.filename}`;

    // 4. Simpan ke DB
    const photo = await prisma.sessionPhoto.create({
      data: {
        treatmentSessionId: sessionId,
        memberId: session.encounter.member.memberId,
        photoUrl: relativeUrl,
        fileName: file.originalname,
        fileSizeBytes: file.size,
        caption: caption ?? null,
        takenAt: new Date(),
        takenBy: actor.userId,
      },
      include: {
        takenByUser: {
          select: {
            userId: true,
            profile: { select: { fullName: true } },
          },
        },
      },
    });

    return {
      ...photo,
      photoUrl: toPhotoUrl(photo.photoUrl),
    };
  }

  // ── DELETE /treatment-sessions/:sessionId/photos/:photoId ────────────────
  async remove(sessionId: string, photoId: string, actor: RequestUser) {
    // 1. Hanya SUPERADMIN yang boleh hapus
    if (actor.roleName !== "SUPER_ADMIN") {
      throw new AppError("Hanya SUPERADMIN yang dapat menghapus foto", 403);
    }

    // 2. Pastikan sesi ada
    const session = await getSessionWithConsent(sessionId);

    // 3. Cari foto
    const photo = await prisma.sessionPhoto.findUnique({
      where: { sessionPhotoId: photoId },
    });

    if (!photo) throw new AppError("Foto tidak ditemukan", 404);

    // 4. Validasi foto milik sesi ini
    if (photo.treatmentSessionId !== sessionId) {
      throw new AppError("Foto bukan milik sesi ini", 400);
    }

    // 5. Hapus file dari disk (jika ada)
    const diskPath = path.join(
      process.cwd(),
      "uploads",
      "photos",
      path.basename(photo.photoUrl)
    );
    if (fs.existsSync(diskPath)) {
      fs.unlinkSync(diskPath);
    }

    // 6. Hapus dari DB
    await prisma.sessionPhoto.delete({
      where: { sessionPhotoId: photoId },
    });

    return { deleted: true, photoId };
  }
}