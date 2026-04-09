import express       from "express";
import cors          from "cors";
import helmet        from "helmet";
import morgan        from "morgan";
import { env }       from "./config/env";
import { errorHandler } from "./middlewares/errorHandler";

// Routes
import authRoutes    from "./modules/auth/auth.routes";
import sessionRoutes from "./modules/sessions/sessions.routes";      // ← ADD
import vitalSignRoutes from "./modules/vital-signs/vital-signs.routes"; // ← ADD (jika terpisah)

const app = express();

// Security & Logging
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/auth",                authRoutes);
app.use("/treatment-sessions",  sessionRoutes);   // ← ADD

// Global Error Handler
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`RAHO Backend running on port ${env.PORT} [${env.NODE_ENV}]`);
});

export default app;