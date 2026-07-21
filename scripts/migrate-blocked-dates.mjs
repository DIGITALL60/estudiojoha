import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = path.join(__dirname, "../lib/db/sqlite.db");
const db = new Database(dbPath);

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS blocked_dates (
      id TEXT PRIMARY KEY,
      professional_id TEXT NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      reason TEXT
    )
  `);
  console.log("blocked_dates table ready");
} catch (e) {
  console.error("Error:", e.message);
} finally {
  db.close();
}
