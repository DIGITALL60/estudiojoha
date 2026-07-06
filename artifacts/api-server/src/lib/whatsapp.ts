import axios from "axios";
import { logger } from "./logger.js";

// ─── Configuración desde variables de entorno ───────────────────────────────
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!;
const ACCESS_TOKEN    = process.env.WHATSAPP_ACCESS_TOKEN!;
const API_URL = `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`;

// Compatibilidad con routes/whatsapp.ts existente
export let whatsappSocket: null = null;
export let currentQR: string | null = null;
export let isConnected = true; // Con Cloud API siempre disponible

// ─── Inicialización — ya no requiere QR ni sesión ───────────────────────────
export async function initWhatsApp() {
  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    logger.error("❌ Faltan variables: WHATSAPP_PHONE_NUMBER_ID o WHATSAPP_ACCESS_TOKEN");
    isConnected = false;
    return;
  }
  isConnected = true;
  logger.info("✅ WhatsApp Cloud API lista. Sin QR, sin sesión, sin riesgo de baneo.");
}

// ─── Enviar mensaje de texto ─────────────────────────────────────────────────
export async function sendWhatsAppMessage(phone: string, text: string): Promise<boolean> {
  // Normalizar número: solo dígitos
  const formattedPhone = phone.replace(/[^0-9]/g, "");

  if (!formattedPhone) {
    logger.warn("sendWhatsAppMessage: número vacío, se omite.");
    return false;
  }

  try {
    const response = await axios.post(
      API_URL,
      {
        messaging_product: "whatsapp",
        to: formattedPhone,
        type: "text",
        text: { body: text },
      },
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
    logger.info(
      { messageId: response.data?.messages?.[0]?.id },
      `✅ Mensaje enviado a ${formattedPhone}`
    );
    return true;
  } catch (err: any) {
    const detail = err.response?.data ?? err.message;
    logger.error({ detail }, `❌ Error enviando mensaje a ${formattedPhone}`);
    return false;
  }
}
