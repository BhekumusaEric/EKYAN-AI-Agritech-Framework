# Business Book & Credit Coach

**Status:** MVP feature specification
**Updated:** 2026-11-24
**Pilot:** Busia poultry agripreneurs

## Product decision

Build a simple recordkeeping and application-preparation tool. It helps an agripreneur organize and explain business activity; it does not make the business "creditworthy", predict approval, or replace a lender's assessment. Lender requirements must be validated with pilot partners.

The existing finance profile is an information summary, not a credit score. The MVP must not display a weighted score, eligibility band, approval likelihood, or recommended loan amount. Gender, disability, age, ethnicity, religion, and other protected characteristics are not financial assessment inputs. Group reporting may be used only to monitor access and record-coverage gaps.

## Users and flow

The agripreneur records and manages their own business activity. Farmer records remain managed by an agripreneur; a farmer login is not introduced. A farmer's identity or personal records are not needed to record the agripreneur's business transaction.

1. **Record:** capture a dated income, expense, loan, savings, or owner transaction in a short form. Entries are editable by the owning agripreneur and sync idempotently when connectivity returns.
2. **Organize:** browse records by simple folders: **Money in**, **Money out**, **Loans**, **Savings**, and **Owner contributions/withdrawals**. Existing orders can be reviewed as business activity but must not be treated as cash received or a fulfilled sale.
3. **Review:** see a six-month month-by-month summary, paid/unpaid amounts, due dates, and record-coverage prompts. A month with no entries is labelled "No records" rather than interpreted as zero business activity.
4. **Prepare:** enter a requested amount, purpose, and term to create a downloadable CSV application pack. The user reviews it and shares it themselves. Exporting does not transmit it to a lender; direct lender viewing continues to require active, purpose-specific consent.
5. **Improve records:** the Credit Coach points out missing or inconsistent records and explains what a lender may ask for. It does not recommend that a person borrow or claim they qualify.

## MVP record structure

Each record uses KES, a date, record type, category, paid/unpaid state, optional due date, and an optional synthetic counterparty reference. Records show their evidence provenance. New entries are self-reported; the prototype has no receipt-upload or independent-verification workflow.

| Folder | Record types | Reporting treatment |
|---|---|---|
| Money in | Sale, service, other income | Report recorded and received amounts separately. |
| Money out | Purchase, other expense | Report recorded and paid amounts separately. |
| Loans | Loan received, loan repayment | Show recorded amounts and a clearly labelled estimate from these entries only. |
| Savings | Deposit, withdrawal | Report separately; savings are not income or an operating expense. |
| Owner | Contribution, withdrawal | Report separately; do not treat as sales or operating expenses. |

Categories are selectable, with poultry-relevant examples (feed, chicks, vaccines, equipment, transport, wages, rent, phone/data, and other). Records must never be silently discarded or treated as independently verified.

### Summary and coaching rules

- **Recorded income** = sale + service + other-income entries.
- **Operating expenses** = purchase + other-expense entries.
- **Operating surplus estimate** = recorded income minus operating expenses; it is not audited profit.
- **Unpaid amounts** and due dates are displayed separately from cash received/paid.
- **Outstanding borrowing estimate** = recorded loan receipts minus recorded repayments, floored at zero. It is incomplete if entries are missing and is not a lender statement.
- **Record coverage** is a count of months with entries in the selected period, not a credit score. No records does not mean no income.
- Prompts may identify absent months, missing due dates for unpaid items, or missing income/expense categories. The user confirms or corrects every record.

## Application pack and sharing

The CSV pack includes the requested purpose, amount, term, reporting period, income/expense summary, unpaid amounts, recorded borrowing estimate, and record-coverage statement. Detailed transaction rows are opt-in. Exports must state that data is synthetic, self-reported where applicable, incomplete, and not a credit decision. The API audits pack generation.

External lender access remains limited to the named lender, purpose, and active expiry-controlled consent. The interface must explain the fields shared, record the access, and support revocation. A downloaded pack is not proof of lender acceptance, tax compliance, or loan eligibility.

## Accessibility, privacy, and scope

- English and draft Kiswahili copy; local review is required before field use.
- Phone-first, large touch targets, one primary task per view, and clear saved/offline/pending-sync states.
- The current synthetic-only MVP must not accept real participant financial or identity data. Use fictional references; do not add national IDs, bank credentials, M-Pesa credentials, or raw payment-message imports.
- No receipt attachments, mobile-money/CRB connections, eTIMS filing, loan application submission, credit bureau reporting, automatic underwriting, loan offers, or personalized borrowing advice in this MVP.
- Future integrations require partner validation, legal/privacy review, explicit consent, and an approved retention and correction process. KRA's eTIMS obligations are separate from EKYAN's bookkeeping record and must not be represented as satisfied by this feature.

## Acceptance criteria

1. Agripreneurs can add, list, and correct synthetic transactions; invalid amounts, record types, payment statuses, or dates are rejected.
2. The ledger displays readable folders, paid/unpaid state, and due dates; offline entries remain queued and sync idempotently.
3. The profile returns monthly recorded income, operating expenses, operating-surplus estimate, unpaid amounts, borrowing estimate, and record coverage without a score or readiness band.
4. Credit Coach text is based only on missing/inconsistent records and includes no approval prediction or borrowing recommendation.
5. The user can generate a CSV pack with an explicit optional choice to include detail rows; generation is audited and does not send data externally.
6. Lender access remains consent-gated, role-checked, and audited. No record export bypasses lender consent for direct API access.
7. Kiswahili translations are visibly marked as drafts pending farmer review.

## Validation before expansion

Co-design the categories, application fields, and repayment-cycle summary with agripreneurs, smallholder representatives, Kenyan lenders, and bookkeeping/tax support. Measure record-entry time, correction rates, monthly coverage, pack completion, and consent comprehension. Do not treat loan approvals as an EKYAN success metric.

## Research references

- [CBK: Digital Credit Providers Regulations 2022](https://www.centralbank.go.ke/2022/03/21/central-bank-of-kenya-digital-credit-providers-regulations-2022/)
- [ODPC: Rights of a Data Subject](https://www.odpc.go.ke/rights-of-a-data-subject/)
- [CGAP: Leveraging Transactional Data for Micro and Small Enterprise Lending](https://www.cgap.org/research/publication/leveraging-transactional-data-for-micro-and-small-enterprise-lending) (case studies are from India; validate locally)
- [KNBS: 2024 FinAccess Household Survey](https://www.knbs.or.ke/reports/2024-finacess-household-survey-report/)
- [KRA: What is eTIMS?](https://www.kra.go.ke/business/etims-electronic-tax-invoice-management-system/learn-about-etims/what-is-etims)
