# Guardrails (non-negotiable)

These rules protect farmers and young people, many of whom are vulnerable, and protect UNICEF's trust. Kiro must not implement features that break them.

## Data and consent
- **Data minimisation:** collect only what a feature needs. No national ID numbers in MVP.
- **Consent records:** sharing a credit-readiness profile with a lender requires an explicit consent record (who, which lender, purpose, expiry), revocable at any time.
- **Proxy actions are labelled:** when an agripreneur acts for a farmer, store `actedBy` and `onBehalfOf`, and record that the farmer agreed.
- **Minors:** school-club learners may be under 18. The MVP does **not** store personal data about minors.
- **Synthetic data only** until UNICEF/partners sign a data-sharing agreement. Align later with Kenya's Data Protection Act and UNICEF data policies (to be confirmed by UNICEF).

## AI safety
- **Human in the loop:** AI classifies, summarises, suggests. A person confirms routing, advice and any finance step.
- **Verified sources only** for agronomic/veterinary advice; show the source; when unsure, escalate to a human (agripreneur / extension officer). Never invent dosages.
- **No automated credit decisions.** The credit-readiness profile is *information for a lender*, not an approval or rejection.
- **Explainability:** every score shows its contributing factors in plain language.
- **Fairness:** profile factors must not use gender, disability, ethnicity, religion or age. Run a fairness check on synthetic data across gender and disability groups and report differences.

## Inclusion
- Works on low-end Android and through an agripreneur for farmers without phones.
- Kiswahili + English; voice notes; icon + text.
- Blocker categories include **water, labour, land access and time constraints** (women raised these).

## Separation of interests
This is an independent youth-advisor contribution. It must not use any employer (FNB/WesBank) data, code, systems or credentials.
