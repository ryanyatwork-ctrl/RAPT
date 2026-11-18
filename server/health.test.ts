import express from "express";
import type { AddressInfo } from "net";
import type { Server } from "http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NOINDEX_ROBOTS_TXT, registerHealthRoutes } from "./_core/health";

const getDb = vi.hoisted(() => vi.fn());
vi.mock("./db", () => ({ getDb: () => getDb() }));

let server: Server;
let baseUrl: string;

beforeEach(async () => {
  const app = express();
  registerHealthRoutes(app);
  app.get("/robots.txt", (_req, res) => res.type("text/plain").send("static robots"));
  // Mirrors the SPA fallback in serveStatic().
  app.use("*", (_req, res) => res.type("text/html").send("<title>SPA</title>"));
  server = await new Promise<Server>(resolve => {
    const s = app.listen(0, () => resolve(s));
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterEach(async () => {
  getDb.mockReset();
  await new Promise(resolve => server.close(resolve));
});

describe("/health", () => {
  it.each(["/health", "/api/health"])("%s returns JSON 200 when the database responds", async path => {
    getDb.mockResolvedValue({ execute: vi.fn().mockResolvedValue([[{ 1: 1 }]]) });
    const res = await fetch(baseUrl + path);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/application\/json/);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.checks.database.status).toBe("ok");
  });

  it("returns 503 JSON when the database query fails", async () => {
    getDb.mockResolvedValue({ execute: vi.fn().mockRejectedValue(new Error("ECONNREFUSED")) });
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(503);
    expect(res.headers.get("content-type")).toMatch(/application\/json/);
    const body = await res.json();
    expect(body.status).toBe("error");
    expect(body.checks.database.error).toContain("ECONNREFUSED");
  });

  it("returns 503 JSON when the database is not configured", async () => {
    getDb.mockResolvedValue(null);
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(503);
    expect((await res.json()).status).toBe("error");
  });
});

describe("/robots.txt", () => {
  it("serves disallow-all text/plain on the engine host", async () => {
    const res = await fetch(`${baseUrl}/robots.txt`, {
      headers: { "x-forwarded-host": "engine.bellevillesystems.com" },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/text\/plain/);
    expect(await res.text()).toBe(NOINDEX_ROBOTS_TXT);
  });

  it("falls through to the static robots.txt on other hosts", async () => {
    const res = await fetch(`${baseUrl}/robots.txt`);
    expect(await res.text()).toBe("static robots");
  });
});

it("keeps the SPA fallback for other paths", async () => {
  const res = await fetch(`${baseUrl}/dashboard`);
  expect(res.headers.get("content-type")).toMatch(/text\/html/);
});
