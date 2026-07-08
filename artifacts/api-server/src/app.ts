import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { pinoHttp } from "pino-http";
import { logger } from "./lib/logger.js";
import { initWhatsApp } from "./lib/whatsapp.js";
import { initCronJobs } from "./lib/cron.js";

// Routes
import healthRouter from "./routes/health.js";
import whatsappRouter from "./routes/whatsapp.js";
import bookingsRouter from "./routes/bookings.js";
import dataRouter from "./routes/data.js";
import authRouter from "./routes/auth.js";
import vouchersRouter from "./routes/vouchers.js";

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5000",
  process.env.FRONTEND_URL ?? "",
].filter(Boolean);

app.use(pinoHttp({ logger }));
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, Railway healthcheck)
    if (!origin) return cb(null, true);
    if (allowedOrigins.some(o => origin.startsWith(o)) || origin.endsWith(".vercel.app")) {
      return cb(null, true);
    }
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Health check for Railway
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// Initialize WhatsApp Baileys
initWhatsApp().catch(err => {
  logger.error({ err }, "Failed to initialize WhatsApp");
});

// Initialize Cron Jobs
initCronJobs();

app.use("/api/healthz", healthRouter);
app.use("/api/whatsapp", whatsappRouter);
app.use("/api/bookings", bookingsRouter);
app.use("/api/data", dataRouter);
app.use("/api/auth", authRouter);
app.use("/api/vouchers", vouchersRouter);

export default app;
