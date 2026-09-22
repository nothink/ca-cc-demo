import type { User } from "../../domain/entities/user.js";
import type { UserRepository } from "../../domain/repositories/user-repository.js";

export class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, User>();

  constructor(users: User[] = []) {
    for (const user of users) {
      this.users.set(user.id, user);
    }
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }
}
