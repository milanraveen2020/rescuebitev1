# Manual UI Test Plan — Mystery Box

A hands-on, click-through checklist for exercising the three apps against the
seeded data. This is **manual UI testing** (verifying the app works on the host
Android emulator + browser), not the automated `pnpm test` suite. Work through
it top to bottom and tick each box; note anything that misbehaves.

> **Prerequisites**
>
> 1. Database container running (`start-dev.bat` or `docker start rescuebite-db`).
> 2. Seed data loaded: `pnpm --filter @rescuebite/api db:seed`
> 3. API running (`pnpm dev:api`) — health check green at `http://localhost:4000/health`.
> 4. For the customer app: emulator booted, `npx expo start`, press `a`.
> 5. For merchant/admin: `pnpm dev:merchant` / `pnpm dev:admin`, then a browser.
>
> **All seeded accounts use password:** `Password123!`

---

## Test accounts

| Role | Email | Notes |
| --- | --- | --- |
| Admin | `admin@rescuebite.test` | Ada Admin |
| Merchant | `owner1@rescuebite.test` | Perera Family Bakers (approved) |
| Merchant | `owner2@rescuebite.test` | Green Cabin Grocer (approved) |
| Merchant | `owner3@rescuebite.test` | Ceylon Coffee House (approved) |
| Merchant | `owner4@rescuebite.test` | Colombo Kottu Kitchen (**PENDING** approval) |
| Customer | `cara@rescuebite.test` | Cara Customer (has seeded orders, favorite, notifications) |
| Customer | `dev@rescuebite.test` | Devon Diner |
| Customer | `banned@rescuebite.test` | Blocked Bob (**SUSPENDED**) |

---

## Plan A — Customer app (Android emulator)

Log in as `cara@rescuebite.test` unless noted otherwise.

- [ ] **A1. Login** — sign in with the seeded password succeeds.
- [ ] **A2. Home tab** — active listings from all 3 approved stores render: **Fresh Produce Box, Pantry Rescue Bag, Lunch Surplus Box** (one of each per store, 9 total). Note: "Surprise Bakery Bag," "Pastry Box," "Coffee & Treats Bag," and "Chef's Mystery Bag" are seeded as EXPIRED/SOLD_OUT/DRAFT respectively and correctly do **not** appear here — see A5.
- [ ] **A3. Map tab** — store pins render, clustered around Colombo (lat ~6.86–6.91, lng ~79.85–79.90).
- [ ] **A4. Listing detail** — open "Fresh Produce Box" (any store): price in LKR, original price struck through, allergen info, and pickup window all show.
- [ ] **A5. Sold-out listing** — find a `SOLD_OUT` listing (live window, 0 remaining); app blocks reservation rather than allowing checkout.
- [ ] **A6. Checkout** — reserve an active listing. Payment fails/503 at the final step (Stripe keys are placeholders) — **expected**, not a bug.
- [ ] **A7. Orders tab** — Cara's pre-seeded orders show with correct statuses and pickup codes.
- [ ] **A8. Favorites tab** — Cara's 1 pre-seeded favorite store shows.
- [ ] **A9. Notifications** — 2 pre-seeded notifications visible; read/unread state correct; notification-settings screen opens.
- [ ] **A10. Suspended login** — log out, try `banned@rescuebite.test`: clear "account suspended" message, no crash, no access granted.

**Loading / empty / error states to watch across A:**
- [ ] Each tab shows a loading state before data arrives (not a blank flash).
- [ ] Pull-to-refresh (if present) re-fetches without duplicating items.
- [ ] Killing the API mid-use surfaces a friendly error, not a raw crash.

---

## Plan B — Merchant dashboard (browser)

Log in as `owner1@rescuebite.test` (Perera Family Bakers).

- [ ] **B1. Dashboard home** — overview stats reflect this store only.
- [ ] **B2. Listings** — 7 listings across every status (2 expired, several active, 1 sold-out, 1 draft).
- [ ] **B3. New listing** — form validation rejects bad price/quantity/pickup window before submit.
- [ ] **B4. Edit + publish** — edit the draft listing and publish it; it moves to active.
- [ ] **B5. Orders** — only orders for this store's listings appear (not other stores').
- [ ] **B6. Store settings** — profile (address, category, description) matches seed data.
- [ ] **B7. Staff** — empty state renders gracefully.
- [ ] **B8. Payouts** — page renders (no real payout data; Stripe stubbed).
- [ ] **B9. Analytics** — renders without crashing on the small dataset.
- [ ] **B10. Scoping check** — log in as `owner2@rescuebite.test`; confirm you see Green Cabin Grocer's data only, never Perera's.

---

## Plan C — Admin dashboard (browser)

Log in as `admin@rescuebite.test`.

- [ ] **C1. Dashboard home** — platform-wide totals (4 stores, ~21 listings, 11 orders).
- [ ] **C2. Approvals** — Colombo Kottu Kitchen is pending; approve it and confirm the merchant side reflects the change.
- [ ] **C3. Stores** — all 4 stores list with correct statuses (3 approved, 1 pending → approved after C2).
- [ ] **C4. Listings** — cross-store view; status filtering (draft/active/expired/sold-out) works.
- [ ] **C5. Orders** — all 11 seeded orders across every status (reserved, paid, collected, cancelled, refunded, no-show).
- [ ] **C6. Users** — 5 customers + 4 owners + 1 admin + 1 suspended; Blocked Bob is visibly flagged suspended.
- [ ] **C7. Reviews** — collected orders have reviews (ratings 4–5); store ratings match the aggregates.
- [ ] **C8. Audit log** — `STORE_APPROVED` entries for the 3 seeded stores, plus a new entry from C2.
- [ ] **C9. Settings** — loads without error.

---

## Out of scope right now (known gaps — don't chase these)

- Real payment completion — Stripe keys are placeholders; PayHere is unbuilt.
- Push notification delivery to a physical device.
- Any geography outside Colombo — seed data is Sri Lanka-only.

---

## Findings log

Record anything that misbehaves as you go, so it can become a bug fix or a test later.

| ID | Screen / step | What happened | Expected | Severity |
| --- | --- | --- | --- | --- |
| 1 | `apps/customer/package.json` | Deleted during an Android Studio merge conflict resolution | File present | High — fixed |
| 2 | Customer app, location fallback | Defaulted to Dublin; seed data is Colombo | Default matches seed data region | Medium — fixed |
| 3 | Map tab | Crashed the whole app (`API key not found`, no Google Maps key configured) | Graceful fallback message | High — fixed |
| 4 | Order detail screen | Price/total paid not shown despite API returning it | Total should be visible | Medium — fixed |
| 5 | Order detail screen | No way to cancel a reservation in the UI, despite the API + client hook already existing | Cancel action should be reachable | Medium — fixed |
| 6 | Order detail screen, back button | Intermittently rendered cut off / overlapping the status bar on Android 16, and was **unresponsive to taps** when misrendered — confirmed blocking, not just cosmetic. Root cause: React Navigation's native `headerTransparent` header has a timing race with Android's edge-to-edge safe-area measurement. | Back button always renders below the status bar and is always tappable | High — fixed by moving the back button out of the native header entirely into a normal JS-positioned view (bypasses the native header timing race). Verify it holds up across repeated navigation. |
| 7 | Order detail screen, "Add to calendar" | Showed "Calendar permission denied" even when permission was granted — the real cause was no calendar account configured on the device. `addPickupToCalendar` collapsed both failure modes into one boolean. | Distinct, accurate message per failure reason | Medium — fixed. Success path (event actually created) still needs verifying on a device/emulator with a Google account signed in. |
