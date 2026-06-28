import app from "./app";
import { logger } from "./lib/logger";
import { db, sqlite, professionals, services } from "@workspace/db";
import { randomUUID } from "crypto";

// Create all tables if they don't exist (schema init without migration files)
function initSchema() {
  try {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS \`professionals\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`name\` text NOT NULL,
        \`role\` text NOT NULL,
        \`email\` text,
        \`phone\` text,
        \`username\` text,
        \`password\` text,
        \`color\` text DEFAULT '#7c3aed' NOT NULL,
        \`initial\` text NOT NULL,
        \`commission_rate\` integer DEFAULT 0
      );
      CREATE UNIQUE INDEX IF NOT EXISTS \`professionals_username_unique\` ON \`professionals\` (\`username\`);
      CREATE TABLE IF NOT EXISTS \`clients\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`name\` text NOT NULL,
        \`phone\` text NOT NULL,
        \`email\` text,
        \`notes\` text,
        \`birthday\` text,
        \`created_at\` integer NOT NULL
      );
      CREATE TABLE IF NOT EXISTS \`services\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`name\` text NOT NULL,
        \`category\` text NOT NULL,
        \`duration\` integer NOT NULL,
        \`price\` integer NOT NULL,
        \`cod\` text
      );
      CREATE TABLE IF NOT EXISTS \`appointments\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`client_id\` text NOT NULL,
        \`professional_id\` text NOT NULL,
        \`service_id\` text NOT NULL,
        \`date\` text NOT NULL,
        \`time\` text NOT NULL,
        \`duration\` integer NOT NULL,
        \`price\` integer NOT NULL,
        \`status\` text DEFAULT 'completado' NOT NULL,
        \`payment_method\` text,
        \`notes\` text,
        \`reminder_sent\` integer DEFAULT false NOT NULL,
        \`created_at\` integer NOT NULL,
        FOREIGN KEY (\`client_id\`) REFERENCES \`clients\`(\`id\`),
        FOREIGN KEY (\`professional_id\`) REFERENCES \`professionals\`(\`id\`),
        FOREIGN KEY (\`service_id\`) REFERENCES \`services\`(\`id\`)
      );
      CREATE TABLE IF NOT EXISTS \`expenses\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`concept\` text NOT NULL,
        \`amount\` integer NOT NULL,
        \`category\` text DEFAULT 'General' NOT NULL,
        \`date\` text NOT NULL,
        \`professional_id\` text,
        \`created_at\` integer NOT NULL,
        FOREIGN KEY (\`professional_id\`) REFERENCES \`professionals\`(\`id\`)
      );
      CREATE TABLE IF NOT EXISTS \`products\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`name\` text NOT NULL,
        \`category\` text NOT NULL,
        \`stock\` integer DEFAULT 0 NOT NULL,
        \`min_stock\` integer DEFAULT 0 NOT NULL,
        \`unit\` text NOT NULL,
        \`price\` integer DEFAULT 0 NOT NULL
      );
      CREATE TABLE IF NOT EXISTS \`professional_schedules\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`professional_id\` text NOT NULL,
        \`day_of_week\` integer NOT NULL,
        \`start_time\` text NOT NULL,
        \`end_time\` text NOT NULL,
        FOREIGN KEY (\`professional_id\`) REFERENCES \`professionals\`(\`id\`)
      );
      CREATE TABLE IF NOT EXISTS \`professional_services\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`professional_id\` text NOT NULL,
        \`service_id\` text NOT NULL,
        FOREIGN KEY (\`professional_id\`) REFERENCES \`professionals\`(\`id\`),
        FOREIGN KEY (\`service_id\`) REFERENCES \`services\`(\`id\`)
      );
      CREATE TABLE IF NOT EXISTS \`service_products\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`service_id\` text NOT NULL,
        \`product_id\` text NOT NULL,
        \`amount\` integer DEFAULT 1 NOT NULL,
        FOREIGN KEY (\`service_id\`) REFERENCES \`services\`(\`id\`) ON DELETE cascade,
        FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE cascade
      );
      CREATE TABLE IF NOT EXISTS \`vouchers\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`code\` text NOT NULL,
        \`discount_type\` text NOT NULL,
        \`discount_value\` integer NOT NULL,
        \`is_active\` integer DEFAULT true NOT NULL,
        \`created_at\` integer NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS \`vouchers_code_unique\` ON \`vouchers\` (\`code\`);
    `);
    logger.info("Database schema initialized successfully");
  } catch (err) {
    logger.error({ err }, "Schema initialization failed");
    process.exit(1);
  }
}

async function seedIfEmpty() {
  try {
    // Seed professionals if empty
    const existingProfs = db.select().from(professionals).all();
    if (existingProfs.length === 0) {
      logger.info("Seeding professionals...");
      db.insert(professionals).values([
        { id: randomUUID(), name: "Estudio JohaMolinero", role: "Admin", color: "#7c3aed", initial: "EJ", email: "estudiojminterno2@gmail.com", phone: "5493510000000", username: "admin", password: "123456789" },
        { id: randomUUID(), name: "Guada García", role: "Staff", color: "#db2777", initial: "GG", email: "guada@example.com", phone: "5493510000001" },
        { id: randomUUID(), name: "Mili Heredia", role: "Staff", color: "#0891b2", initial: "MH", email: "mili@example.com", phone: "5493510000002" },
        { id: randomUUID(), name: "Ángela Alcaraz", role: "Staff", color: "#d97706", initial: "AA", email: "angela@example.com", phone: "5493510000003" },
        { id: randomUUID(), name: "Depilación Definitiva", role: "Staff", color: "#16a34a", initial: "DD", email: "depi@example.com", phone: "5493510000004" },
      ]).run();
      logger.info("Professionals seeded. Admin: admin / 123456789");
    }

    // Seed services if empty (checked independently)
    const existingSrvs = db.select().from(services).all();
    if (existingSrvs.length === 0) {
      logger.info("Seeding services...");
      db.insert(services).values([
        // ── DEPILACIÓN DEFINITIVA - Sesiones ─────────────────────────
        { id: randomUUID(), name: "Sesión Individual 5 min", category: "Depilación Definitiva", duration: 5, price: 0 },
        { id: randomUUID(), name: "Sesión Individual 10 min", category: "Depilación Definitiva", duration: 10, price: 0 },
        { id: randomUUID(), name: "Sesión Individual 15 min", category: "Depilación Definitiva", duration: 15, price: 0 },
        { id: randomUUID(), name: "Pack x10 Sesiones de 5 min", category: "Depilación Definitiva", duration: 50, price: 0 },
        { id: randomUUID(), name: "Pack x10 Sesiones de 10 min", category: "Depilación Definitiva", duration: 100, price: 0 },
        { id: randomUUID(), name: "Pack x10 Sesiones de 15 min", category: "Depilación Definitiva", duration: 150, price: 0 },
        { id: randomUUID(), name: "Bronceado Saludable", category: "Depilación Definitiva", duration: 30, price: 4000 },
        // ── DEPILACIÓN DEFINITIVA - Combos ────────────────────────────
        { id: randomUUID(), name: "Combo 1: Cav completo + Tiro de cola + Media pierna + Axilas", category: "Depilación Definitiva", duration: 30, price: 19000 },
        { id: randomUUID(), name: "Combo 2: Cav completo + Tiro de cola + Piernas completas + Axilas", category: "Depilación Definitiva", duration: 30, price: 21000 },
        { id: randomUUID(), name: "Combo 3: Cav completo + Tiro de cola + Media pierna + Axilas + Bozo + Linea alba", category: "Depilación Definitiva", duration: 30, price: 24000 },
        { id: randomUUID(), name: "Combo 4: Bozo + Mentón + Frente + Mandíbula/Papada", category: "Depilación Definitiva", duration: 15, price: 13000 },
        // ── DEPILACIÓN DEFINITIVA - Zonas ─────────────────────────────
        { id: randomUUID(), name: "Frente", category: "Depilación Definitiva", duration: 5, price: 5000 },
        { id: randomUUID(), name: "Entrecejo", category: "Depilación Definitiva", duration: 5, price: 3500 },
        { id: randomUUID(), name: "Pómulos", category: "Depilación Definitiva", duration: 5, price: 5000 },
        { id: randomUUID(), name: "Bozo", category: "Depilación Definitiva", duration: 5, price: 5000 },
        { id: randomUUID(), name: "Mentón", category: "Depilación Definitiva", duration: 5, price: 5000 },
        { id: randomUUID(), name: "Axilas", category: "Depilación Definitiva", duration: 10, price: 7000 },
        { id: randomUUID(), name: "Abdomen", category: "Depilación Definitiva", duration: 5, price: 8500 },
        { id: randomUUID(), name: "Linea Alba", category: "Depilación Definitiva", duration: 15, price: 4500 },
        { id: randomUUID(), name: "Espalda", category: "Depilación Definitiva", duration: 15, price: 7500 },
        { id: randomUUID(), name: "Ante Brazo", category: "Depilación Definitiva", duration: 15, price: 7500 },
        { id: randomUUID(), name: "Brazos", category: "Depilación Definitiva", duration: 15, price: 8500 },
        { id: randomUUID(), name: "Manos/Pies", category: "Depilación Definitiva", duration: 5, price: 5500 },
        { id: randomUUID(), name: "Media Pierna", category: "Depilación Definitiva", duration: 15, price: 8500 },
        { id: randomUUID(), name: "Muslos", category: "Depilación Definitiva", duration: 15, price: 8500 },
        { id: randomUUID(), name: "Piernas Completas", category: "Depilación Definitiva", duration: 15, price: 12000 },
        { id: randomUUID(), name: "Cavado Bikini", category: "Depilación Definitiva", duration: 15, price: 5500 },
        { id: randomUUID(), name: "Cavado Completo", category: "Depilación Definitiva", duration: 15, price: 8000 },
        { id: randomUUID(), name: "Tiro de Cola", category: "Depilación Definitiva", duration: 15, price: 5500 },
        // ── FACIAL ────────────────────────────────────────────────────
        { id: randomUUID(), name: "Limpieza Facial Básica (mascarilla de regalo)", category: "Sector Facial", duration: 30, price: 26000 },
        { id: randomUUID(), name: "Limpieza Facial Profunda con máscaras", category: "Sector Facial", duration: 60, price: 28000 },
        { id: randomUUID(), name: "Limpieza Facial Profunda Anti Age", category: "Sector Facial", duration: 90, price: 35000 },
        { id: randomUUID(), name: "Peeling Químico", category: "Sector Facial", duration: 45, price: 35000 },
        { id: randomUUID(), name: "Aparatología Facial (Crío Radiofrecuencia - HIMFU)", category: "Sector Facial", duration: 60, price: 30000 },
        { id: randomUUID(), name: "Aparatología Corporal (Crío Radiofrecuencia - HIMFU)", category: "Sector Facial", duration: 60, price: 30000 },
        // ── CEJAS Y PESTAÑAS ──────────────────────────────────────────
        { id: randomUUID(), name: "Diseño + Perfilado de Cejas (pinza/bandas)", category: "Cejas y Pestañas", duration: 30, price: 19500 },
        { id: randomUUID(), name: "Mantenimiento de Perfilado (cada 15 días)", category: "Cejas y Pestañas", duration: 20, price: 16500 },
        { id: randomUUID(), name: "Diseño + Perfilado de Cejas + Henna", category: "Cejas y Pestañas", duration: 60, price: 25000 },
        { id: randomUUID(), name: "Diseño + Perfilado de Cejas + Laminado", category: "Cejas y Pestañas", duration: 90, price: 26000 },
        { id: randomUUID(), name: "Diseño + Perfilado de Cejas HD (Henna y Laminado)", category: "Cejas y Pestañas", duration: 120, price: 0 },
        { id: randomUUID(), name: "Nutrición de Cejas", category: "Cejas y Pestañas", duration: 45, price: 0 },
        { id: randomUUID(), name: "Microblading de Cejas", category: "Cejas y Pestañas", duration: 150, price: 100000 },
        { id: randomUUID(), name: "Retoque Inicial Microblading (30 días)", category: "Cejas y Pestañas", duration: 120, price: 40000 },
        { id: randomUUID(), name: "Retoque Futuro Microblading (8 meses)", category: "Cejas y Pestañas", duration: 120, price: 50000 },
        { id: randomUUID(), name: "Lifting de Pestañas + Nutrición/Botox + Tinte", category: "Cejas y Pestañas", duration: 120, price: 29000 },
        { id: randomUUID(), name: "Depilación Bozo", category: "Cejas y Pestañas", duration: 15, price: 6500 },
        { id: randomUUID(), name: "Rostro Completo (depilación)", category: "Cejas y Pestañas", duration: 45, price: 17000 },
        { id: randomUUID(), name: "Retiro de Pestañas", category: "Cejas y Pestañas", duration: 45, price: 8000 },
        // ── UÑAS - Manicuría y Spa ────────────────────────────────────
        { id: randomUUID(), name: "Manicuría Simple (remoción + limado + calcio)", category: "Uñas", duration: 30, price: 17000 },
        { id: randomUUID(), name: "Spa de Manos EXF + Hidratación", category: "Uñas", duration: 15, price: 10000 },
        { id: randomUUID(), name: "Spa de Manos EXF + Hidratación + Break (café + cubanitos)", category: "Uñas", duration: 30, price: 14000 },
        { id: randomUUID(), name: "Retiro de Semi o Capping + Calcio (sin renovación)", category: "Uñas", duration: 45, price: 17000 },
        { id: randomUUID(), name: "Retiro de otro salón + Servicio nuevo", category: "Uñas", duration: 20, price: 5000 },
        // ── UÑAS - Esmalte Tradicional ────────────────────────────────
        { id: randomUUID(), name: "Esmalte Tradicional (Liso) - Básico", category: "Uñas", duration: 60, price: 20000 },
        { id: randomUUID(), name: "Esmalte Tradicional (Hasta 3 Decos)", category: "Uñas", duration: 60, price: 21000 },
        { id: randomUUID(), name: "Esmalte Tradicional (French)", category: "Uñas", duration: 75, price: 22000 },
        { id: randomUUID(), name: "Esmalte Tradicional Niña", category: "Uñas", duration: 30, price: 16000 },
        { id: randomUUID(), name: "Esmalte Tradicional Niña (Hasta 3 Deco)", category: "Uñas", duration: 45, price: 17000 },
        { id: randomUUID(), name: "Esmalte Tradicional Niña (French)", category: "Uñas", duration: 45, price: 18500 },
        { id: randomUUID(), name: "Esmalte Tradicional OPI Infinite Shine (Liso)", category: "Uñas", duration: 60, price: 20000 },
        { id: randomUUID(), name: "Esmalte Tradicional OPI Infinite Shine (French)", category: "Uñas", duration: 69, price: 22000 },
        // ── UÑAS - Semipermanente ─────────────────────────────────────
        { id: randomUUID(), name: "Esmalte Semipermanente (Liso) + Nivelación", category: "Uñas", duration: 60, price: 20000 },
        { id: randomUUID(), name: "Esmalte Semipermanente (3 Deco) + Nivelación", category: "Uñas", duration: 75, price: 22000 },
        { id: randomUUID(), name: "Esmalte Semipermanente (French) + Nivelación", category: "Uñas", duration: 90, price: 24000 },
        { id: randomUUID(), name: "Esmalte Semipermanente (Full Deco) + Nivelación", category: "Uñas", duration: 90, price: 26000 },
        { id: randomUUID(), name: "Esmalte Semipermanente (Full Deco Compleja) + Nivelación", category: "Uñas", duration: 120, price: 28000 },
        // ── UÑAS - Capping ────────────────────────────────────────────
        { id: randomUUID(), name: "Capping Adicional al Servicio", category: "Uñas", duration: 20, price: 5000 },
        { id: randomUUID(), name: "Capping Liso (sin esmalte arriba)", category: "Uñas", duration: 60, price: 19000 },
        { id: randomUUID(), name: "Capping + French o Baby Boomer", category: "Uñas", duration: 90, price: 21000 },
        // ── UÑAS - Arreglos & Extras ──────────────────────────────────
        { id: randomUUID(), name: "Arreglos/Parches", category: "Uñas", duration: 10, price: 1900 },
        { id: randomUUID(), name: "Arreglos/Parches (posterior al servicio)", category: "Uñas", duration: 15, price: 3000 },
        { id: randomUUID(), name: "Adicional Tip de Softgel", category: "Uñas", duration: 15, price: 2000 },
        { id: randomUUID(), name: "Tip de Softgel (posterior al servicio)", category: "Uñas", duration: 20, price: 2500 },
        // ── UÑAS - Softgel ────────────────────────────────────────────
        { id: randomUUID(), name: "Softgel (Liso)", category: "Uñas", duration: 90, price: 26000 },
        { id: randomUUID(), name: "Softgel (Hasta 3 Deco)", category: "Uñas", duration: 120, price: 30000 },
        { id: randomUUID(), name: "Softgel (French)", category: "Uñas", duration: 120, price: 32000 },
        { id: randomUUID(), name: "Softgel Full Deco (polvitos, decos simples - blooming)", category: "Uñas", duration: 150, price: 34000 },
        { id: randomUUID(), name: "Softgel Full Deco Compleja (baby boom + polvitos + relieves)", category: "Uñas", duration: 180, price: 38000 },
        { id: randomUUID(), name: "Retiro de Softgel (sin renovar) + Calcio", category: "Uñas", duration: 60, price: 18000 },
        { id: randomUUID(), name: "Retiro de Softgel + Soft Nuevas", category: "Uñas", duration: 30, price: 5000 },
        { id: randomUUID(), name: "Retiro de Softgel de otro salón + Calcio", category: "Uñas", duration: 75, price: 18000 },
        // ── PIES - Belleza Básica ─────────────────────────────────────
        { id: randomUUID(), name: "Belleza de Pies Básica (sin esmaltado)", category: "Sector Pies", duration: 30, price: 17000 },
        { id: randomUUID(), name: "Belleza de Pies Básica + Esmaltado Tradi Liso", category: "Sector Pies", duration: 45, price: 18500 },
        { id: randomUUID(), name: "Belleza de Pies Básica + Esmaltado Tradi Liso OPI", category: "Sector Pies", duration: 45, price: 20000 },
        { id: randomUUID(), name: "Belleza de Pies Básica + Esmaltado Tradi French", category: "Sector Pies", duration: 45, price: 21000 },
        { id: randomUUID(), name: "Belleza de Pies Básica + Esmaltado Tradi French OPI", category: "Sector Pies", duration: 60, price: 22000 },
        { id: randomUUID(), name: "Belleza de Pies Básica + Esmaltado Semi Liso", category: "Sector Pies", duration: 60, price: 20000 },
        { id: randomUUID(), name: "Belleza de Pies Básica + Esmaltado Semi French", category: "Sector Pies", duration: 60, price: 21000 },
        // ── PIES - Premium ────────────────────────────────────────────
        { id: randomUUID(), name: "Pies Premium (EXF + Cremas + Torno) sin esmaltado", category: "Sector Pies", duration: 60, price: 21000 },
        { id: randomUUID(), name: "Pies Premium + Esmaltado Tradi Liso", category: "Sector Pies", duration: 75, price: 22000 },
        { id: randomUUID(), name: "Pies Premium + Esmaltado Tradi French", category: "Sector Pies", duration: 90, price: 23000 },
        { id: randomUUID(), name: "Pies Premium + Esmaltado Semi Liso", category: "Sector Pies", duration: 75, price: 23000 },
        { id: randomUUID(), name: "Pies Premium + Esmaltado Semi French", category: "Sector Pies", duration: 90, price: 24000 },
        { id: randomUUID(), name: "Premium Adicional al Servicio Básico (EXF + Crema + Torno en talón)", category: "Sector Pies", duration: 20, price: 11000 },
        { id: randomUUID(), name: "Reconstrucción Uña del Pie (esculpida)", category: "Sector Pies", duration: 15, price: 4500 },
        { id: randomUUID(), name: "Retiro de otro salón + Servicio nuevo (pies)", category: "Sector Pies", duration: 15, price: 4500 },
        // ── COMBINADOS ────────────────────────────────────────────────
        { id: randomUUID(), name: "Esmalte Tradi Manos y Pies Simultáneo (Liso)", category: "Cat�logo Eventos", duration: 60, price: 0 },
        { id: randomUUID(), name: "Esmalte Semi Manos y Pies Simultáneo (Liso)", category: "Cat�logo Eventos", duration: 90, price: 0 },
        { id: randomUUID(), name: "Soft Lisas + Semi Liso Pies", category: "Cat�logo Eventos", duration: 150, price: 0 },
        { id: randomUUID(), name: "Esmalte Semi Manos y Pies Simultáneo (French)", category: "Cat�logo Eventos", duration: 90, price: 0 },
      ]).run();
      logger.info("Services seeded.");
    }

  } catch (err) {
    logger.error({ err }, "Auto-seed failed");
  }
}


const rawPort = process.env["PORT"] || "5000";
const port = Number(rawPort);

// Initialize schema synchronously before starting server
initSchema();

app.listen(port, async (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  await seedIfEmpty();
});


