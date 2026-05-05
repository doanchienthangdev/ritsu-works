# frontend/ — Founder Dashboard + Internal Apps

> Wave 4+ implementation. Real-time visibility (Bài #10), HITL queue (Bài #2), capability pipeline (Bài #20).

**Status:** Scaffold (not implemented in Wave 1)
**Wave:** 4 (Visibility + Access)
**Bài toán:** #2, #10, #19, #20

---

## Recommended stack

Per chương 28 Wave 4 + chương 29 deployment:

- **Framework:** Next.js 15 (App Router) + React 19
- **Styling:** Tailwind CSS + shadcn/ui
- **Data:** Supabase JS client (real-time subscriptions per Bài #10)
- **Auth:** Supabase Auth (founder + operator roles)
- **Deploy:** Bước A = local Vite dev / Bước B = Hetzner VPS Docker
- **State:** Server Components default, RSC streaming, minimal client state

## Initial pages (Wave 4)

```
frontend/
├── README.md                        ← this file
├── package.json                     ← Next.js + deps
├── next.config.js
├── tsconfig.json
├── tailwind.config.ts
├── app/
│   ├── (auth)/                      ← founder + operator login
│   ├── dashboard/                    ← Bài #10 main dashboard
│   │   ├── page.tsx                  (KPI overview)
│   │   └── layout.tsx
│   ├── hitl/                        ← Bài #2 decision queue
│   │   └── page.tsx
│   ├── capabilities/                 ← Bài #20 pipeline view
│   │   ├── page.tsx                  (list + states)
│   │   └── [id]/
│   │       └── page.tsx              (capability detail)
│   ├── attention/                    ← Bài #19 founder rhythm
│   │   └── page.tsx
│   └── api/
│       └── webhooks/                 ← receive external webhooks (Bài #11)
├── components/
│   ├── ui/                          ← shadcn primitives
│   ├── kpi-card.tsx
│   ├── hitl-queue-item.tsx
│   └── capability-pipeline.tsx
├── lib/
│   ├── supabase.ts                  ← server + client clients
│   └── realtime.ts                  ← realtime subscriptions
└── public/
```

## Read-only views first

Wave 4 deploys read-only views. Mutations come Wave 5 (HITL decisions) + Wave 6+ (operations).

## Required Supabase setup

Frontend reads via `mv_customer_360`, `v_capability_pipeline`, `ops.kpi_snapshots`, etc.

RLS policies (per migration 00010) restrict:
- Founder: full read access
- Operator: pillar-scoped
- Customer: own data only

## Initialization (when ready for Wave 4)

```bash
# Inside frontend/
pnpm create next-app . --typescript --tailwind --app
pnpm add @supabase/supabase-js @supabase/ssr
pnpm add -D shadcn-ui
npx shadcn-ui@latest init
```

## Cross-references

- Bài #10 visibility: `knowledge/phase-a2-extensions/bai-10-real-time-visibility-DRAFT.md`
- Bài #2 HITL: `governance/HITL.md`
- Bài #20 CLA: `wiki/capabilities/_CATALOG.md`
- Deployment: chương 29 (Bước A vs B)

---

*Frontend implementation is Wave 4. This scaffold reserves the folder + documents intent. Don't implement until Wave 1-3 foundation is solid.*
