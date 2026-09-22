import { beforeEach, describe, expect, it } from "vitest";
import type { Todo } from "../../domain/entities/todo.js";
import type { User } from "../../domain/entities/user.js";
import { UnauthenticatedError } from "../errors.js";
import { InMemoryTodoRepository } from "../testing/in-memory-todo-repository.js";
import { InMemoryUserRepository } from "../testing/in-memory-user-repository.js";
import { listTodos } from "./list-todos.js";

const admin: User = { id: "admin-id", name: "admin", role: "admin" };
const alice: User = { id: "alice-id", name: "alice", role: "member" };

let todoRepository: InMemoryTodoRepository;
let userRepository: InMemoryUserRepository;

beforeEach(() => {
  todoRepository = new InMemoryTodoRepository();
  userRepository = new InMemoryUserRepository([admin, alice]);
});

function makeTodo(overrides: Partial<Todo>): Todo {
  return {
    id: crypto.randomUUID(),
    title: "todo",
    completed: false,
    ownerId: alice.id,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("listTodos", () => {
  it("returns all todos when ownerId is not specified", async () => {
    const t1 = makeTodo({ ownerId: admin.id, createdAt: new Date(2024, 0, 1) });
    const t2 = makeTodo({ ownerId: alice.id, createdAt: new Date(2024, 0, 2) });
    await todoRepository.save(t1);
    await todoRepository.save(t2);

    const result = await listTodos({ todoRepository, userRepository })({ actorId: admin.id });

    expect(result.map((t) => t.id)).toEqual([t1.id, t2.id]);
  });

  it("filters by ownerId when specified", async () => {
    const t1 = makeTodo({ ownerId: admin.id });
    const t2 = makeTodo({ ownerId: alice.id });
    await todoRepository.save(t1);
    await todoRepository.save(t2);

    const result = await listTodos({ todoRepository, userRepository })({
      actorId: admin.id,
      ownerId: alice.id,
    });

    expect(result.map((t) => t.id)).toEqual([t2.id]);
  });

  it("throws UnauthenticatedError when actorId does not resolve to a user", async () => {
    await expect(
      listTodos({ todoRepository, userRepository })({ actorId: "unknown" }),
    ).rejects.toThrow(UnauthenticatedError);
  });
});
