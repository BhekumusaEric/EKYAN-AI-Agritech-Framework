{
  // ============================================================
  // EKYAN Connect — MCP Server Configuration
  // ============================================================
  // Covers all service layers identified in the EKYAN BRS v1.0
  // and the AI & Agritech Engineering Framework (README.md):
  //
  //  1. Core Database & GIS         — PostgreSQL/PostGIS, Supabase, TimescaleDB
  //  2. AI & Language Services      — Gemini, Vertex AI
  //  3. Earth Observation           — Google Earth Engine, Sentinel Hub
  //  4. Messaging & Communications  — WhatsApp Cloud API (Twilio/Meta), Africa's Talking (USSD/SMS)
  //  5. Mobile Money & Payments     — M-Pesa Daraja, Airtel Money
  //  6. Maps & Geospatial           — Google Maps
  //  7. Weather & Climate           — Open-Meteo (open-source), Tomorrow.io
  //  8. Market Data                 — Kenya Agricultural Commodity Exchange (KACE)
  //  9. File & Document Storage     — Google Cloud Storage
  // 10. Monitoring & Observability  — Google Cloud Monitoring
  // 11. Identity & Auth             — Supabase Auth
  // 12. Task Queue                  — Redis (via local MCP proxy)
  // 13. Web Search & Research       — Brave Search
  // 14. GitHub (source control)     — GitHub MCP
  //
  //  UI & FRONTEND LAYER:
  // 15. Design System               — Figma MCP
  // 16. GIS / Interactive Maps      — Mapbox MCP
  // 17. Deployment / Hosting        — Vercel MCP (Next.js dashboards & PWA)
  // 18. Mobile / Android PWA        — Expo MCP (React Native offline agripreneur app)
  // 19. Frontend Error Monitoring   — Sentry MCP
  // 20. Product Analytics           — PostHog MCP
  // 21. Browser Testing & Debugging — Chrome DevTools MCP (Puppeteer)
  // 22. CMS / Multilingual Content  — Contentful MCP (advisory + onboarding content)
  // 23. Accessibility Auditing      — axe DevTools MCP
  // 24. UI Component Explorer       — Storybook MCP (local component library)
  // ============================================================

  "mcpServers": {

    // ----------------------------------------------------------
    // 1. CORE DATABASE — PostgreSQL / PostGIS / TimescaleDB
    // ----------------------------------------------------------
    // The central operational ledger: farmer profiles, blockers,
    // input orders, bookkeeping, consent records, KPI tables.
    // Uses the official Supabase MCP which speaks to your hosted
    // PostgreSQL instance (PostGIS + TimescaleDB extensions).
    "ekyan-supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--access-token",
        "${SUPABASE_ACCESS_TOKEN}"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "${SUPABASE_ACCESS_TOKEN}",
        // Set to your EKYAN Supabase project ref (e.g. "abcdefghijklm")
        "SUPABASE_PROJECT_REF": "${EKYAN_SUPABASE_PROJECT_REF}"
      }
    },

    // ----------------------------------------------------------
    // 2. AI & LANGUAGE SERVICES — Google Gemini / Vertex AI
    // ----------------------------------------------------------
    // Powers: voice transcription (Whisper-equivalent via Chirp),
    // multilingual summarisation (Swahili/English), blocker
    // classification, RAG advisory, finance-readiness explanation,
    // investor memo drafting, cash-flow scenario generation.
    "ekyan-vertex-ai": {
      "command": "npx",
      "args": [
        "-y",
        "@google-cloud/vertex-ai-mcp-server@latest"
      ],
      "env": {
        "GOOGLE_CLOUD_PROJECT": "${EKYAN_GCP_PROJECT_ID}",
        "GOOGLE_CLOUD_LOCATION": "${EKYAN_GCP_REGION}",
        "GOOGLE_APPLICATION_CREDENTIALS": "${GOOGLE_APPLICATION_CREDENTIALS}"
      }
    },

    // ----------------------------------------------------------
    // 3a. EARTH OBSERVATION — Google Earth Engine
    // ----------------------------------------------------------
    // Retrieves NDVI (Sentinel-2 / Landsat), soil moisture, and
    // land-cover data per farm plot. Feeds the alternative credit
    // scoring model (satellite-derived vegetation health) and the
    // hyperlocal climate advisory module.
    "ekyan-earth-engine": {
      "command": "npx",
      "args": [
        "-y",
        "@google/earthengine-mcp-server@latest"
      ],
      "env": {
        "EE_SERVICE_ACCOUNT": "${EE_SERVICE_ACCOUNT}",
        "EE_PRIVATE_KEY": "${EE_PRIVATE_KEY}",
        "GOOGLE_CLOUD_PROJECT": "${EKYAN_GCP_PROJECT_ID}"
      }
    },

    // ----------------------------------------------------------
    // 3b. EARTH OBSERVATION — Copernicus / Sentinel Hub
    // ----------------------------------------------------------
    // Direct access to Sentinel-2 multispectral imagery via the
    // Sentinel Hub Process API. Used for canopy moisture tracking
    // and early-warning NDVI anomaly detection per ward/county.
    "ekyan-sentinel-hub": {
      "command": "npx",
      "args": [
        "-y",
        "@sentinel-hub/mcp-server@latest"
      ],
      "env": {
        "SH_CLIENT_ID": "${SENTINEL_HUB_CLIENT_ID}",
        "SH_CLIENT_SECRET": "${SENTINEL_HUB_CLIENT_SECRET}",
        "SH_BASE_URL": "https://services.sentinel-hub.com"
      }
    },

    // ----------------------------------------------------------
    // 4a. MESSAGING — WhatsApp Cloud API (Meta)
    // ----------------------------------------------------------
    // The primary conversational channel. Sends and receives
    // voice notes, structured messages, weather nudges, blocker
    // status updates, supplier commitments, and finance alerts
    // to agripreneurs and (via proxy) to farmers.
    "ekyan-whatsapp": {
      "command": "npx",
      "args": [
        "-y",
        "@meta/whatsapp-business-mcp@latest"
      ],
      "env": {
        "WHATSAPP_ACCESS_TOKEN": "${WHATSAPP_ACCESS_TOKEN}",
        "WHATSAPP_PHONE_NUMBER_ID": "${WHATSAPP_PHONE_NUMBER_ID}",
        "WHATSAPP_BUSINESS_ACCOUNT_ID": "${WHATSAPP_BUSINESS_ACCOUNT_ID}"
      }
    },

    // ----------------------------------------------------------
    // 4b. MESSAGING — Africa's Talking (USSD / SMS / Voice)
    // ----------------------------------------------------------
    // USSD fallback for feature-phone farmers; SMS for
    // low-connectivity alerts; voice IVR for voice-to-text
    // blocker capture on 2G networks. Essential for digital
    // inclusion in ASALs (arid & semi-arid lands).
    "ekyan-africastalking": {
      "command": "npx",
      "args": [
        "-y",
        "@africastalking/mcp-server@latest"
      ],
      "env": {
        "AT_API_KEY": "${AFRICASTALKING_API_KEY}",
        "AT_USERNAME": "${AFRICASTALKING_USERNAME}"
      }
    },

    // ----------------------------------------------------------
    // 5a. MOBILE MONEY — Safaricom M-Pesa Daraja API
    // ----------------------------------------------------------
    // Retrieves M-Pesa transaction history for bookkeeping
    // reconciliation and alternative credit scoring. Also used
    // for EKYAN Connect payment confirmation (supplier payments,
    // buyer receipts) and input finance disbursement tracking.
    "ekyan-mpesa": {
      "command": "npx",
      "args": [
        "-y",
        "@safaricom/mpesa-mcp-server@latest"
      ],
      "env": {
        "MPESA_CONSUMER_KEY": "${MPESA_CONSUMER_KEY}",
        "MPESA_CONSUMER_SECRET": "${MPESA_CONSUMER_SECRET}",
        "MPESA_BUSINESS_SHORT_CODE": "${MPESA_BUSINESS_SHORT_CODE}",
        "MPESA_PASSKEY": "${MPESA_PASSKEY}",
        "MPESA_ENVIRONMENT": "${MPESA_ENVIRONMENT}"
      }
    },

    // ----------------------------------------------------------
    // 5b. MOBILE MONEY — Airtel Money (secondary market)
    // ----------------------------------------------------------
    // Supplementary mobile-money channel used in counties where
    // Airtel has stronger penetration than Safaricom.
    "ekyan-airtel-money": {
      "command": "npx",
      "args": [
        "-y",
        "@airtel/airtel-money-mcp@latest"
      ],
      "env": {
        "AIRTEL_CLIENT_ID": "${AIRTEL_CLIENT_ID}",
        "AIRTEL_CLIENT_SECRET": "${AIRTEL_CLIENT_SECRET}",
        "AIRTEL_COUNTRY": "KE",
        "AIRTEL_CURRENCY": "KES",
        "AIRTEL_ENVIRONMENT": "${AIRTEL_ENVIRONMENT}"
      }
    },

    // ----------------------------------------------------------
    // 6. MAPS & GEOSPATIAL — Google Maps Platform
    // ----------------------------------------------------------
    // Reverse-geocoding of GPS coordinates to ward/sub-county
    // admin boundaries. Route optimization for last-mile input
    // delivery. Location clustering of pooled input demand.
    // Embedded map views in the M&E dashboard.
    "ekyan-maps": {
      "command": "npx",
      "args": [
        "-y",
        "@google/maps-mcp-server@latest"
      ],
      "env": {
        "GOOGLE_MAPS_API_KEY": "${GOOGLE_MAPS_API_KEY}"
      }
    },

    // ----------------------------------------------------------
    // 7a. WEATHER — Open-Meteo (open-source, free)
    // ----------------------------------------------------------
    // Hyperlocal 7-day hourly weather forecasts by lat/lon.
    // Drives the daily SMS/WhatsApp nudge engine — rainfall
    // probability, temperature extremes, humidity spikes.
    // No API key required; hosted at open-meteo.com.
    "ekyan-weather-openmeteo": {
      "command": "npx",
      "args": [
        "-y",
        "@open-meteo/mcp-server@latest"
      ],
      "env": {
        "OPEN_METEO_BASE_URL": "https://api.open-meteo.com/v1"
      }
    },

    // ----------------------------------------------------------
    // 7b. WEATHER — Tomorrow.io (premium hyperlocal)
    // ----------------------------------------------------------
    // Higher-resolution hourly forecasts and historical climate
    // data for planting-window optimisation and drought-risk
    // early warning, particularly in ASAL counties.
    "ekyan-weather-tomorrow": {
      "command": "npx",
      "args": [
        "-y",
        "@tomorrow-io/mcp-server@latest"
      ],
      "env": {
        "TOMORROW_API_KEY": "${TOMORROW_IO_API_KEY}"
      }
    },

    // ----------------------------------------------------------
    // 8. MARKET DATA — Brave Search (web research)
    // ----------------------------------------------------------
    // Retrieves current market prices from KACE, Nairobi wholesale
    // market reports, and other public agricultural price sources.
    // Also used for agronomic knowledge retrieval (RAG grounding)
    // over public extension resources and research papers.
    "ekyan-search": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-brave-search@latest"
      ],
      "env": {
        "BRAVE_API_KEY": "${BRAVE_API_KEY}"
      }
    },

    // ----------------------------------------------------------
    // 9. CLOUD STORAGE — Google Cloud Storage
    // ----------------------------------------------------------
    // Stores crop-disease model weights (.tflite), voice note
    // audio blobs, receipt/invoice scans, training datasets,
    // M&E export files, and investor profile PDFs. Also the
    // offline-sync staging area for field data.
    "ekyan-gcs": {
      "serverUrl": "https://storage.googleapis.com/storage/mcp",
      "authProviderType": "google_credentials",
      "headers": {
        "User-Agent": "ekyan.antigravity"
      },
      "oauth": {
        "scopes": [
          "https://www.googleapis.com/auth/cloud-platform"
        ]
      }
    },

    // ----------------------------------------------------------
    // 10. MONITORING — Google Cloud Monitoring
    // ----------------------------------------------------------
    // Tracks platform health: sync failures, integration errors,
    // overdue blocker SLA breaches, and AI model latency/accuracy
    // dashboards. Required by NFR-014 of the BRS.
    "ekyan-monitoring": {
      "command": "npx",
      "args": [
        "-y",
        "@google-cloud/monitoring-mcp@latest"
      ],
      "env": {
        "GOOGLE_CLOUD_PROJECT": "${EKYAN_GCP_PROJECT_ID}",
        "GOOGLE_APPLICATION_CREDENTIALS": "${GOOGLE_APPLICATION_CREDENTIALS}"
      }
    },

    // ----------------------------------------------------------
    // 11. TASK QUEUE — Redis (Celery broker)
    // ----------------------------------------------------------
    // Backs Celery workers for async tasks: voice transcription
    // jobs, demand aggregation batch runs, nightly NDVI pulls,
    // SLA escalation sweeps, and notification dispatch queues.
    "ekyan-redis": {
      "command": "npx",
      "args": [
        "-y",
        "@redis/mcp-server@latest"
      ],
      "env": {
        "REDIS_URL": "${EKYAN_REDIS_URL}"
      }
    },

    // ----------------------------------------------------------
    // 12. FILESYSTEM — Local project workspace
    // ----------------------------------------------------------
    // Grants the agent direct read/write to the EKYAN source repo:
    // source files, model weights, migration scripts, BRS docs,
    // and config files. Keeps the agent anchored to the codebase.
    "ekyan-filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem@latest",
        "c:/Users/ressah-lab/.gemini/antigravity/scratch/EKYAN-AI-Agritech-Framework"
      ]
    },

    // ----------------------------------------------------------
    // 13. GITHUB — Source control & issues
    // ----------------------------------------------------------
    // Manages EKYAN source code: open/update issues for tracked
    // blockers and BRS requirements, review PRs for model updates,
    // create releases, and read file trees for codebase grounding.
    "ekyan-github": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-github@latest"
      ],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_PERSONAL_ACCESS_TOKEN}"
      }
    },

    // ----------------------------------------------------------
    // 14. BIGQUERY — Analytics & M&E reporting
    // ----------------------------------------------------------
    // Hosts the programme intelligence layer: KPI tables, outcome
    // funnels, cost-per-outcome calculations, and donor M&E
    // exports. TimescaleDB time-series data is also mirrored here
    // for UNICEF and donor reporting dashboards.
    "ekyan-bigquery": {
      "serverUrl": "https://bigquery.googleapis.com/mcp",
      "authProviderType": "google_credentials",
      "headers": {
        "User-Agent": "ekyan.antigravity"
      },
      "oauth": {
        "scopes": [
          "https://www.googleapis.com/auth/bigquery",
          "https://www.googleapis.com/auth/cloud-platform"
        ]
      }
    },

    // ----------------------------------------------------------
    // 15. FIRESTORE — Offline-sync document store
    // ----------------------------------------------------------
    // Stores field operation records (farmer profiles, blockers,
    // intentions, input orders) in a schema that supports
    // offline-first writes on Android and merges on reconnect.
    // Bridges the mobile edge tier with the core cloud pipeline.
    "ekyan-firestore": {
      "serverUrl": "https://firestore.googleapis.com/mcp",
      "authProviderType": "google_credentials",
      "headers": {
        "User-Agent": "ekyan.antigravity"
      },
      "oauth": {
        "scopes": [
          "https://www.googleapis.com/auth/datastore",
          "https://www.googleapis.com/auth/cloud-platform"
        ]
      }
    },

    // ----------------------------------------------------------
    // 16. DESIGN SYSTEM — Figma
    // ----------------------------------------------------------
    // Bridges design → code for all three EKYAN UIs:
    //  · Agripreneur offline PWA (large touch targets, NFR-003)
    //  · UNICEF M&E GIS dashboard
    //  · Supplier/buyer portal
    // The agent reads component specs, extracts design tokens,
    // and generates matching React/TailwindCSS code from Figma
    // frames — no manual copy-paste from design files.
    "ekyan-figma": {
      "command": "npx",
      "args": [
        "-y",
        "@figma/mcp-server@latest"
      ],
      "env": {
        "FIGMA_PERSONAL_ACCESS_TOKEN": "${FIGMA_PERSONAL_ACCESS_TOKEN}"
      }
    },

    // ----------------------------------------------------------
    // 16. GIS / INTERACTIVE MAPS — Mapbox
    // ----------------------------------------------------------
    // Powers the interactive layers in the UNICEF M&E dashboard:
    //  · Choropleth of verified adoption rates by ward/county
    //  · Heatmap of unresolved blockers by geography
    //  · Farm plot polygons overlaid with NDVI colour scale
    //  · Last-mile delivery route visualisation
    // Also used in the agripreneur PWA for offline map tiles
    // (Mapbox GL JS with tile caching for 2G/3G environments).
    "ekyan-mapbox": {
      "command": "npx",
      "args": [
        "-y",
        "@mapbox/mcp-server@latest"
      ],
      "env": {
        "MAPBOX_ACCESS_TOKEN": "${MAPBOX_ACCESS_TOKEN}"
      }
    },

    // ----------------------------------------------------------
    // 17. DEPLOYMENT & HOSTING — Vercel
    // ----------------------------------------------------------
    // Hosts and deploys:
    //  · UNICEF M&E dashboard (Next.js 14 + Recharts + Mapbox GL)
    //  · Supplier/buyer portal (Next.js 14)
    //  · AgriconnectPWA (served as a Progressive Web App with
    //    offline Service Worker, cacheable on low-end Android)
    // Vercel edge functions proxy time-sensitive API calls
    // (weather, market prices) to avoid exposing keys client-side.
    "ekyan-vercel": {
      "command": "npx",
      "args": [
        "-y",
        "@vercel/mcp-adapter@latest"
      ],
      "env": {
        "VERCEL_TOKEN": "${VERCEL_TOKEN}",
        "VERCEL_TEAM_ID": "${VERCEL_TEAM_ID}"
      }
    },

    // ----------------------------------------------------------
    // 18. MOBILE / ANDROID — Expo (React Native)
    // ----------------------------------------------------------
    // The agripreneur offline field app targets low-end Android
    // (NFR-002). Expo manages:
    //  · OTA (over-the-air) updates without Play Store resubmission
    //  · EAS Build for .apk / .aab artefacts
    //  · Expo Go for rapid field testing at community hubs
    //  · expo-camera (crop disease photo capture → TFLite)
    //  · expo-av (voice note recording → Vertex AI STT)
    //  · expo-sqlite (local offline DB → sync with Firestore)
    "ekyan-expo": {
      "command": "npx",
      "args": [
        "-y",
        "@expo/mcp-server@latest"
      ],
      "env": {
        "EXPO_TOKEN": "${EXPO_TOKEN}",
        "EXPO_ACCOUNT_NAME": "${EXPO_ACCOUNT_NAME}"
      }
    },

    // ----------------------------------------------------------
    // 19. FRONTEND ERROR MONITORING — Sentry
    // ----------------------------------------------------------
    // Captures and triages runtime errors across all surfaces:
    //  · React Native crashes on field Android devices
    //  · Next.js SSR/client errors in the M&E dashboard
    //  · FastAPI backend exceptions
    // Sentry's session replay and performance tracing also helps
    // identify UI bottlenecks on slow connections (NFR-006).
    "ekyan-sentry": {
      "command": "npx",
      "args": [
        "-y",
        "@sentry/mcp-server@latest"
      ],
      "env": {
        "SENTRY_AUTH_TOKEN": "${SENTRY_AUTH_TOKEN}",
        "SENTRY_ORG": "${SENTRY_ORG}",
        "SENTRY_PROJECT": "${SENTRY_PROJECT}"
      }
    },

    // ----------------------------------------------------------
    // 20. PRODUCT ANALYTICS — PostHog
    // ----------------------------------------------------------
    // Open-source, self-hostable analytics — appropriate for a
    // UNICEF programme where data sovereignty matters.
    // Tracks:
    //  · Agripreneur session funnels (blocker → resolved)
    //  · Feature adoption rates per value chain and county
    //  · Drop-off points in the finance-readiness profile flow
    //  · M&E dashboard usage by programme manager cohort
    // No personally identifiable data is sent; events are keyed
    // to anonymised participant IDs.
    "ekyan-posthog": {
      "command": "npx",
      "args": [
        "-y",
        "@posthog/mcp-server@latest"
      ],
      "env": {
        "POSTHOG_API_KEY": "${POSTHOG_API_KEY}",
        "POSTHOG_HOST": "${POSTHOG_HOST}"
      }
    },

    // ----------------------------------------------------------
    // 21. BROWSER TESTING & DEBUGGING — Chrome DevTools
    // ----------------------------------------------------------
    // Drives a Chromium instance for:
    //  · End-to-end UI testing of the M&E dashboard (map layers,
    //    chart rendering, filter interactions)
    //  · Visual regression testing for the agripreneur PWA
    //    (simulated 2G throttling via DevTools Network panel)
    //  · Lighthouse audits: PWA score, accessibility, performance
    //    on a low-end mobile profile (NFR-002, NFR-004)
    //  · Screenshots/traces for bug reports from field testers
    "ekyan-chrome-devtools": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-puppeteer@latest"
      ],
      "env": {
        "PUPPETEER_EXECUTABLE_PATH": "${PUPPETEER_EXECUTABLE_PATH}"
      }
    },

    // ----------------------------------------------------------
    // 22. CMS & MULTILINGUAL ADVISORY CONTENT — Contentful
    // ----------------------------------------------------------
    // Manages all structured editorial content that the AI serves
    // through the RAG advisory layer, without requiring a code
    // deployment to update it:
    //  · Agronomic advice articles (Swahili + English, BR-016)
    //  · Value-chain specific fact sheets (poultry, horticulture,
    //    dairy) reviewed and approved by extension officers
    //  · Onboarding guides and UI copy for each app surface
    //  · Disclaimer and escalation message templates
    // Content versioning ensures AI advice is traceable to an
    // approved source document (BRS §12.3).
    "ekyan-contentful": {
      "command": "npx",
      "args": [
        "-y",
        "@contentful/mcp-server@latest"
      ],
      "env": {
        "CONTENTFUL_SPACE_ID": "${CONTENTFUL_SPACE_ID}",
        "CONTENTFUL_ACCESS_TOKEN": "${CONTENTFUL_ACCESS_TOKEN}",
        "CONTENTFUL_MANAGEMENT_TOKEN": "${CONTENTFUL_MANAGEMENT_TOKEN}",
        "CONTENTFUL_ENVIRONMENT": "master"
      }
    },

    // ----------------------------------------------------------
    // 23. ACCESSIBILITY AUDITING — axe DevTools
    // ----------------------------------------------------------
    // Runs automated WCAG 2.1 AA audits (NFR-004) on every UI
    // surface. Critical for EKYAN's inclusion mandate:
    //  · Large touch targets (NFR-003) checked on mobile viewport
    //  · Screen reader compatibility for participants with
    //    visual impairments (BRS §14.3)
    //  · Colour contrast validation for outdoor sunlight use
    //  · Keyboard navigation for the M&E dashboard
    "ekyan-axe": {
      "command": "npx",
      "args": [
        "-y",
        "@axe-core/mcp-server@latest"
      ],
      "env": {
        "AXE_API_KEY": "${AXE_API_KEY}"
      }
    },

    // ----------------------------------------------------------
    // 24. UI COMPONENT EXPLORER — Storybook (local)
    // ----------------------------------------------------------
    // Runs a local Storybook server for the shared EKYAN design
    // system. Lets the agent:
    //  · Browse and render individual UI components in isolation
    //  · Generate new component stories from Figma specs
    //  · Run interaction tests (play functions) headlessly
    //  · Export the component catalogue for the design handoff
    // The design system is shared across the PWA, dashboard and
    // supplier portal so changes propagate consistently.
    "ekyan-storybook": {
      "command": "npx",
      "args": [
        "-y",
        "@storybook/mcp-server@latest",
        "--config-dir",
        "c:/Users/ressah-lab/.gemini/antigravity/scratch/EKYAN-AI-Agritech-Framework/.storybook"
      ]
    }
  }
}
