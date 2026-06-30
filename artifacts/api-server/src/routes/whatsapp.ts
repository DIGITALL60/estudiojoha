import { Router } from "express";
import { currentQR, isConnected, sendWhatsAppMessage } from "../lib/whatsapp";
import { requireAuth } from "../middlewares/auth.js";

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
    return res.status(400).json({ error: "messages array required" });
  }

  if (!isConnected) {
    return res.status(503).json({ error: "WhatsApp is not connected" });
  }

  // We process them sequentially. For huge lists, we might want to delay between sends
  // to avoid ban, but for reactivation of a few clients it should be fine.
  let sent = 0;
  let failed = 0;

  for (const msg of messages) {
    if (msg.phone && msg.message) {
      const success = await sendWhatsAppMessage(msg.phone, msg.message);
      if (success) {
        sent++;
      } else {
        failed++;
      }
      // Small artificial delay to avoid being flagged as spam quickly
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  res.json({ success: true, sent, failed });
});

export default router;
