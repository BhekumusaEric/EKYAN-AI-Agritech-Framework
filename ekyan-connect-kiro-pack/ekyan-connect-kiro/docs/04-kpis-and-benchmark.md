# 04 · KPIs and Benchmark

## As-is vs ambition
| Measure | Today | 2028 ambition |
|---|---|---|
| Farmers | ~73,558 | 2,000,000 (~27×) |
| Agripreneurs | 512 | 6,000–50,000 |
| Farmers per agripreneur | ~144 | ~333 (at 6,000) or ~40 (at 50,000) |
| Verified full adoption | ~66% | not set |
| Programme cost per farmer reached | ~US$46 (US$3.36M ÷ 73,558; excludes youth/school outcomes) | not set |

**Meaning:** at 6,000 agripreneurs each must serve ~2.3× more farmers (needs time-saving tools). At 50,000 the challenge is fast, consistent incubation. Either way, scale depends on systems.

> Illustration only: at 2M farmers, each +10 points of verified adoption = ~200,000 more farmers changing practice. Do not promise outcomes before a pilot baseline.

## Pilot KPI dictionary (implement in `packages/shared/kpi.ts`)
| ID | KPI | Formula | Source |
|---|---|---|---|
| K1 | Blockers logged | count(blockers) per period | M2 |
| K2 | Blocker resolution rate | resolved ÷ logged | M2 |
| K3 | Median time to resolve | median(resolvedAt − createdAt) | M2 |
| K4 | Order fulfilment rate | fulfilled order lines ÷ order lines | M3 |
| K5 | Supplier commitment rate | committed demand items ÷ demand items | M3 |
| K6 | Intention → action conversion | farmers with ≥1 fulfilled order ÷ farmers with logged intention | M1/M3 |
| K7 | Agripreneurs with current business records | agripreneurs with at least one recorded income and one operating-cost entry in the selected period ÷ active agripreneurs | M4 |
| K8 | Farmers served per agripreneur | active farmers ÷ active agripreneurs | M1 |
| K9 | Women share (agripreneurs, farmers) | women ÷ total | People |
| K10 | Cost per resolved blocker / per fulfilled farmer | programme cost input ÷ K2 count / K6 count | M5 + admin input |
| K11 | Data-quality score | % records passing checks | M5 |
