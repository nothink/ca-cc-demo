import { beforeEach, describe, expect, it } from "vitest";
import type { Todo } from "../../domain/entities/todo.js";
import type { User } from "../../domain/entities/user.js";
import { PermissionDeniedError, TodoNotFoundError, UnauthenticatedError } from "../errors.js";
import { InMemoryTodoRepository } from "../testing/in-memory-todo-repository.js";
import { InMemoryUserRepository } from "../testing/in-memory-user-repository.js";
import { updateTodo } from "./update-todo.js";

const admin: User = { id: "admin-id", name: "admin", role: "admin" };
const alice: User = { id: "alice-id", name: "alice", role: "member" };
const bob: User = { id: "bob-id", name: "bob", role: "member" };

let todoRepository: InMemoryTodoRepository;
let userRepository: InMemoryUserRepository;
let aliceTodo: Todo;

beforeEach(async () => {
  todoRepository = new InMemoryTodoRepository();
  userRepository = new InMemoryUserRepository([admin, alice, bob]);
  aliceTodo = {
    id: crypto.randomUUID(),
    title: "original",
    completed: false,
    ownerId: alice.id,
    createdAt: new Date(2024, 0, 1),
    updatedAt: new Date(2024, 0, 1),
  };
  await todoRepository.save(aliceTodo);
});

describe("updateTodo", () => {
  it("allows admin to update another user's todo", async () => {
    const result = await updateTodo({ todoRepository, userRepository })({
      actorId: admin.id,
      todoId: aliceTodo.id,
      title: "updated by admin",
    });

    expect(result.title).toBe("updated by admin");
    expect(result.updatedAt.getTime()).toBeGreaterThan(aliceTodo.updatedAt.getTime());
  });

  it("allows a member to update their own todo", async () => {
    const result = await updateTodo({ todoRepository, userRepository })({
      actorId: alice.id,
      todoId: aliceTodo.id,
      completed: true,
    });

    expect(result.completed).toBe(true);
    expect(result.title).toBe(aliceTodo.title);
  });

  it("denies a member from updating another member's todo", async () => {
    await expect(
      updateTodo({ todoRepository, userRepository })({
        actorId: bob.id,
        todoId: aliceTodo.id,
        title: "hijack",
      }),
    ).rejects.toThrow(PermissionDeniedError);
  });

  it("throws TodoNotFoundError before checking permission for a missing todo", async () => {
    await expect(
      updateTodo({ todoRepository, userRepository })({
        actorId: bob.id,
        todoId: "missing-id",
        title: "x",
      }),
    ).rejects.toThrow(TodoNotFoundError);
  });

  it("throws UnauthenticatedError when actorId does not resolve to a user", async () => {
    await expect(
      updateTodo({ todoRepository, userRepository })({
        actorId: "unknown",
        todoId: aliceTodo.id,
        title: "x",
      }),
    ).rejects.toThrow(UnauthenticatedError);
  });
});
