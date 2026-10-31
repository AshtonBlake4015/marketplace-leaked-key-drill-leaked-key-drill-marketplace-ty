import { z } from "zod";
import type { InfraiClient } from "./infrai_client.js";

export const drillInputSchema = z.object({
  incidentId: z.string().min(1),
  sellerAssets: z.array(z.object({
    assetId: z.string().min(1),
    sellerId: z.string().min(1),
    kind: z.enum(["listing", "inventory", "payout_profile"])
  })).min(1),
  buyerUpdates: z.array(z.object({
    updateId: z.string().min(1),
    assetId: z.string().min(1),
    buyerId: z.string().min(1)
  })),
  orderHandoff: z.object({
    orderId: z.string().min(1),
    assetId: z.string().min(1),
    state: z.literal("ready")
  })
});

export type DrillInput = z.infer<typeof drillInputSchema>;

export type MarketplaceDecision = {
  exposedAssetIds: string[];
  buyerUpdateIdsToReplay: string[];
  orderHandoff: { orderId: string; state: "paused" | "ready" };
};

export function decideMarketplaceHandoff(input: DrillInput, logEvidence: unknown): MarketplaceDecision {
  const evidence = JSON.stringify(logEvidence);
  const exposedAssetIds = input.sellerAssets
    .map((asset) => asset.assetId)
    .filter((assetId) => evidence.includes(assetId));
  const exposed = new Set(exposedAssetIds);

  return {
    exposedAssetIds,
    buyerUpdateIdsToReplay: input.buyerUpdates
      .filter((update) => exposed.has(update.assetId))
      .map((update) => update.updateId),
    orderHandoff: {
      orderId: input.orderHandoff.orderId,
      state: exposed.has(input.orderHandoff.assetId) ? "paused" : "ready"
    }
  };
}

function requiredKeyId(created: Record<string, unknown>): string {
  const value = created.id ?? created.key_id;
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("Key creation response did not contain an identifier");
  }
  return value;
}

export async function runMarketplaceDrill(client: InfraiClient, input: DrillInput) {
  const created = await client.createDrillKey(`${input.incidentId}:create`);
  const keyId = requiredKeyId(created);

  try {
    await client.reportCompromise(keyId);
    const assetTerms = input.sellerAssets.map((asset) => asset.assetId).join(" OR ");
    const logEvidence = await client.searchLogs(assetTerms);
    await client.rotateDrillKey(keyId, `${input.incidentId}:rotate`);
    const keys = await client.listKeys();

    return {
      incidentId: input.incidentId,
      temporaryKeyId: keyId,
      rotationConfirmed: JSON.stringify(keys).includes(keyId),
      ...decideMarketplaceHandoff(input, logEvidence)
    };
  } finally {
    await client.revokeDrillKey(keyId);
  }
}
