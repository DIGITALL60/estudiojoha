import makeWASocket, { useMultiFileAuthState, DisconnectReason } from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import { logger } from "./logger";

export let whatsappSocket: ReturnType<typeof makeWASocket> | null = null;
export let currentQR: string | null = null;
export let isConnected = false;

export async function initWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true, // Also print to terminal for debugging
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
      logger.info("WhatsApp connected successfully!");
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
    // Baileys requires the phone number with country code and @s.whatsapp.net
    // We assume the phone is already in format like "5493510000000"
    const formattedPhone = phone.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
    await whatsappSocket.sendMessage(formattedPhone, { text });
    return true;
  } catch (err) {
    logger.error({ err, phone }, "Failed to send WhatsApp message");
    return false;
  }
}
