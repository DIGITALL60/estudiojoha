import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Clients Table
export const clients = sqliteTable("clients", {
  id: text("id").primaryKey(), // using uuid or cuid
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  notes: text("notes"),
  birthday: text("birthday"), // stored as YYYY-MM-DD or DD/MM
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(new Date()),
});

export const insertClientSchema = createInsertSchema(clients);
export const selectClientSchema = createSelectSchema(clients);
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = z.infer<typeof selectClientSchema>;

// Professionals Table
export const professionals = sqliteTable("professionals", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  email: text("email"),
  phone: text("phone"),
  username: text("username").unique(),
  password: text("password"),
  color: text("color").notNull().default("#7c3aed"),
  initial: text("initial").notNull(),
  commissionRate: integer("commission_rate").default(0),
  baseSalary: integer("base_salary").default(0),
  salesTarget: integer("sales_target").default(0),
});

export const insertProfessionalSchema = createInsertSchema(professionals);
export const selectProfessionalSchema = createSelectSchema(professionals);
export type Professional = z.infer<typeof selectProfessionalSchema>;

// Services Table
export const services = sqliteTable("services", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  duration: integer("duration").notNull(), // in minutes
  price: integer("price").notNull(),
  cod: text("cod"),
});

export const insertServiceSchema = createInsertSchema(services);
export const selectServiceSchema = createSelectSchema(services);
export type Service = z.infer<typeof selectServiceSchema>;

// Products Table (Stock)
export const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  stock: integer("stock").notNull().default(0),
  minStock: integer("min_stock").notNull().default(0),
  unit: text("unit").notNull(), // e.g., 'unidad', 'litro', 'kit'
  price: integer("price").notNull().default(0),
});

export const insertProductSchema = createInsertSchema(products);
export const selectProductSchema = createSelectSchema(products);
export type Product = z.infer<typeof selectProductSchema>;

// Service Products Table (Bill of Materials)
export const service_products = sqliteTable("service_products", {
  id: text("id").primaryKey(),
  serviceId: text("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull().default(1),
});

export const insertServiceProductSchema = createInsertSchema(service_products);
export const selectServiceProductSchema = createSelectSchema(service_products);
export type ServiceProduct = z.infer<typeof selectServiceProductSchema>;

// Appointments Table
export const appointments = sqliteTable("appointments", {
  id: text("id").primaryKey(),
  clientId: text("client_id").notNull().references(() => clients.id),
  professionalId: text("professional_id").notNull().references(() => professionals.id),
  serviceId: text("service_id").notNull().references(() => services.id),
  date: text("date").notNull(), // YYYY-MM-DD
  time: text("time").notNull(), // HH:mm
  duration: integer("duration").notNull(),
  price: integer("price").notNull(),
  status: text("status").notNull().default("completado"), // agendado, completado, cancelado
  paymentMethod: text("payment_method"), // Efectivo, Transferencia, Tarjeta, Mercado Pago
  notes: text("notes"),
  shopSales: integer("shop_sales").default(0), // Ventas generadas en el local
  reminderSent: integer("reminder_sent", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(new Date()),
});

export const insertAppointmentSchema = createInsertSchema(appointments);
export const selectAppointmentSchema = createSelectSchema(appointments);
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = z.infer<typeof selectAppointmentSchema>;

// Professional Schedules Table
export const professional_schedules = sqliteTable("professional_schedules", {
  id: text("id").primaryKey(),
  professionalId: text("professional_id").notNull().references(() => professionals.id),
  dayOfWeek: integer("day_of_week").notNull(), // 0 = Sunday, 1 = Monday, etc.
  startTime: text("start_time").notNull(), // HH:mm
  endTime: text("end_time").notNull(), // HH:mm
});

export const insertProfessionalScheduleSchema = createInsertSchema(professional_schedules);
export const selectProfessionalScheduleSchema = createSelectSchema(professional_schedules);
export type ProfessionalSchedule = z.infer<typeof selectProfessionalScheduleSchema>;

// Professional <-> Service assignment Table
export const professional_services = sqliteTable("professional_services", {
  id: text("id").primaryKey(),
  professionalId: text("professional_id").notNull().references(() => professionals.id),
  serviceId: text("service_id").notNull().references(() => services.id),
});

export const insertProfessionalServiceSchema = createInsertSchema(professional_services);
export const selectProfessionalServiceSchema = createSelectSchema(professional_services);
export type ProfessionalService = z.infer<typeof selectProfessionalServiceSchema>;

// Expenses Table (Caja - Egresos)
export const expenses = sqliteTable("expenses", {
  id: text("id").primaryKey(),
  concept: text("concept").notNull(),
  amount: integer("amount").notNull(),
  category: text("category").notNull().default("General"), // e.g. Insumos, Alquiler, Sueldos
  date: text("date").notNull(), // YYYY-MM-DD
  professionalId: text("professional_id").references(() => professionals.id), // If expense is tied to a professional
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull(),
});

export const insertExpenseSchema = createInsertSchema(expenses);
export const selectExpenseSchema = createSelectSchema(expenses);
export type Expense = z.infer<typeof selectExpenseSchema>;

// Vouchers Table
export const vouchers = sqliteTable("vouchers", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  discountType: text("discount_type").notNull(), // 'percent' or 'fixed'
  discountValue: integer("discount_value").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().default(new Date()),
});

export const insertVoucherSchema = createInsertSchema(vouchers);
export const selectVoucherSchema = createSelectSchema(vouchers);
export type Voucher = z.infer<typeof selectVoucherSchema>;

// App Settings (key-value store for business config & toggles)
export const app_settings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});