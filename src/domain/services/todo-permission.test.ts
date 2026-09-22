import { describe, expect, it } from "vitest";
import type { Todo } from "../entities/todo.js";
import type { User } from "../entities/user.js";
import { canModifyTodo } from "./todo-permission.js";

const admin: User = { id: "admin-id", name: "admin", role: "admin" };
const alice: User = { id: "alice-id", name: "alice", role: "member" };
const bob: User = { id: "bob-id", name: "bob", role: "member" };

const aliceTodo: Todo = {
  id: "todo-1",
  title: "alice's todo",
  completed: false,
  ownerId: alice.id,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("canModifyTodo", () => {
  it("allows admin to modify any todo", () => {
    expect(canModifyTodo(admin, aliceTodo)).toBe(true);
  });

  it("allows a member to modify their own todo", () => {
    expect(canModifyTodo(alice, aliceTodo)).toBe(true);
  });

  it("denies a member from modifying another member's todo", () => {
    expect(canModifyTodo(bob, aliceTodo)).toBe(false);
  });
});
