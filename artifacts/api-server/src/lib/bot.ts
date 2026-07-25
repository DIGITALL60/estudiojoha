/**
 * Bot de reservas para Estudio Joha Molinero
 * Maneja el estado de la conversación y crea turnos reales en la base de datos.
 */

import { db, services, professionals, clients, appointments, professional_schedules } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { cloudSendText, cloudSendList, cloudSendButtons } from "./whatsapp-cloud.js";
import { logger } from "./logger.js";
import { getBoolSetting } from "./settings.js";

// ─── Session store ─────────────────────────────────────────────────────────
type Step =
  | "idle"
  | "choosing_category"
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
  category?: string;      // chosen category
  // For rescheduling flow
  appointmentIdToReschedule?: string;
  lastUpcomingDates?: { dateStr: string; displayDate: string; dayName: string }[];
}

const sessions = new Map<string, Session>();

function getSession(from: string): Session {
  if (!sessions.has(from)) sessions.set(from, { step: "idle" });
  return sessions.get(from)!;
}

// ─── Time & Date helpers ───────────────────────────────────────────────────
function parseTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function formatTime(mins: number) {
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
}

function getDayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d));
  return dateObj.getUTCDay();
}

const DAY_NAMES_ES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

async function getAvailableTimes(professionalId: string, date: string, duration: number): Promise<string[]> {
  const dayOfWeek = getDayOfWeek(date);
  if (dayOfWeek === 0) return []; // Sunday closed

  const schedules = await db.select().from(professional_schedules).where(eq(professional_schedules.professionalId, professionalId));
  let daySchedules = schedules.filter((s) => s.dayOfWeek === dayOfWeek);

  // Fallback to default schedule (Tue-Sat 09:00-20:00) if no custom schedule rows in DB
  if (schedules.length === 0) {
    if (dayOfWeek >= 2 && dayOfWeek <= 6) {
      daySchedules = [{ id: "def", professionalId, dayOfWeek, startTime: "09:00", endTime: "20:00" }];
    }
  }
  if (!daySchedules.length) return [];

  const allApps = await db.select().from(appointments).where(eq(appointments.professionalId, professionalId));
  const dayApps = allApps.filter((a) => a.date === date && a.status !== "cancelado");

  const nowArgDate = new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
  const nowArgTime = new Date().toLocaleTimeString("en-GB", { timeZone: "America/Argentina/Buenos_Aires", hour: "2-digit", minute: "2-digit" });
  const [nowH, nowM] = nowArgTime.split(":").map(Number);
  const nowMinutes = nowH * 60 + nowM;

  const blocks: number[] = [];
  for (const sched of daySchedules) {
    const start = parseTime(sched.startTime);
    const end = parseTime(sched.endTime);
    for (let t = start; t + duration <= end; t += 30) {
      if (date === nowArgDate && t <= nowMinutes + 15) {
        continue;
      }
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

async function getUpcomingAvailableDates(professionalId: string, duration: number, limit = 4) {
  const result: { dateStr: string; displayDate: string; dayName: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(now.getTime() + i * 86400000);
    const dateStr = d.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
    const dayOfWeek = getDayOfWeek(dateStr);
    if (dayOfWeek === 0) continue;

    const times = await getAvailableTimes(professionalId, dateStr, duration);
    if (times.length > 0) {
      const [y, m, day] = dateStr.split("-");
      result.push({
        dateStr,
        displayDate: `${day}/${m}/${y}`,
        dayName: DAY_NAMES_ES[dayOfWeek],
      });
      if (result.length >= limit) break;
    }
  }
  return result;
}

// ─── Main handler ────────────────────────────────────────────────────────────
export async function handleBotMessage(from: string, text: string, interactiveId?: string): Promise<void> {
  const isBotEnabled = await getBoolSetting("whatsapp_notif");
  if (!isBotEnabled) {
    logger.info({ from }, "[Bot] Ignoring message because whatsapp_notif is disabled in settings");
    return;
  }

  const session = getSession(from);
  const normalized = text.trim().toLowerCase();
  const input = interactiveId || text.trim();

  const isGreeting = ["hola", "buenas", "buenos", "turno", "reservar", "quiero", "necesito", "hi", "hello", "saludos"].some(
    (w) => normalized.includes(w)
  );

  // ── Phone number normalization helper ────────────────────────────────────
  function cleanPhone(phone: string): string {
    let digits = (phone || "").replace(/\D/g, "");
    if (digits.startsWith("549")) digits = digits.slice(3);
    else if (digits.startsWith("54")) digits = digits.slice(2);
    if (digits.startsWith("0")) digits = digits.slice(1);
    return digits;
  }

  function phonesMatch(p1: string, p2: string): boolean {
    const c1 = cleanPhone(p1);
    const c2 = cleanPhone(p2);
    if (!c1 || !c2) return false;
    return c1 === c2 || c1.endsWith(c2) || c2.endsWith(c1);
  }

  // ── Check if client is confirming/canceling from a reminder ──────────────
  // These are standalone messages outside of a booking session and should bypass any current step
  const isConfirmation =
    input === "reminder_confirm" ||
    normalized === "si" ||
    normalized === "sí" ||
    normalized.includes("confirmo") ||
    normalized.includes("confirmar") ||
    normalized.includes("asistire") ||
    normalized.includes("asistiré") ||
    normalized.includes("voy a ir");

  const isCancellation =
    input === "reminder_cancel" ||
    normalized === "no" ||
    normalized === "cancelar" ||
    normalized.includes("cancelo") ||
    normalized.includes("no asist") ||
    normalized.includes("no puedo") ||
    normalized.includes("no voy") ||
    normalized.includes("reprogram");

  if (input === "reminder_confirm" || input === "reminder_cancel") {
    // Explicit button clicks are always processed as a reminder response
  }

  if (input === "reminder_confirm" || input === "reminder_cancel" || ((session.step === "idle" || session.step === "done") && (isConfirmation || isCancellation))) {
    if (isConfirmation || isCancellation) {
      // Look for upcoming appointment for this phone number by normalizing
      const allClients = await db.select().from(clients);
      const client = allClients.find(c => phonesMatch(c.phone || "", from));
      const clientId = client?.id;
      let app = null;

      if (clientId) {
        const today = new Date().toISOString().split("T")[0];

        const upcomingApps = await db.select().from(appointments).where(
          and(eq(appointments.clientId, clientId), eq(appointments.status, "agendado"))
        );

        // Find the closest upcoming appointment
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
          // Offer ONLY to reschedule instead of direct cancellation without alternative
          session.step = "rescheduling_choosing_date";
          session.appointmentIdToReschedule = app.id;
          session.serviceId = app.serviceId;
          session.serviceDuration = (await db.select().from(services).where(eq(services.id, app.serviceId)).limit(1))[0]?.duration || 30;
          session.professionalId = app.professionalId;
          session.professionalName = (await db.select().from(professionals).where(eq(professionals.id, app.professionalId)).limit(1))[0]?.name || "la profesional";
          session.serviceName = (await db.select().from(services).where(eq(services.id, app.serviceId)).limit(1))[0]?.name || "tu servicio";

          await db.update(appointments).set({ status: "cancelado" }).where(eq(appointments.id, app.id));

          const upcoming = await getUpcomingAvailableDates(session.professionalId, session.serviceDuration);
          session.lastUpcomingDates = upcoming;
          sessions.set(from, session);

          let upcomingMsg = "";
          if (upcoming.length > 0) {
            upcomingMsg = `\n\n📅 *Próximas fechas con disponibilidad de ${session.professionalName}:*\n` +
              upcoming.map((u, idx) => `${idx + 1}️⃣ *${u.displayDate}* (${u.dayName})`).join("\n") +
              `\n\nEscribí la fecha (Ej: *${upcoming[0].displayDate}*) o respondé con el número (*1, 2, 3 o 4*) 👇`;
          } else {
            upcomingMsg = `\n\nEscribila en formato: *DD/MM/AAAA*\nEj: *28/07/2026*`;
          }

          await cloudSendText(from,
            `😕 ¡Lamentamos que no puedas asistir!\n\n` +
            `Tu turno anterior fue cancelado, pero vamos a *reprogramarlo* para otra fecha que te quede cómoda 📅${upcomingMsg}`
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
    let dateStr = "";
    const numIdx = parseInt(input.trim());
    if (session.lastUpcomingDates && numIdx >= 1 && numIdx <= session.lastUpcomingDates.length) {
      dateStr = session.lastUpcomingDates[numIdx - 1].dateStr;
    } else {
      const matchDDMM = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      const matchISO = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (matchDDMM) {
        dateStr = `${matchDDMM[3]}-${matchDDMM[2].padStart(2, "0")}-${matchDDMM[1].padStart(2, "0")}`;
      } else if (matchISO) {
        dateStr = input;
      }
    }

    if (!dateStr) {
      await cloudSendText(from, "No entendí la fecha 😅 Escribila así: *DD/MM/AAAA* (Ej: *28/07/2026*) o con el número de la opción 👇");
      return;
    }

    const availableTimes = await getAvailableTimes(session.professionalId!, dateStr, session.serviceDuration!);
    if (!availableTimes.length) {
      const upcoming = await getUpcomingAvailableDates(session.professionalId!, session.serviceDuration || 30);
      session.lastUpcomingDates = upcoming;
      sessions.set(from, session);

      let upcomingMsg = "";
      if (upcoming.length > 0) {
        upcomingMsg = `\n\n📅 *Próximas fechas disponibles con ${session.professionalName}:*\n` +
          upcoming.map((u, idx) => `${idx + 1}️⃣ *${u.displayDate}* (${u.dayName})`).join("\n") +
          `\n\nEscribí la fecha que prefieras o respondé con el número (1, 2, 3 o 4) 👇`;
      }

      await cloudSendText(from,
        `⚠️ No hay horarios disponibles para esa fecha con *${session.professionalName}* (el estudio atiende de Martes a Sábados).${upcomingMsg}`
      );
      return;
    }

    session.date = dateStr;
    session.step = "rescheduling_choosing_time";
    sessions.set(from, session);

    const [y, m, d] = dateStr.split("-");
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
      session.step = "choosing_category";
      sessions.set(from, session);
      await showCategories(from);
      return;
    }

    // ── CHOOSING CATEGORY ────────────────────────────────────────────────────
    if (session.step === "choosing_category") {
      const allServices = await db.select().from(services);
      const cats = Array.from(new Set(allServices.map(s => s.category)));
      const chosenCat = cats.find(c => c === input || c.toLowerCase().includes(normalized));
      
      if (!chosenCat) {
        await cloudSendText(from, "No encontré esa categoría. Por favor elegí una opción de la lista 👇");
        await showCategories(from);
        return;
      }
      
      session.category = chosenCat;
      session.step = "choosing_service";
      sessions.set(from, session);
      await showServices(from, chosenCat);
      return;
    }

    // ── CHOOSING SERVICE ─────────────────────────────────────────────────────
    if (session.step === "choosing_service") {
      const allServices = await db.select().from(services);
      const catServices = allServices.filter(s => s.category === session.category).sort((a, b) => a.name.localeCompare(b.name));
      
      let svc = catServices.find((s) => s.id === input || s.name.toLowerCase().includes(normalized));
      
      // Also allow numeric selection
      const numMatch = input.match(/^\d+$/);
      if (!svc && numMatch) {
        const index = parseInt(numMatch[0]) - 1;
        if (index >= 0 && index < catServices.length) {
          svc = catServices[index];
        }
      }

      if (!svc) {
        await cloudSendText(from, "No encontré ese servicio. Por favor respondé con el NÚMERO del servicio 👇");
        await showServices(from, session.category!);
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

      const upcoming = await getUpcomingAvailableDates(prof.id, session.serviceDuration || 30);
      session.lastUpcomingDates = upcoming;
      sessions.set(from, session);

      let upcomingMsg = "";
      if (upcoming.length > 0) {
        upcomingMsg = `\n\n📅 *Próximas fechas con disponibilidad de ${prof.name}:*\n` +
          upcoming.map((u, idx) => `${idx + 1}️⃣ *${u.displayDate}* (${u.dayName})`).join("\n") +
          `\n\nEscribí la fecha (Ej: *${upcoming[0].displayDate}*) o respondé con el número (1, 2, 3 o 4) 👇`;
      } else {
        upcomingMsg = `\n\nEscribí la fecha en formato: *DD/MM/AAAA*\nEj: *28/07/2026*\n\n📅 Atendemos Martes a Sábado, 09:00 a 20:00 hs`;
      }

      await cloudSendText(
        from,
        `¡Genial! Elegiste a *${prof.name}* para *${session.serviceName}* 💜${upcomingMsg}`
      );
      return;
    }

    // ── CHOOSING DATE ────────────────────────────────────────────────────────
    if (session.step === "choosing_date") {
      let dateStr = "";
      const numIdx = parseInt(input.trim());
      if (session.lastUpcomingDates && numIdx >= 1 && numIdx <= session.lastUpcomingDates.length) {
        dateStr = session.lastUpcomingDates[numIdx - 1].dateStr;
      } else {
        const matchDDMM = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        const matchISO = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (matchDDMM) {
          dateStr = `${matchDDMM[3]}-${matchDDMM[2].padStart(2, "0")}-${matchDDMM[1].padStart(2, "0")}`;
        } else if (matchISO) {
          dateStr = input;
        }
      }

      if (!dateStr) {
        await cloudSendText(from, "No entendí la fecha 😅 Escribila así: *DD/MM/AAAA* (Ej: *28/07/2026*) o el número de opción (1, 2, 3 o 4) 👇");
        return;
      }

      const availableTimes = await getAvailableTimes(session.professionalId!, dateStr, session.serviceDuration!);
      if (!availableTimes.length) {
        const upcoming = await getUpcomingAvailableDates(session.professionalId!, session.serviceDuration || 30);
        session.lastUpcomingDates = upcoming;
        sessions.set(from, session);

        let upcomingMsg = "";
        if (upcoming.length > 0) {
          upcomingMsg = `\n\n📅 *Próximas fechas disponibles con ${session.professionalName}:*\n` +
            upcoming.map((u, idx) => `${idx + 1}️⃣ *${u.displayDate}* (${u.dayName})`).join("\n") +
            `\n\nEscribí la fecha que prefieras o respondé con el número (1, 2, 3 o 4) 👇`;
        }

        await cloudSendText(from, `⚠️ No hay horarios disponibles para esa fecha con *${session.professionalName}* (el estudio atiende de Martes a Sábados).${upcomingMsg}`);
        return;
      }

      session.date = dateStr;
      session.step = "choosing_time";
      sessions.set(from, session);

      const [y, m, d] = dateStr.split("-");
      const dateDisplay = `${d}/${m}/${y}`;
      const timeRows = availableTimes.slice(0, 10).map((t) => ({ id: `time_${t}`, title: t, description: "Disponible" }));
      await cloudSendList(
        from,
        `Horarios para ${dateDisplay}`,
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
async function showCategories(to: string): Promise<void> {
  const allServices = await db.select().from(services);
  const categories = Array.from(new Set(allServices.map(s => s.category)));

  const rows = categories.slice(0, 10).map((c) => ({
    id: c,
    title: c.length > 24 ? c.substring(0, 24) : c,
  }));

  await cloudSendList(
    to,
    "Estudio Joha Molinero 💅",
    "¡Hola! Bienvenida 🌸\nEstamos en *Río Segundo, Córdoba*\n📅 Martes a Sábado · 10:00 a 20:00 hs\n\n¿Qué te gustaría hacerte hoy?",
    "Ver Categorías",
    [{ title: "Categorías", rows }]
  );
}

async function showServices(to: string, category: string): Promise<void> {
  const allServices = await db.select().from(services);
  const catServices = allServices.filter(s => s.category === category).sort((a, b) => a.name.localeCompare(b.name));
  
  let msg = `Elegiste *${category}* 💅\n\nEscribí el *NÚMERO* del servicio que querés reservar:\n\n`;
  
  catServices.forEach((s, idx) => {
    msg += `*${idx + 1}.* ${s.name} (${s.duration} min - $${s.price})\n`;
  });

  await cloudSendText(to, msg);
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
