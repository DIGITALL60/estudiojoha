import { z } from "zod";

export const createBookingSchema = z.object({
  body: z.object({
    client: z.object({
      name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
      phone: z.string().min(6, "El teléfono debe tener al menos 6 dígitos"),
      birthday: z.string().optional().nullable(),
      notes: z.string().optional().nullable(),
    }),
    appointment: z.object({
      professionalId: z.string().min(1, "ID de profesional requerido"),
      serviceId: z.string().optional().nullable(),
      serviceIds: z.array(z.string()).optional(),
      services: z.array(z.string()).optional(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
      time: z.string().regex(/^\d{2}:\d{2}$/, "Formato de hora inválido (HH:mm)"),
      duration: z.number().optional(),
      price: z.number().optional(),
      notes: z.string().optional().nullable(),
      voucherCode: z.string().optional().nullable(),
    }),
  }),
});
