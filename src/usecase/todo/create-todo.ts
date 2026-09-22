import type { Todo } from "../../domain/entities/todo.js";
import type { TodoRepository } from "../../domain/repositories/todo-repository.js";
import type { UserRepository } from "../../domain/repositories/user-repository.js";
import { UnauthenticatedError } from "../errors.js";

export type CreateTodoDeps = {
  todoRepository: TodoRepository;
  userRepository: UserRepository;
};

export type CreateTodoInput = {
  actorId: string;
  title: string;
};

export function createTodo(deps: CreateTodoDeps) {
  return async (input: CreateTodoInput): Promise<Todo> => {
    const actor = await deps.userRepository.findById(input.actorId);
    if (!actor) throw new UnauthenticatedError();

    const now = new Date();
    const todo: Todo = {
      id: crypto.randomUUID(),
      title: input.title,
      completed: false,
      ownerId: actor.id,
      createdAt: now,
      updatedAt: now,
    };
    await deps.todoRepository.save(todo);
    return todo;
  };
}
