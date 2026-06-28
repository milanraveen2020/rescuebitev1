# RescueBite — Integrations Flowchart

Every external service the platform talks to, and how data flows between the apps,
the NestJS API, and third parties. Diagrams use [Mermaid](https://mermaid.js.org/)
(renders natively on GitHub).

## System & integrations overview

```mermaid
flowchart TB
  %% ---------- Clients ----------
  subgraph CLIENTS["Frontends"]
    CUST["Customer app<br/>Expo / React Native · :8081"]
    MERCH["Merchant web<br/>Next.js · :3001"]
    ADMIN["Admin web<br/>Next.js · :3002"]
  end

  %% ---------- Customer-device native SDKs ----------
  subgraph DEVICE["Customer device SDKs"]
    SRN["@stripe/stripe-react-native<br/>confirm payment"]
    PUSHSDK["expo-notifications + expo-device<br/>register push token"]
    GEO["expo-location + react-native-maps<br/>location & store map"]
  end
  CUST --- SRN
  CUST --- PUSHSDK
  CUST --- GEO

  %% ---------- Shared client ----------
  AC["packages/api-client<br/>typed transport (all frontends)"]
  CUST --> AC
  MERCH --> AC
  ADMIN --> AC
  AC -->|HTTPS REST · Zod-validated| API

  %% ---------- API ----------
  subgraph API["NestJS API · :4000"]
    AUTH["auth<br/>JWT · argon2 hashing"]
    LIST["listings + upload"]
    ORD["orders / reservations"]
    PAY["payments<br/>Stripe Connect marketplace"]
    NOTIF["notifications"]
    EMAIL["common/email"]
    MON["common/monitoring"]
    ADM["admin"]
    MERCHMOD["merchant"]
    HEALTH["health"]
  end

  %% ---------- External integrations ----------
  API -->|Prisma ORM| PG[("PostgreSQL<br/>DATABASE_URL")]

  PAY -->|"SDK: accounts, accountLinks,<br/>paymentIntents, refunds"| STRIPE{{"Stripe Connect<br/>(test mode)"}}
  STRIPE -->|"webhook → POST /payments/webhook<br/>payment_intent.succeeded / .payment_failed<br/>charge.refunded · account.updated"| PAY
  SRN -->|"confirm clientSecret"| STRIPE
  MERCH -.->|"redirect to hosted<br/>Express onboarding"| STRIPE

  EMAIL -->|"POST api.resend.com/emails"| RESEND{{"Resend<br/>transactional email"}}

  NOTIF -->|"POST exp.host push API"| EXPO{{"Expo Push service"}}
  EXPO -.->|push delivery| PUSHSDK

  LIST -->|"presigned PUT (s3-request-presigner)"| S3{{"AWS S3 / S3-compatible<br/>listing images"}}
  SRN -.->|"direct upload bytes"| S3

  MON -->|"captureException"| SENTRY{{"Sentry<br/>error monitoring"}}

  %% ---------- Styling ----------
  classDef ext fill:#fde68a,stroke:#b45309,color:#1f2937;
  classDef db fill:#bfdbfe,stroke:#1d4ed8,color:#1f2937;
  class STRIPE,RESEND,EXPO,S3,SENTRY ext;
  class PG db;
```

> **Legend** — 🟨 amber = third-party service · 🟦 blue = datastore.
> Solid arrows are direct API calls; dotted arrows are redirects / async delivery.

## Integration inventory

| Integration | Used by | Purpose | Env / config | Dev fallback when unset |
| --- | --- | --- | --- | --- |
| **PostgreSQL** (Prisma) | API (all modules) | Persistence | `DATABASE_URL` | — (required) |
| **Stripe Connect** (`stripe`) | API `payments`; customer app `@stripe/stripe-react-native` | Marketplace payments: Express onboarding, PaymentIntents w/ `application_fee_amount` + `transfer_data`, refunds, webhooks | `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `PLATFORM_FEE_BPS` | Payment endpoints return **503**; rest of API still boots |
| **Resend** | API `common/email` | Transactional email (verify email, password reset, order confirmation, refund notice, store-approval result) | `RESEND_API_KEY`, `EMAIL_FROM` | Email is **logged to console** instead of sent |
| **Expo Push** | API `notifications`; customer app `expo-notifications`/`expo-device` | Push notifications to registered device tokens; prunes dead tokens | `EXPO_ACCESS_TOKEN` | Push payload is **logged** instead of sent |
| **AWS S3** (`@aws-sdk/client-s3`) | API `listings/upload` | Presigned PUT URLs for listing images; client uploads bytes directly | `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL` | Returns a **stub upload ticket** |
| **Sentry** (`@sentry/node`) | API `common/monitoring` | Captures unexpected 5xx errors (via `HttpExceptionFilter`) | `SENTRY_DSN` | Monitoring **disabled** (no phone-home) |
| **Expo Location / Maps** | Customer app | Device geolocation + store map | client-side (Expo) | — |

## Payment flow (Stripe Connect marketplace)

```mermaid
sequenceDiagram
    autonumber
    participant M as Merchant web
    participant C as Customer app
    participant API as NestJS API
    participant S as Stripe

    Note over M,S: Onboarding (one-time)
    M->>API: POST /payments/connect/onboarding
    API->>S: accounts.create + accountLinks.create (Express)
    S-->>API: onboarding URL
    API-->>M: URL → redirect merchant to Stripe
    S-->>API: webhook account.updated → set payoutsEnabled

    Note over C,S: Checkout
    C->>API: POST /payments/orders/:id/checkout
    API->>API: recompute amount + platform fee server-side
    API->>S: paymentIntents.create (application_fee_amount + transfer_data → merchant)
    S-->>API: clientSecret
    API-->>C: clientSecret
    C->>S: confirm payment (stripe-react-native)
    S-->>API: webhook payment_intent.succeeded → order RESERVED → PAID
    API->>C: order confirmation email + push

    Note over M,S: Refund
    M->>API: POST /payments/orders/:id/refund
    API->>S: refunds.create
    S-->>API: webhook charge.refunded → REFUNDED + restock
```
