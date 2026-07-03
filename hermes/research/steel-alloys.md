# Tracked Steel Specs & Alloy Codes — Helical Piers

Living reference per POLICIES.md Policy 3: "Monitor only the steel prices and specific
alloys that directly affect our procurement." Exact spec codes below; price series in
the last section. Trace IDs refer to `sources.md`.

## Shaft materials

### Round shaft (pipe piles)
| Spec | Grade | Min yield | Notes | Trace |
|---|---|---|---|---|
| ASTM A252 | Grade 3 | 45 ksi (often supplied 50+ ksi) | Standard welded/seamless pipe pile spec | SRC-002, SRC-013 |
| ASTM A500 | Grade C | 46–50 ksi | Cold-formed structural tubing alternative | SRC-013 |

Model specs (e.g., Ram Jack) commonly require A252 Gr 3 **or** A500 Gr C with
**50 ksi min yield / 62 ksi min tensile** for helical pile shafts (SRC-013).

### Solid square shaft (RCS bar)
| Spec | Material | Notes | Trace |
|---|---|---|---|
| ASTM A29/A29M | Modified medium-carbon, similar to **AISI 1044** (smaller SS sizes) | Hot-rolled round-cornered-square bar; improved strength via fine grain | SRC-003, SRC-010 |
| ASTM A29/A29M | HSLA low/medium-carbon (larger SS sizes, e.g., SS175–SS225) | Higher-strength fine-grain HSLA | SRC-010 |

## Helix plates & brackets
- Helix plates: typically ASTM A572 Gr 50 or equivalent HSLA plate — **confirm against
  the specific manufacturer ESR we install** (backlog item R-2).
- Corrosion: hot-dip galvanizing per ASTM A153 / A123 where specified; AC358 requires
  50-year corrosion design life (SRC-001).

## Acceptance criteria
- ICC-ES **AC358** governs recognition of helical pile systems under the IBC: materials,
  shaft/helix geometry, connections, axial compression/tension and lateral capacity,
  and load-test procedures (SRC-001, SRC-004, SRC-012).

## Price monitoring (feeds the Industry Monitor agent)
| Series | What it covers | Cadence | Trace |
|---|---|---|---|
| FRED `WPU101704` | PPI: hot-rolled steel bars, plates, structural shapes | Monthly | SRC-020 |
| FRED `PCU33123312` | PPI: steel product mfg from purchased steel (pipe/tube) | Monthly | SRC-021 |

Snapshot 2026-07: HRC spot around $1,100/T, up roughly 36% year-over-year
(tradingeconomics.com HRC index, early June 2026) — verify against PPI series before
using in any public content or bid.

---
*Started 2026-07-02. Fill in supplier + exact installed-product model numbers (backlog R-1) once procurement list is confirmed by Ellis.*
