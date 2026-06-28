import cron from "node-cron";
import { db, appointments, clients, services, professionals } from "@workspace/db";
import { eq, and, gt, lt } from "drizzle-orm";
import { sendWhatsAppMessage } from "./whatsapp.js";
import { logger } from "./logger.js";

// Schedule: Runs every day at 18:00 (6:00 PM)
// The user asked for it to run at 18:00 hs
const CRON_EXPRESSION = "0 18 * * *";

export function initCronJobs() {
  logger.info(`Starting cron jobs with schedule: ${CRON_EXPRESSION}`);

  cron.schedule(CRON_EXPRESSION, async () => {
    logger.info("Running daily appointment reminders job...");
    try {
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

      for (const app of upcomingAppointments) {
        try {
          const [client] = await db.select().from(clients).where(eq(clients.id, app.clientId)).limit(1);
          const [service] = await db.select().from(services).where(eq(services.id, app.serviceId)).limit(1);
          const [prof] = await db.select().from(professionals).where(eq(professionals.id, app.professionalId)).limit(1);

          if (client && client.phone && service && prof) {
            const msg = 
              `¡Hola ${client.name}! 👋\n\n` +
              `Te recordamos que mañana a las *${app.time}hs* tenés turno en *Estudio Joha Molinero* 💅\n\n` +
              `Servicio: ${service.name}\n` +
              `Profesional: ${prof.name}\n\n` +
              `Por favor, si no podés asistir, avisanos para liberar el lugar.\n¡Te esperamos! 💜`;

            await sendWhatsAppMessage(client.phone, msg);

            // Mark as sent
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
