import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema/index.js";

export type DrizzleClient = ReturnType<typeof drizzle<typeof schema>>;

export function createDrizzleClient(): DrizzleClient {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return drizzle(pool, { schema });
}
