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

app.use(pinoHttp({ logger }));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

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
