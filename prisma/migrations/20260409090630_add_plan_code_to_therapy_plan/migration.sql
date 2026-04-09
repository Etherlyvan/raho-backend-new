/*
  Warnings:

  - A unique constraint covering the columns `[plan_code]` on the table `session_therapy_plans` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "session_therapy_plans" ADD COLUMN     "plan_code" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "session_therapy_plans_plan_code_key" ON "session_therapy_plans"("plan_code");
