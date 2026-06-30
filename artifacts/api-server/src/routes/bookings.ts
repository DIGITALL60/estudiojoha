import { Router } from "express";
import { db, clients, appointments, professionals, services, professional_schedules, vouchers } from "@workspace/db";
import { eq } from "drizzle-orm";
import { sendWhatsAppMessage } from "../lib/whatsapp.js";
import { logger } from "../lib/logger.js";
import { randomUUID } from "crypto";
import { validate } from "../middlewares/validate.js";
import { createBookingSchema } from "../schemas/bookings.js";
import { isTimeSlotAvailable } from "../lib/availability.js";
import { getBoolSetting, getSetting } from "../lib/settings.js";

const router = Router();

router.post("/", validate(createBookingSchema), async (req, res) => {
  try {
    const { client, appointment } = req.body;

    const appointmentId = randomUUID();

    const availability = await isTimeSlotAvailable(
      appointment.date,
      appointment.professionalId,
      appointment.duration,
      appointment.time
    );
    if (!availability.available) {
      return res.status(409).json({ error: availability.reason || "Horario no disponible" });
    }

    // 1. Find or create client
    const existingClients = db.select().from(clients).where(eq(clients.phone, client.phone)).all();
    const existingClient = existingClients[0];
    let clientId = existingClient?.id;

    if (!clientId) {
      clientId = randomUUID();
      db.insert(clients).values({
        id: clientId,
        name: client.name,
        phone: client.phone,
        birthday: client.birthday || null,
        createdAt: new Date(),
      }).run();
    } else if (client.birthday && !existingClient.birthday) {
      db.update(clients).set({ birthday: client.birthday }).where(eq(clients.id, clientId)).run();
    }

    // 2. Create appointment
    let finalNotes = appointment.notes || "";
    if (appointment.voucherCode) {
      finalNotes = finalNotes
        ? `${finalNotes}\n(Voucher usado: ${appointment.voucherCode})`
        : `(Voucher usado: ${appointment.voucherCode})`;
    }

    db.insert(appointments).values({
      id: appointmentId,
      clientId,
      professionalId: appointment.professionalId,
      serviceId: appointment.serviceId,
      date: appointment.date,
      time: appointment.time,
      duration: appointment.duration,
      price: appointment.price,
      status: "agendado",
      notes: finalNotes || null,
      createdAt: new Date(),
    }).run();

    // 3. Deactivate voucher if used
    if (appointment.voucherCode) {
      db.update(vouchers)
        .set({ isActive: false })
        .where(eq(vouchers.code, appointment.voucherCode.toUpperCase()))
        .run();
    }

    // 4. Fetch details for messages
    const [prof] = await db.select().from(professionals).where(eq(professionals.id, appointment.professionalId)).limit(1);
    const [srv] = await db.select().from(services).where(eq(services.id, appointment.serviceId)).limit(1);
    const allProfessionals = await db.select().from(professionals);
    const admin = allProfessionals.find(p => p.role?.toLowerCase() === "admin");

    const professionalName = prof?.name ?? "el profesional";
    const serviceName = srv?.name ?? "tu servicio";
    const businessAddress = await getSetting("business_address", "Río Segundo, Córdoba");
    const whatsappEnabled = await getBoolSetting("whatsapp_notif");

    // 5. Send WhatsApp Notifications (Non-blocking)
    const clientMsg =
      `¡Hola ${client.name}! 👋\n\n` +
      `Tu turno en *Estudio Joha Molinero* está confirmado ✅\n\n` +
      `📅 Fecha: *${appointment.date}*\n` +
      `⏰ Hora: *${appointment.time}*\n` +
      `💅 Servicio: ${serviceName}\n` +
      `👩‍🎨 Profesional: ${professionalName}\n\n` +
      `📍 ${businessAddress}\n\n` +
      `Si necesitás cancelar o reprogramar, avisanos con anticipación.\n¡Gracias por elegirnos! 💜`;

    const profMsg =
      `🔔 *Nuevo turno asignado*\n\n` +
      `👤 Cliente: ${client.name}\n` +
      `📱 Teléfono: ${client.phone}\n` +
      `📅 Fecha: ${appointment.date}\n` +
      `⏰ Hora: ${appointment.time}\n` +
      `💅 Servicio: ${serviceName}`;

    const adminMsg =
      `🆕 *Nuevo turno reservado* (web)\n\n` +
      `👤 Cliente: ${client.name} — ${client.phone}\n` +
      `📅 Fecha: ${appointment.date} a las ${appointment.time}\n` +
      `💅 Servicio: ${serviceName}\n` +
      `👩‍🎨 A cargo de: ${professionalName}`;

    if (whatsappEnabled) {
      Promise.allSettled([
        sendWhatsAppMessage(client.phone, clientMsg),
        prof?.phone && prof.phone !== admin?.phone ? sendWhatsAppMessage(prof.phone, profMsg) : Promise.resolve(),
        admin?.phone ? sendWhatsAppMessage(admin.phone, adminMsg) : Promise.resolve()
      ]).catch(err => {
        logger.error({ err }, "Error sending WhatsApp notifications");
      });
    }

    res.json({ success: true, appointmentId });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error({ error, errMsg }, "Error processing booking");
    res.status(500).json({ error: `Error al procesar la reserva: ${errMsg}` });
  }
});

// GET available times
router.get("/availability", async (req, res) => {
  try {
    const { date, professionalId, serviceDuration } = req.query;
    
    if (!date || !professionalId || !serviceDuration) {
      return res.status(400).json({ error: "Missing required query parameters: date, professionalId, serviceDuration" });
    }

    const requestedDate = String(date);
    const duration = Number(serviceDuration);
    
    // Parse date to get day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    const dateObj = new Date(requestedDate);
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({ error: "Invalid date format" });
    }
    
    // Important: getUTCDay() or normal getDay() depends on how the date is interpreted,
    // assuming requestedDate is YYYY-MM-DD, parsing it directly gives UTC at midnight.
    // So getUTCDay() is the correct day.
    const dayOfWeek = dateObj.getUTCDay();

    // 1. Fetch professional schedules for that day
    const schedules = await db.select().from(professional_schedules).where(
      eq(professional_schedules.professionalId, String(professionalId))
    );
    
    const daySchedules = schedules.filter(s => s.dayOfWeek === dayOfWeek);
    
    if (daySchedules.length === 0) {
      return res.json({ availableTimes: [] });
    }

    // 2. Fetch existing appointments for that professional on that date
    const existingAppointments = await db.select().from(appointments).where(
      eq(appointments.professionalId, String(professionalId))
    );
    
    const dayAppointments = existingAppointments.filter(a => a.date === requestedDate && a.status !== "cancelado");

    // Helper to parse HH:mm to minutes from midnight
    const parseTime = (timeStr: string) => {
      const [h, m] = timeStr.split(":").map(Number);
      return h * 60 + m;
    };
    
    // Helper to format minutes to HH:mm
    const formatTime = (mins: number) => {
      const h = Math.floor(mins / 60).toString().padStart(2, "0");
      const m = (mins % 60).toString().padStart(2, "0");
      return `${h}:${m}`;
    };

    let availableBlocks: number[] = [];
    const INTERVAL = 30; // Check every 30 minutes

    for (const schedule of daySchedules) {
      const startMins = parseTime(schedule.startTime);
      const endMins = parseTime(schedule.endTime);

      for (let time = startMins; time + duration <= endMins; time += INTERVAL) {
        // Check if [time, time + duration] overlaps with any existing appointment
        const hasOverlap = dayAppointments.some(app => {
          const appStart = parseTime(app.time);
          const appEnd = appStart + app.duration;
          // Overlap condition:
          // A overlaps B if A.start < B.end AND A.end > B.start
          return time < appEnd && (time + duration) > appStart;
        });

        if (!hasOverlap) {
          availableBlocks.push(time);
        }
      }
    }

    // Convert minutes back to HH:mm
    const availableTimes = [...new Set(availableBlocks)].sort((a, b) => a - b).map(formatTime);

    return res.json({ availableTimes });
  } catch (error) {
    logger.error({ error }, "Error fetching availability");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── CLIENT PORTAL ─────────────────────────────────────────

router.get("/client/:phone", async (req, res) => {
  try {
    const { phone } = req.params as { phone: string };
    if (!phone) return res.status(400).json({ error: "Phone number required" });

    // Find client
    const [client] = await db.select().from(clients).where(eq(clients.phone, phone)).limit(1);
    if (!client) {
      return res.json([]); // No client found, no appointments
    }

    // Fetch upcoming appointments
    const allApps = await db
      .select({
        id: appointments.id,
        date: appointments.date,
        time: appointments.time,
        status: appointments.status,
        serviceName: services.name,
        professionalName: professionals.name,
      })
      .from(appointments)
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .leftJoin(professionals, eq(appointments.professionalId, professionals.id))
      .where(eq(appointments.clientId, client.id));

    // Sort by date descending and filter only upcoming (agendado)
    const upcoming = allApps
      .filter(a => a.status === "agendado")
      .sort((a, b) => {
        const da = new Date(a.date + "T" + a.time);
        const db = new Date(b.date + "T" + b.time);
        return da.getTime() - db.getTime();
      });

    return res.json(upcoming);
  } catch (error) {
    logger.error({ error }, "Error fetching client appointments");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/cancel/:id", async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const [app] = await db.select().from(appointments).where(eq(appointments.id, id)).limit(1);
    
    if (!app) return res.status(404).json({ error: "Turno no encontrado" });
    if (app.status !== "agendado") return res.status(400).json({ error: "El turno ya no puede ser cancelado" });

    // Check 24 hour rule
    const appDate = new Date(app.date + "T" + app.time);
    const now = new Date();
    const hoursDiff = (appDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursDiff < 24) {
      return res.status(400).json({ error: "No podés cancelar turnos con menos de 24hs de anticipación." });
    }

    await db.update(appointments).set({ status: "cancelado" }).where(eq(appointments.id, id));
    
    // Optional: Send cancellation WhatsApp to professional/admin here

    return res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error canceling appointment");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
