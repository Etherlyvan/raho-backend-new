import { Router }                        from "express";
import { login, refresh, logout, me }    from "./auth.controller";
import { authenticate }                  from "@/middlewares/authenticate";

const router = Router();

// POST /auth/login
router.post("/login",   login);

// POST /auth/refresh
router.post("/refresh", refresh);

// POST /auth/logout
router.post("/logout",  authenticate, logout);

// GET  /auth/me  ← NEW
router.get("/me",       authenticate, me);

export default router;