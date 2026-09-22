import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import type { Todo } from "../../domain/entities/todo.js";
import type { TodoRepository } from "../../domain/repositories/todo-repository.js";
import type { UserRepository } from "../../domain/repositories/user-repository.js";
import {
  PermissionDeniedError,
  TodoNotFoundError,
  UnauthenticatedError,
} from "../../usecase/errors.js";
import { createTodo } from "../../usecase/todo/create-todo.js";
import { deleteTodo } from "../../usecase/todo/delete-todo.js";
import { listTodos } from "../../usecase/todo/list-todos.js";
import { updateTodo } from "../../usecase/todo/update-todo.js";
import {
  CreateTodoBodySchema,
  ErrorResponseSchema,
  TodoIdParamSchema,
  TodoListQuerySchema,
  TodoSchema,
  UpdateTodoBodySchema,
} from "../schemas/todo-schemas.js";

function toResponse(todo: Todo) {
  return {
    id: todo.id,
    title: todo.title,
    completed: todo.completed,
    ownerId: todo.ownerId,
    createdAt: todo.createdAt.toISOString(),
    updatedAt: todo.updatedAt.toISOString(),
  };
}

function getActorId(c: {
  req: { header: (name: string) => string | undefined };
}): string | undefined {
  return c.req.header("X-User-Id");
}

const listRoute = createRoute({
  method: "get",
  path: "/todos",
  request: { query: TodoListQuerySchema },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(TodoSchema) } },
      description: "Todo一覧",
    },
    401: {
      content: { "application/json": { schema: ErrorResponseSchema } },
      description: "未認証",
    },
  },
});

const createRouteDef = createRoute({
  method: "post",
  path: "/todos",
  request: { body: { content: { "application/json": { schema: CreateTodoBodySchema } } } },
  responses: {
    201: { content: { "application/json": { schema: TodoSchema } }, description: "作成されたTodo" },
    401: {
      content: { "application/json": { schema: ErrorResponseSchema } },
      description: "未認証",
    },
  },
});

const updateRoute = createRoute({
  method: "patch",
  path: "/todos/{id}",
  request: {
    params: TodoIdParamSchema,
    body: { content: { "application/json": { schema: UpdateTodoBodySchema } } },
  },
  responses: {
    200: { content: { "application/json": { schema: TodoSchema } }, description: "更新されたTodo" },
    401: {
      content: { "application/json": { schema: ErrorResponseSchema } },
      description: "未認証",
    },
    403: {
      content: { "application/json": { schema: ErrorResponseSchema } },
      description: "権限なし",
    },
    404: {
      content: { "application/json": { schema: ErrorResponseSchema } },
      description: "Todoが存在しない",
    },
  },
});

const deleteRoute = createRoute({
  method: "delete",
  path: "/todos/{id}",
  request: { params: TodoIdParamSchema },
  responses: {
    204: { description: "削除成功" },
    401: {
      content: { "application/json": { schema: ErrorResponseSchema } },
      description: "未認証",
    },
    403: {
      content: { "application/json": { schema: ErrorResponseSchema } },
      description: "権限なし",
    },
    404: {
      content: { "application/json": { schema: ErrorResponseSchema } },
      description: "Todoが存在しない",
    },
  },
});

export type TodoRoutesDeps = {
  todoRepository: TodoRepository;
  userRepository: UserRepository;
};

export function createTodoRoutes(deps: TodoRoutesDeps) {
  const app = new OpenAPIHono({
    defaultHook: (result, c) => {
      if (!result.success) {
        return c.json({ error: result.error.issues[0]?.message ?? "invalid request" }, 400);
      }
    },
  });

  app.openapi(listRoute, async (c) => {
    const actorId = getActorId(c);
    if (!actorId) return c.json({ error: "X-User-Id header is required" }, 401);

    try {
      const { ownerId } = c.req.valid("query");
      const todos = await listTodos(deps)(
        ownerId === undefined ? { actorId } : { actorId, ownerId },
      );
      return c.json(todos.map(toResponse), 200);
    } catch (error) {
      if (error instanceof UnauthenticatedError)
        return c.json({ error: error.message || "unauthenticated" }, 401);
      throw error;
    }
  });

  app.openapi(createRouteDef, async (c) => {
    const actorId = getActorId(c);
    if (!actorId) return c.json({ error: "X-User-Id header is required" }, 401);

    try {
      const { title } = c.req.valid("json");
      const todo = await createTodo(deps)({ actorId, title });
      return c.json(toResponse(todo), 201);
    } catch (error) {
      if (error instanceof UnauthenticatedError)
        return c.json({ error: error.message || "unauthenticated" }, 401);
      throw error;
    }
  });

  app.openapi(updateRoute, async (c) => {
    const actorId = getActorId(c);
    if (!actorId) return c.json({ error: "X-User-Id header is required" }, 401);

    try {
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      const todo = await updateTodo(deps)({
        actorId,
        todoId: id,
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.completed !== undefined ? { completed: body.completed } : {}),
      });
      return c.json(toResponse(todo), 200);
    } catch (error) {
      if (error instanceof UnauthenticatedError)
        return c.json({ error: error.message || "unauthenticated" }, 401);
      if (error instanceof PermissionDeniedError)
        return c.json({ error: error.message || "permission denied" }, 403);
      if (error instanceof TodoNotFoundError)
        return c.json({ error: error.message || "todo not found" }, 404);
      throw error;
    }
  });

  app.openapi(deleteRoute, async (c) => {
    const actorId = getActorId(c);
    if (!actorId) return c.json({ error: "X-User-Id header is required" }, 401);

    try {
      const { id } = c.req.valid("param");
      await deleteTodo(deps)({ actorId, todoId: id });
      return c.body(null, 204);
    } catch (error) {
      if (error instanceof UnauthenticatedError)
        return c.json({ error: error.message || "unauthenticated" }, 401);
      if (error instanceof PermissionDeniedError)
        return c.json({ error: error.message || "permission denied" }, 403);
      if (error instanceof TodoNotFoundError)
        return c.json({ error: error.message || "todo not found" }, 404);
      throw error;
    }
  });

  return app;
}
