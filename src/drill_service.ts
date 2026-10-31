import express from "express";
import { ZodError } from "zod";
import { InfraiError, infraiFromEnvironment } from "./infrai_client.js";
import { drillInputSchema, runMarketplaceDrill } from "./marketplace_drill.js";

export function createDrillService() {
  const app = express();
  app.use(express.json({ limit: "32kb" }));

  app.post("/drills/leaked-key", async (request, response) => {
    try {
      const input = drillInputSchema.parse(request.body);
      const result = await runMarketplaceDrill(infraiFromEnvironment(), input);
      response.status(200).json(result);
    } catch (error) {
      if (error instanceof ZodError) {
        response.status(400).json({ error: "invalid_drill_request", issues: error.issues });
        return;
      }
      if (error instanceof InfraiError) {
        const status = error.status >= 400 && error.status < 500 ? error.status : 502;
        response.status(status).json({ error: error.code });
        return;
      }
      response.status(500).json({ error: "drill_failed" });
    }
  });

  return app;
}

if (process.argv[1]?.endsWith("drill_service.ts")) {
  const port = Number(process.env.PORT ?? "3000");
  createDrillService().listen(port, () => {
    console.log(`Marketplace drill service listening on http://localhost:${port}`);
  });
}
