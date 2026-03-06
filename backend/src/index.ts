import cors from "cors";
import express from "express";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { createHealthRoutes } from "./routes/healthRoutes";
import { createSettingsRoutes } from "./routes/settingsRoutes";
import { createStocksRoutes } from "./routes/stocksRoutes";
import { createWatchlistRoutes } from "./routes/watchlistRoutes";

const prisma = new PrismaClient();
const app = express();
const port = Number(process.env.PORT ?? 3000);
const reportsDir = path.resolve(process.cwd(), "reports");

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json({ limit: "2mb" }));

app.use("/api", createHealthRoutes());
app.use("/api", createStocksRoutes({ prisma, reportsDir }));
app.use("/api", createWatchlistRoutes({ prisma }));
app.use("/api", createSettingsRoutes({ prisma }));

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof SyntaxError) {
    return res.status(400).json({ error: "Invalid JSON payload" });
  }
  console.error(err);
  return res.status(500).json({ error: "Internal server error" });
});

app.listen(port, () => {
  console.log(`Backend server running on http://localhost:${port}`);
});
