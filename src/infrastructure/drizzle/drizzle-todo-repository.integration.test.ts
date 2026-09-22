import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Todo } from "../../domain/entities/todo.js";
import { createDrizzleClient, type DrizzleClient } from "./client.js";
import { DrizzleTodoRepository } from "./drizzle-todo-repository.js";

const OWNER_ID = "22222222-2222-4222-8222-222222222222";

describe.skipIf(!process.env.DATABASE_URL)("DrizzleTodoRepository", () => {
  let client: DrizzleClient;
  let repository: DrizzleTodoRepository;

  beforeAll(() => {
    client = createDrizzleClient();
    repository = new DrizzleTodoRepository(client);
  });

  afterAll(async () => {
    await client.$client.end();
  });

  it("returns the same content from save -> findById", async () => {
    const todo: Todo = {
      id: crypto.randomUUID(),
      title: "integration test todo",
      completed: false,
      ownerId: OWNER_ID,
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
      updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    };

    await repository.save(todo);
    const found = await repository.findById(todo.id);

    expect(found).toEqual(todo);

    await repository.delete(todo.id);
  });

  it("returns null after delete", async () => {
    const todo: Todo = {
      id: crypto.randomUUID(),
      title: "to be deleted",
      completed: false,
      ownerId: OWNER_ID,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await repository.save(todo);
    await repository.delete(todo.id);

    expect(await repository.findById(todo.id)).toBeNull();
  });
});
