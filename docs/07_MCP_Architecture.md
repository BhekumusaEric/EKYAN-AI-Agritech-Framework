# EKYAN Connect — MCP Architecture

## Overview

EKYAN Connect uses **29 MCP (Model Context Protocol) servers** to give the AI agent direct, structured access to every external service the platform needs — from earth observation satellites to mobile money APIs to React component libraries.

The servers are defined in two locations:

| Location | Scope | Purpose |
|----------|-------|---------|
| `.agents/mcp_config.json` | **Repo / workspace** | Auto-loaded by any AI agent (Antigravity, Claude Code, Codex) that opens this repo. Use this for team-shared config. |
| `~/.gemini/config/plugins/ekyan/mcp_config.json` | **Machine-local** | Loaded by Antigravity globally. Same content — the plugin bundles the config with the skill and rules. |

---

## Server Map

### 🗄️ Database & GIS (3 servers)

| Server | npm / endpoint | Purpose |
|--------|---------------|---------|
| `ekyan-supabase` | `@supabase/mcp-server-supabase` | Operational ledger — farmer profiles, blockers, input orders, bookkeeping, consent records, KPI tables (PostgreSQL/PostGIS/TimescaleDB) |
| `ekyan-firestore` | `https://firestore.googleapis.com/mcp` | Offline-first field records (Android → sync on reconnect, BR-013) |
| `ekyan-bigquery` | `https://bigquery.googleapis.com/mcp` | Programme intelligence, donor M&E, outcome funnels, cost-per-outcome KPIs |

### 🤖 AI & Language (1 server)

| Server | npm | Purpose |
|--------|-----|---------|
| `ekyan-vertex-ai` | `@google-cloud/vertex-ai-mcp-server` | Chirp STT for voice notes, Swahili/English NLP, blocker classification, RAG advisory, finance memo drafting |

### 🛰️ Earth Observation (2 servers)

| Server | npm | Purpose |
|--------|-----|---------|
| `ekyan-earth-engine` | `@google/earthengine-mcp-server` | NDVI per farm plot, soil moisture, credit scoring features |
| `ekyan-sentinel-hub` | `@sentinel-hub/mcp-server` | Sentinel-2 canopy moisture tracking, early-warning anomaly detection |

### 💬 Messaging & Communications (2 servers)

| Server | npm | Purpose |
|--------|-----|---------|
| `ekyan-whatsapp` | `@meta/whatsapp-business-mcp` | Primary channel — agripreneur voice notes, weather nudges, blocker alerts |
| `ekyan-africastalking` | `@africastalking/mcp-server` | USSD/SMS/Voice IVR fallback for feature-phone farmers in ASALs |

### 💰 Mobile Money (2 servers)

| Server | npm | Purpose |
|--------|-----|---------|
| `ekyan-mpesa` | `@safaricom/mpesa-mcp-server` | M-Pesa transaction history → bookkeeping reconciliation + alternative credit scoring |
| `ekyan-airtel-money` | `@airtel/airtel-money-mcp` | Secondary mobile-money channel for Airtel-dominant counties |

### 🗺️ Geospatial (1 server)

| Server | npm | Purpose |
|--------|-----|---------|
| `ekyan-maps` | `@google/maps-mcp-server` | Geocoding GPS → ward/sub-county, demand clustering, last-mile delivery routing |

### ☁️ Weather & Climate (2 servers)

| Server | npm | Purpose |
|--------|-----|---------|
| `ekyan-weather-openmeteo` | `@open-meteo/mcp-server` | Free hyperlocal 7-day hourly forecasts — drives daily SMS/WhatsApp nudge engine |
| `ekyan-weather-tomorrow` | `@tomorrow-io/mcp-server` | High-res forecasts for drought/ASAL early warning and planting-window optimisation |

### 🔍 Market Data & Research (1 server)

| Server | npm | Purpose |
|--------|-----|---------|
| `ekyan-search` | `@modelcontextprotocol/server-brave-search` | KACE/wholesale price feeds, agronomic knowledge retrieval for RAG grounding |

### 🗂️ File & Storage (2 servers)

| Server | npm / endpoint | Purpose |
|--------|---------------|---------|
| `ekyan-gcs` | `https://storage.googleapis.com/storage/mcp` | TFLite model weights, voice blobs, receipt scans, M&E exports |
| `ekyan-filesystem` | `@modelcontextprotocol/server-filesystem` | Direct read/write to this workspace |

### 📊 Monitoring & Queue (2 servers)

| Server | npm | Purpose |
|--------|-----|---------|
| `ekyan-monitoring` | `@google-cloud/monitoring-mcp` | SLA breach alerts, sync failures, integration errors (NFR-014) |
| `ekyan-redis` | `@redis/mcp-server` | Celery broker — async voice transcription, NDVI pulls, escalation sweeps |

### 🐙 Source Control (1 server)

| Server | npm | Purpose |
|--------|-----|---------|
| `ekyan-github` | `@modelcontextprotocol/server-github` | Issues for BRS requirements, PR reviews, releases |

---

## 🎨 UI & Frontend Layer (10 servers)

| Server | npm | Surface | Purpose |
|--------|-----|---------|---------|
| `ekyan-figma` | `@figma/mcp-server` | All UIs | Design → React/TailwindCSS code from Figma frames + design tokens |
| `ekyan-mapbox` | `@mapbox/mcp-server` | M&E Dashboard | Choropleth (adoption rates), blocker heatmaps, NDVI overlays, farm plot polygons |
| `ekyan-vercel` | `@vercel/mcp-adapter` | All UIs | Deploy M&E dashboard, agripreneur PWA (Service Worker), supplier portal |
| `ekyan-expo` | `@expo/mcp-server` | Agripreneur App | React Native offline field app — OTA updates, EAS Build (.apk), expo-camera, expo-av, expo-sqlite |
| `ekyan-sentry` | `@sentry/mcp-server` | All surfaces | Runtime error capture across React Native, Next.js and FastAPI |
| `ekyan-posthog` | `@posthog/mcp-server` | M&E / PWA | Self-hostable product analytics; anonymised participant IDs; no PII |
| `ekyan-chrome-devtools` | `@modelcontextprotocol/server-puppeteer` | M&E Dashboard | E2E tests, Lighthouse PWA/a11y audits on 2G-throttled mobile profile |
| `ekyan-contentful` | `@contentful/mcp-server` | Advisory RAG | Swahili + English CMS — agronomic articles, fact sheets, UI copy, disclaimer templates |
| `ekyan-axe` | `@axe-core/mcp-server` | All UIs | Automated WCAG 2.1 AA audits (NFR-004), touch target validation (NFR-003) |
| `ekyan-storybook` | `@storybook/mcp-server` | All UIs | Shared design system component library — browse, generate stories, run interaction tests |

---

## Three UIs and Which MCPs Serve Them

```
┌─────────────────────────────────────────────────────────────────────┐
│  Agripreneur Offline PWA (Android, React Native / Expo)             │
│  ekyan-expo · ekyan-vercel · ekyan-figma · ekyan-storybook          │
│  ekyan-axe · ekyan-sentry · ekyan-firestore · ekyan-vertex-ai       │
│  ekyan-whatsapp · ekyan-africastalking                              │
├─────────────────────────────────────────────────────────────────────┤
│  UNICEF M&E GIS Dashboard (Next.js 14 + Recharts + Mapbox GL)       │
│  ekyan-mapbox · ekyan-vercel · ekyan-bigquery · ekyan-posthog       │
│  ekyan-chrome-devtools · ekyan-contentful · ekyan-sentry            │
│  ekyan-figma · ekyan-storybook · ekyan-axe                         │
├─────────────────────────────────────────────────────────────────────┤
│  Supplier / Buyer Portal (Next.js 14)                               │
│  ekyan-vercel · ekyan-supabase · ekyan-figma · ekyan-storybook      │
│  ekyan-sentry · ekyan-axe · ekyan-maps                             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## MVP vs Phase 2 Activation

| Phase | Servers |
|-------|---------|
| **MVP** | supabase · firestore · vertex-ai · whatsapp · africastalking · weather-openmeteo · filesystem · github · bigquery · figma · storybook · vercel · expo · sentry · chrome-devtools · axe |
| **Phase 2** | + mpesa · airtel-money · earth-engine · sentinel-hub · weather-tomorrow · maps · search · redis · monitoring · mapbox · posthog · contentful |
| **Future** | + insurance APIs · formal credit bureau · multi-country configs |

---

## Setup

1. Copy `.env.example` → `.env` and fill in your values
2. Install Node.js ≥ 20 (all MCP servers run via `npx`)
3. Set `GOOGLE_APPLICATION_CREDENTIALS` to your service account JSON
4. The `.agents/mcp_config.json` is picked up automatically by Antigravity, Claude Code and Codex when this workspace is open

> **During MVP:** Use `MPESA_ENVIRONMENT=sandbox`, `AIRTEL_ENVIRONMENT=staging`, and synthetic Supabase data only. Do not process real personal or financial data until agreements are in place (see `EKYANBRS.md §14`).

