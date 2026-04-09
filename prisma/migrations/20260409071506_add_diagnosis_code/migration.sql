/*
  Warnings:

  - The primary key for the `diagnoses` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `created_at` on the `diagnoses` table. All the data in the column will be lost.
  - You are about to drop the column `diagnosis_id` on the `diagnoses` table. All the data in the column will be lost.
  - You are about to drop the column `doktor_pemeriksa` on the `diagnoses` table. All the data in the column will be lost.
  - You are about to drop the column `encounter_id` on the `diagnoses` table. All the data in the column will be lost.
  - You are about to drop the column `icd_primer` on the `diagnoses` table. All the data in the column will be lost.
  - You are about to drop the column `icd_sekunder` on the `diagnoses` table. All the data in the column will be lost.
  - You are about to drop the column `icd_tersier` on the `diagnoses` table. All the data in the column will be lost.
  - You are about to drop the column `kategori_diagnosa` on the `diagnoses` table. All the data in the column will be lost.
  - You are about to drop the column `keluhan_riwayat_sekarang` on the `diagnoses` table. All the data in the column will be lost.
  - You are about to drop the column `pemeriksaan_fisik` on the `diagnoses` table. All the data in the column will be lost.
  - You are about to drop the column `pemeriksaan_tambahan` on the `diagnoses` table. All the data in the column will be lost.
  - You are about to drop the column `riwayat_pengobatan` on the `diagnoses` table. All the data in the column will be lost.
  - You are about to drop the column `riwayat_penyakit_terdahulu` on the `diagnoses` table. All the data in the column will be lost.
  - You are about to drop the column `riwayat_sosial_kebiasaan` on the `diagnoses` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `diagnoses` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[diagnosiscode]` on the table `diagnoses` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `diagnosiscode` to the `diagnoses` table without a default value. This is not possible if the table is not empty.
  - The required column `diagnosisid` was added to the `diagnoses` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `doktorpemeriksa` to the `diagnoses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `encounterid` to the `diagnoses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedat` to the `diagnoses` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "diagnoses" DROP CONSTRAINT "diagnoses_encounter_id_fkey";

-- AlterTable
ALTER TABLE "diagnoses" DROP CONSTRAINT "diagnoses_pkey",
DROP COLUMN "created_at",
DROP COLUMN "diagnosis_id",
DROP COLUMN "doktor_pemeriksa",
DROP COLUMN "encounter_id",
DROP COLUMN "icd_primer",
DROP COLUMN "icd_sekunder",
DROP COLUMN "icd_tersier",
DROP COLUMN "kategori_diagnosa",
DROP COLUMN "keluhan_riwayat_sekarang",
DROP COLUMN "pemeriksaan_fisik",
DROP COLUMN "pemeriksaan_tambahan",
DROP COLUMN "riwayat_pengobatan",
DROP COLUMN "riwayat_penyakit_terdahulu",
DROP COLUMN "riwayat_sosial_kebiasaan",
DROP COLUMN "updated_at",
ADD COLUMN     "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "diagnosiscode" TEXT NOT NULL,
ADD COLUMN     "diagnosisid" TEXT NOT NULL,
ADD COLUMN     "doktorpemeriksa" TEXT NOT NULL,
ADD COLUMN     "encounterid" TEXT NOT NULL,
ADD COLUMN     "icdprimer" TEXT,
ADD COLUMN     "icdsekunder" TEXT,
ADD COLUMN     "icdtersier" TEXT,
ADD COLUMN     "kategoridiagnosa" TEXT,
ADD COLUMN     "keluhanriwayatsekarang" TEXT,
ADD COLUMN     "pemeriksaanfisik" TEXT,
ADD COLUMN     "pemeriksaantambahan" JSONB,
ADD COLUMN     "riwayatpengobatan" TEXT,
ADD COLUMN     "riwayatpenyakitterdahulu" TEXT,
ADD COLUMN     "riwayatsosialkebiasaan" TEXT,
ADD COLUMN     "updatedat" TIMESTAMP(3) NOT NULL,
ADD CONSTRAINT "diagnoses_pkey" PRIMARY KEY ("diagnosisid");

-- CreateIndex
CREATE UNIQUE INDEX "diagnoses_diagnosiscode_key" ON "diagnoses"("diagnosiscode");

-- AddForeignKey
ALTER TABLE "diagnoses" ADD CONSTRAINT "diagnoses_encounterid_fkey" FOREIGN KEY ("encounterid") REFERENCES "encounters"("encounter_id") ON DELETE RESTRICT ON UPDATE CASCADE;
