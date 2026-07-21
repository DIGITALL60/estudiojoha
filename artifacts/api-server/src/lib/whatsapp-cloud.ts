/**
 * WhatsApp Cloud API (Meta Official)
 * Used to receive messages via webhook and send bot replies.
 * Credentials are stored in env vars, with fallback to the provided values.
 */

const PHONE_NUMBER_ID = process.env.WA_CLOUD_PHONE_ID || "1215897258279390";
const WA_CLOUD_TOKEN = process.env.WA_CLOUD_TOKEN || "EAAcn4gDDVvYBSMgXbhxFOiegGBFly2PWpB04of7RAUhLCDJdmeN3D05FoUrKGfHqQdsZBZBqkQoNhgotQxjPzzdkn7CQCeh43m2rs4eN0ZALrWHeJlFUeLdCJTiEokwpQPWoiBRykOxG4SX6XIfHb7inYxpxZAfXOZBg3sSbGtKjZCKfxoN5pDczFsIgZBADz26ZCwZDZD";
const API_URL = `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`;

import { logger } from "./logger.js";

async function post(body: object): Promise<void> {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WA_CLOUD_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.text();
      logger.error({ err }, "[WhatsApp Cloud] API Error");
    }
  } catch (err) {
    logger.error({ err }, "[WhatsApp Cloud] Network Error");
  }
}

export async function cloudSendText(to: string, text: string): Promise<void> {
  await post({
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: text },
  });
}

export async function cloudSendList(
  to: string,
  headerText: string,
  bodyText: string,
  buttonLabel: string,
  sections: { title: string; rows: { id: string; title: string; description?: string }[] }[]
): Promise<void> {
  await post({
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "list",
      header: { type: "text", text: headerText },
      body: { text: bodyText },
      action: { button: buttonLabel, sections },
    },
  });
}

export async function cloudSendButtons(
  to: string,
  bodyText: string,
  buttons: { id: string; title: string }[]
): Promise<void> {
  await post({
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: bodyText },
      action: {
        buttons: buttons.map((b) => ({
          type: "reply",
          reply: { id: b.id, title: b.title },
        })),
      },
    },
  });
}
