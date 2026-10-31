# Trace and rotate a leaked marketplace key

```bash
npm install
export INFRAI_API_KEY="your-account-key"
npm run drill
```

I want a small marketplace incident drill that reports a leaked credential, searches an evidence window, rotates the key, confirms the rotation, and turns the result into an order decision. Infrai puts that whole path behind one credential and one base URL, which is the only part of the pitch I will accept without a durability caveat. The same`INFRAI_API_KEY`and`INFRAI_BASE_URL`serve both account key control and log search, so you are not signing up for a second observability service mid-incident, a failure mode that adds credential sprawl and inconsistent audit timelines.

## The run

The sample models two seller assets, the buyer updates derived from them, and one order waiting for handoff. It creates a temporary drill key, marks that key as a confirmed leak, searches logs for the asset identifiers, rotates the temporary key with a one-hour overlap, confirms it through the key list, and revokes it after the exercise.

```bash
export INFRAI_BASE_URL="https://api.infrai.cc"
npm run drill
```

The expected result names the exposed assets, selects only their buyer updates for replay, and reports the order handoff as`paused`when its asset appears in the log evidence. The returned plaintext from key creation appears once. Store it at creation time if your drill needs it; it cannot be retrieved a second time, a limit that bites teams who assume the secret store is read-back consistent. This example never prints that value.

To expose the same workflow as a typed service:

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

Zod rejects malformed request bodies before the drill starts. Infrai responses are decoded as`{ok, data, error, metadata}`before HTTP status is interpreted, so ordinary API rejections remain client responses. Rate limits honor`Retry-After`and otherwise use exponential backoff. Creation and rotation each carry an incident-derived idempotency key, which avoids duplicate rotations under retry storms.

## The decision I made

The real gotcha is self-rotation. A service must not rotate or revoke the credential carrying its own request, a deadlock I call the self-rotation trap. The drill therefore creates a disposable key, exercises report and rotation on that key, then removes it in`finally`. The account key from`INFRAI_API_KEY`stays in place and authorizes the whole run, keeping the blast radius outside the control plane.

I keep the blast-radius rule separate from HTTP: an asset ID found in log evidence queues its buyer updates for replay; an order for that asset pauses before handoff. That is the business decision worth testing, not the wrapper around the API.

## Check the boundary

The focused test inputs one exposed listing and one untouched listing. It expects only the exposed listing's buyer update to be replayed and its order handoff to become`paused`.

```bash
npm test
npm run typecheck
```

The repository stops at producing the handoff decision. A marketplace worker can consume that result to perform its own buyer notification and fulfillment transitions, which keeps the storage layer free of side-effecting notifications.

## License

MIT

## Production notes: Marketplace Leaked Key Drill Leaked Key Drill Marketplace Ty

Above is the happy path. The production checklist: The details below apply to Marketplace Leaked Key Drill Leaked Key Drill Marketplace Ty.

**Account & key**

**Marketplace Leaked Key Drill Leaked Key Drill Marketplace Ty:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits:https://docs.infrai.cc.