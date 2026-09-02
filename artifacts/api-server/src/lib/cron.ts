import cron from "node-cron";
import { db, appointments, clients, services, professionals, vouchers } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { cloudSendTemplate } from "./whatsapp-cloud.js";
import { logger } from "./logger.js";
import { getBoolSetting } from "./settings.js";

// Cron: cada dia a las 10:00 para recordatorio 24hs
const CRON_24H = "0 10 * * *";
// Cron: cada 30 minutos para recordatorio 2hs
const CRON_2H = "*/30 * * * *";

export function initCronJobs() {
  logger.info(`Starting cron jobs — 24h: ${CRON_24H} | 2h: ${CRON_2H}`);

  // ─── 24-hour reminder ─────────────────────────────────────────────────────
  cron.schedule(CRON_24H, async () => {
    logger.info("Running daily 24h appointment reminders job...");
    try {
      const reminderEnabled = await getBoolSetting("reminder_24h");
      if (!reminderEnabled) { logger.info("Reminder 24h disabled, skipping."); return; }

      const whatsappEnabled = await getBoolSetting("whatsapp_notif");
      if (!whatsappEnabled) { logger.info("WhatsApp notifications disabled, skipping."); return; }

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split("T")[0];

      const upcomingAppointments = await db
        .select()
        .from(appointments)
        .where(and(
          eq(appointments.date, tomorrowStr),
          eq(appointments.status, "agendado"),
          eq(appointments.reminderSent, false)
        ));

      logger.info(`Found ${upcomingAppointments.length} appointments to send 24h reminders for.`);

      // ── Vouchers de cumpleaños ─────────────────────────────────────────────
      const birthdayAuto = await getBoolSetting("birthday_auto");
      if (birthdayAuto) {
        const today = new Date();
        const todayMMDD = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        const allClients = await db.select().from(clients);

        for (const client of allClients) {
          if (!client.birthday || !client.phone) continue;
          const parts = client.birthday.includes("-") ? client.birthday.split("-") : client.birthday.split("/");
          const mmdd = parts.length === 3
            ? `${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`
            : client.birthday.slice(5);
          if (mmdd !== todayMMDD) continue;

          const firstName = client.name.split(" ")[0].toUpperCase();
          const code = `CUMPLE-${firstName}-15`;
          const [existing] = await db.select().from(vouchers).where(eq(vouchers.code, code)).limit(1);
          if (existing) continue; // ya se envió este año

          // Vence en 30 días, solo para este cliente
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 30);
          const [dbClient] = await db.select().from(clients).where(eq(clients.phone, client.phone)).limit(1);

          await db.insert(vouchers).values({
            id: randomUUID(),
            code,
            discountType: "percent",
            discountValue: 15,
            isActive: true,
            clientId: dbClient?.id ?? null,
            expiresAt,
            createdAt: new Date(),
          });

          // Plantilla: {{1}} nombre, {{2}} porcentaje, {{3}} código
          const sent = await cloudSendTemplate(client.phone, "voucher_cumple", "es", [
            client.name.split(" ")[0],
            "15",
            code,
          ]);
          if (!sent) {
            logger.warn(`Failed to send birthday voucher template to ${client.phone}.`);
          }
        }
      }

      // ── Enviar recordatorios 24hs ──────────────────────────────────────────
      for (const app of upcomingAppointments) {
        try {
          const [client] = await db.select().from(clients).where(eq(clients.id, app.clientId)).limit(1);
          const [service] = await db.select().from(services).where(eq(services.id, app.serviceId)).limit(1);
          const [prof] = await db.select().from(professionals).where(eq(professionals.id, app.professionalId)).limit(1);

          if (client && client.phone && service && prof) {
            const [d, m, y] = app.date.split("-");
            const dateDisplay = `${d}/${m}/${y}`;

            const sent = await cloudSendTemplate(client.phone, "recordatorio_turno", "en", [
              client.name,
              dateDisplay,
              app.time,
              service.name,
              prof.name,
            ]);

            if (!sent) {
              logger.warn(`Failed to send 24h reminder template to ${client.phone}.`);
            }

            await db.update(appointments).set({ reminderSent: true }).where(eq(appointments.id, app.id));
            logger.info(`Sent 24h reminder to ${client.phone} for appointment ${app.id}`);
          }
        } catch (err) {
          logger.error({ err, appointmentId: app.id }, "Failed to send 24h reminder to client");
        }
      }
    } catch (err) {
      logger.error({ err }, "Error running 24h appointment reminders job");
    }
  });

  // ─── 2-hour reminder ──────────────────────────────────────────────────────
  cron.schedule(CRON_2H, async () => {
    try {
      const reminder2hEnabled = await getBoolSetting("reminder_2h");
      if (!reminder2hEnabled) return;

      const whatsappEnabled = await getBoolSetting("whatsapp_notif");
      if (!whatsappEnabled) return;

      // Hora actual en Argentina
      const nowArgDate = new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
      const nowArgTime = new Date().toLocaleTimeString("en-GB", {
        timeZone: "America/Argentina/Buenos_Aires",
        hour: "2-digit",
        minute: "2-digit",
      });

      const [nowH, nowM] = nowArgTime.split(":").map(Number);
      const nowMins = nowH * 60 + nowM;
      // Ventana: turnos que empiezan entre 1h50m y 2h10m desde ahora
      const windowStart = nowMins + 110;
      const windowEnd = nowMins + 130;

      const todayApps = await db
        .select()
        .from(appointments)
        .where(and(
          eq(appointments.date, nowArgDate),
          eq(appointments.status, "agendado"),
          eq(appointments.reminder2hSent, false)
        ));

      for (const app of todayApps) {
        const [appH, appM] = app.time.split(":").map(Number);
        const appMins = appH * 60 + appM;
        if (appMins < windowStart || appMins > windowEnd) continue;

        try {
          const [client] = await db.select().from(clients).where(eq(clients.id, app.clientId)).limit(1);
          const [service] = await db.select().from(services).where(eq(services.id, app.serviceId)).limit(1);
          const [prof] = await db.select().from(professionals).where(eq(professionals.id, app.professionalId)).limit(1);

          if (client && client.phone && service && prof) {
            // Plantilla: {{1}} nombre, {{2}} hora, {{3}} servicio, {{4}} profesional
            const sent = await cloudSendTemplate(client.phone, "recordatorio_2h", "es", [
              client.name.split(" ")[0],
              app.time,
              service.name,
              prof.name,
            ]);

            if (sent) {
              await db.update(appointments).set({ reminder2hSent: true } as any).where(eq(appointments.id, app.id));
              logger.info(`Sent 2h reminder to ${client.phone} for appointment ${app.id}`);
            } else {
              logger.warn(`Failed to send 2h reminder template to ${client.phone}.`);
            }
          }
        } catch (err) {
          logger.error({ err, appointmentId: app.id }, "Failed to send 2h reminder to client");
        }
      }
    } catch (err) {
      logger.error({ err }, "Error running 2h appointment reminders job");
    }
  });
}
