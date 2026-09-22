import { beforeEach, describe, expect, it } from "vitest";
import type { Todo } from "../../domain/entities/todo.js";
import type { User } from "../../domain/entities/user.js";
import { PermissionDeniedError, TodoNotFoundError, UnauthenticatedError } from "../errors.js";
import { InMemoryTodoRepository } from "../testing/in-memory-todo-repository.js";
import { InMemoryUserRepository } from "../testing/in-memory-user-repository.js";
import { deleteTodo } from "./delete-todo.js";

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

describe("deleteTodo", () => {
  it("allows admin to delete another user's todo", async () => {
    await deleteTodo({ todoRepository, userRepository })({
      actorId: admin.id,
      todoId: aliceTodo.id,
    });

    expect(await todoRepository.findById(aliceTodo.id)).toBeNull();
  });

  it("allows a member to delete their own todo", async () => {
    await deleteTodo({ todoRepository, userRepository })({
      actorId: alice.id,
      todoId: aliceTodo.id,
    });

    expect(await todoRepository.findById(aliceTodo.id)).toBeNull();
  });

  it("denies a member from deleting another member's todo", async () => {
    await expect(
      deleteTodo({ todoRepository, userRepository })({
        actorId: bob.id,
        todoId: aliceTodo.id,
      }),
    ).rejects.toThrow(PermissionDeniedError);
  });

  it("throws TodoNotFoundError before checking permission for a missing todo", async () => {
    await expect(
      deleteTodo({ todoRepository, userRepository })({
        actorId: bob.id,
        todoId: "missing-id",
      }),
    ).rejects.toThrow(TodoNotFoundError);
  });

  it("throws UnauthenticatedError when actorId does not resolve to a user", async () => {
    await expect(
      deleteTodo({ todoRepository, userRepository })({
        actorId: "unknown",
        todoId: aliceTodo.id,
      }),
    ).rejects.toThrow(UnauthenticatedError);
  });
});
