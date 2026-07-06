const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'sqlite.db');
const db = new Database(dbPath);

console.log("Categories before:");
const before = db.prepare('SELECT DISTINCT category FROM services').all();
console.log(before);

// Fix "Catlogo Eventos" and similar encoding issues
const stmt = db.prepare(`UPDATE services SET category = 'Catálogo Eventos' WHERE category LIKE 'Cat%logo Eventos'`);
const info = stmt.run();
console.log(`Updated ${info.changes} rows for Catálogo.`);

// Fix "Depilacin" as well just in case
const stmt2 = db.prepare(`UPDATE services SET category = 'Depilación Definitiva' WHERE category LIKE 'Depilaci%n Definitiva'`);
const info2 = stmt2.run();
console.log(`Updated ${info2.changes} rows for Depilación.`);

console.log("Categories after:");
const after = db.prepare('SELECT DISTINCT category FROM services').all();
console.log(after);

db.close();
