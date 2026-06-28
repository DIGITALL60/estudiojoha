import Database from 'better-sqlite3';
import { join } from 'path';

// Using absolute path just to be safe
const dbPath = "c:\\Users\\Carlos\\Desktop\\PROYECTOS 2026\\estudiojoha-main\\estudiojoha-main\\lib\\db\\sqlite.db";
console.log("Opening db at:", dbPath);
const db = new Database(dbPath);

console.log("Purging appointments...");
db.exec("DELETE FROM appointments;");

console.log("Purging clients...");
db.exec("DELETE FROM clients;");

console.log("Purging professional schedules...");
db.exec("DELETE FROM professional_schedules;");

console.log("Purging professional services...");
db.exec("DELETE FROM professional_services;");

console.log("Purging expenses...");
db.exec("DELETE FROM expenses;");

console.log("Purging products and links...");
db.exec("DELETE FROM products;");
db.exec("DELETE FROM service_products;");

console.log("Purging professionals (keeping admin)...");
db.exec("DELETE FROM professionals WHERE lower(role) != 'admin' AND username != 'admin';");

console.log("Purge complete! Only Admin and Services remain.");
db.close();
