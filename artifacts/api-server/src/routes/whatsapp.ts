import { Router } from "express";
import { currentQR, isConnected } from "../lib/whatsapp.js";
import { cloudSendText } from "../lib/whatsapp-cloud.js";
import { requireAuth } from "../middlewares/auth.js";
import { logger } from "../lib/logger.js";

const router = Router();

router.get("/status", (_req, res) => {
  res.json({
    connected: isConnected,
    qr: currentQR,
  });
});

router.post("/send-bulk", requireAuth, async (req, res) => {
  const { messages } = req.body;
  if (!Array.isArray(messages)) {
    res.status(400).json({ error: "messages array required" });
    return;
  }

  if (!isConnected) {
    res.status(503).json({ error: "WhatsApp is not connected" });
    return;
  }

  // Responder inmediatamente al frontend para no bloquear la petición HTTP (evitar timeout)
  res.json({ 
    success: true, 
    message: "Envíos masivos encolados con modo anti-baneo (batches + simulación humana) activo." 
  });

  // Procesamiento en segundo plano
  (async () => {
    let sent = 0;
    let failed = 0;
    const validMessages = messages.filter((m) => m.phone && m.message);

    const BATCH_SIZE = 5;
    const BATCH_PAUSE_MIN = 15_000; // 15s min between batches
    const BATCH_PAUSE_MAX = 30_000; // 30s max between batches

    for (let i = 0; i < validMessages.length; i++) {
      const msg = validMessages[i];
      
      logger.info(`[BULK] Procesando mensaje ${i + 1} de ${validMessages.length} para ${msg.phone}...`);
      
      const success = await cloudSendText(msg.phone, msg.message);
      if (success) {
        sent++;
      } else {
        failed++;
      }

      // After every BATCH_SIZE messages, take a longer natural break
      const isLastMessage = i === validMessages.length - 1;
      if (!isLastMessage && (i + 1) % BATCH_SIZE === 0) {
        const batchPause =
          BATCH_PAUSE_MIN + Math.floor(Math.random() * (BATCH_PAUSE_MAX - BATCH_PAUSE_MIN));
        logger.info(`[BULK ANTI-BAN] Esperando ${Math.round(batchPause/1000)}s antes del próximo lote de envíos...`);
        await new Promise((r) => setTimeout(r, batchPause));
      }
    }
    logger.info(`[BULK FINALIZADO] Enviados: ${sent}, Fallidos: ${failed}`);
  })();

  return;
});

export default router;
