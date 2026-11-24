# Implementation Plan: EKYAN Connect MVP

Run in order. Each task ends with passing tests. Reference requirement IDs.

- [ ] 1. **Scaffold monorepo**: pnpm workspaces `apps/web`, `apps/api`, `packages/shared`; TypeScript, ESLint, Prettier, Vitest; Docker Compose (web, api, postgres); `.env.example`. _Req R9_
- [ ] 2. **Prisma schema + migrations** for the data model in design §2; `synthetic` flag on seedable tables. _R1, R8.3_
- [ ] 3. **Shared package**: zod schemas for all entities; `kpi.ts` with K1–K11 definitions (id, name, formula, source). _R6.1_
- [ ] 4. **Auth + RBAC**: mock OTP login, JWT, role guard middleware, audit-log middleware. _R8.1–8.2_
- [ ] 5. **Config module**: CRUD for counties, value chains, input items, blocker categories (with route + SLA), organisations; seed Busia/Poultry. _R1.3–1.4_
- [ ] 6. **Farmers + Field Log API**: farmers, orders, blockers, transactions; validation; `actedBy/onBehalfOf`; consent-to-record rule. _R2.1–2.3, 2.6–2.7_
- [ ] 7. **Sync endpoint**: batch idempotent `/sync` with per-entry results. _R2.5_
- [ ] 8. **AIService + blocker triage**: interface, rule/keyword implementation, optional LLM provider behind env flag; returns category, urgency, confidence, rationale. _R3.1_
- [ ] 9. **Blocker routing, status workflow and SLA job**. _R3.2–3.5_
- [ ] 10. **Demand pooling job + demand-group API + forecast**; aggregates only to suppliers. _R4.1–4.2, 4.5_
- [ ] 11. **Supplier commitments + notifications (in-app + mock channel adapter) + fulfilment**. _R4.3–4.4_
- [ ] 12. **Adapters (mocks)**: Advisory (Ask Nia), Marketplace (OneNetwork), Savings (Chomoka), Finance, Climate, Channel. _tech.md_
- [ ] 13. **Credit-readiness scorer** per design §3.4, versioned weights, factor explanations; unit test proving protected attributes are excluded. _R5.2–5.5_
- [ ] 14. **Consent module** + consent-gated lender profile endpoint + audit of reads + revoke. _R5.6–5.7_
- [ ] 15. **Fairness report endpoint** (score distribution by gender and disability on seed data). _R5.8_
- [ ] 16. **KPI service + dashboard API** with filters, programme cost input, CSV export. _R6.1–6.4, 6.6_
- [ ] 17. **Data-quality checks** (duplicates, outliers, missing fields) + K11. _R6.5_
- [ ] 18. **Seed script** per design §6 (deterministic). _R8.3_
- [ ] 19. **Web PWA shell**: routing by role, i18n (en, sw), synthetic-data banner, service worker, IndexedDB sync queue. _R2.4, R2.8, R9_
- [ ] 20. **Agripreneur UI**: Home, Farmers, New entry (Order/Blocker/Sale, voice-note stub), My blockers, My business + consent manager, Ask. _R2, R3.5, R5.1–5.6, R7_
- [ ] 21. **Supplier UI**: demand board with forecast, commitments. _R4_
- [ ] 22. **Lender UI**: consented profiles with explanations and "not a credit decision" label. _R5.3, R5.5_
- [ ] 23. **Extension UI**: assigned blockers by urgency/ward, update status. _R3.3_
- [ ] 24. **Programme dashboard UI**: KPI tiles with tooltips, funnel, blockers by category, filters, data-quality panel, cost input, export. _R6_
- [ ] 25. **Accessibility + performance pass**: axe checks, tap targets, bundle size budget. _R9.1–9.2_
- [ ] 26. **E2E tests** for the four journeys in design §7. _R9.4_
- [ ] 27. **Demo script** `docs/DEMO.md`: 10-minute walkthrough following Mama Achieng → Brian → supplier → lender → programme dashboard.
