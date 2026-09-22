import { beforeEach, describe, expect, it } from "vitest";
import type { User } from "../../domain/entities/user.js";
import { UnauthenticatedError } from "../errors.js";
import { InMemoryTodoRepository } from "../testing/in-memory-todo-repository.js";
import { InMemoryUserRepository } from "../testing/in-memory-user-repository.js";
import { createTodo } from "./create-todo.js";

const alice: User = { id: "alice-id", name: "alice", role: "member" };

let todoRepository: InMemoryTodoRepository;
let userRepository: InMemoryUserRepository;

beforeEach(() => {
  todoRepository = new InMemoryTodoRepository();
  userRepository = new InMemoryUserRepository([alice]);
});

describe("createTodo", () => {
  it("creates a todo owned by the actor", async () => {
    const todo = await createTodo({ todoRepository, userRepository })({
      actorId: alice.id,
      title: "buy milk",
    });

    expect(todo.title).toBe("buy milk");
    expect(todo.ownerId).toBe(alice.id);
    expect(todo.completed).toBe(false);
    expect(await todoRepository.findById(todo.id)).toEqual(todo);
  });

  it("throws UnauthenticatedError when actorId does not resolve to a user", async () => {
    await expect(
      createTodo({ todoRepository, userRepository })({ actorId: "unknown", title: "x" }),
    ).rejects.toThrow(UnauthenticatedError);
  });
});
