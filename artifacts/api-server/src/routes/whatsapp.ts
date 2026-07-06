import { Router } from "express";
import { currentQR, isConnected, sendWhatsAppMessage } from "../lib/whatsapp.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

// Estado de la conexión — con Cloud API siempre está conectado
router.get("/status", (req, res) => {
  res.json({
    connected: isConnected,
    provider: "Meta WhatsApp Cloud API",
    qr: null, // Ya no se usa QR con la API oficial
  });
});

router.post("/send-bulk", requireAuth, async (req, res) => {
  const { messages } = req.body;
  if (!Array.isArray(messages)) {
    res.status(400).json({ error: "messages array required" });
    return;
  }

  if (!isConnected) {
    res.status(503).json({ error: "WhatsApp Cloud API no está configurada" });
    return;
  }

  const results: { to: string; success: boolean; error?: string }[] = [];

  for (const { to, message } of messages) {
    try {
      await sendWhatsAppMessage(to, message);
      results.push({ to, success: true });
      // Delay entre mensajes para no saturar la API
      await new Promise((r) => setTimeout(r, 1000));
    } catch (err: any) {
      results.push({ to, success: false, error: err.message });
    }
  }

  res.json({ results });
});

export default router;
