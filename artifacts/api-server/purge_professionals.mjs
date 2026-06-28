import Database from 'better-sqlite3';
import { join } from 'path';

const dbPath = "c:\\Users\\Carlos\\Desktop\\PROYECTOS 2026\\estudiojoha-main\\estudiojoha-main\\lib\\db\\sqlite.db";
const db = new Database(dbPath);

console.log("Purging professionals properly...");
// Delete everyone who is not explicitly an admin role OR username 'admin'
db.exec("DELETE FROM professionals WHERE lower(role) != 'admin' AND (username IS NULL OR username != 'admin');");

console.log("Done.");
db.close();
