import { asc, eq } from "drizzle-orm";
import type { Todo } from "../../domain/entities/todo.js";
import type { TodoRepository } from "../../domain/repositories/todo-repository.js";
import type { DrizzleClient } from "./client.js";
import { todos } from "./schema/todo.js";

type TodoRow = typeof todos.$inferSelect;

function toEntity(record: TodoRow): Todo {
  return {
    id: record.id,
    title: record.title,
    completed: record.completed,
    ownerId: record.ownerId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export class DrizzleTodoRepository implements TodoRepository {
  constructor(private readonly client: DrizzleClient) {}

  async findById(id: string): Promise<Todo | null> {
    const [record] = await this.client.select().from(todos).where(eq(todos.id, id));
    return record ? toEntity(record) : null;
  }

  async findAll(): Promise<Todo[]> {
    const records = await this.client.select().from(todos).orderBy(asc(todos.createdAt));
    return records.map(toEntity);
  }

  async findByOwnerId(ownerId: string): Promise<Todo[]> {
    const records = await this.client
      .select()
      .from(todos)
      .where(eq(todos.ownerId, ownerId))
      .orderBy(asc(todos.createdAt));
    return records.map(toEntity);
  }

  async save(todo: Todo): Promise<void> {
    await this.client
      .insert(todos)
      .values({
        id: todo.id,
        title: todo.title,
        completed: todo.completed,
        ownerId: todo.ownerId,
        createdAt: todo.createdAt,
        updatedAt: todo.updatedAt,
      })
      .onConflictDoUpdate({
        target: todos.id,
        set: {
          title: todo.title,
          completed: todo.completed,
          updatedAt: todo.updatedAt,
        },
      });
  }

  async delete(id: string): Promise<void> {
    await this.client.delete(todos).where(eq(todos.id, id));
  }
}
