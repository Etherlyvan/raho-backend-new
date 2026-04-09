import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";                    // ← tambah
import { env } from "./config/env";
import { errorHandler } from "./middlewares/errorHandler";
import authRoutes from "./modules/auth/auth.routes";
import sessionRoutes from "./modules/sessions/sessions.routes";

const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── Static File Serving ──────────────────────────────────────────────────────
// Foto yang diupload bisa diakses via: GET /uploads/sessions/:sessionId/:filename
// ─────────────────────────────────────────────────────────────────────────────
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/health", (_req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

app.use("/auth", authRoutes);
app.use("/treatment-sessions", sessionRoutes);

app.use(errorHandler);

app.listen(env.PORT, () => console.log(`RAHO Backend running on port ${env.PORT} [${env.NODE_ENV}]`));

export default app;