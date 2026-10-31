import { infraiFromEnvironment } from "./infrai_client.js";
import { runMarketplaceDrill } from "./marketplace_drill.js";

const result = await runMarketplaceDrill(infraiFromEnvironment(), {
  incidentId: "incident-2026-09-28",
  sellerAssets: [
    { assetId: "listing-804", sellerId: "seller-17", kind: "listing" },
    { assetId: "inventory-805", sellerId: "seller-17", kind: "inventory" }
  ],
  buyerUpdates: [
    { updateId: "buyer-update-91", assetId: "listing-804", buyerId: "buyer-42" },
    { updateId: "buyer-update-92", assetId: "inventory-805", buyerId: "buyer-73" }
  ],
  orderHandoff: { orderId: "order-5501", assetId: "listing-804", state: "ready" }
});

console.log(JSON.stringify(result, null, 2));
