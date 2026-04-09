import express       from "express";
import cors          from "cors";
import helmet        from "helmet";
import morgan        from "morgan";
import path          from "path";

import {env}           from "./config/env";
import { errorHandler }                  from "./middlewares/errorHandler";
import authRoutes                        from "./modules/auth/auth.routes";
import sessionRoutes                     from "./modules/sessions/sessions.routes";
import { diagnosisNestedRouter,
         diagnosisStandaloneRouter }     from "./modules/diagnoses/diagnoses.routes";
import { dashboardRouter }               from "./modules/dashboard/dashboard.routes";
import membersRouter from "./modules/members/members.routes";

const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/health", (_req, res) =>
  res.json({ status: "ok", timestamp: new Date().toISOString() }),
);

// ── Routes ─────────────────────────────────────────────
app.use("/auth",                              authRoutes);
app.use("/treatment-sessions",               sessionRoutes);
app.use("/encounters/:encounterId/diagnoses", diagnosisNestedRouter);
app.use("/diagnoses",                         diagnosisStandaloneRouter);
app.use("/dashboard",                         dashboardRouter); // ← ini yang belum ada
app.use("/members", membersRouter);
// Error handler — wajib PALING TERAKHIR
app.use(errorHandler);

app.listen(env.PORT, () =>
  console.log(`RAHO Backend running on port ${env.PORT} [${env.NODE_ENV}]`),
);

export default app;