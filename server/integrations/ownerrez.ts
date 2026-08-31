import { ENV } from "../_core/env";

export type RaptNightlyPrice = {
  date: string;
  suggestedPrice: number;
};

export type OwnerRezSpotRate = {
  property_id: number;
  date: string;
  amount: number;
  currency: "USD";
};

function parsePropertyMap(): Record<string, number> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(ENV.ownerRezPropertyMapJson || "{}");
  } catch {
    throw new Error("OWNERREZ_PROPERTY_MAP_JSON is not valid JSON.");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("OWNERREZ_PROPERTY_MAP_JSON must be an object mapping RAPT property IDs to OwnerRez property IDs.");
  }

  const result: Record<string, number> = {};
  for (const [raptId, ownerRezId] of Object.entries(parsed as Record<string, unknown>)) {
    const numeric = Number(ownerRezId);
    if (!Number.isInteger(numeric) || numeric <= 0) {
      throw new Error(`Invalid OwnerRez property ID mapped from RAPT property ${raptId}.`);
    }
    result[String(raptId)] = numeric;
  }
  return result;
}

export function getOwnerRezIntegrationStatus() {
  let mappingValid = true;
  let mappedProperties = 0;
  let mappingError: string | undefined;
  try {
    mappedProperties = Object.keys(parsePropertyMap()).length;
  } catch (error: any) {
    mappingValid = false;
    mappingError = error?.message || String(error);
  }

  const credentialsConfigured = Boolean(ENV.ownerRezEmail && ENV.ownerRezToken);

  return {
    enabled: ENV.ownerRezEnabled,
    credentialsConfigured,
    mappingValid,
    mappedProperties,
    mappingError,
    ready:
      ENV.ownerRezEnabled &&
      credentialsConfigured &&
      mappingValid &&
      mappedProperties > 0,
    baseUrl: ENV.ownerRezBaseUrl,
  };
}

export function buildOwnerRezSpotRates(
  raptPropertyId: number,
  pricing: RaptNightlyPrice[]
): OwnerRezSpotRate[] {
  const propertyMap = parsePropertyMap();
  const ownerRezPropertyId = propertyMap[String(raptPropertyId)];
  if (!ownerRezPropertyId) {
    throw new Error(`No OwnerRez property mapping exists for RAPT property ${raptPropertyId}.`);
  }

  return pricing.map((day) => {
    const amount = Number(day.suggestedPrice);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day.date)) {
      throw new Error(`Invalid RAPT rate date: ${day.date}`);
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error(`Invalid RAPT rate amount for ${day.date}: ${day.suggestedPrice}`);
    }

    return {
      property_id: ownerRezPropertyId,
      date: day.date,
      amount: Math.round(amount * 100) / 100,
      currency: "USD",
    };
  });
}

export async function publishOwnerRezSpotRates(options: {
  raptPropertyId: number;
  pricing: RaptNightlyPrice[];
  dryRun?: boolean;
}) {
  const rates = buildOwnerRezSpotRates(options.raptPropertyId, options.pricing);

  if (options.dryRun !== false) {
    return {
      published: false,
      dryRun: true,
      count: rates.length,
      rates,
    };
  }

  if (!ENV.ownerRezEnabled) {
    throw new Error("OwnerRez publishing is disabled. Set OWNERREZ_ENABLED=true only after enrollment and migration validation.");
  }
  if (!ENV.ownerRezEmail || !ENV.ownerRezToken) {
    throw new Error("OwnerRez credentials are not configured.");
  }

  const authorization = Buffer.from(`${ENV.ownerRezEmail}:${ENV.ownerRezToken}`).toString("base64");
  const response = await fetch(`${ENV.ownerRezBaseUrl.replace(/\/+$/, "")}/v2/spotrates`, {
    method: "PATCH",
    headers: {
      Authorization: `Basic ${authorization}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "RAPT/1.0 (Belleville Systems)",
    },
    body: JSON.stringify(rates),
  });

  const responseText = await response.text();
  let responseBody: unknown = responseText;
  if (responseText) {
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      // Preserve non-JSON error text for troubleshooting.
    }
  }

  if (!response.ok) {
    throw new Error(
      `OwnerRez nightly-rate publish failed (${response.status} ${response.statusText}): ${responseText || "no response body"}`
    );
  }

  return {
    published: true,
    dryRun: false,
    count: rates.length,
    response: responseBody,
  };
}
