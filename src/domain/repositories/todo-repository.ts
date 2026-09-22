import type { Todo } from "../entities/todo.js";

export interface TodoRepository {
  findById(id: string): Promise<Todo | null>;
  findAll(): Promise<Todo[]>;
  findByOwnerId(ownerId: string): Promise<Todo[]>;
  save(todo: Todo): Promise<void>;
  delete(id: string): Promise<void>;
}
