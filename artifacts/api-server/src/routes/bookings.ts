import { Router } from "express";
import { db, clients, appointments, professionals, services, professional_schedules, vouchers } from "@workspace/db";
import { eq } from "drizzle-orm";
import { cloudSendText } from "../lib/whatsapp-cloud.js";
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

    const serviceIds = appointment.serviceIds || (appointment.serviceId ? [appointment.serviceId] : []);
    if (!serviceIds.length) {
      return res.status(400).json({ error: "No se seleccionaron servicios" });
    }

    // Fetch the services from DB
    const selectedServicesDB = [];
    for (const sId of serviceIds) {
      const [srv] = await db.select().from(services).where(eq(services.id, sId)).limit(1);
      if (srv) selectedServicesDB.push(srv);
    }
    if (selectedServicesDB.length === 0) {
      return res.status(400).json({ error: "Servicios no encontrados" });
    }

    const totalDuration = selectedServicesDB.reduce((acc, s) => acc + s.duration, 0);

    const availability = await isTimeSlotAvailable(
      appointment.date,
      appointment.professionalId,
      totalDuration,
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

    // 2. Create appointments
    let finalNotes = appointment.notes || "";
    if (appointment.voucherCode) {
      finalNotes = finalNotes
        ? `${finalNotes}\n(Voucher usado: ${appointment.voucherCode})`
        : `(Voucher usado: ${appointment.voucherCode})`;
    }

    const addMinutes = (timeStr: string, minutes: number) => {
      const [h, m] = timeStr.split(":").map(Number);
      const total = h * 60 + m + minutes;
      return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
    };

    let currentStartTime = appointment.time;
    const appointmentIds = [];
    const serviceNames = [];
    let remainingPrice = appointment.price;

    for (let i = 0; i < selectedServicesDB.length; i++) {
      const srv = selectedServicesDB[i];
      const appId = randomUUID();
      appointmentIds.push(appId);
      serviceNames.push(srv.name);
      
      let priceForThisService = srv.price;
      if (i === selectedServicesDB.length - 1) {
         priceForThisService = remainingPrice;
      } else {
         priceForThisService = Math.min(priceForThisService, remainingPrice);
         remainingPrice -= priceForThisService;
      }

      db.insert(appointments).values({
        id: appId,
        clientId,
        professionalId: appointment.professionalId,
        serviceId: srv.id,
        date: appointment.date,
        time: currentStartTime,
        duration: srv.duration,
        price: Math.max(0, priceForThisService),
        status: "agendado",
        notes: finalNotes || null,
        createdAt: new Date(),
      }).run();
      
      currentStartTime = addMinutes(currentStartTime, srv.duration);
    }

    // 3. Deactivate voucher if used
    if (appointment.voucherCode) {
      db.update(vouchers)
        .set({ isActive: false })
        .where(eq(vouchers.code, appointment.voucherCode.toUpperCase()))
        .run();
    }

    // 4. Fetch details for messages
    const [prof] = await db.select().from(professionals).where(eq(professionals.id, appointment.professionalId)).limit(1);
    const allProfessionals = await db.select().from(professionals);
    const admin = allProfessionals.find(p => p.role?.toLowerCase() === "admin");

    const professionalName = prof?.name ?? "el profesional";
    const servicesListString = serviceNames.join(", ");
    const businessAddress = await getSetting("business_address", "Río Segundo, Córdoba");
    const whatsappEnabled = await getBoolSetting("whatsapp_notif");

    // 5. Send WhatsApp Notifications (Non-blocking)
    const clientMsg =
      `¡Hola ${client.name}! 👋\n\n` +
      `Tu turno en *Estudio Joha Molinero* está confirmado ✅\n\n` +
      `📅 Fecha: *${appointment.date}*\n` +
      `⏰ Hora: *${appointment.time}*\n` +
      `💅 Servicio/s: ${servicesListString}\n` +
      `👩‍🎨 Profesional: ${professionalName}\n\n` +
      `📍 ${businessAddress}\n\n` +
      `Si necesitás reprogramar, avisanos con al menos 24hs de anticipación.\n¡Gracias por elegirnos! 💜`;

    const profMsg =
      `🔔 *Nuevo turno asignado*\n\n` +
      `👤 Cliente: ${client.name}\n` +
      `📱 Teléfono: ${client.phone}\n` +
      `📅 Fecha: ${appointment.date}\n` +
      `⏰ Hora de inicio: ${appointment.time}\n` +
      `💅 Servicio/s: ${servicesListString}`;

    const adminMsg =
      `🆕 *Nuevo turno reservado* (web)\n\n` +
      `👤 Cliente: ${client.name} — ${client.phone}\n` +
      `📅 Fecha: ${appointment.date} a las ${appointment.time}\n` +
      `💅 Servicio/s: ${servicesListString}\n` +
      `👩‍🎨 A cargo de: ${professionalName}`;

    if (whatsappEnabled) {
      Promise.all([
      cloudSendText(client.phone, clientMsg),
      prof?.phone && prof.phone !== admin?.phone ? cloudSendText(prof.phone, profMsg) : Promise.resolve(),
      admin?.phone ? cloudSendText(admin.phone, adminMsg) : Promise.resolve()
    ]).catch(err => {
      logger.error({ err }, "Error sending WhatsApp notifications");
      });
    }

    return res.json({ success: true, appointmentId: appointmentIds[0] });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error({ error, errMsg }, "Error processing booking");
    return res.status(500).json({ error: `Error al procesar la reserva: ${errMsg}` });
  }
});

// GET upsell suggestion — disponibilidad real para servicio complementario
router.get("/upsell-suggestion", async (req, res) => {
  try {
    const { date, professionalId, endTime, bookedCategories } = req.query;

    if (!date || !professionalId || !endTime) {
      return res.status(400).json({ suggestion: null });
    }

    const excludedCats = String(bookedCategories || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    // Buscar servicios cortos (<=30 min) de otras categorías con precio
    const allServices = db.select().from(services).all();
    const candidates = allServices.filter(
      (s) =>
        s.price > 0 &&
        s.duration <= 30 &&
        !excludedCats.includes(s.category)
    );

    if (candidates.length === 0) {
      return res.json({ suggestion: null });
    }

    // Mezclar para no mostrar siempre el mismo
    const shuffled = candidates.sort(() => Math.random() - 0.5);

    // Verificar disponibilidad real para cada candidato en el horario endTime
    for (const svc of shuffled) {
      const avail = await isTimeSlotAvailable(
        String(date),
        String(professionalId),
        svc.duration,
        String(endTime)
      );

      if (avail.available) {
        return res.json({
          suggestion: {
            service: svc,
            time: String(endTime),
            date: String(date),
          },
        });
      }
    }

    return res.json({ suggestion: null });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error({ error, errMsg }, "Error fetching upsell suggestion");
    return res.json({ suggestion: null });
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
