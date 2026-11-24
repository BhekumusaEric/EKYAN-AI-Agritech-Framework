# EKYAN Connect: Kiro Build Pack

**What this is:** the planning and specification pack for building **EKYAN Connect**, a working structure for the *Engaging Kenyan Youth in Agriculture and Nutrition (EKYAN)* programme (UNICEF / Generation Unlimited).

**One-line purpose:** turn what farmers learn into action, income and evidence by connecting farmers, agripreneurs, suppliers, lenders, buyers and the programme team in one system. The system **plugs into the tools EKYAN already has (Ask Nia, OneNetwork, Agribytes, Chomoka) and does not replace them.**

> Status: proposal and prototype stage. Prepared by Bhekumusa Ntshwenya for discussion with the UNICEF GenU EKYAN team. All figures come from programme documents (EKYAN update Oct 2026 deck, MPTF 2025 Kenya narrative report, GenU Trust Fund 2025 consolidated report). The prototype uses **synthetic data only**.

## How to use this pack with Kiro

1. Copy this whole folder into the root of a new, empty repository.
2. Open it in Kiro. Kiro automatically loads `.kiro/steering/*.md` as always-on project context.
3. Open `.kiro/specs/ekyan-connect-mvp/` and review `requirements.md`, then `design.md`, then `tasks.md`.
4. Run tasks in order from `tasks.md`. Kiro should complete one task, run its tests, then move on.
5. Read `docs/` for the background: who we are building for and why.

## Folder map

```text
.kiro/
  steering/
    product.md        Why it exists, who it serves, scope, principles
    tech.md           Stack, constraints, integration rules
    structure.md      Repo layout and coding conventions
    guardrails.md     Consent, privacy, AI safety, fairness rules (non-negotiable)
  specs/ekyan-connect-mvp/
    requirements.md   User stories + EARS acceptance criteria
    design.md         Architecture, data model, APIs, flows
    tasks.md          Ordered implementation plan
docs/
  01-context-and-empathy.md    Programme context, personas, empathy maps, journeys
  02-problems-root-causes.md   Problem tree with evidence
  03-solution-overview.md      Modules, actors, reuse-vs-build, AI map
  04-kpis-and-benchmark.md     As-is vs targets, pilot KPIs
  05-roadmap-and-pilot.md      Phases and Busia poultry pilot
  06-open-questions.md         What must be validated with UNICEF / Kuza
  07-glossary.md               Terms
```

## Golden rules for Kiro

- **Integrate, don't replace.** Ask Nia, OneNetwork, Agribytes and Chomoka are external systems behind adapters. In the MVP they are **mocks**.
- **Agripreneur-assisted, farmer-first.** Farmers may have no smartphone. Every farmer action must be possible *through* an agripreneur.
- **Offline-first and low-bandwidth.**
- **Consent before sharing.** No credit profile leaves the system without recorded consent.
- **Human in the loop.** AI suggests; people decide.
- **Synthetic data only** until a data-sharing agreement exists.
