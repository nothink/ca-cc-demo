import type { Todo } from "../../domain/entities/todo.js";
import type { TodoRepository } from "../../domain/repositories/todo-repository.js";
import type { UserRepository } from "../../domain/repositories/user-repository.js";
import { UnauthenticatedError } from "../errors.js";

export type ListTodosDeps = {
  todoRepository: TodoRepository;
  userRepository: UserRepository;
};

export type ListTodosInput = {
  actorId: string;
  ownerId?: string;
};

export function listTodos(deps: ListTodosDeps) {
  return async (input: ListTodosInput): Promise<Todo[]> => {
    const actor = await deps.userRepository.findById(input.actorId);
    if (!actor) throw new UnauthenticatedError();

    if (input.ownerId !== undefined) {
      return deps.todoRepository.findByOwnerId(input.ownerId);
    }
    return deps.todoRepository.findAll();
  };
}
