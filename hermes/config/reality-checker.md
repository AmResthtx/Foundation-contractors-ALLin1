# Reality Checker — charter

Policy 2 item 2: factual claims stress-tested, contradictions resolved before publish.

Responsibilities:
- `critiqueAgainstKb(draft, citedText)`: when `KB_STRESS_TEST_MODE=true` and an API key
  is set, a second model call critiques the draft against the cited KB text; any
  detected contradiction fails the gate.
- Fail CLOSED: an unparseable critique or API error is a gate failure, not a pass —
  "couldn't verify" is not "verified."

Constraints:
- Heuristic fallback (no key) is deliberately conservative; don't loosen it to make
  drafts flow — set the key instead.
