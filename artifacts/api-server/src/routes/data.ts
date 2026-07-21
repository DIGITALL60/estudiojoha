import { Router } from "express";
import { db, professionals, services, clients, appointments, professional_schedules, professional_services, products, service_products, expenses, app_settings, blocked_dates } from "@workspace/db";

import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { cloudSendText } from "../lib/whatsapp-cloud.js";
import { logger } from "../lib/logger.js";
import { requireAuth } from "../middlewares/auth.js";
import { getAllSettings, upsertSettings, getBoolSetting, getSetting } from "../lib/settings.js";
import { isTimeSlotAvailable } from "../lib/availability.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../lib/cloudinary.js";

const router = Router();

// ─── UPLOAD IMAGE ───────────────────────────────────────────────────────────
router.post("/upload", requireAuth, async (req, res) => {
  try {
    const { image, folder } = req.body as { image: string; folder?: string };
    if (!image) return res.status(400).json({ error: "No image provided" });

    const cloudEnabled = !!(process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME);
    if (!cloudEnabled) {
      // Cloudinary not configured — return the base64 as-is (fallback)
      return res.json({ url: image });
    }

    const url = await uploadToCloudinary(image, folder ?? "estudiojoha/services");
    return res.json({ url });
  } catch (err) {
    logger.error({ err }, "Error uploading image to Cloudinary");
    return res.status(500).json({ error: "Failed to upload image" });
  }
});

// ─── DELETE IMAGE ────────────────────────────────────────────────────────────
router.delete("/upload", requireAuth, async (req, res) => {
  try {
    const { url } = req.body as { url: string };
    if (url && url.includes("cloudinary.com")) {
      await deleteFromCloudinary(url);
    }
    return res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Error deleting image from Cloudinary");
    return res.status(500).json({ error: "Failed to delete image" });
  }
});


const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DAY_NAMES_FULL = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function summarizeBusinessHours(schedules: { dayOfWeek: number; startTime: string; endTime: string }[]) {
  if (schedules.length === 0) {
    return {
      openDaysLabel: "Martes a Sábado",
      hoursLabel: "10:00 — 20:00 hs",
      closedLabel: "Dom y Lun: Cerrado",
    };
  }

  const byDay: Record<number, { starts: string[]; ends: string[] }> = {};
  for (const s of schedules) {
    if (!byDay[s.dayOfWeek]) byDay[s.dayOfWeek] = { starts: [], ends: [] };
    byDay[s.dayOfWeek].starts.push(s.startTime);
    byDay[s.dayOfWeek].ends.push(s.endTime);
  }

  const openDays = Object.keys(byDay).map(Number).sort((a, b) => a - b);
  const closedDays = [0, 1, 2, 3, 4, 5, 6].filter(d => !openDays.includes(d));

  const earliest = schedules.reduce((min, s) => (s.startTime < min ? s.startTime : min), schedules[0].startTime);
  const latest = schedules.reduce((max, s) => (s.endTime > max ? s.endTime : max), schedules[0].endTime);

  const formatRange = (days: number[]) => {
    if (days.length === 0) return "";
    if (days.length === 1) return DAY_NAMES_FULL[days[0]];
    if (days.length === 7) return "Todos los días";
    const consecutive = days.every((d, i) => i === 0 || d === days[i - 1] + 1);
    if (consecutive && days.length > 1) {
      return `${DAY_NAMES_FULL[days[0]]} a ${DAY_NAMES_FULL[days[days.length - 1]]}`;
    }
    return days.map(d => DAY_NAMES[d]).join(", ");
  };

  return {
    openDaysLabel: formatRange(openDays),
    hoursLabel: `${earliest} — ${latest} hs`,
    closedLabel: closedDays.length > 0 ? `${formatRange(closedDays)}: Cerrado` : "",
  };
}

// Public info for landing + booking wizard
router.get("/public-info", async (_req, res) => {
  try {
    const settings = await getAllSettings();
    const schedules = await db.select().from(professional_schedules);
    const hours = summarizeBusinessHours(schedules);

    res.json({
      settings: {
        business_name: settings.business_name,
        business_email: settings.business_email,
        business_phone: settings.business_phone,
        business_address: settings.business_address,
        business_instagram: settings.business_instagram,
        whatsapp_link: settings.whatsapp_link,
        carousel_images: settings.carousel_images ? JSON.parse(settings.carousel_images) : [],
      },
      hours,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch public info" });
  }
});

// ─── SERVICES ─────────────────────────────────────────────
router.get("/services", async (req, res) => {
  try {
    const data = await db.select().from(services);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch services" });
  }
});

// ─── REPORTS ──────────────────────────────────────────────
router.get("/reports/services-30d", async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateString = thirtyDaysAgo.toISOString().split("T")[0]; // YYYY-MM-DD

    // Fetch all completed appointments from the last 30 days
    // Note: Drizzle ORM string comparison works correctly for YYYY-MM-DD dates
    const apps = await db.select().from(appointments).where(eq(appointments.status, "completado"));
    
    // Filter in memory to ensure date correctness (simple approach)
    const recentApps = apps.filter(a => a.date >= dateString);

    let totalRevenue = 0;
    const serviceStats: Record<string, { revenue: number, sales: number }> = {};

    for (const app of recentApps) {
      totalRevenue += app.price;
      
      if (!serviceStats[app.serviceId]) {
        serviceStats[app.serviceId] = { revenue: 0, sales: 0 };
      }
      serviceStats[app.serviceId].revenue += app.price;
      serviceStats[app.serviceId].sales += 1;
    }

    const paidSales = recentApps.length;
    const averageTicket = paidSales > 0 ? Math.round(totalRevenue / paidSales) : 0;

    res.json({
      totalRevenue,
      paidSales,
      averageTicket,
      serviceStats
    });
  } catch (err) {
    logger.error({ err }, "Error generating service reports");
    res.status(500).json({ error: "Failed to generate reports" });
  }
});

router.post("/services", requireAuth, async (req, res) => {
  try {
    const { name, category, duration, price, cod, recipes, imageUrl } = req.body;
    if (!name || !category) return res.status(400).json({ error: "Name and category required" });
    const id = randomUUID();
    await db.insert(services).values({
      id, name, category,
      duration: Number(duration),
      price: Number(price),
      cod,
      imageUrl,
    });
    
    // Handle recipes
    if (recipes && Array.isArray(recipes)) {
      for (const recipe of recipes) {
        await db.insert(service_products).values({
          id: randomUUID(),
          serviceId: id,
          productId: recipe.productId,
          amount: Number(recipe.amount)
        });
      }
    }

    const [created] = await db.select().from(services).where(eq(services.id, id)).limit(1);
    return res.status(201).json(created);
  } catch (err) {
    return res.status(500).json({ error: "Failed to create service" });
  }
});

router.patch("/services/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const { name, category, duration, price, cod, recipes, imageUrl } = req.body;
    await db.update(services).set({
      name, category, duration: Number(duration), price: Number(price), cod, imageUrl
    }).where(eq(services.id, id));

    // Only update recipes when explicitly sent (prevents accidental wipe on edit)
    if (recipes !== undefined && Array.isArray(recipes)) {
      await db.delete(service_products).where(eq(service_products.serviceId, id));
      for (const recipe of recipes) {
        await db.insert(service_products).values({
          id: randomUUID(),
          serviceId: id,
          productId: recipe.productId,
          amount: Number(recipe.amount)
        });
      }
    }

    const [updated] = await db.select().from(services).where(eq(services.id, id)).limit(1);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update service" });
  }
});

router.delete("/services/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    await db.delete(services).where(eq(services.id, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete service" });
  }
});

// ─── PROFESSIONALS ─────────────────────────────────────────
router.get("/professionals", async (req, res) => {
  try {
    const data = await db.select().from(professionals);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch professionals" });
  }
});

router.post("/professionals", requireAuth, async (req, res) => {
  try {
    const { name, role, username, email, phone, password, color, initial, commissionRate, baseSalary, salesTarget } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    const id = randomUUID();
    await db.insert(professionals).values({
      id, name, role: role || "Staff", username, email, phone, password,
      color: color || "#7c3aed", initial,
      commissionRate: commissionRate !== undefined ? Number(commissionRate) : 0,
      baseSalary: baseSalary !== undefined ? Number(baseSalary) : 0,
      salesTarget: salesTarget !== undefined ? Number(salesTarget) : 0
    });
    const [created] = await db.select().from(professionals).where(eq(professionals.id, id)).limit(1);
    return res.status(201).json(created);
  } catch (err) {
    return res.status(500).json({ error: "Failed to create professional" });
  }
});

router.patch("/professionals/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const { name, role, username, email, phone, password, color, initial, commissionRate, baseSalary, salesTarget } = req.body;
    const updateData: any = { name, role, username, email, phone, color, initial };
    if (password !== undefined && password !== "") {
      updateData.password = password;
    }
    if (commissionRate !== undefined) {
      updateData.commissionRate = Number(commissionRate);
    }
    if (baseSalary !== undefined) {
      updateData.baseSalary = Number(baseSalary);
    }
    if (salesTarget !== undefined) {
      updateData.salesTarget = Number(salesTarget);
    }
    await db.update(professionals).set(updateData).where(eq(professionals.id, id));
    const [updated] = await db.select().from(professionals).where(eq(professionals.id, id)).limit(1);
    if (!updated) return res.status(404).json({ error: "Not found" });
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: "Failed to update professional" });
  }
});

router.delete("/professionals/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    // Delete all dependent records first (SQLite has no ON DELETE CASCADE for these)
    await db.delete(professional_services).where(eq(professional_services.professionalId, id));
    await db.delete(professional_schedules).where(eq(professional_schedules.professionalId, id));
    await db.delete(professionals).where(eq(professionals.id, id));
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Failed to delete professional");
    res.status(500).json({ error: "Failed to delete professional" });
  }
});

// ─── CLIENTS ─────────────────────────────────────────────────────────────────
router.get("/clients", requireAuth, async (req, res) => {
  try {
    const data = await db.select().from(clients);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch clients" });
  }
});

router.post("/clients", requireAuth, async (req, res) => {
  try {
    const { name, phone, email, birthday, notes } = req.body;
    if (!name || !phone) return res.status(400).json({ error: "name and phone are required" });

    const id = randomUUID();
    await db.insert(clients).values({ id, name, phone, email, birthday, notes, createdAt: new Date() });
    const [created] = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
    return res.status(201).json(created);
  } catch (err) {
    return res.status(500).json({ error: "Failed to create client" });
  }
});

router.patch("/clients/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const { name, phone, email, birthday, notes } = req.body;
    await db.update(clients).set({ name, phone, email, birthday, notes }).where(eq(clients.id, id));
    const [updated] = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update client" });
  }
});

router.delete("/clients/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    await db.delete(clients).where(eq(clients.id, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete client" });
  }
});

// ─── APPOINTMENTS ──────────────────────────────────────────
router.get("/appointments", requireAuth, async (req, res) => {
  try {
    // Join with client, professional, service info
    const rows = await db
      .select({
        id: appointments.id,
        date: appointments.date,
        time: appointments.time,
        duration: appointments.duration,
        price: appointments.price,
        status: appointments.status,
        paymentMethod: appointments.paymentMethod,
        notes: appointments.notes,
        shopSales: appointments.shopSales,
        clientId: appointments.clientId,
        professionalId: appointments.professionalId,
        serviceId: appointments.serviceId,
        clientName: clients.name,
        clientPhone: clients.phone,
        clientNotes: clients.notes,
        professionalName: professionals.name,
        professionalColor: professionals.color,
        serviceName: services.name,
      })
      .from(appointments)
      .leftJoin(clients, eq(appointments.clientId, clients.id))
      .leftJoin(professionals, eq(appointments.professionalId, professionals.id))
      .leftJoin(services, eq(appointments.serviceId, services.id));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch appointments" });
  }
});

router.post("/appointments", requireAuth, async (req, res) => {
  try {
    const { clientId, professionalId, serviceId, date, time, duration, price, status, notes } = req.body;
    const dur = Number(duration);

    const availability = await isTimeSlotAvailable(date, professionalId, dur, time);
    if (!availability.available) {
      return res.status(409).json({ error: availability.reason || "Horario no disponible" });
    }

    const id = randomUUID();
    await db.insert(appointments).values({
      id, clientId, professionalId, serviceId,
      date, time,
      duration: Number(duration),
      price: Number(price),
      status: status ?? "agendado",
      notes,
      shopSales: req.body.shopSales ? Number(req.body.shopSales) : 0,
      createdAt: new Date(),
    });
    const [created] = await db.select().from(appointments).where(eq(appointments.id, id)).limit(1);

    // Fetch details for WhatsApp notification
    try {
      const [client] = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
      const [prof] = await db.select().from(professionals).where(eq(professionals.id, professionalId)).limit(1);
      const [srv] = await db.select().from(services).where(eq(services.id, serviceId)).limit(1);
      
      const allProfessionals = await db.select().from(professionals);
      const admin = allProfessionals.find(p => p.role.toLowerCase() === "admin");
      const whatsappEnabled = await getBoolSetting("whatsapp_notif");
      const businessAddress = await getSetting("business_address", "Río Segundo, Córdoba");

      if (client && prof && srv && whatsappEnabled) {
        const clientMsg =
          `¡Hola ${client.name}! 👋\n\n` +
          `Tu turno en *Estudio Joha Molinero* está confirmado ✅\n\n` +
          `📅 Fecha: *${date}*\n` +
          `⏰ Hora: *${time}*\n` +
          `💅 Servicio: ${srv.name}\n` +
          `👩‍🎨 Profesional: ${prof.name}\n\n` +
          `📍 ${businessAddress}\n\n` +
          `Si necesitás cancelar o reprogramar, avisanos con anticipación.\n¡Gracias por elegirnos! 💜`;
        await cloudSendText(client.phone, clientMsg);

        if (prof.phone && prof.phone !== admin?.phone) {
          const profMsg =
            `🔔 *Nuevo turno asignado (manual)*\n\n` +
            `👤 Cliente: ${client.name}\n` +
            `📱 Teléfono: ${client.phone}\n` +
            `📅 Fecha: ${date}\n` +
            `⏰ Hora: ${time}\n` +
            `💅 Servicio: ${srv.name}`;
          await cloudSendText(prof.phone, profMsg);
        }

        if (admin?.phone) {
          const adminMsg =
            `🆕 *Nuevo turno cargado en agenda*\n\n` +
            `👤 Cliente: ${client.name} — ${client.phone}\n` +
            `📅 Fecha: ${date} a las ${time}\n` +
            `💅 Servicio: ${srv.name}\n` +
            `👩‍🎨 A cargo de: ${prof.name}`;
          await cloudSendText(admin.phone, adminMsg);
        }
      }
    } catch (msgErr) {
      logger.error({ msgErr }, "Error sending WhatsApp notifications for manual appointment");
    }

    return res.status(201).json(created);
  } catch (err) {
    return res.status(500).json({ error: "Failed to create appointment" });
  }
});

router.patch("/appointments/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const { status, notes, price, paymentMethod } = req.body;

    const [current] = await db.select().from(appointments).where(eq(appointments.id, id));
    if (!current) return res.status(404).json({ error: "Appointment not found" });

    // Handle stock deduction / refund
    if (status !== undefined && current.status !== status) {
      const isCompleting = status === "completado";
      const isReverting = current.status === "completado" && status !== "completado";

      if (isCompleting || isReverting) {
        // Find products for this service
        const recipes = await db.select().from(service_products).where(eq(service_products.serviceId, current.serviceId));
        
        for (const recipe of recipes) {
          const [product] = await db.select().from(products).where(eq(products.id, recipe.productId));
          if (product) {
            const newStock = isCompleting 
              ? product.stock - recipe.amount 
              : product.stock + recipe.amount;
              
            await db.update(products).set({ stock: newStock }).where(eq(products.id, product.id));
          }
        }

        // Handle shop sales stock deduction / refund by parsing notes
        const parseShopSales = (notesStr: string | null) => {
          if (!notesStr) return [];
          const match = notesStr.match(/\[SHOP_SALES\](.*?)\[\/SHOP_SALES\]/);
          if (match) {
            try { return JSON.parse(match[1]); } catch(e) { return []; }
          }
          return [];
        };

        const oldShopSales = parseShopSales(current.notes);
        const newShopSales = parseShopSales(notes);

        if (isCompleting) {
          // Deduct stock for newShopSales
          for (const item of newShopSales) {
            const [product] = await db.select().from(products).where(eq(products.id, item.id));
            if (product) {
              await db.update(products).set({ stock: product.stock - item.qty }).where(eq(products.id, product.id));
            }
          }
        } else if (isReverting) {
          // Refund stock for oldShopSales
          for (const item of oldShopSales) {
            const [product] = await db.select().from(products).where(eq(products.id, item.id));
            if (product) {
              await db.update(products).set({ stock: product.stock + item.qty }).where(eq(products.id, product.id));
            }
          }
        }
      }
    }

    await db.update(appointments).set({ 
      status, 
      notes, 
      price: price ? Number(price) : undefined,
      shopSales: req.body.shopSales !== undefined ? Number(req.body.shopSales) : undefined,
      paymentMethod: paymentMethod !== undefined ? paymentMethod : undefined
    }).where(eq(appointments.id, id));
    const [updated] = await db.select().from(appointments).where(eq(appointments.id, id)).limit(1);
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: "Failed to update appointment" });
  }
});

router.post("/appointments/:id/remind", requireAuth, async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const [app] = await db.select().from(appointments).where(eq(appointments.id, id)).limit(1);
    if (!app) return res.status(404).json({ error: "Appointment not found" });

    const [client] = await db.select().from(clients).where(eq(clients.id, app.clientId)).limit(1);
    const [prof] = await db.select().from(professionals).where(eq(professionals.id, app.professionalId)).limit(1);
    const [srv] = await db.select().from(services).where(eq(services.id, app.serviceId)).limit(1);
    
    if (!client || !client.phone) {
      return res.status(400).json({ error: "Client phone not found" });
    }

    const professionalName = prof?.name ?? "el profesional";
    const serviceName = srv?.name ?? "tu servicio";
    const [d, m, y] = app.date.split("-");
    const dateDisplay = `${d}/${m}/${y}`;

    // Try to send with interactive buttons first
    try {
      const { cloudSendButtons } = await import("../lib/whatsapp-cloud.js");
      await cloudSendButtons(
        client.phone,
        `¡Hola ${client.name}! 👋\n\nTe recordamos tu turno en *Estudio Joha Molinero* 💅\n\n📅 ${dateDisplay} a las *${app.time}hs*\n💅 Servicio: ${serviceName}\n👩‍🎨 Profesional: ${professionalName}\n\n¿Podés confirmar tu asistencia?`,
        [
          { id: "reminder_confirm", title: "✅ Confirmo" },
          { id: "reminder_cancel", title: "❌ No puedo ir" },
        ]
      );
    } catch {
      // Fallback to plain text
      const msg =
        `¡Hola ${client.name}! 👋\n\n` +
        `Te recordamos tu turno en *Estudio Joha Molinero* 💅\n\n` +
        `📅 ${dateDisplay} a las *${app.time}hs*\n` +
        `💅 Servicio: ${serviceName}\n` +
        `👩‍🎨 Profesional: ${professionalName}\n\n` +
        `Respondé *SI* para confirmar o *NO* para cancelar/reprogramar.\n¡Te esperamos! 💜`;
      await cloudSendText(client.phone, msg);
    }
    
    // Mark as reminded
    await db.update(appointments).set({ reminderSent: true }).where(eq(appointments.id, id));
    
    return res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Error sending manual reminder");
    return res.status(500).json({ error: "Failed to send reminder" });
  }
});



// ─── SCHEDULES ─────────────────────────────────────────────
router.get("/schedules", async (req, res) => {
  try {
    const data = await db.select().from(professional_schedules);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch schedules" });
  }
});

router.post("/schedules", requireAuth, async (req, res) => {
  try {
    const { professionalId, dayOfWeek, startTime, endTime } = req.body;
    if (!professionalId || dayOfWeek === undefined || !startTime || !endTime) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const id = randomUUID();
    await db.insert(professional_schedules).values({
      id, professionalId, dayOfWeek: Number(dayOfWeek), startTime, endTime
    });
    const [created] = await db.select().from(professional_schedules).where(eq(professional_schedules.id, id)).limit(1);
    return res.status(201).json(created);
  } catch (err) {
    return res.status(500).json({ error: "Failed to create schedule" });
  }
});

router.delete("/schedules/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    await db.delete(professional_schedules).where(eq(professional_schedules.id, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete schedule" });
  }
});

// ─── BLOCKED DATES ─────────────────────────────────────────────
router.get("/blocked-dates", async (req, res) => {
  try {
    const data = await db.select().from(blocked_dates);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch blocked dates" });
  }
});

router.post("/blocked-dates", requireAuth, async (req, res) => {
  try {
    const { professionalId, date, reason } = req.body;
    if (!professionalId || !date) {
      return res.status(400).json({ error: "professionalId and date are required" });
    }
    // Check if already blocked
    const existing = await db.select().from(blocked_dates)
      .where(eq(blocked_dates.professionalId, professionalId))
      .all?.() ?? await db.select().from(blocked_dates).where(eq(blocked_dates.professionalId, professionalId));
    const alreadyBlocked = (Array.isArray(existing) ? existing : []).find((b: any) => b.date === date);
    if (alreadyBlocked) {
      return res.status(409).json({ error: "Date already blocked" });
    }
    const id = randomUUID();
    await db.insert(blocked_dates).values({ id, professionalId, date, reason: reason || null });
    const [created] = await db.select().from(blocked_dates).where(eq(blocked_dates.id, id)).limit(1);
    return res.status(201).json(created);
  } catch (err) {
    logger.error({ err }, "Failed to create blocked date");
    return res.status(500).json({ error: "Failed to create blocked date" });
  }
});

router.delete("/blocked-dates/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    await db.delete(blocked_dates).where(eq(blocked_dates.id, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete blocked date" });
  }
});


// ─── PROFESSIONAL SERVICES ─────────────────────────────────
router.get("/professional-services", async (req, res) => {
  try {
    const data = await db.select().from(professional_services);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch professional services" });
  }
});

router.post("/professional-services", requireAuth, async (req, res) => {
  try {
    const { professionalId, serviceId } = req.body;
    if (!professionalId || !serviceId) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const id = randomUUID();
    await db.insert(professional_services).values({
      id, professionalId, serviceId
    });
    const [created] = await db.select().from(professional_services).where(eq(professional_services.id, id)).limit(1);
    return res.status(201).json(created);
  } catch (err) {
    return res.status(500).json({ error: "Failed to create professional service" });
  }
});

router.delete("/professional-services/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    await db.delete(professional_services).where(eq(professional_services.id, id as string));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete professional service" });
  }
});

// Sync all service assignments for a professional (replaces existing)
router.put("/professional-services/sync", requireAuth, async (req, res) => {
  try {
    const { professionalId, serviceIds } = req.body;
    if (!professionalId || !Array.isArray(serviceIds)) {
      return res.status(400).json({ error: "professionalId and serviceIds[] required" });
    }

    const existing = await db.select().from(professional_services).where(eq(professional_services.professionalId, professionalId));
    for (const row of existing) {
      await db.delete(professional_services).where(eq(professional_services.id, row.id));
    }

    for (const serviceId of serviceIds) {
      await db.insert(professional_services).values({
        id: randomUUID(),
        professionalId,
        serviceId,
      });
    }

    const updated = await db.select().from(professional_services).where(eq(professional_services.professionalId, professionalId));
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: "Failed to sync professional services" });
  }
});

// ─── APP SETTINGS ───────────────────────────────────────────
router.get("/settings", async (_req, res) => {
  try {
    const settings = await getAllSettings();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

router.patch("/settings", requireAuth, async (req, res) => {
  try {
    await upsertSettings(req.body);
    const settings = await getAllSettings();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: "Failed to update settings" });
  }
});

// ─── PRODUCTS (STOCK) ──────────────────────────────────────
router.get("/products", requireAuth, async (req, res) => {
  try {
    const data = await db.select().from(products);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

router.post("/products", requireAuth, async (req, res) => {
  try {
    const { name, category, stock, minStock, unit, price, services: linkedServices } = req.body;
    if (!name || !category || !unit) return res.status(400).json({ error: "Name, category and unit required" });
    const id = randomUUID();
    await db.insert(products).values({
      id, name, category,
      stock: Number(stock || 0),
      minStock: Number(minStock || 0),
      unit,
      price: Number(price || 0),
    });

    if (linkedServices && Array.isArray(linkedServices)) {
      for (const link of linkedServices) {
        await db.insert(service_products).values({
          id: randomUUID(),
          serviceId: link.serviceId,
          productId: id,
          amount: Number(link.amount || 1)
        });
      }
    }

    const [created] = await db.select().from(products).where(eq(products.id, id)).limit(1);
    return res.status(201).json(created);
  } catch (err) {
    return res.status(500).json({ error: "Failed to create product" });
  }
});

router.patch("/products/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const { name, category, stock, minStock, unit, price, services: linkedServices } = req.body;
    await db.update(products).set({
      name, category,
      stock: stock !== undefined ? Number(stock) : undefined,
      minStock: minStock !== undefined ? Number(minStock) : undefined,
      unit,
      price: price !== undefined ? Number(price) : undefined,
    }).where(eq(products.id, id as string));

    if (linkedServices && Array.isArray(linkedServices)) {
      await db.delete(service_products).where(eq(service_products.productId, id));
      for (const link of linkedServices) {
        await db.insert(service_products).values({
          id: randomUUID(),
          serviceId: link.serviceId,
          productId: id,
          amount: Number(link.amount || 1)
        });
      }
    }

    const [updated] = await db.select().from(products).where(eq(products.id, id as string)).limit(1);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update product" });
  }
});

router.delete("/products/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    await db.delete(products).where(eq(products.id, id as string));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete product" });
  }
});

// ─── SERVICE PRODUCTS (RECIPES) ────────────────────────────
router.get("/service-products", requireAuth, async (req, res) => {
  try {
    const data = await db.select().from(service_products);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch service products" });
  }
});

router.post("/service-products", requireAuth, async (req, res) => {
  try {
    const { serviceId, productId, amount } = req.body;
    if (!serviceId || !productId || amount === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const id = randomUUID();
    await db.insert(service_products).values({
      id, serviceId, productId, amount: Number(amount)
    });
    const [created] = await db.select().from(service_products).where(eq(service_products.id, id)).limit(1);
    return res.status(201).json(created);
  } catch (err) {
    return res.status(500).json({ error: "Failed to link product to service" });
  }
});

router.delete("/service-products/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    await db.delete(service_products).where(eq(service_products.id, id as string));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete service product link" });
  }
});

// ─── EXPENSES (CAJA - EGRESOS) ─────────────────────────────
router.get("/expenses", requireAuth, async (req, res) => {
  try {
    const data = await db.select().from(expenses);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch expenses" });
  }
});

router.post("/expenses", requireAuth, async (req, res) => {
  try {
    const { concept, amount, category, date, professionalId } = req.body;
    if (!concept || amount === undefined || !date) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const id = randomUUID();
    await db.insert(expenses).values({
      id, concept, amount: Number(amount), category, date, professionalId,
      createdAt: new Date(),
    });
    const [created] = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1);
    return res.status(201).json(created);
  } catch (err) {
    return res.status(500).json({ error: "Failed to create expense" });
  }
});

router.delete("/expenses/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    await db.delete(expenses).where(eq(expenses.id, id as string));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete expense" });
  }
});

export default router;
