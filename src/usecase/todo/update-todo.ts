import type { Todo } from "../../domain/entities/todo.js";
import type { TodoRepository } from "../../domain/repositories/todo-repository.js";
import type { UserRepository } from "../../domain/repositories/user-repository.js";
import { canModifyTodo } from "../../domain/services/todo-permission.js";
import { PermissionDeniedError, TodoNotFoundError, UnauthenticatedError } from "../errors.js";

export type UpdateTodoDeps = {
  todoRepository: TodoRepository;
  userRepository: UserRepository;
};

export type UpdateTodoInput = {
  actorId: string;
  todoId: string;
  title?: string;
  completed?: boolean;
};

export function updateTodo(deps: UpdateTodoDeps) {
  return async (input: UpdateTodoInput): Promise<Todo> => {
    const actor = await deps.userRepository.findById(input.actorId);
    if (!actor) throw new UnauthenticatedError();

    const todo = await deps.todoRepository.findById(input.todoId);
    if (!todo) throw new TodoNotFoundError();

    if (!canModifyTodo(actor, todo)) throw new PermissionDeniedError();

    const updated: Todo = {
      ...todo,
      title: input.title ?? todo.title,
      completed: input.completed ?? todo.completed,
      updatedAt: new Date(),
    };
    await deps.todoRepository.save(updated);
    return updated;
  };
}
