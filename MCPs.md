# EKYAN Connect — MCP Server Registry

> [!IMPORTANT]
> Plugin live at **[EKYAN Agritech Intelligence Platform](customization://ekyan)** (global, enabled). Contains 19 MCP servers, 1 skill (`ekyan-agritech`), and 10 always-on rules.

---

## MCP Servers by Layer (19 total)

### 🗄️ 1. Core Database & GIS
| Server | Tool | Purpose |
|--------|------|---------|
| `ekyan-supabase` | `@supabase/mcp-server-supabase` | Operational ledger — farmer profiles, blockers, input orders, bookkeeping, consent records, KPI tables (PostgreSQL/PostGIS/TimescaleDB) |
| `ekyan-firestore` | Google Firestore MCP | Offline-first field record store; syncs to Supabase on reconnect (BR-013) |
| `ekyan-bigquery` | Google BigQuery MCP | Programme intelligence, donor M&E, outcome funnels, cost-per-outcome KPIs |

### 🤖 2. AI & Language Services
| Server | Tool | Purpose |
|--------|------|---------|
| `ekyan-vertex-ai` | `@google-cloud/vertex-ai-mcp-server` | Chirp STT for voice notes, Swahili/English NLP, blocker classification, RAG advisory, finance memo drafting |

### 🛰️ 3. Earth Observation
| Server | Tool | Purpose |
|--------|------|---------|
| `ekyan-earth-engine` | `@google/earthengine-mcp-server` | NDVI per farm plot, soil moisture, credit scoring features (satellite-derived) |
| `ekyan-sentinel-hub` | `@sentinel-hub/mcp-server` | Sentinel-2 canopy moisture tracking, early-warning anomaly detection |

### 💬 4. Messaging & Communications
| Server | Tool | Purpose |
|--------|------|---------|
| `ekyan-whatsapp` | `@meta/whatsapp-business-mcp` | Primary channel — agripreneur voice notes, weather nudges, blocker status, supplier alerts |
| `ekyan-africastalking` | `@africastalking/mcp-server` | USSD/SMS/Voice IVR fallback for feature-phone farmers in ASALs |

### 💰 5. Mobile Money & Payments
| Server | Tool | Purpose |
|--------|------|---------|
| `ekyan-mpesa` | `@safaricom/mpesa-mcp-server` | M-Pesa transaction history → bookkeeping reconciliation + alternative credit scoring |
| `ekyan-airtel-money` | `@airtel/airtel-money-mcp` | Secondary mobile-money channel for Airtel-dominant counties |

### 🗺️ 6. Maps & Geospatial
| Server | Tool | Purpose |
|--------|------|---------|
| `ekyan-maps` | `@google/maps-mcp-server` | Geocoding GPS → ward/sub-county, demand clustering, last-mile delivery routing |

### ☁️ 7. Weather & Climate
| Server | Tool | Purpose |
|--------|------|---------|
| `ekyan-weather-openmeteo` | `@open-meteo/mcp-server` | Free hyperlocal 7-day hourly forecasts — drives daily SMS/WhatsApp nudge engine |
| `ekyan-weather-tomorrow` | `@tomorrow-io/mcp-server` | High-res forecasts for drought/ASAL early warning and planting-window optimisation |

### 🔍 8. Market Data & Research
| Server | Tool | Purpose |
|--------|------|---------|
| `ekyan-search` | `@modelcontextprotocol/server-brave-search` | KACE/wholesale price feeds, agronomic knowledge retrieval for RAG grounding |

### 🗂️ 9. File & Document Storage
| Server | Tool | Purpose |
|--------|------|---------|
| `ekyan-gcs` | Google Cloud Storage MCP | TFLite model weights, voice blobs, receipt scans, M&E exports, offline sync staging |
| `ekyan-filesystem` | `@modelcontextprotocol/server-filesystem` | Direct read/write to EKYAN workspace source repo |

### 📊 10. Monitoring & Observability
| Server | Tool | Purpose |
|--------|------|---------|
| `ekyan-monitoring` | `@google-cloud/monitoring-mcp` | SLA breach alerts, sync failures, integration errors (NFR-014) |

### ⚙️ 11. Task Queue
| Server | Tool | Purpose |
|--------|------|---------|
| `ekyan-redis` | `@redis/mcp-server` | Celery broker — async voice transcription, NDVI pulls, escalation sweeps, notification dispatch |

### 🐙 12. Source Control
| Server | Tool | Purpose |
|--------|------|---------|
| `ekyan-github` | `@modelcontextprotocol/server-github` | Issues for BRS requirements tracking, PR review for model updates, releases |

---

## Environment Variables Checklist

> [!WARNING]
> All variables below must be set in your shell environment. During MVP all data must remain **synthetic** — do not point at production M-Pesa / Supabase / WhatsApp accounts until data agreements are signed.

```bash
# ── Supabase ──────────────────────────────────────────────────
SUPABASE_ACCESS_TOKEN=
EKYAN_SUPABASE_PROJECT_REF=

# ── Google Cloud ──────────────────────────────────────────────
EKYAN_GCP_PROJECT_ID=
EKYAN_GCP_REGION=africa-south1       # or us-central1 during MVP
GOOGLE_APPLICATION_CREDENTIALS=      # path to service-account JSON

# ── Google Earth Engine ───────────────────────────────────────
EE_SERVICE_ACCOUNT=
EE_PRIVATE_KEY=

# ── Sentinel Hub ──────────────────────────────────────────────
SENTINEL_HUB_CLIENT_ID=
SENTINEL_HUB_CLIENT_SECRET=

# ── WhatsApp Cloud API (Meta) ─────────────────────────────────
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_BUSINESS_ACCOUNT_ID=

# ── Africa's Talking ──────────────────────────────────────────
AFRICASTALKING_API_KEY=
AFRICASTALKING_USERNAME=

# ── Safaricom M-Pesa Daraja ───────────────────────────────────
MPESA_CONSUMER_KEY=
MPESA_CONSUMER_SECRET=
MPESA_BUSINESS_SHORT_CODE=
MPESA_PASSKEY=
MPESA_ENVIRONMENT=sandbox            # → production when live

# ── Airtel Money ──────────────────────────────────────────────
AIRTEL_CLIENT_ID=
AIRTEL_CLIENT_SECRET=
AIRTEL_ENVIRONMENT=staging

# ── Maps, Search & Weather ────────────────────────────────────
GOOGLE_MAPS_API_KEY=
BRAVE_API_KEY=
TOMORROW_IO_API_KEY=

# ── Redis ─────────────────────────────────────────────────────
EKYAN_REDIS_URL=redis://localhost:6379/0

# ── GitHub ────────────────────────────────────────────────────
GITHUB_PERSONAL_ACCESS_TOKEN=
```

---

## MVP vs Phase 2 Activation

| Phase | Active Servers |
|-------|---------------|
| **MVP (now)** | `ekyan-supabase`, `ekyan-firestore`, `ekyan-vertex-ai`, `ekyan-whatsapp`, `ekyan-africastalking`, `ekyan-weather-openmeteo`, `ekyan-filesystem`, `ekyan-github`, `ekyan-bigquery` |
| **Phase 2** | + `ekyan-mpesa`, `ekyan-airtel-money`, `ekyan-earth-engine`, `ekyan-sentinel-hub`, `ekyan-weather-tomorrow`, `ekyan-maps`, `ekyan-search`, `ekyan-redis`, `ekyan-monitoring` |
| **Future** | + insurance APIs, formal credit bureau links, multi-country configs |

---

## Plugin Files

| File | Path |
|------|------|
| `plugin.json` | [plugin.json](file://C:/Users/ressah-lab/.gemini/config/plugins/ekyan/plugin.json) |
| `mcp_config.json` | [mcp_config.json](file://C:/Users/ressah-lab/.gemini/config/plugins/ekyan/mcp_config.json) |
| `rules/AGENTS.md` | [AGENTS.md](file://C:/Users/ressah-lab/.gemini/config/plugins/ekyan/rules/AGENTS.md) |
| `skills/ekyan-agritech/SKILL.md` | [SKILL.md](file://C:/Users/ressah-lab/.gemini/config/plugins/ekyan/skills/ekyan-agritech/SKILL.md) |
