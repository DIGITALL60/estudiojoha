import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import path from "path";
import * as schema from "./schema";

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = process.env.DATABASE_URL ?? path.join(__dirname, "../sqlite.db");
export const sqlite = new Database(dbPath);
export const db = drizzle(sqlite, { schema });

export * from "./schema";

