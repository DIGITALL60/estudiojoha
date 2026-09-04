import { db, appointments, professional_schedules, blocked_dates } from "@workspace/db";
import { eq, and } from "drizzle-orm";

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
  const nowArgDate = new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
  const nowArgTime = new Date().toLocaleTimeString("en-GB", { timeZone: "America/Argentina/Buenos_Aires", hour: "2-digit", minute: "2-digit" });
  const [nowH, nowM] = nowArgTime.split(":").map(Number);
  const nowMinutes = nowH * 60 + nowM;

  if (date < nowArgDate) {
    return { available: false, reason: "No se pueden reservar turnos para fechas pasadas" };
  }

  if (date === nowArgDate) {
    const slotStartMins = parseTime(time);
    if (slotStartMins <= nowMinutes + 15) {
      return { available: false, reason: "El horario seleccionado ya ha transcurrido" };
    }
  }

  const [yyyy, mm, dd] = date.split("-").map(Number);
  const dateObj = new Date(Date.UTC(yyyy, mm - 1, dd));
  if (isNaN(dateObj.getTime())) {
    return { available: false, reason: "Fecha inválida" };
  }

  // Check blocked dates first
  const blocked = await db
    .select()
    .from(blocked_dates)
    .where(and(
      eq(blocked_dates.professionalId, professionalId),
      eq(blocked_dates.date, date)
    ));

  if (blocked.length > 0) {
    const reason = blocked[0].reason ? `Día bloqueado: ${blocked[0].reason}` : "La profesional no está disponible ese día";
    return { available: false, reason };
  }

  const dayOfWeek = dateObj.getUTCDay(); // 0 = Sunday, 1 = Monday, 2 = Tuesday, ..., 6 = Saturday
  const schedules = await db
    .select()
    .from(professional_schedules)
    .where(eq(professional_schedules.professionalId, professionalId));

  // Sunday is closed
  if (dayOfWeek === 0) {
    return { available: false, reason: "Los domingos el estudio permanece cerrado" };
  }

  let daySchedules = schedules.filter((s) => s.dayOfWeek === dayOfWeek);
  // Fallback to default salon working hours (09:00 - 20:00) if no custom schedule is registered
  if (schedules.length === 0) {
    daySchedules = [{ id: "default", professionalId, dayOfWeek, startTime: "09:00", endTime: "20:00" }];
  } else if (daySchedules.length === 0) {
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
    .select({
      id: appointments.id,
      date: appointments.date,
      time: appointments.time,
      duration: appointments.duration,
      status: appointments.status,
    })
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
