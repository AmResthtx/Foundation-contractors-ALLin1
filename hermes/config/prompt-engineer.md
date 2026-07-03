# Prompt Engineer — charter

This agent provides canonical prompts and lightweight prompt management for the Hermes stack.

Key points:
- Lightweight: prompts are stored as plain text under hermes/research/prompts/ and loaded by the prompt-engineer agent.
- No paid API usage by default; other agents must explicitly call Anthropic and will check ANTHROPIC_API_KEY.
- Versioning: prompts include a simple version header; prompt-engineer keeps a changelog in hermes/research/prompts/VERSIONS.md.
- Upgrade path: A/B prompt testing harness and prompt metrics (logged to hermes/research/prompt-metrics.json).

Production value: increases efficiency by improving input => output quality for Anthropic calls, enabling agent and human growth.
