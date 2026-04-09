import { PrismaClient } from "../../generated/prisma";
import { AppError } from "../../utils/AppError";

const prisma = new PrismaClient();

// Helper: attach author profile ke array notes
async function attachAuthors(notes: any[]) {
  if (notes.length === 0) return notes;

  const authorIds = [...new Set(notes.map((n) => n.authorId))];
  const authors = await prisma.user.findMany({
    where: { userId: { in: authorIds } },
    select: {
      userId: true,
      profile: { select: { fullName: true } },
    },
  });

  const authorMap = new Map(authors.map((u) => [u.userId, u]));

  return notes.map((n) => ({
    ...n,
    author: authorMap.get(n.authorId) ?? { userId: n.authorId, profile: null },
  }));
}

export class EmrNoteService {
  async listBySession(sessionId: string) {
    // Pastikan sesi ada
    const session = await prisma.treatmentSession.findUnique({
      where: { treatmentSessionId: sessionId },
      select: { treatmentSessionId: true },
    });
    if (!session) throw new AppError("Sesi tidak ditemukan", 404);

    const notes = await prisma.eMRNote.findMany({
      where: { sessionId },
      orderBy: { createdAt: "desc" },
      // TIDAK ada include author — bukan Prisma relation
    });

    return attachAuthors(notes);
  }

  async create(
    sessionId: string,
    actorId: string,
    actorRole: string,
    body: { type: string; text: string; tags?: string }
  ) {
    const session = await prisma.treatmentSession.findUnique({
      where: { treatmentSessionId: sessionId },
      select: { treatmentSessionId: true, encounterId: true },
    });
    if (!session) throw new AppError("Sesi tidak ditemukan", 404);

    // Validasi role yang boleh membuat EMR note
    const ALLOWED_ROLES = ["NURSE", "DOCTOR", "ADMINLAYANAN", "SUPERADMIN"];
    if (!ALLOWED_ROLES.includes(actorRole)) {
      throw new AppError("Tidak memiliki izin untuk membuat EMR note", 403);
    }

    // Mapping role → AuthorRole enum Prisma
    const ROLE_MAP: Record<string, string> = {
      NURSE: "NURSE",
      DOCTOR: "DOCTOR",
      ADMINLAYANAN: "ADMIN",
      SUPERADMIN: "ADMIN",
    };

    // Bangun content JSON
    const tags = body.tags
      ? body.tags.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    const content = { text: body.text, tags };

    const note = await prisma.eMRNote.create({
      data: {
        sessionId,
        encounterId: session.encounterId,
        authorId: actorId,
        authorRole: ROLE_MAP[actorRole] as any,
        type: body.type as any,
        content,
        // TIDAK gunakan connect/create untuk author — bukan relation Prisma
      },
      // TIDAK ada include author
    });

    // Attach author data manual
    const [noted] = await attachAuthors([note]);
    return noted;
  }
}