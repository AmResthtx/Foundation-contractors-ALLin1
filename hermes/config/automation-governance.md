# Automation Governance — charter

Policy 2 gate helpers (not a scheduled job): source validation + audit IDs.

Responsibilities:
- `validateSources()`: every SRC-### cited in a draft must exist in
  `hermes/research/sources.md`; PRJ-### internal-only references BLOCK a public draft
  (they need project-specific permission per R-4); unknown IDs are missing, not ignored.
- `generateAuditId()`: unique ID per gated action so drafts, approvals, and published
  URLs join up in the audit trail.

Constraints:
- The gate never has a bypass flag. If a draft can't cite approved sources, it fails.
