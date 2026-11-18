import type { Express, Request, Response } from "express";
import { sql } from "drizzle-orm";
import { getDb } from "../db";

const DB_CHECK_TIMEOUT_MS = 3000;

// Hosts that serve the app/engine rather than public marketing pages. These
// must not be indexed, so they get a disallow-all robots.txt.
const NOINDEX_HOST_PREFIXES = ["engine."];

export const NOINDEX_ROBOTS_TXT = "User-agent: *\nDisallow: /\n";

type CheckResult = { status: "ok" | "error"; error?: string; latencyMs?: number };

async function checkDatabase(): Promise<CheckResult> {
  const started = Date.now();
  try {
    const db = await getDb();
    if (!db) return { status: "error", error: "database not configured" };

    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("database check timed out")), DB_CHECK_TIMEOUT_MS);
    });
    try {
      await Promise.race([db.execute(sql`select 1`), timeout]);
    } finally {
      clearTimeout(timer);
    }
    return { status: "ok", latencyMs: Date.now() - started };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "database check failed",
      latencyMs: Date.now() - started,
    };
  }
}

async function handleHealth(_req: Request, res: Response) {
  const database = await checkDatabase();
  const ok = database.status === "ok";
  res
    .status(ok ? 200 : 503)
    .set("Cache-Control", "no-cache, no-store, must-revalidate")
    .json({
      status: ok ? "ok" : "error",
      service: "rapt-engine",
      time: new Date().toISOString(),
      checks: { database },
    });
}

export function isNoindexHost(host: string | undefined): boolean {
  const hostname = (host || "").toLowerCase().split(":")[0];
  return NOINDEX_HOST_PREFIXES.some(prefix => hostname.startsWith(prefix));
}

function handleRobots(req: Request, res: Response, next: () => void) {
  const host = req.header("x-forwarded-host") || req.header("host");
  if (!isNoindexHost(host)) return next(); // fall through to the static robots.txt
  res
    .status(200)
    .type("text/plain")
    .set("X-Robots-Tag", "noindex, nofollow")
    .send(NOINDEX_ROBOTS_TXT);
}

/**
 * Real backend health and robots routes. Must be registered before the SPA
 * static/fallback handler so these paths never return index.html.
 */
export function registerHealthRoutes(app: Express) {
  app.get(["/health", "/api/health"], handleHealth);
  app.get("/robots.txt", handleRobots);
}
