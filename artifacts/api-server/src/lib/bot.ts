/**
 * Bot de reservas para Estudio Joha Molinero
 * Maneja el estado de la conversación y crea turnos reales en la base de datos.
 */

import { db, services, professionals, clients, appointments, professional_schedules } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { cloudSendText, cloudSendList, cloudSendButtons } from "./whatsapp-cloud.js";
import { logger } from "./logger.js";

// ─── Session store ─────────────────────────────────────────────────────────
type Step =
  | "idle"
  | "choosing_service"
  | "choosing_professional"
  | "choosing_date"
  | "choosing_time"
  | "asking_name"
  | "confirming"
  | "done";

interface Session {
  step: Step;
  serviceId?: string;
  serviceName?: string;
  serviceDuration?: number;
  professionalId?: string;
  professionalName?: string;
  date?: string;          // YYYY-MM-DD
  time?: string;          // HH:mm
  clientName?: string;
}

const sessions = new Map<string, Session>();

function getSession(from: string): Session {
  if (!sessions.has(from)) sessions.set(from, { step: "idle" });
  return sessions.get(from)!;
}

// ─── Time helpers ───────────────────────────────────────────────────────────
function parseTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function formatTime(mins: number) {
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
}

async function getAvailableTimes(professionalId: string, date: string, duration: number): Promise<string[]> {
  const dateObj = new Date(date);
  const dayOfWeek = dateObj.getUTCDay();

  const schedules = await db.select().from(professional_schedules).where(eq(professional_schedules.professionalId, professionalId));
  const daySchedules = schedules.filter((s) => s.dayOfWeek === dayOfWeek);
  if (!daySchedules.length) return [];

  const allApps = await db.select().from(appointments).where(eq(appointments.professionalId, professionalId));
  const dayApps = allApps.filter((a) => a.date === date && a.status !== "cancelado");

  const blocks: number[] = [];
  for (const sched of daySchedules) {
    const start = parseTime(sched.startTime);
    const end = parseTime(sched.endTime);
    for (let t = start; t + duration <= end; t += 30) {
      const overlap = dayApps.some((a) => {
        const as = parseTime(a.time);
        const ae = as + a.duration;
        return t < ae && t + duration > as;
      });
      if (!overlap) blocks.push(t);
    }
  }
  return [...new Set(blocks)].sort((a, b) => a - b).map(formatTime);
}

// ─── Main handler ────────────────────────────────────────────────────────────
export async function handleBotMessage(from: string, text: string, interactiveId?: string): Promise<void> {
  const session = getSession(from);
  const normalized = text.trim().toLowerCase();
  const input = interactiveId || text.trim();

  const isGreeting = ["hola", "buenas", "buenos", "turno", "reservar", "quiero", "necesito", "hi", "hello", "saludos"].some(
    (w) => normalized.includes(w)
  );

  try {
    // ── WELCOME ──────────────────────────────────────────────────────────────
    if (session.step === "idle" || isGreeting) {
      session.step = "choosing_service";
      sessions.set(from, session);
      await showServices(from);
      return;
    }

    // ── CHOOSING SERVICE ─────────────────────────────────────────────────────
    if (session.step === "choosing_service") {
      const allServices = await db.select().from(services);
      const svc = allServices.find((s) => s.id === input || s.name.toLowerCase().includes(normalized));
      if (!svc) {
        await cloudSendText(from, "No encontré ese servicio. Por favor elegí una opción del menú 👇");
        await showServices(from);
        return;
      }
      session.serviceId = svc.id;
      session.serviceName = svc.name;
      session.serviceDuration = svc.duration;
      session.step = "choosing_professional";
      sessions.set(from, session);
      await showProfessionals(from, svc.id);
      return;
    }

    // ── CHOOSING PROFESSIONAL ────────────────────────────────────────────────
    if (session.step === "choosing_professional") {
      const allProfs = await db.select().from(professionals);
      const prof = allProfs.find((p) => p.id === input || p.name.toLowerCase().includes(normalized));
      if (!prof) {
        await cloudSendText(from, "No encontré esa profesional. Elegí una opción 👇");
        await showProfessionals(from, session.serviceId!);
        return;
      }
      session.professionalId = prof.id;
      session.professionalName = prof.name;
      session.step = "choosing_date";
      sessions.set(from, session);
      await cloudSendText(
        from,
        `Genial! Elegiste a *${prof.name}* para *${session.serviceName}* 💜\n\n¿Qué fecha preferís?\n\nEscribila en formato: *DD/MM/AAAA*\nEj: *25/07/2025*\n\n📅 Atendemos Martes a Sábado, 10:00 a 20:00 hs`
      );
      return;
    }

    // ── CHOOSING DATE ────────────────────────────────────────────────────────
    if (session.step === "choosing_date") {
      // Parse DD/MM/YYYY or YYYY-MM-DD
      let dateStr = "";
      const matchDDMM = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      const matchISO = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (matchDDMM) {
        dateStr = `${matchDDMM[3]}-${matchDDMM[2].padStart(2, "0")}-${matchDDMM[1].padStart(2, "0")}`;
      } else if (matchISO) {
        dateStr = input;
      } else {
        await cloudSendText(from, "No entendí la fecha 😅 Escribila así: *DD/MM/AAAA*\nEj: *25/07/2025*");
        return;
      }

      const dateObj = new Date(dateStr);
      const dayOfWeek = dateObj.getUTCDay(); // 0=Dom, 6=Sab
      if (dayOfWeek === 0) {
        await cloudSendText(from, "Los domingos estamos cerradas 🙏 Elegí otro día (Martes a Sábado).");
        return;
      }

      const availableTimes = await getAvailableTimes(session.professionalId!, dateStr, session.serviceDuration!);
      if (!availableTimes.length) {
        await cloudSendText(from, `No hay horarios disponibles para el ${input} con ${session.professionalName}. Probá con otro día 📅`);
        return;
      }

      session.date = dateStr;
      session.step = "choosing_time";
      sessions.set(from, session);

      // Show available times in chunks of 3 as buttons or list
      const timeRows = availableTimes.slice(0, 10).map((t) => ({ id: `time_${t}`, title: t, description: "Disponible" }));
      await cloudSendList(
        from,
        `Horarios para ${input}`,
        `Estos son los horarios disponibles con *${session.professionalName}*:`,
        "Ver Horarios",
        [{ title: "Horarios disponibles", rows: timeRows }]
      );
      return;
    }

    // ── CHOOSING TIME ────────────────────────────────────────────────────────
    if (session.step === "choosing_time") {
      let timeStr = input.replace("time_", "");
      // Validate HH:mm
      if (!/^\d{1,2}:\d{2}$/.test(timeStr)) {
        await cloudSendText(from, "Escribí el horario en formato HH:MM, ej: *10:00*");
        return;
      }
      session.time = timeStr;
      session.step = "asking_name";
      sessions.set(from, session);
      await cloudSendText(from, `¡Perfecto! Turno para las *${timeStr}* ✅\n\n¿Cuál es tu nombre completo?`);
      return;
    }

    // ── ASKING NAME ──────────────────────────────────────────────────────────
    if (session.step === "asking_name") {
      session.clientName = text.trim();
      session.step = "confirming";
      sessions.set(from, session);

      const [d, m, y] = (session.date || "").split("-");
      const dateDisplay = `${y}-${m}-${d}` === session.date ? `${d}/${m}/${y}` : session.date;

      await cloudSendButtons(
        from,
        `Confirmá tu turno 📋\n\n👤 *${session.clientName}*\n💅 ${session.serviceName}\n👩‍🎨 ${session.professionalName}\n📅 ${dateDisplay}\n⏰ ${session.time}\n\n¿Confirmamos?`,
        [
          { id: "confirm_yes", title: "✅ Confirmar" },
          { id: "confirm_no", title: "❌ Cancelar" },
        ]
      );
      return;
    }

    // ── CONFIRMING ────────────────────────────────────────────────────────────
    if (session.step === "confirming") {
      if (input === "confirm_yes" || normalized.includes("sí") || normalized === "si" || normalized === "confirmar") {
        // Create booking in DB
        const appointmentId = randomUUID();

        // Find or create client
        const existingClients = db.select().from(clients).where(eq(clients.phone, from)).all();
        let clientId = existingClients[0]?.id;
        if (!clientId) {
          clientId = randomUUID();
          db.insert(clients).values({
            id: clientId,
            name: session.clientName!,
            phone: from,
            createdAt: new Date(),
          }).run();
        }

        db.insert(appointments).values({
          id: appointmentId,
          clientId,
          professionalId: session.professionalId!,
          serviceId: session.serviceId!,
          date: session.date!,
          time: session.time!,
          duration: session.serviceDuration!,
          price: 0,
          status: "agendado",
          notes: `Reserva via WhatsApp Bot`,
          createdAt: new Date(),
        }).run();

        sessions.delete(from);

        const [d, m, y] = (session.date || "").split("-");
        const dateDisplay = `${d}/${m}/${y}`;

        await cloudSendText(
          from,
          `✅ *¡Turno confirmado!*\n\n👤 ${session.clientName}\n💅 ${session.serviceName}\n👩‍🎨 ${session.professionalName}\n📅 ${dateDisplay}\n⏰ ${session.time}\n\n📍 Río Segundo, Córdoba (te confirmamos la dirección el día anterior)\n\n¡Gracias por elegirnos! 💜 Si necesitás cancelar, avisanos con 24hs de anticipación.`
        );
        logger.info({ from, appointmentId }, "[Bot] Turno creado desde WhatsApp");
      } else {
        sessions.delete(from);
        await cloudSendText(from, "Turno cancelado 🙈 Cuando quieras reservar de nuevo escribinos y arrancamos de nuevo!");
      }
      return;
    }
  } catch (err) {
    logger.error({ err, from }, "[Bot] Error handling message");
    sessions.delete(from);
    await cloudSendText(from, "Ocurrió un error 😔 Por favor escribinos directamente y te ayudamos!");
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function showServices(to: string): Promise<void> {
  const allServices = await db.select().from(services);
  const rows = allServices.slice(0, 10).map((s) => ({
    id: s.id,
    title: s.name.length > 24 ? s.name.substring(0, 21) + "..." : s.name,
    description: `${s.duration} min · $${s.price}`,
  }));

  await cloudSendList(
    to,
    "Estudio Joha Molinero 💅",
    "¡Hola! Bienvenida 🌸\nEstamos en *Río Segundo, Córdoba*\n📅 Martes a Sábado · 10:00 a 20:00 hs\n\n¿Qué servicio querés reservar?",
    "Ver Servicios",
    [{ title: "Nuestros Servicios", rows }]
  );
}

async function showProfessionals(to: string, serviceId: string): Promise<void> {
  const allProfs = await db.select().from(professionals);
  const activeProfs = allProfs.filter((p) => p.role?.toLowerCase() !== "admin" || allProfs.length === 1);

  if (activeProfs.length === 1) {
    // Auto-select if only one professional
    const prof = activeProfs[0];
    const session = getSession(to);
    session.professionalId = prof.id;
    session.professionalName = prof.name;
    session.step = "choosing_date";
    sessions.set(to, session);
    await cloudSendText(
      to,
      `¡Perfecto! *${prof.name}* te va a atender 💜\n\n¿Qué fecha preferís?\nEscribila así: *DD/MM/AAAA*\nEj: *25/07/2025*`
    );
    return;
  }

  const buttons = activeProfs.slice(0, 3).map((p) => ({ id: p.id, title: p.name }));
  await cloudSendButtons(to, "¿Con quién querés reservar?", buttons);
}
