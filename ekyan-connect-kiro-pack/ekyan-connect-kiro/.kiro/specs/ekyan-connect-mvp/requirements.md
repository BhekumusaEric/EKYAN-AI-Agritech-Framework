# Requirements: EKYAN Connect MVP

Format: user story + acceptance criteria in EARS notation (WHEN/IF … THE SYSTEM SHALL …).
Context: read `.kiro/steering/*` and `docs/01–04` first.

## R1 · People, roles and configuration
**Story:** As a programme admin, I want to configure counties, value chains, input catalogue, blocker categories and partners, so the system adapts to new contexts without code changes.
1. THE SYSTEM SHALL support roles: `agripreneur`, `supplier`, `lender`, `extension_officer`, `programme_admin`.
2. THE SYSTEM SHALL store farmers as records managed by an agripreneur (farmers need no login in MVP).
3. WHEN an admin adds a value chain, input item, blocker category, county or partner, THE SYSTEM SHALL make it available in forms without redeploy.
4. THE SYSTEM SHALL seed: county Busia; value chain Poultry; inputs Day-old chicks, Feed (bags), Vaccines (doses), Drinkers/feeders; blocker categories Inputs, Finance, Water, Market, Disease, Labour, Land access, Time.
5. THE SYSTEM SHALL record gender and optional disability status for people for inclusion reporting only, never for scoring.

## R2 · Field Log (agripreneur)
**Story:** As an agripreneur, I want to log a farmer's order, blocker or my sale in under 30 seconds, even offline, so nothing is lost.
1. THE SYSTEM SHALL let an agripreneur register a farmer with name, phone (optional), village, gender, and consent-to-record flag.
2. IF the farmer consent-to-record flag is false, THE SYSTEM SHALL NOT save the farmer.
3. THE SYSTEM SHALL support entry types: `order` (item, quantity, needed-by date), `blocker` (category, description, optional voice note), `transaction` (type sale/purchase/service, amount KES, counterparty, date).
4. WHEN the device is offline, THE SYSTEM SHALL save entries locally and show them as "pending sync".
5. WHEN connectivity returns, THE SYSTEM SHALL sync pending entries and show success or conflict per entry.
6. THE SYSTEM SHALL record `actedBy` (agripreneur) and `onBehalfOf` (farmer) on every proxy entry.
7. IF quantity ≤ 0 or amount ≤ 0, THE SYSTEM SHALL reject the entry with a clear message.
8. THE SYSTEM SHALL be usable in English and Kiswahili.

## R3 · Blocker resolution
**Story:** As a farmer (through my agripreneur), I want my blocker to reach someone who can act, and to see what happened.
1. WHEN a blocker is created, THE SYSTEM SHALL suggest a category and urgency (AI triage) that the agripreneur can accept or change.
2. WHEN a blocker is confirmed, THE SYSTEM SHALL route it by rule: Inputs → suppliers in county; Finance → lender partner queue; Disease → Ask Nia mock then extension officer; Water/Land/Labour/Time → extension officer; Market → buyer queue (stub).
3. THE SYSTEM SHALL track status: `open` → `in_progress` → `resolved` | `cannot_resolve`, with resolver and note.
4. IF a blocker stays `open` past its SLA (configurable, default 7 days), THE SYSTEM SHALL flag it as overdue and escalate to programme_admin.
5. THE SYSTEM SHALL let the agripreneur see status of all blockers they logged.

## R4 · Pooled demand board (supplier)
**Story:** As a supplier, I want to see aggregated demand by item, area and needed-by window, so I can serve rural farmers profitably.
1. THE SYSTEM SHALL aggregate open orders by item × county/ward × needed-by week, showing total quantity, number of farmers and number of agripreneurs.
2. THE SYSTEM SHALL NOT show farmer names or phones to suppliers; only aggregates and the agripreneur delivery point.
3. WHEN a supplier commits to a demand group with price and delivery date, THE SYSTEM SHALL notify the relevant agripreneurs (in-app + mock channel).
4. WHEN an agripreneur confirms delivery, THE SYSTEM SHALL mark order lines fulfilled and update K4/K6.
5. THE SYSTEM SHALL show a simple 4-week demand forecast per item (moving average), labelled as an estimate.

## R5 · Bookkeeping and credit-readiness profile
**Story:** As an agripreneur, I want my records to become a profile I can choose to share with a lender.
1. THE SYSTEM SHALL show monthly recorded income, operating expenses, operating-surplus estimate, paid/unpaid amounts, recorded borrowing estimate and record coverage.
2. THE SYSTEM SHALL distinguish recorded, self-reported, programme-confirmed, independently verified and unavailable evidence.
3. THE SYSTEM SHALL provide a record-coverage checklist, not a creditworthiness score, eligibility band or approval prediction.
4. THE SYSTEM SHALL NOT use gender, disability, age, ethnicity or religion as lending or creditworthiness factors.
5. THE SYSTEM SHALL label the profile as informational and not a credit decision; the lender remains responsible for underwriting.
6. WHEN an agripreneur grants consent to a specific lender with a purpose and expiry, THE SYSTEM SHALL allow that lender to view the profile until expiry or revocation.
7. IF consent is absent, expired or revoked, THE SYSTEM SHALL deny lender access and log the attempt.
8. THE SYSTEM SHALL monitor record coverage across gender and disability groups for inclusion purposes only, without using those characteristics to assess an individual.
9. THE SYSTEM SHALL let an agripreneur generate a downloadable application summary and explicitly choose whether to include detailed transaction rows; export generation SHALL NOT send data to a lender.
10. THE SYSTEM SHALL provide record-completion coaching only; it SHALL NOT recommend borrowing or claim that an applicant qualifies.

## R6 · Programme dashboard
**Story:** As a programme manager, I want one trusted view of activity, outcomes and cost per outcome.
1. THE SYSTEM SHALL display KPIs K1–K11 as defined in `docs/04`, each with definition tooltip and source.
2. THE SYSTEM SHALL filter by county, value chain, period and gender.
3. THE SYSTEM SHALL show blockers by category and an intention → order → fulfilled funnel.
4. THE SYSTEM SHALL let an admin enter programme cost per period to compute K10.
5. THE SYSTEM SHALL run data-quality checks (duplicates, outliers, missing fields) and show K11 with a list of failing records.
6. THE SYSTEM SHALL export KPI tables to CSV.

## R7 · Advisory bridge (mock)
1. WHEN an agripreneur asks a question in-app, THE SYSTEM SHALL send it to `AdvisoryAdapter` (Ask Nia mock) and show the answer with its source.
2. IF the adapter returns low confidence or no source, THE SYSTEM SHALL offer to convert the question into a blocker routed to an extension officer.

## R8 · Security, audit, privacy
1. THE SYSTEM SHALL enforce role-based access on every endpoint.
2. THE SYSTEM SHALL write an audit entry for every create/update/delete and every profile view.
3. THE SYSTEM SHALL flag all seed records `synthetic = true` and show a "Synthetic data" banner.
4. THE SYSTEM SHALL not store national ID numbers or data about minors.

## R9 · Non-functional
1. Initial PWA load ≤ ~200 KB gzipped where feasible; works on low-end Android Chrome.
2. WCAG 2.1 AA; tap targets ≥ 44 px.
3. p95 API latency < 500 ms on seed data.
4. Unit test coverage ≥ 70% on services; e2e for R2, R3, R4, R5.6–5.7.
