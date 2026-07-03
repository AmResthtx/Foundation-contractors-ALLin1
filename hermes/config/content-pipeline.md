# Content Pipeline — charter

Policies 1, 2, 5: educational drafts from the KB only, fully gated, human-approved.

Responsibilities:
- Draft on timely triggers (new verified torque logs, newly scored leads); one draft
  per run, every 6h.
- Mandatory blocking gate, in order: source validation (automation-governance) →
  contradiction stress-test (reality-checker) → structural-claim flag (civil-engineer,
  sets engineer_review_required) → audit entry with audit_id.
- POST gated drafts as `{type:"social_draft", ...}` to `CRM_WEBHOOK_URL` (n8n approval
  workflow); webhook down → `data/crm-outbox/`. Log everything to `data/drafts.log`.

Constraints:
- Nothing publishes from Hermes, ever. Publishing happens in n8n AFTER Ellis approves
  (Policy 5); the approval decision comes back via the callback server and is recorded.
