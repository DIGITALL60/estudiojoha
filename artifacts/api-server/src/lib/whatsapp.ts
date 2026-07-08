import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import { logger } from "./logger.js";
import P from "pino";

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

// Reconnect backoff: avoids hammering WA servers after bans / rate limits
let reconnectAttempts = 0;
const MAX_RECONNECT_DELAY_MS = 60_000; // 1 minute cap

function getReconnectDelay(): number {
  // Exponential backoff: 2s, 4s, 8s … capped at 60s + jitter
  const base = Math.min(2_000 * Math.pow(2, reconnectAttempts), MAX_RECONNECT_DELAY_MS);
  const jitter = Math.floor(Math.random() * 3_000); // 0-3s of random jitter
  return base + jitter;
}

// Realistic browser fingerprints that rotate on each init
const BROWSER_PROFILES: [string, string, string][] = [
  ["Chrome",  "Desktop", "121.0.0"],
  ["Firefox", "Desktop", "122.0"],
  ["Safari",  "Desktop", "17.3"],
  ["Edge",    "Desktop", "121.0.2277.128"],
];

function getRandomBrowserProfile(): [string, string, string] {
  return BROWSER_PROFILES[Math.floor(Math.random() * BROWSER_PROFILES.length)];
}

// ──────────────────────────────────────────────────────────────────────────

export async function initWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");
  const { version, isLatest } = await fetchLatestBaileysVersion();

  logger.info(`Using WA v${version.join(".")}, isLatest: ${isLatest}`);

  const browserProfile = getRandomBrowserProfile();
  logger.info(`Browser fingerprint: ${browserProfile[0]} ${browserProfile[2]}`);

  // Silent baileys logger to avoid leaking internal data
  const silentLogger = P({ level: "silent" }) as any;

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, silentLogger),
    },
    logger: silentLogger,
    printQRInTerminal: false, // Disabled – we serve QR via API
    browser: browserProfile,
    syncFullHistory: false,
    generateHighQualityLinkPreview: false, // Reduces outgoing traffic fingerprint
    // Human-like timing: randomised message send intervals
    msgRetryCounterCache: undefined,
    // Avoid reading receipts to reduce activity signature
    markOnlineOnConnect: false,
    retryRequestDelayMs: 2_000,
    // Keep socket alive naturally without aggressive pings
    keepAliveIntervalMs: 25_000,
  });

  whatsappSocket = sock;

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // Always capture new QR immediately – do NOT wipe the old one first
    if (qr) {
      logger.info("New QR code generated");
      try {
        currentQR = await QRCode.toDataURL(qr, {
          errorCorrectionLevel: "H",
          margin: 2,
          width: 300,
        });
        logger.info("QR code ready for display");
      } catch (err) {
        logger.error({ err }, "Error generating QR Code");
      }
    }

    if (connection === "close") {
      isConnected = false;
      // DO NOT clear currentQR here – keep showing the last QR while reconnecting
      // so the user can re-scan immediately if needed.

      const statusCode =
        (lastDisconnect?.error as { output?: { statusCode?: number } })?.output?.statusCode;

      logger.warn({ statusCode, reason: lastDisconnect?.error }, "WhatsApp connection closed.");

      const loggedOut = statusCode === DisconnectReason.loggedOut;
      const banned = statusCode === 401; // 401 = account action required / banned

      if (loggedOut || banned) {
        // Force fresh session – clear stale QR so UI asks user to scan again
        currentQR = null;
        if (banned) {
          logger.error("WhatsApp account banned or action required (401). Waiting before retry.");
          // Wait 5 min before retrying after a ban signal
          await delay(300_000);
        } else {
          logger.error("WhatsApp logged out. Delete auth_info_baileys and restart.");
        }
        reconnectAttempts = 0;
        initWhatsApp();
      } else {
        // Normal disconnect – exponential backoff reconnect
        reconnectAttempts++;
        const waitMs = getReconnectDelay();
        logger.info(`Reconnecting in ${waitMs}ms (attempt #${reconnectAttempts})…`);
        await delay(waitMs);
        initWhatsApp();
      }
    } else if (connection === "open") {
      logger.info("✅ WhatsApp Web conectado exitosamente (Baileys)!");
      isConnected = true;
      currentQR = null; // Clear QR only once we are truly connected
      reconnectAttempts = 0; // Reset backoff counter on success
    }
  });
}

// Human-like random delay between message sends (ms)
function humanDelay(): Promise<void> {
  const ms = 1_200 + Math.floor(Math.random() * 2_800); // 1.2s – 4s
  return delay(ms);
}

export async function sendWhatsAppMessage(phone: string, text: string): Promise<boolean> {
  if (!isConnected || !whatsappSocket) {
    logger.error("Cannot send message, WhatsApp is not connected.");
    return false;
  }

  try {
    const formattedPhone = phone.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

    // 1. Human-like pre-send pause
    await humanDelay();

    // 2. Añadir mutación invisible al texto
    const mutatedText = text + getInvisibleMutation();

    // 3. Simular lectura/presencia
    await whatsappSocket.presenceSubscribe(formattedPhone);
    await delay(Math.random() * 500 + 500); // 0.5s - 1.0s pausa antes de escribir

    // 4. Estado "escribiendo..." proporcional al mensaje
    await whatsappSocket.sendPresenceUpdate("composing", formattedPhone);
    
    // Cálculo: aprox 50ms por carácter, mínimo 2s, máximo 12s
    const typingTime = Math.min(Math.max(mutatedText.length * 50, 2000), 12000);
    await delay(typingTime);

    // 5. Pausar escritura y enviar
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
