# EKYAN Connect — Agent Rules (Repo Root)

This file is automatically loaded by Antigravity and other AI coding agents
(Claude Code, Codex, Cursor) whenever this repository is open.

## Context
You are building **EKYAN Connect** — a digital coordination and intelligence
platform for the EKYAN programme (UNICEF Kenya / Generation Unlimited).
Full specification: [`EKYANBRS.md`](./EKYANBRS.md)
MCP architecture: [`docs/07_MCP_Architecture.md`](./docs/07_MCP_Architecture.md)

## Project Layout
```
.agents/              ← workspace-scoped AI agent config (MCP servers, skill, rules)
docs/                 ← module specifications (01–07)
src/                  ← Python source (FastAPI, ML models, voice bot)
  crop_disease_model/ ← TFLite edge inference (YOLOv8-nano / MobileNetV3)
  swahili_voice_bot/  ← WhatsApp / USSD conversational agronomist
  credit_scoring/     ← Alternative ML credit scoring (XGBoost)
  climate_engine/     ← NDVI + hyperlocal weather advisory rule engine
```

## Core Rules (always enforce)

1. **Human accountability.** AI must never make final lending, credit, or
   clinical (veterinary/agronomic prescriptions) decisions. Always surface a
   human confirmation step.
2. **Consent before data sharing.** Never share farmer/agripreneur financial,
   location, or personal records with a lender, investor, or buyer without an
   active, purpose-specific, non-expired consent record.
3. **Synthetic data only during MVP.** All prototype runs use synthetic data.
   Never request, store, or process real personal or financial data until
   data-sharing, privacy, and partner agreements are in place.
4. **Protected characteristics excluded from scoring.** Gender, disability,
   ethnicity, religion, and similar characteristics must never be used as
   inputs to any finance-readiness or credit assessment computation.
5. **Language inclusivity.** Default to English and Kiswahili. Flag when a
   message arrives in another language.
6. **Source every AI output.** Advisory outputs must cite the source document
   or retrieval chunk. If confidence is low, say so explicitly and escalate.
7. **Offline-resilience.** Assume field agents operate with intermittent
   connectivity. All data writes must be idempotent and sync-safe.
8. **Do not invent pesticide, veterinary, or dosage instructions.** Triage,
   provide general guidance, and always escalate to a qualified extension
   officer or vet.
9. **Audit everything high-impact.** Any action that shares data with an
   external party, changes a consent record, or modifies a finance profile
   must generate an audit log entry.
10. **BRS is the source of truth.** When in doubt about scope, refer to
    `EKYANBRS.md`. The BRS governs what is in-scope for MVP, Phase 2, and
    future phases.

## Stack Quick Reference
| Layer | Technology |
|-------|-----------|
| Edge AI / CV | PyTorch → ONNX → TFLite (YOLOv8-nano), OpenCV |
| Conversational AI | Whisper / Vertex AI Chirp, Gemini Flash, LangChain |
| Backend | Python 3.11+, FastAPI, Celery, Redis, Pydantic |
| Database / GIS | PostgreSQL 16, PostGIS, Supabase, TimescaleDB, Firestore |
| ML / Analytics | XGBoost, Scikit-Learn, Prophet, GeoPandas |
| Earth Observation | Sentinel-2 (Sentinel Hub), Google Earth Engine |
| Frontend / Mobile | Next.js 14, TailwindCSS, Mapbox GL, Recharts; Expo (React Native) |
| Messaging | WhatsApp Cloud API, Africa's Talking (USSD/SMS/Voice) |
| Mobile Money | M-Pesa Daraja, Airtel Money |
