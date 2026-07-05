# Agent Learning System

How the agent learns your approval standards and eventually replaces you.

## Overview

The agent is trained on **your approval decisions** to understand what makes content:
- ✅ Good enough to approve
- ❌ Not good enough to publish

Over time, the agent learns to:
1. Predict your approval decision with 80%+ accuracy
2. Understand what content characteristics drive revenue
3. Auto-approve/decline without you

## The Learning Cycle

### Phase 1: Data Collection (Weeks 1-4)

**You approve/decline content. Agent takes notes.**

Every time you review content, you provide:
- ✅ **Approval**: Yes or No
- 📝 **Reasoning**: Why did you approve/decline?
- 📊 **Scores**: Quality, accuracy, differentiation, CTA effectiveness

Example:
```
Content: "5 Signs Your Foundation Needs Helical Piers" (Blog)
Your Decision: APPROVE ✅
Your Notes: "Strong differentiation. Great explanation of why helical > traditional. CTA feels natural."
Your Quality Score: 9/10
Your Differentiation Score: 8/10
Your CTA Effectiveness Score: 7/10
```

**Database records:**
```
INSERT INTO approval_learning_dataset (
  content_topic, content_format, user_approval,
  user_notes, quality_score, differentiation_score, cta_effectiveness_score,
  approval_date
) VALUES (
  'Helical Piers', 'blog', true,
  'Strong differentiation. Great explanation...', 9.0, 8.0, 7.0,
  NOW()
);
```

This happens for every piece you review. After 20-30 approvals, you have a training dataset.

### Phase 2: Pattern Recognition (Week 5-8)

**Agent analyzes what makes you approve/decline.**

After 30+ decisions, n8n runs analysis (Claude API):

```
Analyze approval patterns:
- Which topics do I approve most? (helical piers, installation process, cost guides)
- Which formats do I prefer? (videos for "how-to", blogs for education)
- What accuracy threshold matters? (I reject 70% accuracy but approve 80%+)
- What CTA style do I like? (conversational, not pushy)
- What makes me decline? (vague claims, competitor trash talk, thin content)

Identify correlations:
- Topics with high accuracy scores → I approve
- Formats with natural CTAs → I approve
- Content showing unique process → I approve
- Short, vague content → I decline
```

Agent learns:
```json
{
  "approval_factors": {
    "preferred_topics": ["helical-piers", "installation", "cost-guides", "case-studies"],
    "preferred_formats": ["video", "blog", "case-study"],
    "minimum_accuracy_required": 78,
    "requires_unique_angle": true,
    "requires_process_explanation": true,
    "cta_style_preferred": "conversational",
    "minimum_word_count": 800,
    "requires_sourcing": true
  },
  "reject_signals": [
    "vague-claims",
    "competitor-trash-talk",
    "thin-research",
    "high-pressure-cta"
  ]
}
```

### Phase 3: Prediction (Week 9-12)

**Agent predicts your decision on new content.**

Before you review, agent predicts:
```
New Content: "DIY Foundation Repair vs. Professional" (Blog)

Agent Prediction:
- Topic: "DIY-vs-professional" - NOT in preferred topics
- Format: "blog" - PREFERRED
- Accuracy Score: 82 - ABOVE threshold
- Unique Angle: Yes - REQUIRED
- Process Explanation: Yes - REQUIRED
- CTA Style: Conversational - MATCHES preferred style
- Confidence: 72% → LIKELY APPROVE

Prediction: 72% confidence you'll APPROVE
```

Slack notification:
```
🤖 Agent prediction: 72% you'll APPROVE this
(Topic not preferred, but format/quality/angle suggest yes)
```

### Phase 4: Accuracy Verification

Agent learns how often it predicted correctly:

```
After 50 predictions:
- Correct: 38 predictions
- Accuracy: 76%

After 100 predictions:
- Correct: 85 predictions
- Accuracy: 85%

After 150 predictions:
- Correct: 135 predictions
- Accuracy: 90%
```

### Phase 5: Auto-Approval (Week 13+)

**Once agent reaches 90% prediction accuracy, it auto-approves.**

Configuration (in config.json):
```json
"agent_learning": {
  "transition_to_auto_approve_at": {
    "approvals_reviewed": 50,
    "prediction_accuracy": 0.85,
    "confidence_threshold": 0.9
  }
}
```

Once triggered:
- Content meeting approval criteria auto-publishes
- You get a report summary (no manual approval needed)
- Agent still logs everything for continued learning

Example auto-approve:
```
🤖 AUTO-APPROVED

Topic: "How to Install Helical Piers" (Video)
- Accuracy: 92/100 ✅
- Unique angle: Yes ✅
- Includes process: Yes ✅
- CTA style: Conversational ✅
- Confidence: 96%

Published to: WordPress, Facebook, Instagram, Email
Will measure performance over next 30 days.
```

## Revenue Learning

Beyond approval, the agent learns what content **drives revenue**.

### Correlation Analysis

After 50+ pieces published, agent runs:

```sql
SELECT
  topic,
  format,
  AVG(revenue_received) as avg_revenue,
  COUNT(*) as pieces,
  AVG(roi_multiple) as avg_roi,
  AVG(clicks) as avg_clicks,
  AVG(phone_calls) as avg_calls
FROM content_performance cp
JOIN content_published c ON cp.content_id = c.content_id
GROUP BY topic, format
ORDER BY avg_revenue DESC;
```

Results might show:
```
Topic              Format    Avg Revenue  Pieces  Avg ROI  Avg Calls
------            ------    -----------  ------  -------  ----------
Helical Piers     Video     $3,200       8       18x      12
Cost Guides       Blog      $2,100       6       14x      8
Installation      Video     $1,900       5       16x      7
Case Studies      Blog      $1,200       4       12x      5
Competitor Comp   Blog      $400         3       2x       1
```

Agent recommends:
```
🎯 DOUBLE DOWN ON:
1. Helical Piers (Video) - $3,200 avg revenue, 18x ROI
2. Cost Guides (Blog) - $2,100 avg revenue, 14x ROI
3. Installation Process (Video) - $1,900 avg revenue, 16x ROI

⚠️ STOP OR MINIMIZE:
1. Competitor comparisons - Only $400 revenue, 2x ROI (low quality traffic)
2. Generic how-tos - Drive clicks but few actual calls

🧪 TEST NEW ANGLES:
1. Seasonal foundation issues (heat/cold cycles in your region)
2. New construction foundation design
3. Foundation inspection DIY guide
```

## Dashboard: Agent Learning Status

Weekly Slack report:

```
📊 AGENT LEARNING STATUS (Week 8)

Content Reviewed: 42 pieces
Agent Predictions Made: 12
Prediction Accuracy: 83% ✅ (Goal: 90%)

Approval Pattern Identified:
✅ Prefers: Helical piers, installation, educational
✅ Requires: Unique angle, accuracy 78+, process explanation
❌ Rejects: Vague claims, competitor trash talk, thin research

Revenue Patterns (Top 5):
1. Helical Piers (Video) - 18x ROI
2. Cost Guides (Blog) - 14x ROI
3. Installation (Video) - 16x ROI
4. Case Studies (Blog) - 12x ROI
5. Seasonal Tips (Social) - 8x ROI

Next Milestone: 50% confidence threshold (60 total predictions)
On track for auto-approval in ~3 weeks if accuracy stays 83%+

Action Items:
- Keep focusing on helical piers + installation content
- Minimize competitor analysis pieces
- Test new angle: regional seasonal foundation issues
```

## Monitoring Agent Learning

Check agent progress:

```bash
# SQL query to see learning progress
SELECT
  COUNT(*) as total_reviews,
  SUM(CASE WHEN user_approval THEN 1 ELSE 0 END) as approved,
  SUM(CASE WHEN user_approval THEN 0 ELSE 1 END) as declined,
  ROUND(100.0 * SUM(CASE WHEN user_approval THEN 1 ELSE 0 END) / COUNT(*), 1) as approval_rate,
  AVG(quality_score) as avg_quality_score,
  AVG(eventual_revenue) as avg_eventual_revenue
FROM approval_learning_dataset;

-- Example output:
-- total_reviews: 42
-- approved: 31
-- declined: 11
-- approval_rate: 73.8%
-- avg_quality_score: 8.1
-- avg_eventual_revenue: $1,650
```

## Human + Agent Hybrid Mode

Before full auto-approval, use **hybrid approval**:

```
Content awaiting approval:

1. "How to Fix Concrete Cracks" (Blog)
   Agent confidence: 78% → APPROVE
   Your decision: APPROVE ✅
   Agent was right!

2. "New Foundation Technology" (Blog)
   Agent confidence: 65% → UNCERTAIN
   Your decision: DECLINE ❌ (too vague)
   Agent learned: This topic needs more specificity

3. "Helical Pier Case Study" (Blog)
   Agent confidence: 94% → APPROVE
   Your decision: APPROVE ✅
   Agent was right!
```

## Transitioning to Auto-Approval

When ready, move to full auto-approval:

**Step 1: Enable in config.json**
```json
"agent_learning": {
  "enabled": true,
  "auto_approve_threshold": 0.90
}
```

**Step 2: Monitor for 1 week**
- Agent auto-approves content
- You review the published content (not pre-publication)
- If 95%+ are good, full auto-approval is working

**Step 3: Adjust if needed**
- If agent over-approves: raise threshold to 0.92
- If agent under-approves: lower threshold to 0.88
- Rerun training on new data

## Fallback to Manual Approval

If agent loses accuracy (>5% decline):

```
⚠️ ACCURACY DROP DETECTED
Agent accuracy was 91%, now 86%
Reason: New content format (video scripts) not in training data

Action: Reverting to manual approval for now.
Agent will retrain on video scripts.

Your job: Approve next 20 video scripts manually.
Agent will learn video script approval patterns.
Expected retraining time: ~2 weeks.
```

## FAQs

**Q: What if my approval criteria change?**
A: Retrain the agent. Approve 20+ pieces under new criteria, agent will adapt.

**Q: Can the agent make mistakes?**
A: Yes. Agent predicts with ~90% accuracy, not 100%. Manual oversight always recommended until you're fully confident.

**Q: What if agent auto-approves something bad?**
A: Content goes live but gets measured. If performance is terrible (0 calls, 0 meetings), it gets a low grade and agent learns not to approve that pattern again.

**Q: How do I know agent is learning?**
A: Check weekly Slack report. Prediction accuracy should trend up. After 100 approvals, accuracy plateaus around your natural consistency level.

**Q: Can I override agent auto-approval?**
A: Yes. You can always manually decline something the agent auto-approved. It's logged as override data.

---

## The End Goal

After 3-4 months:
- Agent knows your standards cold
- Auto-approves 90%+ of content
- You focus on strategy + optimization
- Agent handles execution
- System runs 24/7 with minimal intervention

You've built a **scalable content machine** that teaches itself.
