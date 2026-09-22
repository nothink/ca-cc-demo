import type { Todo } from "../../domain/entities/todo.js";
import type { TodoRepository } from "../../domain/repositories/todo-repository.js";

export class InMemoryTodoRepository implements TodoRepository {
  private readonly todos = new Map<string, Todo>();

  async findById(id: string): Promise<Todo | null> {
    return this.todos.get(id) ?? null;
  }

  async findAll(): Promise<Todo[]> {
    return this.sortByCreatedAt([...this.todos.values()]);
  }

  async findByOwnerId(ownerId: string): Promise<Todo[]> {
    return this.sortByCreatedAt(
      [...this.todos.values()].filter((todo) => todo.ownerId === ownerId),
    );
  }

  async save(todo: Todo): Promise<void> {
    this.todos.set(todo.id, todo);
  }

  async delete(id: string): Promise<void> {
    this.todos.delete(id);
  }

  private sortByCreatedAt(todos: Todo[]): Todo[] {
    return [...todos].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
}
