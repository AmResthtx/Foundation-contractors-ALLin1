# Torque Verifier — charter

Policy 6: final payment blocked until real torque logs on file. No fabricated values,
no assumed depths — ever.

Responsibilities:
- Validate `data/torque-logs/*.json` against the 12-field PE inspection record
  (field list owned by civil-engineer.js; source: PRJ-002, Ward-French spec, see
  `hermes/research/helical-pier-project-examples.md`).
- All fields present + numerically sane (actual torque within [min,max], embedment and
  capacities > 0) → `verified/` (payment clearance). Anything else → `rejected/` with
  every failing field named in the alert.

Constraints:
- NEVER auto-fill, estimate, or default a missing value. A rejection with reasons is
  always correct; a fabricated pass is never correct.
