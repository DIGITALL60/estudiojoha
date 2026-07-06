import makeWASocket, { useMultiFileAuthState, DisconnectReason } from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import { logger } from "./logger.js";

export let whatsappSocket: ReturnType<typeof makeWASocket> | null = null;
export let currentQR: string | null = null;
export let isConnected = false;

// ─── Funciones Anti-Baneo ──────────────────────────────────────────────────

// Retraso asíncrono
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Devuelve un string invisible (Zero-width space) aleatorio
// Esto muta el hash del mensaje para que WhatsApp no detecte que es 100% idéntico.
function getInvisibleMutation(): string {
  const invisibleChars = ["\u200B", "\u200C", "\u200D", "\uFEFF"];
  let mutation = "";
  const count = Math.floor(Math.random() * 3) + 1; // 1 a 3 caracteres invisibles
  for (let i = 0; i < count; i++) {
    mutation += invisibleChars[Math.floor(Math.random() * invisibleChars.length)];
  }
  return mutation;
}

// ──────────────────────────────────────────────────────────────────────────

export async function initWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true, // Print to terminal for debugging
  });

  whatsappSocket = sock;

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      logger.info("New QR code generated");
      try {
        currentQR = await QRCode.toDataURL(qr);
      } catch (err) {
        logger.error({ err }, "Error generating QR Code");
      }
    }

    if (connection === "close") {
      isConnected = false;
      currentQR = null;
      const shouldReconnect =
        (lastDisconnect?.error as { output?: { statusCode?: number } })?.output?.statusCode !==
        DisconnectReason.loggedOut;
      
      logger.warn({ reason: lastDisconnect?.error }, "WhatsApp connection closed.");
      
      if (shouldReconnect) {
        initWhatsApp();
      } else {
        logger.error("WhatsApp logged out. Please delete auth_info_baileys and restart to scan again.");
      }
    } else if (connection === "open") {
      logger.info("✅ WhatsApp Web conectado exitosamente (Baileys)!");
      isConnected = true;
      currentQR = null;
    }
  });
}

export async function sendWhatsAppMessage(phone: string, text: string) {
  if (!isConnected || !whatsappSocket) {
    logger.error("Cannot send message, WhatsApp is not connected.");
    return false;
  }

  try {
    const formattedPhone = phone.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

    // 1. Añadir mutación invisible al texto
    const mutatedText = text + getInvisibleMutation();

    // 2. Simular lectura/presencia
    await whatsappSocket.presenceSubscribe(formattedPhone);
    await delay(Math.random() * 500 + 500); // 0.5s - 1.0s pausa antes de escribir

    // 3. Estado "escribiendo..." proporcional al mensaje
    await whatsappSocket.sendPresenceUpdate("composing", formattedPhone);
    
    // Cálculo: aprox 50ms por carácter, mínimo 2s, máximo 12s
    const typingTime = Math.min(Math.max(mutatedText.length * 50, 2000), 12000);
    await delay(typingTime);

    // 4. Pausar escritura y enviar
    await whatsappSocket.sendPresenceUpdate("paused", formattedPhone);
    await delay(Math.random() * 500 + 200);

    // Enviar mensaje real
    await whatsappSocket.sendMessage(formattedPhone, { text: mutatedText });
    
    logger.info(`✅ Mensaje enviado a ${phone} (Typing sim: ${typingTime}ms)`);
    return true;
  } catch (err) {
    logger.error({ err, phone }, "❌ Error enviando mensaje WhatsApp");
    return false;
  }
}
