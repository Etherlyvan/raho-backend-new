// src/utils/storage.ts
import fs   from 'fs';
import path from 'path';

const UPLOAD_ROOT = path.join(process.cwd(), 'uploads');

/**
 * Upload file ke local disk.
 * Mendukung multer diskStorage (file.path) maupun memoryStorage (file.buffer).
 *
 * @param file   - Express.Multer.File dari middleware
 * @param folder - Subfolder relatif, e.g. "members/abc123/documents"
 * @returns      - Path relatif yang disimpan di DB, e.g. "uploads/members/abc123/documents/file.pdf"
 */
export async function uploadFile(
  file  : Express.Multer.File,
  folder: string,
): Promise<string> {
  const dir = path.join(UPLOAD_ROOT, folder);
  fs.mkdirSync(dir, { recursive: true });

  const ext      = path.extname(file.originalname).toLowerCase() || '.bin';
  const safeName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${ext}`;
  const destPath = path.join(dir, safeName);

  if (file.path) {
    // diskStorage → pindahkan file yang sudah ada
    fs.renameSync(file.path, destPath);
  } else if (file.buffer) {
    // memoryStorage → tulis buffer ke disk
    fs.writeFileSync(destPath, new Uint8Array(file.buffer));
  } else {
    throw new Error('Tidak ada data file yang bisa disimpan (path/buffer kosong).');
  }

  // Return relative URL yang disimpan ke DB
  return `uploads/${folder}/${safeName}`;
}

/**
 * Hapus file dari local disk berdasarkan path relatif yang tersimpan di DB.
 * Tidak melempar error jika file tidak ditemukan (idempotent).
 *
 * @param fileUrl - Path relatif seperti "uploads/members/abc123/documents/file.pdf"
 */
export async function deleteFile(fileUrl: string): Promise<void> {
  const absPath = path.join(process.cwd(), fileUrl);
  if (fs.existsSync(absPath)) {
    fs.unlinkSync(absPath);
  }
}