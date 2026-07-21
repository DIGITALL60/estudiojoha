import { Router } from "express";
import { handleBotMessage } from "../lib/bot.js";
import { logger } from "../lib/logger.js";

const router = Router();

const VERIFY_TOKEN = process.env.WA_VERIFY_TOKEN || "joha2024";

/**
 * GET /api/webhook
 * Meta uses this endpoint to verify the webhook when you configure it in the dashboard.
 */
router.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    logger.info("[Webhook] Meta verification successful ✅");
    return res.status(200).send(challenge);
  }

  logger.warn({ mode, token }, "[Webhook] Verification failed ❌");
  return res.sendStatus(403);
});

/**
 * POST /api/webhook
 * Receives incoming WhatsApp messages from Meta.
 * Always responds 200 first, then processes asynchronously.
 */
router.post("/", async (req, res) => {
  res.sendStatus(200); // Must respond within 20s or Meta retries

  try {
    const body = req.body;
    if (body.object !== "whatsapp_business_account") return;

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value;
        if (!value?.messages?.length) continue;

        for (const message of value.messages) {
          const from: string = message.from;

          // Ignore status updates (delivered, read, etc.)
          if (message.type === "status") continue;

          let text = "";
          let interactiveId: string | undefined;

          if (message.type === "text") {
            text = message.text?.body || "";
          } else if (message.type === "interactive") {
            interactiveId =
              message.interactive?.list_reply?.id ||
              message.interactive?.button_reply?.id ||
              "";
            text = interactiveId;
          }

          if (text || interactiveId) {
            logger.info({ from, text: text.substring(0, 50), interactiveId }, "[Webhook] Incoming message");
            await handleBotMessage(from, text, interactiveId);
          }
        }
      }
    }
  } catch (err) {
    logger.error({ err }, "[Webhook] Error processing message");
  }
});

export default router;
