# Structure Steering

```text
apps/
  web/                 React PWA (agripreneur, supplier, lender, programme views)
    src/features/
      field-log/
      blockers/
      demand-board/
      credit-profile/
      dashboard/
      admin-config/
    src/offline/       IndexedDB store + sync queue
    src/i18n/          en.json, sw.json
  api/                 Fastify API
    src/modules/
      people/          farmers, agripreneurs, orgs
      orders/
      blockers/
      demand/
      transactions/
      credit-profile/
      consent/
      kpi/
      config/
    src/adapters/      advisory, marketplace, learning, savings, finance, climate, channel
    src/ai/            AIService interface + rule-based impl
packages/
  shared/              types, zod schemas, KPI definitions
prisma/                schema + migrations + seed (synthetic)
docs/                  background documents
```

## Conventions
- Validation with **zod** shared between web and api.
- Every module: `routes.ts`, `service.ts`, `repo.ts`, `*.test.ts`.
- KPI formulas live in **one place**: `packages/shared/kpi.ts`, each with id, name, formula, source, owner.
- No secrets in code; `.env.example` only.
- Commit messages: `feat(module): ...`, `fix(module): ...`.
- Each task in `tasks.md` ends with green tests.
