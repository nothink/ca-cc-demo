import type { TodoRepository } from "../domain/repositories/todo-repository.js";
import type { UserRepository } from "../domain/repositories/user-repository.js";
import { createDrizzleClient } from "./drizzle/client.js";
import { DrizzleTodoRepository } from "./drizzle/drizzle-todo-repository.js";
import { DrizzleUserRepository } from "./drizzle/drizzle-user-repository.js";

export type Container = {
  todoRepository: TodoRepository;
  userRepository: UserRepository;
};

export function createContainer(): Container {
  const client = createDrizzleClient();
  return {
    todoRepository: new DrizzleTodoRepository(client),
    userRepository: new DrizzleUserRepository(client),
  };
}
