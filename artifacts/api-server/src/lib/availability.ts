import { db, appointments, professional_schedules } from "@workspace/db";
import { eq } from "drizzle-orm";

function parseTime(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

export async function isTimeSlotAvailable(
  date: string,
  professionalId: string,
  duration: number,
  time: string,
  excludeAppointmentId?: string
): Promise<{ available: boolean; reason?: string }> {
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    return { available: false, reason: "Fecha inválida" };
  }

  const dayOfWeek = dateObj.getUTCDay();
  const schedules = await db
    .select()
    .from(professional_schedules)
    .where(eq(professional_schedules.professionalId, professionalId));

  const daySchedules = schedules.filter((s) => s.dayOfWeek === dayOfWeek);
  if (daySchedules.length === 0) {
    return { available: false, reason: "La profesional no trabaja ese día" };
  }

  const slotStart = parseTime(time);
  const slotEnd = slotStart + duration;

  const withinSchedule = daySchedules.some((s) => {
    const startMins = parseTime(s.startTime);
    const endMins = parseTime(s.endTime);
    return slotStart >= startMins && slotEnd <= endMins;
  });

  if (!withinSchedule) {
    return { available: false, reason: "Horario fuera del turno de la profesional" };
  }

  const existingAppointments = await db
    .select()
    .from(appointments)
    .where(eq(appointments.professionalId, professionalId));

  const dayAppointments = existingAppointments.filter(
    (a) => a.date === date && a.status !== "cancelado" && a.id !== excludeAppointmentId
  );

  const hasOverlap = dayAppointments.some((app) => {
    const appStart = parseTime(app.time);
    const appEnd = appStart + app.duration;
    return slotStart < appEnd && slotEnd > appStart;
  });

  if (hasOverlap) {
    return { available: false, reason: "Ya existe un turno en ese horario" };
  }

  return { available: true };
}
