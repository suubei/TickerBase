import express from "express";

export function createHealthRoutes() {
  const router = express.Router();

  router.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  return router;
}
