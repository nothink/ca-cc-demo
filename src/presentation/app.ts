import { OpenAPIHono } from "@hono/zod-openapi";
import { Scalar } from "@scalar/hono-api-reference";
import { createTodoRoutes, type TodoRoutesDeps } from "./routes/todo-routes.js";

export function createApp(deps: TodoRoutesDeps): OpenAPIHono {
  const app = new OpenAPIHono();

  app.route("/", createTodoRoutes(deps));

  app.doc("/openapi.json", {
    openapi: "3.0.0",
    info: {
      title: "Clean Architecture x Claude Code demo",
      version: "1.0.0",
    },
  });

  app.get("/docs", Scalar({ url: "/openapi.json" }));

  return app;
}
