---
name: ekyan-agritech
description: >-
  Master skill for the EKYAN Connect platform. Covers the full BRS capability map:
  field operations, blocker resolution, input demand aggregation, bookkeeping &
  credit readiness, market matching, advisory RAG, and programme intelligence.
  Activate when building, debugging, or querying any EKYAN Connect module.
---

# EKYAN Connect — Master Engineering Skill

## Platform Architecture Quick Reference

```
Edge / Mobile Tier (Offline)        Core Cloud (FastAPI + Microservices)      Stakeholders
─────────────────────────────       ──────────────────────────────────────     ─────────────
Android TFLite (YOLOv8-nano)   ──► Central Data Pipeline (PostgreSQL/PostGIS) ► Lenders / Banks
WhatsApp / USSD Voice Bot      ◄─► Blocker Resolution Engine (Celery + Redis)  ► Impact Investors
Offline field logger (PWA)     ──► Input Demand Aggregator                     ► Buyers/Off-takers
                                   Alternative Credit Scoring (XGBoost)        ► UNICEF / GenU M&E
                                   Hyperlocal Climate Engine (Sentinel-2/GEE)
                                   B2B Farm-to-Fork Marketplace (Prophet)
```

## MCP Server Map → Capability

| MCP Server               | Primary EKYAN Capability                                     |
|--------------------------|--------------------------------------------------------------|
| `ekyan-supabase`         | Operational ledger, farmer profiles, consent, audit logs     |
| `ekyan-vertex-ai`        | Voice transcription (Chirp), Swahili NLP, RAG advisory       |
| `ekyan-earth-engine`     | NDVI per farm plot, soil moisture, credit scoring features   |
| `ekyan-sentinel-hub`     | Sentinel-2 canopy moisture, early-warning anomaly detection  |
| `ekyan-whatsapp`         | Primary agripreneur channel; weather nudges; blocker alerts  |
| `ekyan-africastalking`   | USSD/SMS fallback for feature-phone farmers; voice IVR       |
| `ekyan-mpesa`            | M-Pesa transaction history → bookkeeping + credit scoring    |
| `ekyan-airtel-money`     | Secondary mobile-money channel (Airtel-dominant counties)    |
| `ekyan-maps`             | Geocoding, demand clustering, last-mile delivery routing     |
| `ekyan-weather-openmeteo`| Free hyperlocal 7-day forecasts for nudge engine             |
| `ekyan-weather-tomorrow` | High-res forecasts for drought/ASAL early warning            |
| `ekyan-search`           | KACE price feeds, agronomic knowledge retrieval (RAG)        |
| `ekyan-gcs`              | Model weights, voice blobs, receipt scans, M&E exports       |
| `ekyan-monitoring`       | SLA breach alerts, sync failures, NFR-014 observability      |
| `ekyan-redis`            | Celery task queue: transcription, NDVI, escalation sweeps    |
| `ekyan-filesystem`       | Source code, BRS docs, model configs — workspace grounding   |
| `ekyan-github`           | Issues for BRS requirements, PR review, releases             |
| `ekyan-bigquery`         | Programme intelligence KPIs, donor M&E, outcome funnels      |
| `ekyan-firestore`        | Offline-first field records, mobile sync bridge              |

## Capability Modules

### Module 1 — Field Operations
- Farmer profile CRUD (managed by agripreneur on behalf of farmer)
- Adoption intention, input order, blocker, transaction, outcome recording
- Offline-first: writes to Firestore, syncs to Supabase on reconnect
- Voice note capture → Vertex AI Chirp STT → structured JSON record

### Module 2 — Blocker Resolution
- Capture: category, description, location (Maps geocode), urgency, affected practice
- AI suggests category + route (agripreneur confirms before saving — BR-022)
- Statuses: Open → Acknowledged → In Progress → Resolved / Cannot Resolve → Closed
- SLA escalation sweep: Celery beat task via Redis; alerts via WhatsApp/SMS
- Dashboard: volume, resolution rate, time-to-resolution by geography and value chain

### Module 3 — Input Demand Aggregation
- Record: input type, spec, quantity, location (Maps), required date
- Cluster compatible demand by item × ward × time window (Supabase PostGIS)
- Supplier view: aggregate demand without farmer PII
- Supplier commits: quantity, price, quality evidence, delivery ETA
- Fulfilment confirmed by agripreneur before order marked complete

### Module 4 — Bookkeeping & Credit Readiness
- Income, expense, service, purchase, sale entries
- Vertex AI: voice/receipt → draft ledger entries (agripreneur confirms — BR-044)
- M-Pesa reconciliation via `ekyan-mpesa`
- Finance-readiness profile (explainable rules-based, not ML in MVP — BRS §11.2)
- Readiness factors: completeness, cash-flow, stability, diversification, etc.
- Protected characteristics: explicitly excluded (BR-056)
- Lender view: consent-gated (BR-058); consent audit logged (BR-059)

### Module 5 — Market & Off-taker Network (Phase 2)
- Harvest-date forecasting from planting/stocking events (Prophet model)
- Produce aggregation from youth clusters to meet bulk-order minimums
- Buyer/off-taker matching, forward contract generation
- Price forecasting: time-series ML over KACE/wholesale market data

### Module 6 — Advisory & Risk Intelligence
- RAG over vetted agronomic sources (Brave Search + Supabase vector store)
- Farmer-context injection: crop stage, location, season, existing inputs
- Abstain-and-escalate rules: low confidence → extension officer routing
- Weather integration: Open-Meteo + Tomorrow.io → actionable nudges in Swahili/English
- Disease/pest: triage + escalate; never invent dosage (see rules)
- NDVI anomaly alerts from Earth Engine / Sentinel Hub

### Module 7 — Programme Intelligence
- KPI dictionary: one versioned source of truth (BigQuery dataset)
- Funnel: Training → Intention → Blocker reported → Fulfilled → Adoption → Outcome
- Filters: geography, value chain, period, gender, participant type (BR-101)
- Cost-per-outcome calculation, donor-exportable tables
- Unusual data flagging: AI anomaly detection over ledger records

## Environment Variables Required

Set these in your shell environment before the MCP servers start:

```bash
# Supabase
SUPABASE_ACCESS_TOKEN=
EKYAN_SUPABASE_PROJECT_REF=

# Google Cloud
EKYAN_GCP_PROJECT_ID=
EKYAN_GCP_REGION=africa-south1   # or us-central1 during MVP
GOOGLE_APPLICATION_CREDENTIALS=  # path to service-account JSON

# Google Earth Engine
EE_SERVICE_ACCOUNT=
EE_PRIVATE_KEY=                  # or use GOOGLE_APPLICATION_CREDENTIALS

# Sentinel Hub
SENTINEL_HUB_CLIENT_ID=
SENTINEL_HUB_CLIENT_SECRET=

# WhatsApp Cloud API
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_BUSINESS_ACCOUNT_ID=

# Africa's Talking
AFRICASTALKING_API_KEY=
AFRICASTALKING_USERNAME=

# M-Pesa Daraja
MPESA_CONSUMER_KEY=
MPESA_CONSUMER_SECRET=
MPESA_BUSINESS_SHORT_CODE=
MPESA_PASSKEY=
MPESA_ENVIRONMENT=sandbox         # → production when live

# Airtel Money
AIRTEL_CLIENT_ID=
AIRTEL_CLIENT_SECRET=
AIRTEL_ENVIRONMENT=staging

# Maps & Search
GOOGLE_MAPS_API_KEY=
BRAVE_API_KEY=
TOMORROW_IO_API_KEY=

# Redis
EKYAN_REDIS_URL=redis://localhost:6379/0

# GitHub
GITHUB_PERSONAL_ACCESS_TOKEN=
```

## Development Sequencing (from BRS §5)

1. **MVP (now):** Supabase + Firestore + Vertex AI + WhatsApp + Africa's Talking + Open-Meteo + Filesystem + GitHub + BigQuery
2. **Phase 2:** M-Pesa + Airtel Money + Earth Engine + Sentinel Hub + Tomorrow.io + Maps + Brave Search + Redis + Monitoring
3. **Future:** Full production data, real partner integrations, insurance APIs, formal credit bureau links

## Key Constraints from the BRS

- BR-013: Field records must work **offline** and sync safely → Firestore is the edge store
- BR-022: AI suggestions must be **confirmed by an agripreneur** before routing
- BR-056: Protected characteristics **excluded** from credit scoring
- BR-093 / BR-094: Never invent pesticide/vet instructions; use existing weather/climate services
- NFR-002: Primary interface targets **low-end Android** devices
- NFR-012: Distinguish synthetic / self-reported / programme-confirmed / independently verified records
