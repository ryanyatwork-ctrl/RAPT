import type { Express, Request, Response } from "express";
import { and, eq } from "drizzle-orm";
import { properties } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { getDb, getEventsByPropertyId, getPricingRuleByPropertyId } from "./db";
import { generateMonthPricing } from "./pricingEngine";

function extractApiKey(req: Request): string {
  const direct = req.header("x-api-key");
  if (direct) return direct;

  const authorization = req.header("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

function authorized(req: Request): boolean {
  if (!ENV.publicPricingApiKey) {
    // Never expose enumerable pricing data without an API key in production.
    return !ENV.isProduction;
  }
  return extractApiKey(req) === ENV.publicPricingApiKey;
}

async function handleMonthPricing(req: Request, res: Response) {
  if (!authorized(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const propertyIdRaw = req.params.propertyId || req.query.propertyId;
  const yearRaw = req.query.year;
  const monthRaw = req.query.month;
  const propertyId = Number(propertyIdRaw);
  const year = Number(yearRaw);
  const month = Number(monthRaw);

  if (!Number.isInteger(propertyId) || propertyId <= 0) {
    return res.status(400).json({ error: "A valid numeric propertyId is required." });
  }
  if (!Number.isInteger(year) || year < 2024 || year > 2100) {
    return res.status(400).json({ error: "A valid year is required." });
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return res.status(400).json({ error: "A valid month from 1 through 12 is required." });
  }

  const db = await getDb();
  if (!db) {
    return res.status(503).json({ error: "Pricing database is unavailable." });
  }

  const propertyRows = await db
    .select()
    .from(properties)
    .where(and(eq(properties.id, propertyId), eq(properties.isActive, true)))
    .limit(1);
  const property = propertyRows[0];
  if (!property) {
    return res.status(404).json({ error: "Property not found." });
  }

  const rules = await getPricingRuleByPropertyId(propertyId);
  if (!rules) {
    return res.status(409).json({ error: "Pricing rules are not configured for this property." });
  }

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  const events = await getEventsByPropertyId(propertyId, start, end);
  const basePrice = Number(property.basePrice);
  if (!Number.isFinite(basePrice) || basePrice <= 0) {
    return res.status(409).json({ error: "Property base price is invalid." });
  }

  const pricing = generateMonthPricing(basePrice, year, month, events, rules);

  return res.json({
    schemaVersion: "2026-08-31",
    propertyId,
    year,
    month,
    currency: "USD",
    pricing,
    generatedAt: new Date().toISOString(),
  });
}

export function registerPublicPricingRoutes(app: Express) {
  app.get("/api/public/pricing/:propertyId", (req, res) => {
    void handleMonthPricing(req, res).catch((error) => {
      console.error("[RAPT public pricing] failed:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Pricing generation failed." });
      }
    });
  });

  // Compatibility form used by early Getaway site adapters.
  app.get("/api/public/pricing", (req, res) => {
    void handleMonthPricing(req, res).catch((error) => {
      console.error("[RAPT public pricing] failed:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Pricing generation failed." });
      }
    });
  });
}
