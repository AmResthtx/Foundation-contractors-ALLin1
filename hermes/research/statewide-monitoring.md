# Statewide Monitoring — Texas

Companion to `local-monitoring.md`: signals that matter across Texas, not just Harris
County. Feeds the `statewide-monitoring` job in `hermes/index.js`. Trace IDs refer to
`sources.md`.

## Why a statewide tier

- Subsidence/expansive-clay problems (and the news cycles around them) recur across
  Texas metros — statewide incidents are content opportunities and early warnings for
  patterns that reach Harris County.
- Water policy is set at the state level (TWDB, Legislature); groundwater rules drive
  both subsidence behavior and public awareness of it.
- Steel demand and construction activity statewide move procurement costs before local
  price sheets do.

## Automated feeds (statewide-monitoring job, daily)

| Feed | What it covers | Trace |
|---|---|---|
| `texastribune.org/topic/environment/feed` | Statewide environment/water/groundwater coverage; documented topic-feed pattern | SRC-040 |
| `texaswaternewsroom.org/feed/` | TWDB press releases (their newsroom site) | SRC-041 |

Override with `STATEWIDE_FEEDS` in `.env`. Alert keywords are deliberately narrower
than the local tier (sinkhole, subsidence, foundation, expansive clay/soil) — these
are high-volume feeds and broad words like "drought" or "water" would be pure noise.

## Sources with no RSS (manual/other channel)

- **TCEQ** news releases: email/text subscription only (tceq.texas.gov/news/email.html)
  — subscribe `CRM_EMAIL` manually; no automation path (SRC-042).
- **Dallas Fed Texas Manufacturing Outlook Survey** (monthly, ~last Monday): headline
  general-business-activity index is on FRED as `BACTSAMFRBDAL`, so it can be added to
  the existing `steel-ppi` FRED job later — but it's a diffusion index (crosses zero),
  so the percent-change alert logic doesn't apply as-is (backlog R-11) (SRC-043).
- **TDLR** (Texas Industrialized Housing & Buildings; expansive-soils bulletin TB 10-01
  already registered as SRC-033): watch for bulletin revisions; no feed.

## Event log

*(append dated entries)*

- **2026-07-02** — Tier initialized; two feeds configured, TCEQ noted as email-only,
  Dallas Fed TMOS flagged as future FRED series (R-11). Feed URLs pending first-run
  verification on the production host (dev sandbox network blocks them).
