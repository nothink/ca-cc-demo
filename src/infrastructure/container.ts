import type { TodoRepository } from "../domain/repositories/todo-repository.js";
import type { UserRepository } from "../domain/repositories/user-repository.js";
import { createPrismaClient } from "./prisma/client.js";
import { PrismaTodoRepository } from "./prisma/prisma-todo-repository.js";
import { PrismaUserRepository } from "./prisma/prisma-user-repository.js";

export type Container = {
  todoRepository: TodoRepository;
  userRepository: UserRepository;
};

export function createContainer(): Container {
  const client = createPrismaClient();
  return {
    todoRepository: new PrismaTodoRepository(client),
    userRepository: new PrismaUserRepository(client),
  };
}
