# PayHere Integration Plan (replacing Stripe Connect for Sri Lanka)

> **Status:** Planning doc — no code yet. This is the blueprint we execute later.
> **Why:** RescueBite targets Sri Lanka, where **Stripe Connect is unavailable**. PayHere
> (`payhere.lk`) is the de-facto local gateway. This plan makes the swap *mechanical*: it
> preserves the existing `/payments/*` API surface and order state machine and slots PayHere
> in behind a provider interface, so Stripe can stay for local dev while PayHere serves production.
>
> **Confidence:** facts below are cross-sourced (PayHere GitHub plugins/SDKs, npm, walkthroughs).
> The official `support.payhere.lk` blocks bots, so a few items are marked **[VERIFY]** — confirm
> them against the live docs / a sandbox account before coding. Sources are listed at the end.

---

## 0. TL;DR — the three things that make this non-trivial

1. **The mobile (React Native) SDK does NOT take a server-generated hash.** It authorizes by
   **whitelisting your Android package name / iOS bundle ID** in the PayHere dashboard. The
   server-side `md5` hash is only for PayHere's **web** Checkout / JS SDK. → Two possible
   customer-app paths (native SDK vs WebView); see §4.
2. **The native SDK is a native module → no Expo Go** (needs `expo-dev-client` + `expo prebuild` +
   EAS build; no official config plugin). The **WebView checkout path avoids this entirely** and
   keeps Expo Go working — which is why it's the recommended v1 (see §4).
3. **No marketplace / split payments / sub-merchant payouts** (no Stripe-Connect equivalent).
   The platform collects everything into **one** PayHere account and pays merchants out itself.
   → We add a **payout ledger** and keep the existing commission math.

Everything else (the order lifecycle, the commission bps, the webhook-driven `RESERVED → PAID`
transition, refunds) maps cleanly onto PayHere.

---

## 1. What exists today (the surface we must preserve)

**API endpoints** (`apps/api/src/payments/`):

| Method & route | Role | Purpose | PayHere equivalent |
| --- | --- | --- | --- |
| `GET  /payments/config` | public | returns Stripe publishable key | return `{ provider, payhere:{ merchantId, sandbox } }` |
| `POST /payments/connect/onboarding` | MERCHANT_OWNER | Stripe Express onboarding link | **replace** — collect merchant payout (bank) details; no API onboarding |
| `GET  /payments/connect/status` | MERCHANT_OWNER | connection / payouts status | **replace** — payout-profile completeness + balance |
| `GET  /payments/transfers` | MERCHANT_OWNER | recent Stripe transfers | **replace** — rows from our payout ledger |
| `POST /payments/orders/:id/checkout` | CUSTOMER | create PaymentIntent → `clientSecret` | create a PayHere checkout payload (see §4) |
| `POST /payments/orders/:id/refund` | MERCHANT_OWNER | Stripe refund | PayHere Refund API (§6) |
| `POST /payments/webhook` | public (raw body) | Stripe signed webhook | new PayHere `notify_url` handler (§5) |

**Order state machine** (`apps/api/src/orders/orders.service.ts`) — unchanged in shape:
`reserve()` → `attachPaymentIntent()` → `markPaidByPaymentIntent()` → `markRefunded()` /
`markRefundedByPaymentIntent()`, with `releaseExpiredReservations()` sweeping expired holds.
We generalize the `*ByPaymentIntent` helpers to `*ByPaymentRef` (provider-agnostic).

**Commission** (`apps/api/src/payments/fees.ts`): `computePlatformFee(amountMinor, feeBps)` —
pure, integer minor units. **Reused as-is** for the payout ledger.

**Money model:** `{ amountMinor, currency }`, integer minor units. PayHere amounts are decimal
strings (`"750.00"`), so we convert `amountMinor → (amountMinor/100).toFixed(2)` at the boundary.

---

## 2. Target architecture — a `PaymentProvider` interface

Introduce one seam so Stripe and PayHere are interchangeable and selected by env.

```ts
// apps/api/src/payments/provider/payment-provider.ts
export interface PaymentProvider {
  readonly id: 'stripe' | 'payhere';

  /** Build the client-facing checkout payload for a RESERVED order. */
  createCheckout(order: OrderWithStore, feeMinor: number): Promise<CheckoutSession>;

  /** Refund a captured payment. */
  refund(order: OrderWithStore): Promise<void>;

  /** Verify + normalise an inbound webhook into a provider-agnostic event. */
  parseWebhook(raw: Buffer, headers: Record<string, string>): Promise<ProviderEvent>;

  /** Merchant payout/connection capabilities (Stripe: Connect; PayHere: manual ledger). */
  getPayoutStatus(store: Store): Promise<PayoutStatus>;
}

export type ProviderEvent =
  | { kind: 'payment.succeeded'; paymentRef: string; orderId: string }
  | { kind: 'payment.failed';    orderId: string }
  | { kind: 'payment.refunded';  paymentRef: string; orderId: string }
  | { kind: 'ignored' };
```

- `StripeProvider` = today's `PaymentsService` logic, moved behind the interface.
- `PayHereProvider` = new (§4–§6).
- Selected via `PAYMENT_PROVIDER=stripe|payhere` (default `stripe` for local dev so nothing breaks).
- `CheckoutSession` becomes a **discriminated union by provider** (§4) — this is the one place
  the frontend must branch.

Provider wiring mirrors the existing `stripe.provider.ts` factory (a Nest `useFactory`).

---

## 3. Data model changes (one migration)

`Order` currently has the Stripe-specific `stripePaymentIntentId`. Generalise:

```prisma
model Order {
  // ...
  paymentProvider       String?   // 'stripe' | 'payhere'
  paymentRef            String?   // Stripe paymentIntentId OR PayHere payment_id
  stripePaymentIntentId String?   // keep temporarily; backfill paymentRef, then drop later
}
```

Migration steps: add columns → backfill `paymentRef = stripePaymentIntentId`,
`paymentProvider = 'stripe'` for existing rows → switch code to `paymentRef` → drop the old
column in a later migration. (Follow the repo's `prisma migrate dev` flow.)

**PayHere uses *our* `order.id` as its `order_id`.** That's a real simplification over Stripe:
the `notify_url` webhook arrives already carrying our order id, so we can look the order up
directly and don't need a pre-checkout `attachPaymentIntent()` round-trip. We store PayHere's
`payment_id` as `paymentRef` *when the webhook lands*.

**New payout ledger** (replaces Stripe transfers — see §7):

```prisma
model MerchantPayout {
  id          String   @id @default(uuid())
  storeId     String
  store       Store    @relation(fields: [storeId], references: [id])
  amountMinor Int      // net owed to the merchant (after platform fee)
  currency    String   @default("LKR")
  status      String   @default("PENDING") // PENDING | PAID | FAILED
  periodStart DateTime
  periodEnd   DateTime
  reference   String?  // bank transfer ref / batch id
  createdAt   DateTime @default(now())
  paidAt      DateTime?
  @@index([storeId, status])
}
```

Add merchant payout/bank fields to `Store` (replacing `stripeAccountId`/`payoutsEnabled`):
`payoutBankName`, `payoutAccountName`, `payoutAccountNumber`, `payoutBranch`, `payoutVerified`.

---

## 4. Customer checkout — TWO paths (pick one; recommend SDK)

`POST /payments/orders/:id/checkout` recomputes the amount server-side from the order (never
trust the client — same rule as today) and returns a provider-tagged payload.

### Path A — Native Mobile SDK *(recommended for production UX)*

- Package: **`@payhere/payhere-mobilesdk-reactnative`** (latest `4.1.0`; the 2026 Expo guide pins
  `4.0.14`). Native module (Android + iOS).
- **No hash.** The app calls `PayHere.startPayment(paymentObject, onCompleted, onError, onDismissed)`
  with `merchant_id` + order/customer fields; PayHere validates via **bundle/package whitelisting**.
- Backend returns:

```jsonc
{
  "provider": "payhere",
  "mode": "sdk",
  "paymentObject": {
    "sandbox": true,
    "merchant_id": "<PAYHERE_MERCHANT_ID>",
    "notify_url": "https://api.rescuebite.lk/payments/payhere/notify",
    "order_id": "<order.id>",
    "items": "RescueBite order <short>",
    "amount": "750.00",          // (amountMinor/100).toFixed(2)
    "currency": "LKR",
    "first_name": "...", "last_name": "...", "email": "...", "phone": "...",
    "address": "...", "city": "Colombo", "country": "Sri Lanka"
  }
}
```

- Customer app (`apps/customer/app/checkout/[id].tsx`) calls `PayHere.startPayment(...)`. On
  `onCompleted(paymentId)` it shows a "confirming…" state and **waits for the server** (the
  `notify_url` webhook is the source of truth — never mark PAID from the client).
- **Expo impact (required):** add `expo-dev-client`, run `npx expo prebuild`, build with **EAS**
  (`eas build --profile development`). **Expo Go will not work.** No official config plugin — either
  commit the prebuilt `android/`/`ios/` folders or author a tiny custom plugin for: JitPack maven
  repo + `AndroidManifest` `tools:replace="android:allowBackup"` (Android), and the two Podfile
  lines + `use_frameworks!` (iOS). Android `minSdk` floor 16; iOS target 11.
- Whitelist the app's **package name / bundle id** in the PayHere dashboard ("Allowed Apps").

### Path B — Web Checkout in a WebView *(keeps Expo Go working; simpler ops)*

- Backend builds the **web Checkout** form for `https://sandbox.payhere.lk/pay/checkout`
  (live `https://www.payhere.lk/pay/checkout`) **with the server-side hash**:

```
hash = UPPER( md5( merchant_id + order_id + amount(2dp) + currency + UPPER(md5(merchant_secret)) ) )
```

- Returns `{ provider:'payhere', mode:'web', checkoutUrl, fields }`; the app opens it in
  `react-native-webview` and watches `return_url`/`cancel_url`. Still confirmed via `notify_url`.
- **Trade-off:** works in Expo Go and needs no native build, but the in-app UX is a web redirect
  rather than a native sheet.

> **Recommendation:** Ship **Path B (WebView) as v1** and treat **Path A (native SDK) as a v2 UX
> upgrade.** Path A forces the whole `expo-dev-client` + `expo prebuild` + EAS + dashboard
> app-whitelisting chain — a lot to take on before the team has shipped any mobile build. Path B
> gets payments working with no native build (still works in Expo Go) and the same server webhook;
> swap in the native sheet later once the EAS pipeline exists. Either way the **backend, webhook,
> refund, and payout ledger are identical** — only the customer checkout screen differs. Decide
> before coding §4.

---

## 5. Webhook — `notify_url` (the source of truth)

New endpoint `POST /payments/payhere/notify` (public; **`application/x-www-form-urlencoded`**, not JSON).

PayHere POSTs: `merchant_id, order_id, payment_id, payhere_amount, payhere_currency,
status_code, md5sig, method, status_message, custom_1, custom_2` (+ masked card fields).

**Verify every notification** before acting:

```
local = UPPER( md5( merchant_id + order_id + payhere_amount + payhere_currency
                    + status_code + UPPER(md5(merchant_secret)) ) )
valid = (local === md5sig)
```

> ⚠️ The webhook `md5sig` field order **differs** from the request hash (§4B): it inserts
> `payhere_amount`, `payhere_currency`, **and `status_code`**. Do not share one routine.
> Use `payhere_amount` **exactly as received** (already 2dp) — don't reformat it.

**`status_code` → order transition:**

| status_code | meaning | action |
| --- | --- | --- |
| `2` | success | **amount/currency gate (below) →** `orders.markPaidByPaymentRef(order_id, payment_id)` → `RESERVED → PAID`; accrue payout (§7); send email + push |
| `0` | pending **[VERIFY]** | log; leave RESERVED |
| `-1` | cancelled **[VERIFY]** | log; let the hold sweep release stock |
| `-2` | failed **[VERIFY]** | log; let the hold sweep release stock |
| `-3` | chargeback **[VERIFY]** | flag order; alert admin |

> 🔒 **Critical — re-verify the amount server-side before marking PAID.** In Path A (native SDK)
> the `amount` lives in the client's `paymentObject`; bundle/package whitelisting authenticates the
> *app*, not the *amount*, and a tampered client could submit `amount:"1.00"` for a Rs 750 order.
> A valid `md5sig` only proves PayHere really charged `payhere_amount` — **not** that it was the
> right amount. So after `md5sig` passes and `status_code == 2`, recompute the order total
> server-side and require **`payhere_amount === (order.totalMinor/100).toFixed(2)`** *and*
> **`payhere_currency === order.currency`**. On mismatch: do **not** mark PAID — flag for admin /
> auto-refund. (This is the same rule the Stripe path enforces by construction at
> `payments.service.ts:129` — "never trust client amounts.") Path B's hash covers the amount at
> initiation, but apply this webhook check there too; it's the one control that makes Path A safe.

Handlers must be **idempotent** (PayHere may retry) — exactly like the current Stripe handler.
`notify_url` **must be public** (won't fire to `localhost`) — see §8 for tunnelling in dev.

---

## 6. Refund — `POST /payments/orders/:id/refund` (merchant)

PayHere has a programmatic Refund API (OAuth-secured). Flow:

1. Get an access token (cache ~9 min; it expires in ~599s):
   ```
   POST https://sandbox.payhere.lk/merchant/v1/oauth/token   (live: https://www.payhere.lk/...)
   Authorization: Basic base64(APP_ID:APP_SECRET)
   Content-Type: application/x-www-form-urlencoded
   grant_type=client_credentials
   ```
2. Refund:
   ```
   POST .../merchant/v1/payment/refund
   Authorization: Bearer <access_token>
   Content-Type: application/json
   { "payment_id": "<order.paymentRef>", "description": "RescueBite refund", "amount": "750.00" }  // amount optional = full
   ```
3. On success → `orders.markRefunded(orderId)` + restock (same as today). A refund notification
   may also arrive at `notify_url` — handle idempotently. The **Retrieval API**
   (`GET .../merchant/v1/payment/search?order_id=`) can reconcile status (`Received`/`Refunded`/`Chargebacked`).

> **[VERIFY]** the live/sandbox OAuth host and exact refund-notification behaviour against a sandbox account.

---

## 7. Marketplace settlement — build our own payout ledger

PayHere has **no split payments and no programmatic sub-merchant onboarding**. So:

- **Collection:** all customer payments land in the **platform's single** PayHere account.
- **Accrual:** on each `payment.succeeded`, compute `fee = computePlatformFee(total, commissionBps)`
  (existing code) and accrue **`net = total − fee`** to the merchant's running balance.
- **Payout:** a scheduled job (e.g. weekly, via the existing `@nestjs/schedule`) rolls each
  merchant's accrued `net` into a `MerchantPayout` row and the platform pays it out by
  **bank transfer (SLIPS/CEFTS)** to the merchant's stored bank details, then marks the row `PAID`
  with a reference. **[VERIFY]** whether PayHere exposes any payout/"send money" API — public
  sources suggest not, so assume manual/bank bulk transfer initiated by finance.
- **Merchant UI:** the merchant "Payouts" page shows accrued balance + `MerchantPayout` history
  (replaces `GET /payments/transfers`). Onboarding becomes a **bank-details form**
  (replaces Stripe Express onboarding), gated by `payoutVerified`.

Optional later: **Hold-on-Card** (Authorize → Capture) maps to stock reservation, but it
auto-releases after **7 days** and is **Visa/Mastercard credit only** — the app's own 15-min
DB reservation already covers this, so treat PayHere holds as out-of-scope for v1.

---

## 8. Config & local dev

**API env (`apps/api/src/config/env.schema.ts`, Zod) — add:**

```
PAYMENT_PROVIDER=payhere          # stripe | payhere (default stripe)
PAYHERE_SANDBOX=true
PAYHERE_MERCHANT_ID=...
PAYHERE_MERCHANT_SECRET=...       # checkout hash + md5sig
PAYHERE_APP_ID=...                # OAuth (refund/retrieval/charging)
PAYHERE_APP_SECRET=...
PAYHERE_NOTIFY_URL=https://<public-host>/payments/payhere/notify
```

Keep the **graceful-fallback** convention this codebase already uses: when PayHere isn't
configured, the provider should **simulate** success in dev (log + auto-mark PAID) so the flow is
exercisable without keys — mirroring the email/push/S3 stubs.

**Customer app env:** `EXPO_PUBLIC_PAYHERE_MERCHANT_ID`, `EXPO_PUBLIC_PAYHERE_SANDBOX` — or
better, fetch them from `GET /payments/config` so the app holds no PayHere config of its own.

**Webhook in dev:** `notify_url` must be public. Use a tunnel
(`cloudflared tunnel --url http://localhost:4000` or ngrok) and set `PAYHERE_NOTIFY_URL` to it.

**Sandbox test cards** (any future expiry / any CVV; name any):

| Brand | Success | Insufficient funds |
| --- | --- | --- |
| Visa | `4916217501611292` | `4024007194349121` |
| Mastercard | `5307732125531191` | `5459051433777487` |
| Amex | `346781005510225` | `370787711978928` |

**Fees (for the commission/UX copy):** Lite 3.30% · Plus 2.99% · Premium 2.69% · HelaPay 1.99%;
foreign currency +1%. Settlement ~**T+2**. **[VERIFY]** on the live pricing page.

---

## 9. Implementation checklist (phased)

**Phase 1 — backend seam (no behaviour change)**
- [ ] Extract `PaymentProvider` interface; wrap current logic as `StripeProvider`.
- [ ] Add `paymentProvider` + `paymentRef` to `Order` (migration + backfill); switch order helpers to `*ByPaymentRef`.
- [ ] Make `CheckoutSession` a provider-discriminated union; update `packages/types` (Zod) + `packages/api-client`.

**Phase 2 — PayHere backend**
- [ ] `PayHereProvider.createCheckout` (Path A payload; or Path B hash + form).
- [ ] `POST /payments/payhere/notify` with md5sig verification + status mapping (idempotent).
- [ ] `PayHereProvider.refund` (OAuth token cache → refund API) + Retrieval reconcile.
- [ ] Env schema + dev simulation fallback.

**Phase 3 — payout ledger (marketplace settlement)**
- [ ] `MerchantPayout` model + `Store` bank fields (migration).
- [ ] Accrual on `payment.succeeded`; scheduled payout job; merchant payouts page + bank-details onboarding.

**Phase 4 — customer app**
- [ ] Path A: add `expo-dev-client`, `expo prebuild`, EAS build, native config, dashboard app-whitelisting; wire `PayHere.startPayment` in `checkout/[id].tsx`. *(or Path B: WebView.)*
- [ ] "Confirming payment…" state that polls/awaits the server until the webhook flips the order to PAID.

**Phase 5 — test & cut over**
- [ ] Sandbox E2E: reserve → checkout → pay (test card) → webhook → PAID → email/push; refund path; failed/cancelled paths.
- [ ] Keep `PAYMENT_PROVIDER=stripe` for CI/local; `payhere` for staging/prod.

---

## 10. Open questions to confirm before coding (**[VERIFY]**)

1. **Mobile SDK hash:** confirm the current SDK still needs **no** per-transaction hash (README/type say none; dashboard app-whitelisting instead). If a recent server-side check now expects one, fold in the §4B hash.
2. **Vendor payout mechanism:** confirm PayHere exposes no payout/"send money" API (→ manual bank transfers) — this shapes Phase 3.
3. **Refund notifications:** does `notify_url` fire on refund, and with what `status_code`/`status_message`?
4. **OAuth host + token TTL** for sandbox vs live; granular `status_code` 0/-1/-2/-3 semantics (docs-only today).
5. **Checkout path decision:** Native SDK (Path A) vs WebView (Path B) — changes the app + build pipeline.

---

## Sources

Server APIs / hash / webhook / refund / OAuth (cross-checked against PayHere's own plugins):
- Checkout API — https://support.payhere.lk/api-&-mobile-sdk/checkout-api
- Refund API — https://support.payhere.lk/api-&-mobile-sdk/refund-api · Retrieval — https://support.payhere.lk/api-&-mobile-sdk/retrieval-api
- Charging/Preapproval/Authorize/Capture — https://support.payhere.lk/api-&-mobile-sdk/charging-api · …/preapproval-api · …/authorize-api · …/capture-api
- Sandbox & test cards — https://support.payhere.lk/sandbox-and-testing
- WHMCS plugin (checkout fields + md5sig in code) — https://github.com/PayHereLK/payhere-whmcs
- WooCommerce plugin — https://github.com/PayHereLK/payhere-woocommerce
- PayHere demo (`constants.php`, `_tokenizer.php`) — https://github.com/PayHereLK/payhere-demo-beta
- Laravel package (refund/retrieve/checkout paths) — https://github.com/Visanduma/laravel-payhere

Mobile SDK / Expo:
- RN SDK repo + README — https://github.com/PayHereLK/payhere-mobilesdk-reactnative
- npm — https://www.npmjs.com/package/@payhere/payhere-mobilesdk-reactnative
- Expo 2026 integration guide — https://www.appsblee.com/2026/02/how-to-integrate-payhere-payment.html

Fees / onboarding:
- https://www.payhere.lk/fees/ · https://support.payhere.lk/application-process · https://support.payhere.lk/general-questions
