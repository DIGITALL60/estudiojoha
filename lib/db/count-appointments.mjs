import Database from 'better-sqlite3';
const db = new Database('./sqlite.db');

const count = db.prepare('SELECT COUNT(*) as c FROM appointments').get();
console.log('Total appointments found:', count.c);
