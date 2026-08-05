/**
 * WhatsApp Cloud API (Meta Official)
 * Used to receive messages via webhook and send bot replies.
 * Credentials are stored in env vars, with fallback to the provided values.
 */

const PHONE_NUMBER_ID = process.env.WA_CLOUD_PHONE_ID || "1215897258279390";
const WA_CLOUD_TOKEN = process.env.WA_CLOUD_TOKEN || "EAAcn4gDDVvYBSMgXbhxFOiegGBFly2PWpB04of7RAUhLCDJdmeN3D05FoUrKGfHqQdsZBZBqkQoNhgotQxjPzzdkn7CQCeh43m2rs4eN0ZALrWHeJlFUeLdCJTiEokwpQPWoiBRykOxG4SX6XIfHb7inYxpxZAfXOZBg3sSbGtKjZCKfxoN5pDczFsIgZBADz26ZCwZDZD";
const API_URL = `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`;

import { logger } from "./logger.js";

async function post(body: object): Promise<boolean> {
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
      return false;
    }
    return true;
  } catch (err) {
    logger.error({ err }, "[WhatsApp Cloud] Network Error");
    return false;
  }
}

export function formatWhatsAppPhone(phone: string): string {
  let cleanPhone = phone.replace(/\D/g, "").replace(/@s\.whatsapp\.net$/, "");
  if (cleanPhone.startsWith("0")) {
    cleanPhone = cleanPhone.slice(1);
  }
  
  if (cleanPhone.startsWith("54")) {
    cleanPhone = cleanPhone.startsWith("549") ? cleanPhone.slice(3) : cleanPhone.slice(2);
  }

  // En Argentina los números válidos para WhatsApp tienen 10 dígitos (sin el 549).
  // Si tiene 12 dígitos, es casi seguro que el usuario incluyó el "15" del celular.
  // Ej: 11 15 12345678, 351 15 1234567, 3472 15 123456.
  if (cleanPhone.length === 12) {
    if (cleanPhone.substring(2, 4) === "15") {
      cleanPhone = cleanPhone.substring(0, 2) + cleanPhone.substring(4);
    } else if (cleanPhone.substring(3, 5) === "15") {
      cleanPhone = cleanPhone.substring(0, 3) + cleanPhone.substring(5);
    } else if (cleanPhone.substring(4, 6) === "15") {
      cleanPhone = cleanPhone.substring(0, 4) + cleanPhone.substring(6);
    }
  }

  return `549${cleanPhone}`;
}

export async function cloudSendText(to: string, text: string): Promise<boolean> {
  const formattedPhone = formatWhatsAppPhone(to);

  return post({
    messaging_product: "whatsapp",
    to: formattedPhone,
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
): Promise<boolean> {
  const formattedPhone = formatWhatsAppPhone(to);
  return post({
    messaging_product: "whatsapp",
    to: formattedPhone,
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
): Promise<boolean> {
  const formattedPhone = formatWhatsAppPhone(to);
  return post({
    messaging_product: "whatsapp",
    to: formattedPhone,
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

/**
 * Enviar Plantilla de WhatsApp (Template)
 * @param to Número de teléfono de destino
 * @param templateName Nombre de la plantilla aprobada en Meta (ej: "turno_confirmado")
 * @param languageCode Código de idioma de la plantilla (ej: "es_AR" o "es")
 * @param parameters Lista de parámetros dinámicos (variables {{1}}, {{2}}, etc) para el BODY.
 */
export async function cloudSendTemplate(
  to: string,
  templateName: string,
  languageCode: string = "es_AR",
  parameters: string[] = []
): Promise<boolean> {
  const formattedPhone = formatWhatsAppPhone(to);

  return post({
    messaging_product: "whatsapp",
    to: formattedPhone,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: languageCode
      },
      components: parameters.length > 0 ? [
        {
          type: "body",
          parameters: parameters.map(p => ({
            type: "text",
            text: p
          }))
        }
      ] : []
    }
  });
}
