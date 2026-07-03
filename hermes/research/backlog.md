# Research Backlog

Open items for the Researcher agent (or Copilot, until the stack runs). Work top-down;
every completed item must add sources to `sources.md` with trace IDs.

## Needs input from Ellis
- **R-1** — Confirm the exact helical pier product line(s) we install (manufacturer +
  model numbers, e.g., CHANCE SS175 / RS2875). The alloy table in `steel-alloys.md`
  stays generic until then. *Note 2026-07-02: three project reference docs reviewed
  (`helical-pier-project-examples.md`) all spec "helical pile by others" to generic
  AC358/ICC-ES-ESR performance criteria — no manufacturer named in any of them. Still
  needs Ellis.*
- **R-2** — Pull the ICC-ES ESR for our specific installed products and extract exact
  material specs (shaft, helix plate, bracket, coating) into `steel-alloys.md`.
- **R-3** — Supplier list with pricing baseline, so PPI moves can be translated into
  procurement impact.
- **R-4** — Permission status for Bammel North Houston and Veteran Memorial project
  references (photos, details, quotes).

## Research (no input needed)
- **R-5** — Harris County / City of Spring permitting requirements for residential
  foundation repair with helical piers (which permits, when engineer-sealed drawings
  are required). Sources: Harris County Engineering, City of Houston if inside city ETJ.
  *Partial: RSS watcher for HGSD + local news shipped in `hermes/index.js`
  (2026-07-02); permitting-requirements research and a county permit feed still open.
  Verify the default feed URLs resolve on first daemon run (couldn't be confirmed from
  the dev sandbox — its network blocks those hosts).*
- **R-6** — IBC/IRC sections governing helical piles (IBC 1810; deep foundation
  provisions) + current Texas adopted editions for unincorporated Harris County.
- **R-7** — Corrosion/design-life data for local soil conditions (resistivity, pH) —
  AC358 §3.9 inputs; check USGS/NRCS Harris County soil survey.
- **R-8** — Competitor positioning scan in Spring/Klein area (Policy 3). Note: internal
  awareness only — competitor claims are prohibited as content sources (Policy 1).
- **R-9** — Torque-to-capacity correlation (Kt factors) documentation for the products
  we install — needed later for the payment-blocking torque-log verification (Policy 6).
  *Partial 2026-07-02: the 12-field inspection record format (install date, manufacturer,
  contractor, equipment, min/max allowable torque, shaft diameter, helix config, tip
  embedment, actual torque, ultimate/allowable capacity, PE-sealed) is now captured
  from a real structural EOR spec — see `helical-pier-project-examples.md` (PRJ-002).
  Still open: the actual Kt correlation factor, which depends on R-1 (our product line).*
- **R-10** — FRED API integration notes: endpoints, API key signup, series update
  schedule for WPU101704 / PCU33123312 (prep for Industry Monitor agent).
  *Mostly done 2026-07-02: shipped using the keyless `fredgraph.csv` endpoint and
  confirmed working in production Docker. Remaining: swap to the keyed FRED API if
  the CSV endpoint ever rate-limits or breaks.*

- **R-11** — *(closed 2026-07-03)* TMOS headline index shipped as `hermes/agents/tmos.js`
  with diffusion-index alerting (sign flip always; point move ≥ `TMOS_ALERT_POINTS`).
  Context in `statewide-monitoring.md` (SRC-043).
- **R-12** — *(closed 2026-07-02)* Community Impact publishes no working RSS: four
  candidate URLs (Spring–Klein + Houston edition patterns) all 404'd in prod. Removed
  from the watcher; remains a browser-only citable source (SRC-046).

- **R-14** — Social media hookup (needs Ellis): n8n container + unified
  notify+approval workflow shipped (`hermes/n8n/hermes-social-approval.json`,
  2026-07-03) with the Hermes-side approval callback receiver
  (`hermes/lib/callback-server.js`, decisions recorded in `data/approvals/` per
  Policy 5). Human steps: import + Telegram credential/chat-ID wiring in the n8n UI
  (`docs/N8N_TELEGRAM_SETUP.md`, ~15 min). Remaining build: connect
  FB/IG/LinkedIn/X/Google Business Profile as n8n credentials and attach posting
  nodes after the approve branch, with the published URL sent back on the same
  callback. Design in `docs/AGENT_STACK.md` §Content Pipeline.

## Done
- ✅ 2026-07-02 — Source registry seeded (`sources.md`, SRC-001…034).
- ✅ 2026-07-02 — Generic shaft material specs documented (A252 Gr 3, A500 Gr C,
  A29/AISI 1044-type RCS bar) with AC358 context.
- ✅ 2026-07-02 — Local baseline: HGSD regulation, USGS subsidence data, expansive-clay
  context, standing watch list.
- ✅ 2026-07-02 — Helical pier project examples reviewed (`helical-pier-project-examples.md`,
  PRJ-001…003): design-load/torque-log documentation standard from a real structural
  EOR, load-capacity comparison, and one non-helical negative example.
