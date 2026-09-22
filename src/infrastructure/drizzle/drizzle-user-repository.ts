import { eq } from "drizzle-orm";
import type { User } from "../../domain/entities/user.js";
import type { UserRepository } from "../../domain/repositories/user-repository.js";
import type { DrizzleClient } from "./client.js";
import { users } from "./schema/user.js";

export class DrizzleUserRepository implements UserRepository {
  constructor(private readonly client: DrizzleClient) {}

  async findById(id: string): Promise<User | null> {
    const [record] = await this.client.select().from(users).where(eq(users.id, id));
    if (!record) return null;
    return { id: record.id, name: record.name, role: record.role };
  }
}
