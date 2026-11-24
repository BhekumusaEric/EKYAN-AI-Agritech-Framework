# Tech Steering

> These are recommended choices for the prototype. Stack decisions are open for confirmation with UNICEF/Kuza; keep everything swappable.

## Stack (prototype)
- **Language:** TypeScript end to end.
- **Frontend:** React + Vite, built as an **installable PWA** (offline-first via service worker + IndexedDB). Tailwind CSS.
- **Backend:** Node.js with Fastify (or NestJS), REST + OpenAPI.
- **Database:** PostgreSQL (Prisma ORM). PostGIS optional later for maps.
- **Auth:** role-based access (farmer-proxy, agripreneur, supplier, lender, extension, programme_admin). Phone-number + OTP mocked in MVP.
- **Messaging channel:** a `ChannelAdapter` interface with a **mock WhatsApp/USSD adapter** so the same flows can later run over WhatsApp Business API or USSD.
- **AI:** behind an `AIService` interface. MVP uses rule-based logic + an optional LLM provider for summarisation/classification. No AI output is final without a human action.
- **Testing:** Vitest (unit), Playwright (e2e), seed scripts with synthetic data.
- **Containers:** Docker Compose for local run (web, api, db).

## Hard constraints
- **Low bandwidth:** pages under ~200 KB initial load where possible; no heavy maps on first load.
- **Offline:** Field Log must work offline and sync later with conflict handling (last-write-wins + audit trail for MVP).
- **Languages:** i18n from day one: English and Kiswahili strings files; others pluggable.
- **Accessibility:** WCAG 2.1 AA, large tap targets, icon + text labels, voice-note field supported.
- **Configurability:** value chains, input catalogue, blocker categories, counties and partners live in DB tables, not code.

## Integration rule: adapters, not rewrites
Each external system gets an adapter interface and a mock implementation:
| Adapter | Real system (future) | MVP |
|---|---|---|
| `AdvisoryAdapter` | Ask Nia (Kuza) | Mock returns canned verified answers |
| `MarketplaceAdapter` | Kuza OneNetwork | Mock; our pooled demand is designed to sync to it |
| `LearningAdapter` | Agribytes / Leadership Academy | Mock links |
| `SavingsAdapter` | Chomoka (VSLA records) | Mock |
| `FinanceAdapter` | SEVi / 4G Capital / Pepea | Mock "share profile" endpoint |
| `ClimateAdapter` | Existing weather/advisory services | Mock alerts |

## Non-functional targets (prototype)
- p95 API < 500 ms on seed data.
- All write actions audited (who, when, what, on behalf of whom).
- Seed data clearly flagged `synthetic = true`.
