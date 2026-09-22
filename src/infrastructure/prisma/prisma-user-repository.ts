import type { PrismaClient } from "@prisma/client";
import type { User } from "../../domain/entities/user.js";
import type { UserRepository } from "../../domain/repositories/user-repository.js";

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly client: PrismaClient) {}

  async findById(id: string): Promise<User | null> {
    const record = await this.client.user.findUnique({ where: { id } });
    if (!record) return null;
    return { id: record.id, name: record.name, role: record.role };
  }
}
