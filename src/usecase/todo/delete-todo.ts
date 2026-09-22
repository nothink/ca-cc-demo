import type { TodoRepository } from "../../domain/repositories/todo-repository.js";
import type { UserRepository } from "../../domain/repositories/user-repository.js";
import { canModifyTodo } from "../../domain/services/todo-permission.js";
import { PermissionDeniedError, TodoNotFoundError, UnauthenticatedError } from "../errors.js";

export type DeleteTodoDeps = {
  todoRepository: TodoRepository;
  userRepository: UserRepository;
};

export type DeleteTodoInput = {
  actorId: string;
  todoId: string;
};

export function deleteTodo(deps: DeleteTodoDeps) {
  return async (input: DeleteTodoInput): Promise<void> => {
    const actor = await deps.userRepository.findById(input.actorId);
    if (!actor) throw new UnauthenticatedError();

    const todo = await deps.todoRepository.findById(input.todoId);
    if (!todo) throw new TodoNotFoundError();

    if (!canModifyTodo(actor, todo)) throw new PermissionDeniedError();

    await deps.todoRepository.delete(input.todoId);
  };
}
