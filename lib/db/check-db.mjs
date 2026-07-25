import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, "sqlite.db");

const db = new Database(dbPath);

console.log("--- CLIENTS ---");
console.log(db.prepare("SELECT * FROM clients;").all());

console.log("--- APPOINTMENTS ---");
console.log(db.prepare("SELECT * FROM appointments;").all());

console.log("--- EXPENSES ---");
console.log(db.prepare("SELECT * FROM expenses;").all());

console.log("--- VOUCHERS ---");
console.log(db.prepare("SELECT * FROM vouchers;").all());

db.close();
