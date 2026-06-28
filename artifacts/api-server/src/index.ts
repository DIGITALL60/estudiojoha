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
        { id: randomUUID(), name: "Manicuría Simple", category: "Uñas", duration: 45, price: 4500 },
        { id: randomUUID(), name: "Esmaltado Semipermanente", category: "Uñas", duration: 90, price: 6000 },
        { id: randomUUID(), name: "Lifting de Pestañas", category: "Cejas y Pestañas", duration: 90, price: 8500 },
        { id: randomUUID(), name: "Limpieza Facial Básica", category: "Facial", duration: 60, price: 5000 },
        { id: randomUUID(), name: "Limpieza Facial Profunda", category: "Facial", duration: 90, price: 7200 },
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

