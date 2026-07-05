# Setup Guide - Foundation Contractor Marketing Automation

Deploy the white-label marketing workflow in 30 minutes.

## Prerequisites

- n8n instance (self-hosted or cloud.n8n.io)
- API keys for: Claude, Perplexity, Meta Business, WordPress, CRM, Twilio
- PostgreSQL database (for performance tracking)
- Slack workspace (for approvals/reports)
- Basic tech comfort (copy/paste config, test API keys)

## Step 1: Clone & Configure (5 minutes)

```bash
# Clone the workflow repo
git clone https://github.com/amresthtx/foundation-contractors-allin1.git
cd foundation-contractors-allin1/n8n-workflow

# Copy configuration template
cp config.template.json config.json

# Edit config.json with YOUR details
nano config.json
# Update:
# - contractor.name (your company)
# - contractor.region (where you operate)
# - research.competitor_watch_domains (competitors to monitor)
# - All API keys and tokens in environment_variables section
```

## Step 2: Set Up Database (5 minutes)

Create PostgreSQL tables for tracking:

```bash
# Option A: Use provided schema
psql -U postgres -d your_database < n8n-workflow/schema/performance-tracking.sql

# Option B: Create manually
createdb foundation_marketing

psql foundation_marketing << 'EOF'
CREATE TABLE content_published (
  id SERIAL PRIMARY KEY,
  content_id VARCHAR(100) UNIQUE,
  topic VARCHAR(255),
  format VARCHAR(50),
  published_date TIMESTAMP,
  channels TEXT,
  accuracy_score INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE content_performance (
  id SERIAL PRIMARY KEY,
  content_id VARCHAR(100),
  clicks INTEGER,
  phone_calls INTEGER,
  scheduled_meetings INTEGER,
  closed_jobs INTEGER,
  revenue_received DECIMAL(10,2),
  measurement_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE content_grades (
  id SERIAL PRIMARY KEY,
  content_id VARCHAR(100),
  grade VARCHAR(2),
  analysis TEXT,
  roi DECIMAL(10,2),
  graded_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE approval_learning_dataset (
  id SERIAL PRIMARY KEY,
  content_topic VARCHAR(255),
  content_format VARCHAR(50),
  accuracy_score INTEGER,
  user_approval BOOLEAN,
  user_notes TEXT,
  approval_reasoning TEXT,
  eventual_revenue DECIMAL(10,2),
  recorded_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_content_id ON content_published(content_id);
CREATE INDEX idx_content_performance ON content_performance(content_id);
CREATE INDEX idx_approval_learning ON approval_learning_dataset(user_approval);
EOF
```

## Step 3: Generate API Keys (10 minutes)

Get all required API keys and tokens:

### Claude API
1. Go to https://console.anthropic.com/
2. Create API key (or use existing)
3. Copy `CLAUDE_API_KEY`

### Perplexity AI
1. Go to https://www.perplexity.ai/api
2. Create account + API key
3. Copy `PERPLEXITY_API_KEY`

### Meta Business Suite
1. Go to https://business.facebook.com
2. Settings → Apps and Websites → [Your App]
3. Copy `META_BUSINESS_TOKEN`
4. Note: `FACEBOOK_PAGE_ID` and `INSTAGRAM_ACCOUNT_ID`

### WordPress
1. Go to your WordPress dashboard
2. Plugins → Install "REST API" or ensure it's active
3. Users → [Your User] → Application Passwords → Create new password
4. Copy `WORDPRESS_API_TOKEN`
5. Your `WORDPRESS_API_URL` is: `https://yoursite.com/wp-json`

### ConvertKit (Email)
1. Go to https://app.convertkit.com/account/access_tokens
2. Create API token
3. Copy `CONVERTKIT_API_KEY`

### Google Analytics 4
1. Go to https://analytics.google.com
2. Admin → API & Services
3. Create OAuth 2.0 credential
4. Copy `GOOGLE_ANALYTICS_TOKEN` and `GOOGLE_ANALYTICS_PROPERTY_ID`

### Pipedrive CRM (or your CRM)
1. Go to https://pipedrive.com/settings/api
2. Copy your API token
3. Copy `CRM_API_TOKEN`

### Twilio (Phone Tracking)
1. Go to https://www.twilio.com/console
2. Copy `ACCOUNT_SID` and `AUTH_TOKEN`
3. Set up call tracking phone number

### Database
1. PostgreSQL connection string: `postgresql://user:password@host:5432/dbname`
2. Get from your database provider or local install

## Step 4: Import into n8n (5 minutes)

1. **Log into n8n**
   - Go to cloud.n8n.io or your self-hosted instance
   - Sign in / create account

2. **Create new workflow**
   - Click "+ Create new workflow"
   - Name it: "Foundation Contractor Marketing - [YourName]"

3. **Import workflow.json**
   - Click menu (⋮) → Import
   - Choose `n8n-workflow/workflow.json`
   - Select "Create new workflow" (not update)

4. **Update credentials**
   - Each node with API calls shows "credentials missing"
   - Click node → Credentials → Add new
   - Paste API keys from Step 3
   - Test connection

5. **Set environment variables**
   - Settings → Environment variables
   - Paste all from `config.json` `environment_variables` section

6. **Update database connection**
   - Find "Log to Performance Database" node
   - Set PostgreSQL credentials from Step 2

## Step 5: Test (5 minutes)

1. **Manually trigger workflow**
   - Click "Execute workflow" (play icon)
   - Watch execution in real-time
   - Check Slack for approval notification

2. **Verify each phase**
   - Research: Check that research data comes back
   - Verification: Accuracy score should be 75+
   - Generation: Content should be generated
   - Approval: Check Slack for message
   - Publishing: Approve in Slack (click reaction)
   - Database: Check PostgreSQL tables have data

3. **Debug errors**
   - Click any failed node
   - Check error message
   - Usually: missing API key, wrong token, database not accessible
   - Fix and retry

## Step 6: Configure Approval Workflow (Optional, 5 minutes)

To make approvals seamless in Slack:

```bash
# In your Slack workspace:
# 1. Create private channel: #marketing-approval
# 2. Create public channel: #marketing-reports
# 3. Get channel IDs:
curl https://slack.com/api/conversations.list \
  -H "Authorization: Bearer xoxb-YOUR-BOT-TOKEN" | jq '.channels[] | {name, id}'

# 4. Update config.json
"approval_channel": "C1234567890",
"recommendations_channel": "C0987654321"
```

Create a Slack bot reaction handler (optional automation):
- Workflow can watch for reactions (👍 = approve, 👎 = decline)
- n8n Slack node: "Trigger on reaction add"
- Auto-publish when approved

## Step 7: Set Up Recurring Execution (5 minutes)

Configure when the workflow runs:

**Option A: Daily (Recommended)**
```
Workflow → Settings → Trigger
Cron: "0 9 * * *" (9am daily)
```

**Option B: Weekly**
```
Cron: "0 9 * * 1" (Mondays at 9am)
```

**Option C: Manual only**
```
Keep as "Execute" button, run when you want
```

## Step 8: Monitor & Optimize (Ongoing)

After first 2 weeks:

1. **Check performance dashboard** (if you set up analytics)
   - Which content drove calls?
   - Which topics had highest ROI?
   - What format worked best?

2. **Review agent recommendations**
   - Check Slack #marketing-reports
   - Agent will suggest what to double down on

3. **Enable auto-approval** (once agent has seen 50+ pieces)
   - config.json: `"auto_approve_threshold": 0.90`
   - Agent learns your standards, approves without you

4. **A/B test variations**
   - Edit content_format preferences
   - Try new competitor sources
   - Test new email nurture angles

## Troubleshooting

### "API key invalid"
- Verify key in Credentials node
- Check key has correct permissions (not read-only)
- Regenerate key in provider dashboard

### "No research data"
- Check Perplexity API quota/plan
- Verify PERPLEXITY_API_KEY in environment variables
- Test with simpler query first

### "Approval Slack message not sent"
- Verify SLACK_APPROVAL_CHANNEL ID (not name)
- Check n8n Slack app installed in workspace
- Check bot has permissions to post in channel

### "Database connection refused"
- Verify PostgreSQL running: `psql -U postgres`
- Check DATABASE_URL format: `postgresql://user:password@host:5432/db`
- Verify tables exist: `\dt` in psql

### "Content not publishing to WordPress"
- Test WordPress API: `curl -H "Authorization: Bearer TOKEN" https://yoursite/wp-json/wp/v2/posts`
- Verify WORDPRESS_API_TOKEN has correct permissions
- Check WordPress blog has API enabled (should be default in 5.0+)

## Next Steps

1. **Run first cycle** (manual, watch execution)
2. **Review content** (approve in Slack)
3. **Check performance** after 7 days
4. **Iterate** based on what works
5. **Enable auto-approval** once comfortable
6. **White-label for new contractors** (copy config, repeat steps)

## White-Label Deployment for New Contractors

Once you've got this running, spinning up for a new contractor is fast:

```bash
# 1. Copy directory
cp -r n8n-workflow n8n-workflow-[contractor-name]

# 2. Create new config
cp config.template.json config.json
# Edit with contractor details

# 3. Create new database
createdb [contractor_name]_marketing

# 4. Import fresh workflow in n8n
# (same as Step 4 above)

# 5. Test and launch
```

Total time: ~1 hour per new contractor after the first setup.

---

Questions? Check `docs/INTEGRATIONS.md` for tool-specific setup, or `docs/AGENT-LEARNING.md` to understand how the agent learns your approval criteria.
