import { Router } from "express";
import { currentQR, isConnected, sendWhatsAppMessage } from "../lib/whatsapp.js";
import { requireAuth } from "../middlewares/auth.js";
import { logger } from "../lib/logger.js";

const router = Router();

router.get("/status", (req, res) => {
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

  // Responder inmediatamente al frontend para no bloquear la petición HTTP
  res.json({ 
    success: true, 
    message: "Envíos masivos encolados con modo anti-baneo extremo activo." 
  });

  // Procesamiento en segundo plano de forma "humana"
  (async () => {
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (msg.phone && msg.message) {
        logger.info(`[BULK] Procesando mensaje ${i + 1} de ${messages.length} para ${msg.phone}...`);
        
        const success = await sendWhatsAppMessage(msg.phone, msg.message);
        if (success) {
          sent++;
        } else {
          failed++;
        }

        // Si no es el último mensaje, meter un delay ENORME (15s a 35s)
        if (i < messages.length - 1) {
          const bulkDelay = Math.floor(Math.random() * 20000) + 15000; // 15000ms a 35000ms
          logger.info(`[BULK ANTI-BAN] Esperando ${Math.round(bulkDelay/1000)}s antes del próximo envío masivo...`);
          await new Promise(r => setTimeout(r, bulkDelay));
        }
      }
    }
    logger.info(`[BULK FINALIZADO] Enviados: ${sent}, Fallidos: ${failed}`);
  })();

  return; // Evita el error TS7030
});

export default router;
