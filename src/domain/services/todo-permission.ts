import type { Todo } from "../entities/todo.js";
import type { User } from "../entities/user.js";

export function canModifyTodo(user: User, todo: Todo): boolean {
  if (user.role === "admin") return true;
  return todo.ownerId === user.id;
}
