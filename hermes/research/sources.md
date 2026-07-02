# Source Registry (internal traceability)

Living file per POLICIES.md Policy 2: every public citation maps to an internal trace ID.
Only Policy-1-approved source classes may be added (standards bodies, government,
peer-reviewed, recognized trade orgs, manufacturer technical documents).

Format: `SRC-###` | source | class | URL | notes

## Standards & acceptance criteria
- **SRC-001** | ICC-ES AC358 — Helical Pile Systems and Devices | Standards body | https://www.appliedtesting.com/standards/icc-es-ac358-helical-pile-systems-and-devices | Acceptance criteria for IBC recognition; requires 50-yr corrosion design (§3.9)
- **SRC-002** | ASTM A252/A252M — Welded and Seamless Steel Pipe Piles | Standards body | https://store.astm.org/a0252_a0252m-19.html | Pipe pile material spec (Grades 1–3)
- **SRC-003** | ASTM A29/A29M — Steel Bars, Carbon and Alloy, Hot-Wrought | Standards body | https://www.astmsteel.com/astm-a29/ | Square-shaft bar dimensional/workmanship spec
- **SRC-004** | ICC-ES ESR-4892 (example evaluation report) | Standards body | https://icc-es.org/wp-content/uploads/report-directory/ESR-4892.pdf | Shows AC358 applied in practice; Division 31 63 00 Bored Piles

## Manufacturer technical documents
- **SRC-010** | CHANCE/Hubbell — Model Specifications guide (TD06160E) | Manufacturer tech doc | https://hubbellcdn.com/specsheet/TD06160E_Chance_and_Atlas_Model_Specifications.pdf | SS-series square shaft + RS-series pipe shaft material specs
- **SRC-011** | CHANCE — Helical Piles for Structural Support guide spec | Manufacturer tech doc | https://www.foundationtechnologies.com/files/documents/CHANCE-Helical-Piles-for-Structural-Support---Guide-Specification.pdf | Guide specification language
- **SRC-012** | Ram Jack — ESR-1854 evaluation report | Manufacturer tech doc | https://www.ramjack.com/wp-content/uploads/2024/03/ESR-18542.pdf | ICC-ES report for Ram Jack systems
- **SRC-013** | Ram Jack — Helical Pile Model Specification Rev 3 | Manufacturer tech doc | https://www.ramjack.com/wp-content/uploads/2024/02/Helical-Pile-Spec-Rev-3-151.pdf | A252 Gr 3 / A500 Gr C, 50 ksi min yield

## Market data (steel pricing — Policy 3 monitoring)
- **SRC-020** | BLS PPI WPU101704 — Hot Rolled Steel Bars, Plates & Structural Shapes | Government | https://fred.stlouisfed.org/series/WPU101704 | Monthly index, primary tracked series
- **SRC-021** | BLS PPI PCU33123312 — Steel Product Mfg from Purchased Steel | Government | https://fred.stlouisfed.org/series/PCU33123312 | Secondary series (pipe/tube manufacturing)
- **SRC-022** | BLS PPI — Metals & Metal Products tables | Government | https://www.bls.gov/regions/mid-atlantic/data/producerpriceindexmetals_us_table.htm | Cross-check table

## Local / geotechnical (Harris County, Spring TX)
- **SRC-030** | Harris-Galveston Subsidence District | Government | https://hgsubsidence.org/ | Regulator; groundwater permitting + subsidence monitoring
- **SRC-031** | USGS — Texas Gulf Coast Groundwater & Land Subsidence | Government | https://webapps.usgs.gov/houston_subsidence/ | Subsidence mapping/data for Houston region
- **SRC-032** | TWDB Report 188 — Land-Surface Subsidence | Government | https://www.twdb.texas.gov/publications/reports/numbered_reports/doc/R188.pdf | Historical subsidence baseline
- **SRC-033** | TDLR IHB TB 10-01 — Foundations on Expansive Soils | Government | https://www.tdlr.texas.gov/ihb/pdf/TB1001.pdf | Texas technical bulletin on expansive-soil foundations
- **SRC-034** | HGSD Science & Research (HoustonNet GNSS network) | Government | https://hgsubsidence.org/science-research/ | ~250 permanent GNSS stations; Spring Creek subsidence/flood study

## Statewide (Texas)
- **SRC-040** | Texas Tribune — RSS feeds (topic-feed pattern) | Recognized news org | https://www.texastribune.org/feeds/ | `texastribune.org/topic/<topic>/feed`; environment topic used by statewide watcher
- **SRC-041** | Texas Water Newsroom (TWDB press releases) | Government | https://texaswaternewsroom.org/ | HTML-only, no RSS (confirmed 2026-07-02) — manual/browser source only, removed from watcher
- **SRC-042** | TCEQ news releases | Government | https://www.tceq.texas.gov/news | No RSS — email/text subscription only (tceq.texas.gov/news/email.html)
- **SRC-043** | Dallas Fed — Texas Manufacturing Outlook Survey | Government | https://www.dallasfed.org/research/surveys/tmos | Monthly; headline index on FRED as `BACTSAMFRBDAL` (diffusion index)
- **SRC-044** | Houston Public Media (NPR affiliate) | Recognized news org | https://www.houstonpublicmedia.org/topics/environment/feed/ | Environment topic feed + main `/feed/` fallback; used by local watcher
- **SRC-045** | Texas Register RSS (Texas SOS) | Government | https://www.sos.state.tx.us/rss/index.shtml | Weekly issue feed exists (statewide rulemaking incl. TCEQ/TWDB); exact feed URL on this directory page (backlog R-13)

---
*Started 2026-07-02. Append new sources with the next free ID in the matching block; never reuse IDs.*
