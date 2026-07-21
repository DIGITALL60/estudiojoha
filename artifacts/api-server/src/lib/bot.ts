/**
 * Bot de reservas para Estudio Joha Molinero
 * Maneja el estado de la conversación y crea turnos reales en la base de datos.
 */

import { db, services, professionals, clients, appointments, professional_schedules } from "@workspace/db";
import { eq, and } from "drizzle-orm";
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
  | "rescheduling_choosing_date"
  | "rescheduling_choosing_time"
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
  // For rescheduling flow
  appointmentIdToReschedule?: string;
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

  // ── Check if client is confirming/canceling from a reminder ──────────────
  // These are standalone messages outside of a booking session and should bypass any current step
  const isConfirmation = input === "reminder_confirm" || normalized === "si" || normalized === "sí" || normalized.includes("confirmo");
  const isCancellation = input === "reminder_cancel" || normalized === "no" || normalized === "cancelar" || normalized.includes("cancelo");

  if (input === "reminder_confirm" || input === "reminder_cancel") {
    // If it's explicitly a button click, we always process it as a reminder response
    // For text matches (si/no), we only process if idle/done to avoid conflicts with other flows
    // But since buttons send the exact ID, we can intercept them safely.
  }

  if (input === "reminder_confirm" || input === "reminder_cancel" || ((session.step === "idle" || session.step === "done") && (isConfirmation || isCancellation))) {
    if (isConfirmation || isCancellation) {
      // Look for upcoming appointment for this phone number
      const clientRows = db.select().from(clients).where(eq(clients.phone, from)).all();
      const clientId = clientRows[0]?.id;
      let app = null;

      if (clientId) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split("T")[0];
        const today = new Date().toISOString().split("T")[0];

        const upcomingApps = await db.select().from(appointments).where(
          and(eq(appointments.clientId, clientId), eq(appointments.status, "agendado"))
        );

        // Find the closest upcoming appointment (today or tomorrow)
        const relevant = upcomingApps
          .filter(a => a.date >= today)
          .sort((a, b) => a.date.localeCompare(b.date));
        app = relevant[0];
      }

      if (app) {
        if (isConfirmation) {
          await db.update(appointments).set({ status: "confirmado" } as any).where(eq(appointments.id, app.id));
          const [srv] = await db.select().from(services).where(eq(services.id, app.serviceId)).limit(1);
          const [prof] = await db.select().from(professionals).where(eq(professionals.id, app.professionalId)).limit(1);
          const [d, m, y] = app.date.split("-");
          await cloudSendText(from,
            `✅ *¡Turno confirmado!*\n\n` +
            `Nos alegra que puedas venir 💜\n\n` +
            `📅 ${d}/${m}/${y} a las ${app.time}hs\n` +
            `💅 ${srv?.name || "tu servicio"}\n` +
            `👩‍🎨 ${prof?.name || "tu profesional"}\n\n` +
            `¡Te esperamos! 🌸`
          );
          logger.info({ from, appointmentId: app.id }, "[Bot] Turno confirmado por cliente");
          return;
        } else if (isCancellation) {
          // Offer to reschedule instead of cancelling directly
          session.step = "rescheduling_choosing_date";
          session.appointmentIdToReschedule = app.id;
          session.serviceId = app.serviceId;
          session.serviceDuration = (await db.select().from(services).where(eq(services.id, app.serviceId)).limit(1))[0]?.duration;
          session.professionalId = app.professionalId;
          session.professionalName = (await db.select().from(professionals).where(eq(professionals.id, app.professionalId)).limit(1))[0]?.name;
          session.serviceName = (await db.select().from(services).where(eq(services.id, app.serviceId)).limit(1))[0]?.name;
          sessions.set(from, session);
          await cloudSendButtons(from,
            `😕 ¡Qué lástima que no puedas venir!\n\n¿Querés *reprogramar* tu turno para otro día, o preferís cancelarlo definitivamente?`,
            [
              { id: "reschedule_yes", title: "📅 Reprogramar" },
              { id: "reschedule_no", title: "❌ Cancelar definitivo" },
            ]
          );
          return;
        }
      } else {
        // No appointments found to confirm/cancel
        if (input === "reminder_confirm" || input === "reminder_cancel") {
           await cloudSendText(from, "No encontré turnos pendientes para confirmar o cancelar.");
           return;
        }
      }
    }
  }

  // ── RESCHEDULING FLOW ─────────────────────────────────────────────────────
  if (session.step === "rescheduling_choosing_date") {
    if (input === "reschedule_no") {
      // Actually cancel the appointment
      if (session.appointmentIdToReschedule) {
        await db.update(appointments).set({ status: "cancelado" }).where(eq(appointments.id, session.appointmentIdToReschedule));
      }
      sessions.delete(from);
      await cloudSendText(from, "Tu turno fue cancelado 🙈\n\nCuando quieras reservar de nuevo, ¡escribinos y te ayudamos! 💜");
      return;
    }
    if (input === "reschedule_yes") {
      await cloudSendText(from, `¡Perfecto! ¿Qué fecha te queda mejor?\n\nEscribila así: *DD/MM/AAAA*\nEj: *28/07/2025*`);
      return;
    }

    // Parse date
    let dateStr = "";
    const matchDDMM = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    const matchISO = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (matchDDMM) {
      dateStr = `${matchDDMM[3]}-${matchDDMM[2].padStart(2, "0")}-${matchDDMM[1].padStart(2, "0")}`;
    } else if (matchISO) {
      dateStr = input;
    } else {
      await cloudSendText(from, "No entendí la fecha 😅 Escribila así: *DD/MM/AAAA*\nEj: *28/07/2025*");
      return;
    }

    const availableTimes = await getAvailableTimes(session.professionalId!, dateStr, session.serviceDuration!);
    if (!availableTimes.length) {
      await cloudSendText(from, `No hay horarios disponibles para esa fecha con ${session.professionalName}. Probá con otro día 📅`);
      return;
    }

    session.date = dateStr;
    session.step = "rescheduling_choosing_time";
    sessions.set(from, session);

    const [d, m, y] = dateStr.split("-");
    const timeRows = availableTimes.slice(0, 10).map((t) => ({ id: `retime_${t}`, title: t, description: "Disponible" }));
    await cloudSendList(from, `Horarios para ${d}/${m}/${y}`,
      `Estos son los horarios disponibles con *${session.professionalName}*:`,
      "Ver Horarios",
      [{ title: "Horarios disponibles", rows: timeRows }]
    );
    return;
  }

  if (session.step === "rescheduling_choosing_time") {
    let timeStr = input.replace("retime_", "");
    if (!/^\d{1,2}:\d{2}$/.test(timeStr)) {
      await cloudSendText(from, "Escribí el horario en formato HH:MM, ej: *10:00*");
      return;
    }

    // Cancel old appointment and create new one
    if (session.appointmentIdToReschedule) {
      const [oldApp] = await db.select().from(appointments).where(eq(appointments.id, session.appointmentIdToReschedule)).limit(1);
      if (oldApp) {
        await db.update(appointments).set({ status: "cancelado" }).where(eq(appointments.id, session.appointmentIdToReschedule));
        const newId = randomUUID();
        db.insert(appointments).values({
          id: newId,
          clientId: oldApp.clientId,
          professionalId: oldApp.professionalId,
          serviceId: oldApp.serviceId,
          date: session.date!,
          time: timeStr,
          duration: oldApp.duration,
          price: oldApp.price,
          status: "agendado",
          notes: `Reprogramado via WhatsApp Bot`,
          createdAt: new Date(),
        }).run();
      }
    }

    sessions.delete(from);
    const [d, m, y] = (session.date || "").split("-");
    await cloudSendText(from,
      `✅ *¡Turno reprogramado!*\n\n` +
      `💅 ${session.serviceName}\n` +
      `👩‍🎨 ${session.professionalName}\n` +
      `📅 ${d}/${m}/${y} a las ${timeStr}hs\n\n` +
      `¡Perfecto, te esperamos! 💜`
    );
    return;
  }

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
      const dayOfWeek = dateObj.getUTCDay();
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
      const dateDisplay = `${d}/${m}/${y}`;

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
        const appointmentId = randomUUID();

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
          `✅ *¡Turno confirmado!*\n\n👤 ${session.clientName}\n💅 ${session.serviceName}\n👩‍🎨 ${session.professionalName}\n📅 ${dateDisplay}\n⏰ ${session.time}hs\n\n📍 Río Segundo, Córdoba\n\n*Tu turno quedó registrado* para el día ${dateDisplay} a las ${session.time}hs ✨\n\n¡Gracias por elegirnos! 💜 Si necesitás reprogramar, avisanos con 24hs de anticipación.`
        );
        logger.info({ from, appointmentId }, "[Bot] Turno creado desde WhatsApp");
      } else if (input === "confirm_no") {
        // Offer to reschedule instead of just cancelling
        sessions.delete(from);
        await cloudSendText(from,
          `Entendido 🙈 Tu turno no fue reservado.\n\nCuando quieras intentar de nuevo, ¡escribinos "Hola" y arrancamos! 💜`
        );
      } else {
        // Unknown reply during confirming — re-show confirmation
        await cloudSendText(from, "Por favor usá los botones para confirmar o cancelar tu turno 👆");
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
  
  const grouped: Record<string, typeof allServices> = {};
  for (const s of allServices) {
    if (!grouped[s.category]) grouped[s.category] = [];
    grouped[s.category].push(s);
  }

  const sections = [];
  for (const [category, svcs] of Object.entries(grouped)) {
    const rows = svcs.slice(0, 10).map((s) => ({
      id: s.id,
      title: s.name.length > 24 ? s.name.substring(0, 21) + "..." : s.name,
      description: `${s.duration} min · $${s.price}`,
    }));
    if (rows.length > 0) {
      sections.push({
        title: category.length > 24 ? category.substring(0, 24) : category,
        rows
      });
    }
  }

  const validSections = sections.slice(0, 10);

  await cloudSendList(
    to,
    "Estudio Joha Molinero 💅",
    "¡Hola! Bienvenida 🌸\nEstamos en *Río Segundo, Córdoba*\n📅 Martes a Sábado · 10:00 a 20:00 hs\n\n¿Qué servicio querés reservar?",
    "Ver Servicios",
    validSections
  );
}

async function showProfessionals(to: string, serviceId: string): Promise<void> {
  const allProfs = await db.select().from(professionals);
  const activeProfs = allProfs.filter((p) => p.role?.toLowerCase() !== "admin" || allProfs.length === 1);

  if (activeProfs.length === 1) {
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
