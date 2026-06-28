import { db, professionals, services } from "@workspace/db";
import { randomUUID } from "crypto";

async function main() {
  console.log("Seeding database...");

  // Seed Professionals
  const profsData = [
    { name: "Estudio JohaMolinero", role: "Admin", color: "#7c3aed", initial: "EJ", email: "estudiojminterno2@gmail.com", phone: "5493510000000", username: "admin", password: "password123" },
    { name: "Guada García", role: "Staff", color: "#db2777", initial: "GG", email: "guada@example.com", phone: "5493510000001" },
    { name: "Mili Heredia", role: "Staff", color: "#0891b2", initial: "MH", email: "mili@example.com", phone: "5493510000002" },
    { name: "Ángela Alcaraz", role: "Staff", color: "#d97706", initial: "AA", email: "angela@example.com", phone: "5493510000003" },
    { name: "Depilación Definitiva", role: "Staff", color: "#16a34a", initial: "DD", email: "depi@example.com", phone: "5493510000004" },
  ];

  for (const prof of profsData) {
    await db.insert(professionals).values({
      id: randomUUID(),
      ...prof,
    });
  }

  // Seed Services
  const srvsData = [
    { name: "Manicuría Simple", category: "Uñas", duration: 45, price: 4500 },
    { name: "Esmaltado Semipermanente", category: "Uñas", duration: 90, price: 6000 },
    { name: "Lifting de Pestañas", category: "Cejas y Pestañas", duration: 90, price: 8500 },
    { name: "Limpieza Facial Básica", category: "Facial", duration: 60, price: 5000 },
    { name: "Limpieza Facial Profunda", category: "Facial", duration: 90, price: 7200 },
  ];

  for (const srv of srvsData) {
    await db.insert(services).values({
      id: randomUUID(),
      ...srv,
    });
  }

  console.log("Seeding complete.");
}

main().catch(console.error);
