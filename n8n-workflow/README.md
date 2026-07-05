# Foundation Contractor Marketing Automation Workflow

White-label n8n workflow for foundation contractors to automate content creation, approval, publishing, and performance tracking with revenue attribution.

## What It Does

```
Research (high-quality sources + format selection)
  ↓
Verify Accuracy (fact-check, stress-test sources)
  ↓
Generate Original Content (via Claude API)
  ↓
Get Approval (human review + agent learns your standards)
  ↓
Publish (to WordPress, social media, email)
  ↓
Evaluate Performance (clicks, calls, meetings, closed jobs, revenue)
  ↓
Grade Content (score by actual business outcome)
  ↓
Optimize (agent doubles down on winners, kills losers, learns next steps)
```

## Key Features

- **Content-to-Revenue Attribution**: Track each piece of content from publication → clicks → calls → meetings → closed jobs → payment received
- **Agent Learning**: Agent takes notes on your approval criteria and eventually auto-approves/declines without you
- **Multi-Format**: Automatically selects right format (video for installation process, blog for how-tos, etc.)
- **Accuracy Verification**: Fact-checks research before generation
- **White-Label Ready**: Configure for any foundation contractor in minutes

## Directory Structure

```
n8n-workflow/
├── README.md (this file)
├── workflow.json (n8n workflow template - import this)
├── config/
│   ├── config.template.json (customize for your contractor)
│   ├── integrations.json (which tools to connect)
│   └── approval-criteria.json (what makes YOU approve content)
├── docs/
│   ├── SETUP.md (deploy in 30 mins)
│   ├── INTEGRATIONS.md (WordPress, CRM, Meta Ad Guru, etc.)
│   └── AGENT-LEARNING.md (how the agent learns your standards)
└── schema/
    ├── performance-tracking.sql (database tables)
    └── approval-feedback.json (training data structure)
```

## Quick Start

1. **Import workflow.json into n8n** (or use your n8n instance)
2. **Copy config.template.json → config.json** and fill in your details
3. **Connect integrations** (follow INTEGRATIONS.md)
4. **Start first cycle** - research → review → publish → measure

## Workflow Cycle

### Phase 1: Research & Generation
- Research high-quality sources (configurable: blogs, competitor sites, industry forums, Meta Ad Guru)
- Verify accuracy of findings
- Generate original content (Claude API)
- Select best format (video, blog, social post, email)

### Phase 2: Approval & Publishing
- Queue content for your review
- You approve/decline + add notes explaining why
- Agent logs your decision (training data for eventual auto-approval)
- Content publishes to configured channels

### Phase 3: Performance & Grading
- Track: clicks, calls, scheduled meetings, closed jobs, full payment received
- Grade content by revenue generated ÷ production cost
- Agent notes correlations (what content characteristics predicted revenue?)

### Phase 4: Optimization
- Agent identifies highest-revenue content types
- Recommends what to double down on
- Recommends what to kill
- Feeds learnings into next research cycle

## Configuration

See `config/config.template.json` for all options:

```json
{
  "contractor": {
    "name": "Texas Rigs and Roots",
    "industry": "foundation-repair",
    "region": "Texas"
  },
  "research": {
    "sources": ["competitor-websites", "industry-blogs", "reddit", "meta-ad-guru"],
    "focus": ["helical-piers", "foundation-repair-education", "installation-process"]
  },
  "publishing": {
    "channels": ["wordpress-blog", "facebook", "instagram", "email-list"],
    "approval_required": true,
    "auto_approve_at_confidence": 0.85
  },
  "integrations": {
    "claude_api": true,
    "wordpress": true,
    "crm": "pipedrive",
    "email": "convertkit",
    "ads": "meta-business-suite",
    "phone_tracking": "twilio"
  },
  "performance_tracking": {
    "database": "postgresql",
    "dashboards": ["content-roi", "approval-learning", "pipeline-attribution"]
  }
}
```

## Agent Learning

The agent becomes smarter each cycle:

1. **Approval Learning**: After you approve/decline 20+ pieces, agent can predict your decision with 80%+ accuracy
2. **Revenue Learning**: After publishing 50+ pieces, agent identifies which content characteristics drive revenue
3. **Auto-Approval**: Once agent hits 90% confidence on your approval criteria, it auto-approves without you

See `docs/AGENT-LEARNING.md` for how to monitor and accelerate this process.

## Performance Metrics

Content is graded on:
- **Clicks** (engagement)
- **Calls** (phone calls = qualified leads)
- **Scheduled Meetings** (appointments booked)
- **Closed Jobs** (actual contracts signed)
- **Full Payment Received** (ultimate revenue metric)

Example scoring:
```
Revenue Generated: $5,000
Production Cost: $200 (research + generation + approval time)
ROI Score: 25x
Content Grade: A+
```

## For White-Label Deployment

To deploy for a new contractor:

1. **Fork this repo** or copy the structure
2. **Update config.json** (company name, integrations, approval criteria)
3. **Connect integrations** (WordPress, CRM, email, etc.)
4. **Run first cycle** (manual approval only)
5. **After 20 cycles, enable agent learning** (agent starts predicting approvals)
6. **Monitor agent accuracy** (dashboard in docs/AGENT-LEARNING.md)
7. **Transition to auto-approval** (once 90%+ confident)

## Next Steps

- Read `docs/SETUP.md` for detailed deployment
- Check `docs/INTEGRATIONS.md` for connecting your tools
- Review `docs/AGENT-LEARNING.md` to understand how agent learns

---

Built for Texas Rigs and Roots. Designed to scale to all foundation contractors.
