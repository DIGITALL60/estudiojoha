import { z } from "zod";

export const createBookingSchema = z.object({
  body: z.object({
    client: z.object({
      name: z.string().min(2, "El nombre es muy corto"),
      phone: z.string().min(6, "El teléfono es inválido"),
      birthday: z.string().optional(),
    }),
    appointment: z.object({
      professionalId: z.string().uuid("ID de profesional inválido"),
      serviceId: z.string().uuid("ID de servicio inválido"),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
      time: z.string().regex(/^\d{2}:\d{2}$/, "Formato de hora inválido (HH:mm)"),
      duration: z.number().min(5, "La duración mínima es 5 minutos"),
      price: z.number().min(0, "El precio no puede ser negativo"),
      voucherCode: z.string().optional(),
    }),
  }),
});
