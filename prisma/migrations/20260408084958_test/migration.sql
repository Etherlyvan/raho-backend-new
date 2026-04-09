-- CreateEnum
CREATE TYPE "RoleName" AS ENUM ('SUPER_ADMIN', 'ADMIN_MANAGER', 'ADMIN_CABANG', 'ADMIN_LAYANAN', 'DOCTOR', 'NURSE', 'MEMBER');

-- CreateEnum
CREATE TYPE "ProfesiType" AS ENUM ('DOKTER', 'NAKES');

-- CreateEnum
CREATE TYPE "BranchType" AS ENUM ('KLINIK', 'HOMECARE');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'LEAD');

-- CreateEnum
CREATE TYPE "JenisKelamin" AS ENUM ('L', 'P');

-- CreateEnum
CREATE TYPE "PackageType" AS ENUM ('BASIC', 'BOOSTER');

-- CreateEnum
CREATE TYPE "MemberPackageStatus" AS ENUM ('PENDING_PAYMENT', 'ACTIVE', 'COMPLETED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('FORMULIR_PENDAFTARAN', 'SURAT_PERNYATAAN', 'SURAT_KEPUTUSAN', 'PERSETUJUAN_SETELAH_PENJELASAN', 'HASIL_LAB', 'FOTO_KONDISI', 'REKAM_MEDIS_LUAR', 'KTP', 'OTHER');

-- CreateEnum
CREATE TYPE "EncounterType" AS ENUM ('CONSULTATION', 'TREATMENT');

-- CreateEnum
CREATE TYPE "EncounterStatus" AS ENUM ('PLANNED', 'ONGOING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PelaksanaanType" AS ENUM ('KLINIK', 'HOMECARE');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'POSTPONED');

-- CreateEnum
CREATE TYPE "JenisBotol" AS ENUM ('IFA', 'EDTA');

-- CreateEnum
CREATE TYPE "EMRNoteType" AS ENUM ('ASSESSMENT', 'CLINICAL_NOTE', 'OPERATIONAL_NOTE', 'OUTCOME_MONITORING');

-- CreateEnum
CREATE TYPE "AuthorRole" AS ENUM ('DOCTOR', 'NURSE', 'ADMIN');

-- CreateEnum
CREATE TYPE "InventoryCategory" AS ENUM ('MEDICINE', 'DEVICE', 'CONSUMABLE');

-- CreateEnum
CREATE TYPE "MutationType" AS ENUM ('RECEIVED', 'USED', 'ADJUSTED', 'RETURNED');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'FULFILLED');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('PREPARING', 'SHIPPED', 'RECEIVED', 'APPROVED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'REJECTED');

-- CreateEnum
CREATE TYPE "VitalSignType" AS ENUM ('SISTOL', 'DIASTOL', 'SATURASI', 'HR', 'PI');

-- CreateEnum
CREATE TYPE "VitalSignTiming" AS ENUM ('SEBELUM', 'SESUDAH');

-- CreateTable
CREATE TABLE "roles" (
    "role_id" TEXT NOT NULL,
    "name" "RoleName" NOT NULL,
    "permissions" TEXT[],

    CONSTRAINT "roles_pkey" PRIMARY KEY ("role_id")
);

-- CreateTable
CREATE TABLE "users" (
    "user_id" TEXT NOT NULL,
    "staff_code" TEXT,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "partnership_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "user_profile_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT,
    "avatar_url" TEXT,
    "jenis_profesi" "ProfesiType",
    "str_number" TEXT,
    "masa_berlaku_str" TIMESTAMP(3),
    "speciality" TEXT,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("user_profile_id")
);

-- CreateTable
CREATE TABLE "branches" (
    "branch_id" TEXT NOT NULL,
    "branch_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "phone" TEXT,
    "tipe" "BranchType" NOT NULL DEFAULT 'KLINIK',
    "operating_hours" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("branch_id")
);

-- CreateTable
CREATE TABLE "partnerships" (
    "partnership_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "phone" TEXT,
    "tipe" "BranchType" NOT NULL DEFAULT 'KLINIK',
    "operating_hours" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partnerships_pkey" PRIMARY KEY ("partnership_id")
);

-- CreateTable
CREATE TABLE "members" (
    "member_id" TEXT NOT NULL,
    "member_no" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "registration_branch_id" TEXT NOT NULL,
    "partnership_id" TEXT,
    "full_name" TEXT NOT NULL,
    "nik" TEXT,
    "tempat_lahir" TEXT,
    "date_of_birth" TIMESTAMP(3),
    "jenis_kelamin" "JenisKelamin",
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "pekerjaan" TEXT,
    "status_nikah" TEXT,
    "emergency_contact" TEXT,
    "medical_history" JSONB,
    "sumber_info_raho" TEXT,
    "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "is_consent_to_photo" BOOLEAN NOT NULL DEFAULT false,
    "is_deceased" BOOLEAN NOT NULL DEFAULT false,
    "postal_code" TEXT,
    "voucher_count" INTEGER NOT NULL DEFAULT 0,
    "referral_code_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "members_pkey" PRIMARY KEY ("member_id")
);

-- CreateTable
CREATE TABLE "branch_member_accesses" (
    "access_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "granted_by" TEXT NOT NULL,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,

    CONSTRAINT "branch_member_accesses_pkey" PRIMARY KEY ("access_id")
);

-- CreateTable
CREATE TABLE "referral_codes" (
    "referral_code_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "referrer_name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referral_codes_pkey" PRIMARY KEY ("referral_code_id")
);

-- CreateTable
CREATE TABLE "member_documents" (
    "member_document_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "document_type" "DocumentType" NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size_bytes" INTEGER,
    "related_encounter_id" TEXT,
    "related_session_id" TEXT,
    "uploaded_by" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_documents_pkey" PRIMARY KEY ("member_document_id")
);

-- CreateTable
CREATE TABLE "master_products" (
    "master_product_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "InventoryCategory" NOT NULL,
    "unit" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "master_products_pkey" PRIMARY KEY ("master_product_id")
);

-- CreateTable
CREATE TABLE "package_pricings" (
    "package_pricing_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "package_type" "PackageType" NOT NULL,
    "package_name" TEXT NOT NULL,
    "total_sessions" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "set_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "package_pricings_pkey" PRIMARY KEY ("package_pricing_id")
);

-- CreateTable
CREATE TABLE "member_packages" (
    "member_package_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "package_pricing_id" TEXT,
    "package_type" "PackageType" NOT NULL,
    "package_name" TEXT,
    "total_sessions" INTEGER NOT NULL,
    "used_sessions" INTEGER NOT NULL DEFAULT 0,
    "original_price" DOUBLE PRECISION NOT NULL,
    "discount_percent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "final_price" DOUBLE PRECISION NOT NULL,
    "discount_note" TEXT,
    "status" "MemberPackageStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "paid_at" TIMESTAMP(3),
    "verified_by" TEXT,
    "verified_at" TIMESTAMP(3),
    "activated_at" TIMESTAMP(3),
    "expired_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_packages_pkey" PRIMARY KEY ("member_package_id")
);

-- CreateTable
CREATE TABLE "encounters" (
    "encounter_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "member_package_id" TEXT NOT NULL,
    "type" "EncounterType" NOT NULL,
    "status" "EncounterStatus" NOT NULL DEFAULT 'PLANNED',
    "consultation_encounter_id" TEXT,
    "treatment_date" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "assessment" JSONB,
    "treatment_plan" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "encounters_pkey" PRIMARY KEY ("encounter_id")
);

-- CreateTable
CREATE TABLE "diagnoses" (
    "diagnosis_id" TEXT NOT NULL,
    "encounter_id" TEXT NOT NULL,
    "doktor_pemeriksa" TEXT NOT NULL,
    "diagnosa" TEXT NOT NULL,
    "kategori_diagnosa" TEXT,
    "icd_primer" TEXT,
    "icd_sekunder" TEXT,
    "icd_tersier" TEXT,
    "keluhan_riwayat_sekarang" TEXT,
    "riwayat_penyakit_terdahulu" TEXT,
    "riwayat_sosial_kebiasaan" TEXT,
    "riwayat_pengobatan" TEXT,
    "pemeriksaan_fisik" TEXT,
    "pemeriksaan_tambahan" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diagnoses_pkey" PRIMARY KEY ("diagnosis_id")
);

-- CreateTable
CREATE TABLE "treatment_sessions" (
    "treatment_session_id" TEXT NOT NULL,
    "encounter_id" TEXT NOT NULL,
    "nurse_id" TEXT,
    "pelaksanaan" "PelaksanaanType",
    "infus_ke" INTEGER,
    "booster_package_id" TEXT,
    "treatment_date" TIMESTAMP(3) NOT NULL,
    "next_treatment_date" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "status" "SessionStatus" NOT NULL DEFAULT 'PLANNED',
    "keluhan_sebelum" TEXT,
    "keluhan_sesudah" TEXT,
    "berhasil_infus" BOOLEAN,
    "healing_crisis" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treatment_sessions_pkey" PRIMARY KEY ("treatment_session_id")
);

-- CreateTable
CREATE TABLE "session_therapy_plans" (
    "session_therapy_plan_id" TEXT NOT NULL,
    "treatment_session_id" TEXT NOT NULL,
    "ifa_mg" DOUBLE PRECISION DEFAULT 0,
    "hho_ml" DOUBLE PRECISION DEFAULT 0,
    "h2_ml" DOUBLE PRECISION DEFAULT 0,
    "no_ml" DOUBLE PRECISION DEFAULT 0,
    "gaso_ml" DOUBLE PRECISION DEFAULT 0,
    "o2_ml" DOUBLE PRECISION DEFAULT 0,
    "o3_ml" DOUBLE PRECISION DEFAULT 0,
    "edta_ml" DOUBLE PRECISION DEFAULT 0,
    "mb_ml" DOUBLE PRECISION DEFAULT 0,
    "h2s_ml" DOUBLE PRECISION DEFAULT 0,
    "kcl_ml" DOUBLE PRECISION DEFAULT 0,
    "jml_nb_ml" DOUBLE PRECISION DEFAULT 0,
    "keterangan" TEXT,
    "planned_by" TEXT NOT NULL,
    "planned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_therapy_plans_pkey" PRIMARY KEY ("session_therapy_plan_id")
);

-- CreateTable
CREATE TABLE "infusion_executions" (
    "infusion_execution_id" TEXT NOT NULL,
    "treatment_session_id" TEXT NOT NULL,
    "ifa_mg_actual" DOUBLE PRECISION DEFAULT 0,
    "hho_ml_actual" DOUBLE PRECISION DEFAULT 0,
    "h2_ml_actual" DOUBLE PRECISION DEFAULT 0,
    "no_ml_actual" DOUBLE PRECISION DEFAULT 0,
    "gaso_ml_actual" DOUBLE PRECISION DEFAULT 0,
    "o2_ml_actual" DOUBLE PRECISION DEFAULT 0,
    "o3_ml_actual" DOUBLE PRECISION DEFAULT 0,
    "edta_ml_actual" DOUBLE PRECISION DEFAULT 0,
    "mb_ml_actual" DOUBLE PRECISION DEFAULT 0,
    "h2s_ml_actual" DOUBLE PRECISION DEFAULT 0,
    "kcl_ml_actual" DOUBLE PRECISION DEFAULT 0,
    "jml_nb_ml_actual" DOUBLE PRECISION DEFAULT 0,
    "keterangan" TEXT,
    "tgl_produksi_cairan" TIMESTAMP(3),
    "jenis_botol" "JenisBotol",
    "jenis_cairan" TEXT,
    "volume_carrier_ml" INTEGER,
    "jumlah_penggunaan_jarum" INTEGER,
    "deviation_note" TEXT,
    "filled_by" TEXT NOT NULL,
    "filled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "infusion_executions_pkey" PRIMARY KEY ("infusion_execution_id")
);

-- CreateTable
CREATE TABLE "doctor_evaluations" (
    "doctor_evaluation_id" TEXT NOT NULL,
    "treatment_session_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "evaluasi_dokter" TEXT,
    "subjective" TEXT,
    "objective" TEXT,
    "assessment" TEXT,
    "plan" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctor_evaluations_pkey" PRIMARY KEY ("doctor_evaluation_id")
);

-- CreateTable
CREATE TABLE "session_vital_signs" (
    "session_vital_sign_id" TEXT NOT NULL,
    "treatment_session_id" TEXT NOT NULL,
    "pencatatan" "VitalSignType" NOT NULL,
    "waktu_catat" "VitalSignTiming" NOT NULL,
    "hasil" DECIMAL(7,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_vital_signs_pkey" PRIMARY KEY ("session_vital_sign_id")
);

-- CreateTable
CREATE TABLE "session_photos" (
    "session_photo_id" TEXT NOT NULL,
    "treatment_session_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "photo_url" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_size_bytes" INTEGER,
    "caption" TEXT,
    "taken_at" TIMESTAMP(3),
    "taken_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_photos_pkey" PRIMARY KEY ("session_photo_id")
);

-- CreateTable
CREATE TABLE "material_usages" (
    "material_usage_id" TEXT NOT NULL,
    "treatment_session_id" TEXT NOT NULL,
    "inventory_item_id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "input_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_usages_pkey" PRIMARY KEY ("material_usage_id")
);

-- CreateTable
CREATE TABLE "emr_notes" (
    "emr_note_id" TEXT NOT NULL,
    "encounter_id" TEXT,
    "treatment_session_id" TEXT,
    "author_id" TEXT NOT NULL,
    "author_role" "AuthorRole" NOT NULL,
    "type" "EMRNoteType" NOT NULL,
    "content" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emr_notes_pkey" PRIMARY KEY ("emr_note_id")
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "inventory_item_id" TEXT NOT NULL,
    "master_product_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "partnership_id" TEXT,
    "stock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "min_threshold" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "location" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("inventory_item_id")
);

-- CreateTable
CREATE TABLE "stock_mutations" (
    "stock_mutation_id" TEXT NOT NULL,
    "inventory_item_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "type" "MutationType" NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "stock_before" DOUBLE PRECISION NOT NULL,
    "stock_after" DOUBLE PRECISION NOT NULL,
    "shipment_id" TEXT,
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_mutations_pkey" PRIMARY KEY ("stock_mutation_id")
);

-- CreateTable
CREATE TABLE "stock_requests" (
    "stock_request_id" TEXT NOT NULL,
    "master_product_id" TEXT NOT NULL,
    "request_by" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_requests_pkey" PRIMARY KEY ("stock_request_id")
);

-- CreateTable
CREATE TABLE "shipments" (
    "shipment_id" TEXT NOT NULL,
    "stock_request_id" TEXT NOT NULL,
    "to_branch_id" TEXT NOT NULL,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'PREPARING',
    "shipped_at" TIMESTAMP(3),
    "received_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "approved_by" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("shipment_id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "invoice_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "treatment_session_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "items" JSONB NOT NULL,
    "paid_at" TIMESTAMP(3),
    "verified_by" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("invoice_id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "audit_log_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resource_id" TEXT,
    "meta" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("audit_log_id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "notification_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "resource_id" TEXT,
    "resource_type" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("notification_id")
);

-- CreateTable
CREATE TABLE "chat_rooms" (
    "chat_room_id" TEXT NOT NULL,
    "participants" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_rooms_pkey" PRIMARY KEY ("chat_room_id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "chat_message_id" TEXT NOT NULL,
    "chat_room_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "content" TEXT,
    "file_url" TEXT,
    "file_type" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("chat_message_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_staff_code_key" ON "users"("staff_code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_user_id_key" ON "user_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "branches_branch_code_key" ON "branches"("branch_code");

-- CreateIndex
CREATE UNIQUE INDEX "members_member_no_key" ON "members"("member_no");

-- CreateIndex
CREATE UNIQUE INDEX "members_user_id_key" ON "members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "members_nik_key" ON "members"("nik");

-- CreateIndex
CREATE UNIQUE INDEX "branch_member_accesses_member_id_branch_id_key" ON "branch_member_accesses"("member_id", "branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "referral_codes_code_key" ON "referral_codes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "package_pricings_branch_id_package_type_total_sessions_key" ON "package_pricings"("branch_id", "package_type", "total_sessions");

-- CreateIndex
CREATE INDEX "member_packages_member_id_branch_id_status_idx" ON "member_packages"("member_id", "branch_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "session_therapy_plans_treatment_session_id_key" ON "session_therapy_plans"("treatment_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "infusion_executions_treatment_session_id_key" ON "infusion_executions"("treatment_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_evaluations_treatment_session_id_key" ON "doctor_evaluations"("treatment_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "session_vital_signs_treatment_session_id_pencatatan_waktu_c_key" ON "session_vital_signs"("treatment_session_id", "pencatatan", "waktu_catat");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_master_product_id_branch_id_key" ON "inventory_items"("master_product_id", "branch_id");

-- CreateIndex
CREATE INDEX "stock_mutations_inventory_item_id_created_at_idx" ON "stock_mutations"("inventory_item_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_stock_request_id_key" ON "shipments"("stock_request_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_treatment_session_id_key" ON "invoices"("treatment_session_id");

-- CreateIndex
CREATE INDEX "audit_logs_resource_resource_id_idx" ON "audit_logs"("resource", "resource_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "chat_messages_chat_room_id_created_at_idx" ON "chat_messages"("chat_room_id", "created_at");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("role_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_partnership_id_fkey" FOREIGN KEY ("partnership_id") REFERENCES "partnerships"("partnership_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_registration_branch_id_fkey" FOREIGN KEY ("registration_branch_id") REFERENCES "branches"("branch_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_partnership_id_fkey" FOREIGN KEY ("partnership_id") REFERENCES "partnerships"("partnership_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_referral_code_id_fkey" FOREIGN KEY ("referral_code_id") REFERENCES "referral_codes"("referral_code_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_member_accesses" ADD CONSTRAINT "branch_member_accesses_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("member_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_member_accesses" ADD CONSTRAINT "branch_member_accesses_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_member_accesses" ADD CONSTRAINT "branch_member_accesses_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_documents" ADD CONSTRAINT "member_documents_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("member_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_documents" ADD CONSTRAINT "member_documents_related_encounter_id_fkey" FOREIGN KEY ("related_encounter_id") REFERENCES "encounters"("encounter_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_documents" ADD CONSTRAINT "member_documents_related_session_id_fkey" FOREIGN KEY ("related_session_id") REFERENCES "treatment_sessions"("treatment_session_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_documents" ADD CONSTRAINT "member_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_pricings" ADD CONSTRAINT "package_pricings_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_pricings" ADD CONSTRAINT "package_pricings_set_by_fkey" FOREIGN KEY ("set_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_packages" ADD CONSTRAINT "member_packages_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("member_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_packages" ADD CONSTRAINT "member_packages_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_packages" ADD CONSTRAINT "member_packages_package_pricing_id_fkey" FOREIGN KEY ("package_pricing_id") REFERENCES "package_pricings"("package_pricing_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("member_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_member_package_id_fkey" FOREIGN KEY ("member_package_id") REFERENCES "member_packages"("member_package_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_consultation_encounter_id_fkey" FOREIGN KEY ("consultation_encounter_id") REFERENCES "encounters"("encounter_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnoses" ADD CONSTRAINT "diagnoses_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("encounter_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_sessions" ADD CONSTRAINT "treatment_sessions_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("encounter_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_sessions" ADD CONSTRAINT "treatment_sessions_nurse_id_fkey" FOREIGN KEY ("nurse_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_sessions" ADD CONSTRAINT "treatment_sessions_booster_package_id_fkey" FOREIGN KEY ("booster_package_id") REFERENCES "member_packages"("member_package_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_therapy_plans" ADD CONSTRAINT "session_therapy_plans_treatment_session_id_fkey" FOREIGN KEY ("treatment_session_id") REFERENCES "treatment_sessions"("treatment_session_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_therapy_plans" ADD CONSTRAINT "session_therapy_plans_planned_by_fkey" FOREIGN KEY ("planned_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "infusion_executions" ADD CONSTRAINT "infusion_executions_treatment_session_id_fkey" FOREIGN KEY ("treatment_session_id") REFERENCES "treatment_sessions"("treatment_session_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "infusion_executions" ADD CONSTRAINT "infusion_executions_filled_by_fkey" FOREIGN KEY ("filled_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_evaluations" ADD CONSTRAINT "doctor_evaluations_treatment_session_id_fkey" FOREIGN KEY ("treatment_session_id") REFERENCES "treatment_sessions"("treatment_session_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_evaluations" ADD CONSTRAINT "doctor_evaluations_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_vital_signs" ADD CONSTRAINT "session_vital_signs_treatment_session_id_fkey" FOREIGN KEY ("treatment_session_id") REFERENCES "treatment_sessions"("treatment_session_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_photos" ADD CONSTRAINT "session_photos_treatment_session_id_fkey" FOREIGN KEY ("treatment_session_id") REFERENCES "treatment_sessions"("treatment_session_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_photos" ADD CONSTRAINT "session_photos_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("member_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_photos" ADD CONSTRAINT "session_photos_taken_by_fkey" FOREIGN KEY ("taken_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_usages" ADD CONSTRAINT "material_usages_treatment_session_id_fkey" FOREIGN KEY ("treatment_session_id") REFERENCES "treatment_sessions"("treatment_session_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_usages" ADD CONSTRAINT "material_usages_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("inventory_item_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_usages" ADD CONSTRAINT "material_usages_input_by_fkey" FOREIGN KEY ("input_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emr_notes" ADD CONSTRAINT "emr_notes_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "encounters"("encounter_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emr_notes" ADD CONSTRAINT "emr_notes_treatment_session_id_fkey" FOREIGN KEY ("treatment_session_id") REFERENCES "treatment_sessions"("treatment_session_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_master_product_id_fkey" FOREIGN KEY ("master_product_id") REFERENCES "master_products"("master_product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_partnership_id_fkey" FOREIGN KEY ("partnership_id") REFERENCES "partnerships"("partnership_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_mutations" ADD CONSTRAINT "stock_mutations_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("inventory_item_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_mutations" ADD CONSTRAINT "stock_mutations_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_mutations" ADD CONSTRAINT "stock_mutations_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("shipment_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_mutations" ADD CONSTRAINT "stock_mutations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_requests" ADD CONSTRAINT "stock_requests_master_product_id_fkey" FOREIGN KEY ("master_product_id") REFERENCES "master_products"("master_product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_requests" ADD CONSTRAINT "stock_requests_request_by_fkey" FOREIGN KEY ("request_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_stock_request_id_fkey" FOREIGN KEY ("stock_request_id") REFERENCES "stock_requests"("stock_request_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_to_branch_id_fkey" FOREIGN KEY ("to_branch_id") REFERENCES "branches"("branch_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("member_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_treatment_session_id_fkey" FOREIGN KEY ("treatment_session_id") REFERENCES "treatment_sessions"("treatment_session_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_chat_room_id_fkey" FOREIGN KEY ("chat_room_id") REFERENCES "chat_rooms"("chat_room_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
