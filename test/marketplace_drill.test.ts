import assert from "node:assert/strict";
import test from "node:test";
import { decideMarketplaceHandoff, drillInputSchema } from "../src/marketplace_drill.js";

test("an exposed seller listing pauses its order and queues only affected buyer updates", () => {
  const input = drillInputSchema.parse({
    incidentId: "incident-44",
    sellerAssets: [
      { assetId: "listing-11", sellerId: "seller-7", kind: "listing" },
      { assetId: "listing-12", sellerId: "seller-8", kind: "listing" }
    ],
    buyerUpdates: [
      { updateId: "update-a", assetId: "listing-11", buyerId: "buyer-2" },
      { updateId: "update-b", assetId: "listing-12", buyerId: "buyer-3" }
    ],
    orderHandoff: { orderId: "order-9", assetId: "listing-11", state: "ready" }
  });

  const decision = decideMarketplaceHandoff(input, {
    hits: [{ message: "read listing-11 during checkout" }]
  });

  assert.deepEqual(decision, {
    exposedAssetIds: ["listing-11"],
    buyerUpdateIdsToReplay: ["update-a"],
    orderHandoff: { orderId: "order-9", state: "paused" }
  });
});
