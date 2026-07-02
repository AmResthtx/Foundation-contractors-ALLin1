# Research Backlog

Open items for the Researcher agent (or Copilot, until the stack runs). Work top-down;
every completed item must add sources to `sources.md` with trace IDs.

## Needs input from Ellis
- **R-1** — Confirm the exact helical pier product line(s) we install (manufacturer +
  model numbers, e.g., CHANCE SS175 / RS2875). The alloy table in `steel-alloys.md`
  stays generic until then.
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
- **R-10** — FRED API integration notes: endpoints, API key signup, series update
  schedule for WPU101704 / PCU33123312 (prep for Industry Monitor agent).
  *Mostly done 2026-07-02: shipped using the keyless `fredgraph.csv` endpoint and
  confirmed working in production Docker. Remaining: swap to the keyed FRED API if
  the CSV endpoint ever rate-limits or breaks.*

- **R-11** — Add Dallas Fed TMOS headline index (FRED `BACTSAMFRBDAL`) to the FRED job
  with diffusion-index-appropriate alerting (sign flips / large point moves, not percent
  change). Context in `statewide-monitoring.md` (SRC-043).
- **R-12** — *(closed 2026-07-02)* Community Impact publishes no working RSS: four
  candidate URLs (Spring–Klein + Houston edition patterns) all 404'd in prod. Removed
  from the watcher; remains a browser-only citable source (SRC-046).

- **R-14** — Social media hookup (needs Ellis): n8n container + Telegram notification
  workflow shipped 2026-07-02 (`docs/N8N_TELEGRAM_SETUP.md`, ~15 min of human steps).
  Remaining: connect FB/IG/LinkedIn/X/Google Business Profile as n8n credentials and
  build the draft→approve→post→callback branch once the content pipeline exists.
  Design in `docs/AGENT_STACK.md` §Content Pipeline.

## Done
- ✅ 2026-07-02 — Source registry seeded (`sources.md`, SRC-001…034).
- ✅ 2026-07-02 — Generic shaft material specs documented (A252 Gr 3, A500 Gr C,
  A29/AISI 1044-type RCS bar) with AC358 context.
- ✅ 2026-07-02 — Local baseline: HGSD regulation, USGS subsidence data, expansive-clay
  context, standing watch list.
