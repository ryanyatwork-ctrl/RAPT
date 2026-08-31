import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { properties } from "../drizzle/schema";
import { getDb, getEventsByPropertyId, getPricingRuleByPropertyId } from "../server/db";
import { generateMonthPricing } from "../server/pricingEngine";
import {
  getOwnerRezIntegrationStatus,
  publishOwnerRezSpotRates,
} from "../server/integrations/ownerrez";

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

async function main() {
  const propertyId = Number(arg("property"));
  const year = Number(arg("year"));
  const month = Number(arg("month"));
  const publish = process.argv.includes("--publish");

  if (!Number.isInteger(propertyId) || propertyId <= 0) {
    throw new Error("Use --property=<RAPT numeric property id>.");
  }
  if (!Number.isInteger(year) || year < 2024 || year > 2100) {
    throw new Error("Use --year=<YYYY>.");
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("Use --month=<1-12>.");
  }

  const status = getOwnerRezIntegrationStatus();
  console.log("OwnerRez integration status:", status);

  const db = await getDb();
  if (!db) throw new Error("Database not available.");

  const rows = await db
    .select()
    .from(properties)
    .where(and(eq(properties.id, propertyId), eq(properties.isActive, true)))
    .limit(1);
  const property = rows[0];
  if (!property) throw new Error(`RAPT property ${propertyId} was not found.`);

  const rules = await getPricingRuleByPropertyId(propertyId);
  if (!rules) throw new Error(`No pricing rules configured for RAPT property ${propertyId}.`);

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  const events = await getEventsByPropertyId(propertyId, start, end);
  const pricing = generateMonthPricing(Number(property.basePrice), year, month, events, rules);

  const result = await publishOwnerRezSpotRates({
    raptPropertyId: propertyId,
    pricing,
    dryRun: !publish,
  });

  console.log(JSON.stringify(result, null, 2));

  if (!publish) {
    console.log("Dry run only. Re-run with --publish after validating the mapping and rates.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
