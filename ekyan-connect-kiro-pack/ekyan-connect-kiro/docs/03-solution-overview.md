# 03 · Solution Overview: EKYAN Connect

## Layers
```text
L1 ACCESS        Agripreneur PWA (offline) · mock WhatsApp/USSD · Kiswahili/English · voice notes
L2 OPERATIONS    Field Log · Blocker Resolution · Pooled Demand · Bookkeeping
L3 CONNECTIONS   Suppliers · Lenders · Buyers · County extension (via adapters)
L4 INTELLIGENCE  Blocker triage · demand forecast · profile explainer · data-quality checks
L5 OVERSIGHT     Programme dashboard · KPI dictionary · consent & audit
```

## Modules
| Module | Problems | MVP? |
|---|---|---|
| M1 Field Log (orders, blockers, sales, voice note) | P1, P2, P3, P5 | Yes |
| M2 Blocker Resolution (triage, route, SLA, close) | P1, P9 | Yes |
| M3 Pooled Demand Board (aggregate, commit, fulfil) | P2 | Yes |
| M4 Bookkeeping + Credit-Readiness Profile + Consent | P3, P8 | Yes |
| M5 Programme Dashboard + KPI dictionary | P7 | Yes |
| M6 Advisory bridge to Ask Nia | P6 | Mock in MVP |
| M7 Supply forecast + buyer board | P4 | Phase 2 |
| M8 Bundles (inputs + finance + buyer) | P2, P3, P4 | Phase 2 (poultry first) |
| M9 Climate alerts | P9 | Phase 2, via existing services |

## Reuse vs build
| Reuse (adapter) | Build |
|---|---|
| Ask Nia (advisory) | Blocker capture + resolution workflow |
| OneNetwork (transactions, marketplace) | Pooled demand on top of OneNetwork data |
| Agribytes / Leadership Academy | Credit-readiness profile + consent |
| Chomoka (savings records) | Programme dashboard + KPI dictionary |
| Finance partners | Configuration (value chains, counties, partners) |

## Actor value
| Actor | Does | Gets |
|---|---|---|
| Farmer (via agripreneur) | Reports needs and blockers | Inputs on time, help, buyer, path to credit |
| Agripreneur | Logs once | More business, records, profile, coaching |
| Supplier | Commits to pooled orders | Predictable rural demand |
| Lender | Views consented profile | Evidence to lend |
| Extension officer | Takes escalated blockers | Prioritised workload |
| Programme team | Reads dashboard | Single source of truth, cost per outcome |

## AI map (all human-in-the-loop)
| Capability | MVP approach | Later |
|---|---|---|
| Blocker triage (category, urgency, routing) | Rules + keyword classifier; optional LLM | Trained classifier on real data |
| Voice note → text | Stubbed | Speech-to-text, Kiswahili |
| Demand forecast | Moving average per item/area | Seasonal models |
| Credit-readiness explainer | Transparent rule-based score with factor breakdown | Lender co-designed model with fairness testing |
| Data-quality checks | Rules (outliers, duplicates, missing fields) | Anomaly detection |
| Advisory | Route to Ask Nia mock | Expand Ask Nia value chains |
