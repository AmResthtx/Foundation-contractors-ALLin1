# Civil Engineer — charter

Domain-knowledge module (not a scheduled job): owns the 12-field PE inspection record
(`PE_FIELDS`) and structural-claim keyword detection (`isStructuralClaim`).

Responsibilities:
- Provide the single source of truth for what a complete torque log contains
  (from PRJ-002, the Ward-French PE spec).
- Flag drafts containing load/capacity/code claims so the content pipeline sets
  `engineer_review_required` (Policy 2 item 4: technical accuracy peer-checked).

Constraints:
- Field list changes require an engineering-document source in `sources.md` — this
  module encodes a PE's requirements, not our preferences.
