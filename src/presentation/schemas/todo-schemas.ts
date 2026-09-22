import { z } from "@hono/zod-openapi";

export const TodoSchema = z
  .object({
    id: z.string().openapi({ example: "1e9c9c1a-0000-4000-8000-000000000000" }),
    title: z.string().openapi({ example: "buy milk" }),
    completed: z.boolean().openapi({ example: false }),
    ownerId: z.string().openapi({ example: "22222222-2222-4222-8222-222222222222" }),
    createdAt: z.iso.datetime().openapi({ example: "2024-01-01T00:00:00.000Z" }),
    updatedAt: z.iso.datetime().openapi({ example: "2024-01-01T00:00:00.000Z" }),
  })
  .openapi("Todo");

export const TodoListQuerySchema = z.object({
  ownerId: z.string().optional().openapi({ example: "22222222-2222-4222-8222-222222222222" }),
});

export const TodoIdParamSchema = z.object({
  id: z.string().openapi({
    param: { name: "id", in: "path" },
    example: "1e9c9c1a-0000-4000-8000-000000000000",
  }),
});

export const CreateTodoBodySchema = z
  .object({
    title: z.string().min(1).openapi({ example: "buy milk" }),
  })
  .openapi("CreateTodoBody");

export const UpdateTodoBodySchema = z
  .object({
    title: z.string().min(1).optional().openapi({ example: "buy oat milk" }),
    completed: z.boolean().optional().openapi({ example: true }),
  })
  .openapi("UpdateTodoBody");

export const ErrorResponseSchema = z
  .object({
    error: z.string().openapi({ example: "not found" }),
  })
  .openapi("ErrorResponse");

export const UserIdHeaderSchema = z.object({
  "x-user-id": z.string().openapi({ example: "22222222-2222-4222-8222-222222222222" }),
});
