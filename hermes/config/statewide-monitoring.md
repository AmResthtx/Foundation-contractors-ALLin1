# Statewide Events Monitor — charter

Same engine as local-monitoring, Texas-wide tier. Feeds: Texas Tribune main (SRC-040)
+ Texas Register weekly (SRC-045); override via `STATEWIDE_FEEDS`.

Constraints:
- Narrower urgent-keyword set than local — these are high-volume general feeds and
  broad keywords (drought, water) would be pure noise. Widen only with evidence.
