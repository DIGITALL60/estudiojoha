import cron from "node-cron";
import { db, appointments, clients, services, professionals, vouchers } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { cloudSendText, cloudSendButtons } from "./whatsapp-cloud.js";
import { logger } from "./logger.js";
import { getBoolSetting, getSetting } from "./settings.js";

// Schedule: Runs every day at 10:00 AM (hora fija para todos los recordatorios)
const CRON_EXPRESSION = "0 10 * * *";

export function initCronJobs() {
  logger.info(`Starting cron jobs with schedule: ${CRON_EXPRESSION}`);

  cron.schedule(CRON_EXPRESSION, async () => {
    logger.info("Running daily appointment reminders job...");
    try {
      const reminderEnabled = await getBoolSetting("reminder_24h");
      if (!reminderEnabled) {
        logger.info("Reminder 24h disabled in settings, skipping.");
        return;
      }

      const whatsappEnabled = await getBoolSetting("whatsapp_notif");
      if (!whatsappEnabled) {
        logger.info("WhatsApp notifications disabled, skipping reminders.");
        return;
      }

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split("T")[0]; // YYYY-MM-DD

      // Fetch appointments for tomorrow that are 'agendado' and haven't had a reminder sent
      const upcomingAppointments = await db
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.date, tomorrowStr),
            eq(appointments.status, "agendado"),
            eq(appointments.reminderSent, false)
          )
        );

      logger.info(`Found ${upcomingAppointments.length} appointments to send reminders for.`);

      // Birthday auto-vouchers (if enabled)
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

          const code = `CUMPLE-${client.name.split(" ")[0].toUpperCase()}-15`;
          const [existing] = await db.select().from(vouchers).where(eq(vouchers.code, code)).limit(1);
          if (!existing) {
            await db.insert(vouchers).values({
              id: randomUUID(),
              code,
              discountType: "percent",
              discountValue: 15,
              isActive: true,
              createdAt: new Date(),
            });
            const waLink = await getSetting("whatsapp_link");
            await cloudSendText(
              client.phone,
              `🎂 ¡Feliz cumpleaños, ${client.name}! 🎂\n\nEn Estudio Joha Molinero te regalamos un *15% de descuento* en tu próxima visita 💜\n\nUsá el código: *${code}*\n\n📲 Reservar: ${waLink}\n\n¡Te esperamos para celebrarlo! 🥂`
            );
          }
        }
      }

      for (const app of upcomingAppointments) {
        try {
          const [client] = await db.select().from(clients).where(eq(clients.id, app.clientId)).limit(1);
          const [service] = await db.select().from(services).where(eq(services.id, app.serviceId)).limit(1);
          const [prof] = await db.select().from(professionals).where(eq(professionals.id, app.professionalId)).limit(1);

          if (client && client.phone && service && prof) {
            const [d, m, y] = app.date.split("-");
            const dateDisplay = `${d}/${m}/${y}`;

            // Send reminder with confirm/cancel buttons
            try {
              await cloudSendButtons(
                client.phone,
                `¡Hola ${client.name}! 👋\n\nTe recordamos que mañana tenés turno en *Estudio Joha Molinero* 💅\n\n📅 ${dateDisplay} a las *${app.time}hs*\n💅 Servicio: ${service.name}\n👩‍🎨 Profesional: ${prof.name}\n\n¿Podés confirmar tu asistencia?`,
                [
                  { id: "reminder_confirm", title: "✅ Confirmo" },
                  { id: "reminder_cancel", title: "❌ No puedo ir" },
                ]
              );
            } catch {
              // Fallback to plain text if buttons fail
              await cloudSendText(
                client.phone,
                `¡Hola ${client.name}! 👋\n\nTe recordamos que mañana tenés turno en *Estudio Joha Molinero* 💅\n\n📅 ${dateDisplay} a las *${app.time}hs*\n💅 Servicio: ${service.name}\n👩‍🎨 Profesional: ${prof.name}\n\nResponde *SI* para confirmar o *NO* para cancelar/reprogramar.\n¡Te esperamos! 💜`
              );
            }

            // Mark as sent so it doesn't send again
            await db.update(appointments).set({ reminderSent: true }).where(eq(appointments.id, app.id));
            logger.info(`Sent reminder to ${client.phone} for appointment ${app.id}`);
          }
        } catch (err) {
          logger.error({ err, appointmentId: app.id }, "Failed to send reminder to client");
        }
      }
    } catch (err) {
      logger.error({ err }, "Error running daily appointment reminders job");
    }
  });
}
