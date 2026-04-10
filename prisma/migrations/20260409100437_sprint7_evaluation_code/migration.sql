/*
  Warnings:

  - A unique constraint covering the columns `[evaluation_code]` on the table `doctor_evaluations` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "doctor_evaluations" ADD COLUMN     "evaluation_code" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "doctor_evaluations_evaluation_code_key" ON "doctor_evaluations"("evaluation_code");
