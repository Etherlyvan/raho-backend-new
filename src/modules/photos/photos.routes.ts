import { Router } from "express";
import { authorize } from "../../middlewares/authorize";
import { photoUploadMiddleware } from "../../utils/fileUpload";
import { uploadPhotoValidator } from "./photos.validator";
import { listPhotos, uploadPhoto, deletePhoto } from "./photos.controller";

const router = Router({ mergeParams: true });

const ALL_ROLES = ["NURSE", "DOCTOR", "ADMIN_LAYANAN", "ADMIN_CABANG", "ADMIN_MANAGER", "SUPER_ADMIN"] as const;

router.get("/", authorize(...ALL_ROLES), listPhotos);
router.post("/", authorize("NURSE", "DOCTOR"), photoUploadMiddleware, uploadPhotoValidator, uploadPhoto);
router.delete("/:photoId", authorize("SUPER_ADMIN"), deletePhoto);

export default router;