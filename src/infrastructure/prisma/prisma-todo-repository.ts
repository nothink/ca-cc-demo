import type { PrismaClient, Todo as PrismaTodo } from "@prisma/client";
import type { Todo } from "../../domain/entities/todo.js";
import type { TodoRepository } from "../../domain/repositories/todo-repository.js";

function toEntity(record: PrismaTodo): Todo {
  return {
    id: record.id,
    title: record.title,
    completed: record.completed,
    ownerId: record.ownerId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export class PrismaTodoRepository implements TodoRepository {
  constructor(private readonly client: PrismaClient) {}

  async findById(id: string): Promise<Todo | null> {
    const record = await this.client.todo.findUnique({ where: { id } });
    return record ? toEntity(record) : null;
  }

  async findAll(): Promise<Todo[]> {
    const records = await this.client.todo.findMany({ orderBy: { createdAt: "asc" } });
    return records.map(toEntity);
  }

  async findByOwnerId(ownerId: string): Promise<Todo[]> {
    const records = await this.client.todo.findMany({
      where: { ownerId },
      orderBy: { createdAt: "asc" },
    });
    return records.map(toEntity);
  }

  async save(todo: Todo): Promise<void> {
    await this.client.todo.upsert({
      where: { id: todo.id },
      create: {
        id: todo.id,
        title: todo.title,
        completed: todo.completed,
        ownerId: todo.ownerId,
        createdAt: todo.createdAt,
        updatedAt: todo.updatedAt,
      },
      update: {
        title: todo.title,
        completed: todo.completed,
        updatedAt: todo.updatedAt,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.client.todo.deleteMany({ where: { id } });
  }
}
