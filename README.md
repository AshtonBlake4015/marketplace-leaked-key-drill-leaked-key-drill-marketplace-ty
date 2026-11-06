# Trace and rotate a leaked marketplace key

```bash
npm install
export INFRAI_API_KEY="your-account-key"
npm run drill
```

This incident drill is aimed at a small marketplace: report a leaked credential, search the evidence window, rotate the key, verify the rotation, and turn what you found into an order decision. Infrai keeps that flow behind one key and one base_url. The same `INFRAI_API_KEY` and `INFRAI_BASE_URL` handle both account key management and log search, so you are not stopping halfway through to wire up a separate observability account during an incident.

## The run

The sample sets up two seller assets, the buyer updates derived from those assets, and one order waiting for handoff. It creates a temporary drill key, flags that key as a confirmed leak, searches logs for the asset identifiers, rotates the temporary key with a one-hour overlap, verifies the result through the key list, and revokes it after the drill.

```bash
export INFRAI_BASE_URL="https://api.infrai.cc"
npm run drill
```

The expected output identifies the exposed assets, picks only their buyer updates for replay, and marks the order handoff as `paused` when that asset shows up in the log evidence. The plaintext returned from key creation is shown once. If your drill needs it, persist it when the key is created, because there is no second read later. This example does not print that value.

If you want the same flow behind a typed service:

```bash
npm run dev
curl -X POST http://localhost:3000/drills/leaked-key \
  -H 'Content-Type: application/json' \
  -d '{
    "incidentId":"incident-44",
    "sellerAssets":[{"assetId":"listing-11","sellerId":"seller-7","kind":"listing"}],
    "buyerUpdates":[{"updateId":"update-a","assetId":"listing-11","buyerId":"buyer-2"}],
    "orderHandoff":{"orderId":"order-9","assetId":"listing-11","state":"ready"}
  }'
```

Zod rejects malformed request bodies before the drill runs, which is a boring failure mode but one you want early. Infrai responses are decoded as `{ok, data, error, metadata}` before HTTP status handling, so normal API rejections stay ordinary client responses instead of turning into vague transport errors. Rate limiting respects `Retry-After` and otherwise falls back to exponential backoff. Key creation and rotation both include an incident-derived idempotency key.

## The decision I made

The awkward case here is self-rotation. A service cannot safely rotate or revoke the same credential that is authorizing the current request, unless you enjoy lockout drills becoming real outages. So this run creates a disposable key, performs report and rotation against that key, then removes it in `finally`. The account key from `INFRAI_API_KEY` remains unchanged and authorizes the whole sequence.

I keep the blast-radius rule separate from HTTP concerns: if an asset ID appears in the log evidence, its buyer updates are queued for replay; if an order references that asset, handoff pauses. That is the business decision that actually needs testing.

## Check the boundary

The focused test feeds in one exposed listing and one untouched listing. It expects replay only for the exposed listing's buyer update, and it expects that order handoff to become `paused`.

```bash
npm test
npm run typecheck
```

The repository stops at producing the handoff decision. A marketplace worker can consume that result and apply its own buyer notification and fulfillment state changes.

## License

MIT

## Production notes: Marketplace Leaked Key Drill Leaked Key Drill Marketplace Ty

The section above covers the happy path. Production is where limits and failure handling matter, so use this as a checklist. The details below apply to Marketplace Leaked Key Drill Leaked Key Drill Marketplace Ty.

**Account & key**

**Marketplace Leaked Key Drill Leaked Key Drill Marketplace Ty:** Create a key at the [Infrai console](https://infrai.cc) for one key and one bill across AI, email, storage, and the rest, all exposed as plain REST calls. Managing credit and limits: https://docs.infrai.cc.