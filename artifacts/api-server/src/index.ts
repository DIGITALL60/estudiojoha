import app from "./app";
import { logger } from "./lib/logger";
import { db, professionals, services } from "@workspace/db";
import { randomUUID } from "crypto";

async function seedIfEmpty() {
  try {
    const existing = await db.select().from(professionals);
    if (existing.length === 0) {
      logger.info("Database is empty - seeding initial data...");
      await db.insert(professionals).values([
        { id: randomUUID(), name: "Estudio JohaMolinero", role: "Admin", color: "#7c3aed", initial: "EJ", email: "estudiojminterno2@gmail.com", phone: "5493510000000", username: "admin", password: "123456789" },
        { id: randomUUID(), name: "Guada García", role: "Staff", color: "#db2777", initial: "GG", email: "guada@example.com", phone: "5493510000001" },
        { id: randomUUID(), name: "Mili Heredia", role: "Staff", color: "#0891b2", initial: "MH", email: "mili@example.com", phone: "5493510000002" },
        { id: randomUUID(), name: "Ángela Alcaraz", role: "Staff", color: "#d97706", initial: "AA", email: "angela@example.com", phone: "5493510000003" },
        { id: randomUUID(), name: "Depilación Definitiva", role: "Staff", color: "#16a34a", initial: "DD", email: "depi@example.com", phone: "5493510000004" },
      ]);
      await db.insert(services).values([
        { id: randomUUID(), name: "Manicuría Simple", category: "Uñas", duration: 45, price: 4500 },
        { id: randomUUID(), name: "Esmaltado Semipermanente", category: "Uñas", duration: 90, price: 6000 },
        { id: randomUUID(), name: "Lifting de Pestañas", category: "Cejas y Pestañas", duration: 90, price: 8500 },
        { id: randomUUID(), name: "Limpieza Facial Básica", category: "Facial", duration: 60, price: 5000 },
        { id: randomUUID(), name: "Limpieza Facial Profunda", category: "Facial", duration: 90, price: 7200 },
      ]);
      logger.info("Initial seed complete. Admin user: admin / 123456789");
    }
  } catch (err) {
    logger.error({ err }, "Auto-seed failed");
  }
}

const rawPort = process.env["PORT"] || "5000";
const port = Number(rawPort);

app.listen(port, async (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  await seedIfEmpty();
});
