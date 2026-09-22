import { serve } from "@hono/node-server";
import { createContainer } from "./infrastructure/container.js";
import { createApp } from "./presentation/app.js";

const app = createApp(createContainer());

serve({ fetch: app.fetch, port: Number(process.env.PORT ?? 3000) });
