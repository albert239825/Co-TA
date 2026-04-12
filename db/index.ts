import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";

const dbPath = path.join(process.cwd(), "db", "co-ta.db");
const sqlite = new Database(dbPath);

// Enable WAL mode for better concurrent read performance
sqlite.pragma("journal_mode = WAL");
// Enable foreign keys (SQLite has them off by default)
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
