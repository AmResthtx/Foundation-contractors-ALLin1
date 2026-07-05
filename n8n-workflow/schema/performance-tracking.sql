-- Foundation Contractor Marketing Automation - Performance Tracking Database Schema
-- PostgreSQL 12+

-- Table 1: Content Published
-- Tracks every piece of content created and published
CREATE TABLE IF NOT EXISTS content_published (
  id SERIAL PRIMARY KEY,
  content_id VARCHAR(100) UNIQUE NOT NULL,
  topic VARCHAR(255) NOT NULL,
  format VARCHAR(50) NOT NULL, -- blog, video, social, email, case-study
  content_summary TEXT,
  published_date TIMESTAMP NOT NULL,
  channels TEXT NOT NULL, -- JSON array of channels: ["wordpress", "facebook", "email"]
  accuracy_score INTEGER CHECK (accuracy_score >= 0 AND accuracy_score <= 100),
  production_cost DECIMAL(8,2), -- $ spent on research + generation + approval time
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT valid_format CHECK (format IN ('blog', 'video', 'social', 'email', 'case-study', 'how-to'))
);

CREATE INDEX idx_content_published_date ON content_published(published_date);
CREATE INDEX idx_content_topic ON content_published(topic);
CREATE INDEX idx_content_format ON content_published(format);

-- Table 2: Content Performance
-- Tracks KPIs for each content piece over time (measured weekly)
CREATE TABLE IF NOT EXISTS content_performance (
  id SERIAL PRIMARY KEY,
  content_id VARCHAR(100) NOT NULL REFERENCES content_published(content_id),
  measurement_period DATE NOT NULL, -- week of measurement

  -- Engagement metrics
  clicks INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  avg_time_on_page DECIMAL(5,2), -- seconds
  bounce_rate DECIMAL(5,2), -- percentage

  -- Lead metrics
  phone_calls INTEGER DEFAULT 0,
  call_duration_seconds INTEGER,
  call_quality_score DECIMAL(3,1), -- 1-10 rating

  -- Sales funnel metrics
  scheduled_meetings INTEGER DEFAULT 0,
  meeting_completion_rate DECIMAL(5,2), -- % of scheduled that happened
  qualified_leads INTEGER DEFAULT 0,
  lead_quality_score DECIMAL(3,1), -- 1-10 rating

  -- Business outcome metrics
  closed_jobs INTEGER DEFAULT 0,
  job_value_total DECIMAL(10,2),
  job_avg_value DECIMAL(10,2),
  revenue_received DECIMAL(10,2) DEFAULT 0,

  -- Calculated ROI
  roi_multiple DECIMAL(8,2), -- revenue / cost
  cost_per_click DECIMAL(8,2),
  cost_per_call DECIMAL(8,2),
  cost_per_meeting DECIMAL(8,2),
  cost_per_job DECIMAL(8,2),

  measurement_date TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT valid_measurement UNIQUE(content_id, measurement_period)
);

CREATE INDEX idx_content_perf_id ON content_performance(content_id);
CREATE INDEX idx_content_perf_period ON content_performance(measurement_period);
CREATE INDEX idx_revenue_received ON content_performance(revenue_received DESC);

-- Table 3: Content Grades
-- Final assessment of content performance and quality
CREATE TABLE IF NOT EXISTS content_grades (
  id SERIAL PRIMARY KEY,
  content_id VARCHAR(100) UNIQUE NOT NULL REFERENCES content_published(content_id),
  grade VARCHAR(2) NOT NULL, -- A+, A, B+, B, C, D, F
  grade_score INTEGER CHECK (grade_score >= 0 AND grade_score <= 100),

  -- Component scores
  accuracy_component DECIMAL(3,1),
  revenue_component DECIMAL(3,1),
  engagement_component DECIMAL(3,1),
  lead_quality_component DECIMAL(3,1),

  -- Analysis
  analysis TEXT,
  what_worked TEXT,
  what_didnt_work TEXT,
  recommendations TEXT,

  -- Final metrics for grade
  final_roi DECIMAL(8,2),
  final_revenue DECIMAL(10,2),
  total_clicks INTEGER,
  total_calls INTEGER,
  total_meetings INTEGER,
  total_jobs INTEGER,

  graded_date TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT valid_grade CHECK (grade IN ('A+', 'A', 'B+', 'B', 'C', 'D', 'F'))
);

CREATE INDEX idx_grade_score ON content_grades(grade_score DESC);
CREATE INDEX idx_grade_roi ON content_grades(final_roi DESC);

-- Table 4: Approval Learning Dataset
-- Training data for agent to learn YOUR approval standards
CREATE TABLE IF NOT EXISTS approval_learning_dataset (
  id SERIAL PRIMARY KEY,

  -- Content characteristics
  content_topic VARCHAR(255) NOT NULL,
  content_format VARCHAR(50) NOT NULL,
  accuracy_score INTEGER,
  research_sources_count INTEGER,
  includes_competitor_analysis BOOLEAN,
  includes_unique_angle BOOLEAN,
  includes_process_explanation BOOLEAN,
  includes_cta BOOLEAN,
  word_count INTEGER,

  -- Your decision
  user_approval BOOLEAN NOT NULL,
  approval_confidence DECIMAL(3,2), -- How sure was the user?
  user_notes TEXT,
  approval_reasoning TEXT, -- Why did you approve/decline?

  -- Feedback fields
  quality_score DECIMAL(3,1), -- 1-10
  differentiation_score DECIMAL(3,1), -- How different from competitors?
  cta_effectiveness_score DECIMAL(3,1), -- Will this drive leads?
  factual_accuracy_score DECIMAL(3,1),
  authority_score DECIMAL(3,1), -- Does this build authority?

  -- How did this decision age?
  eventual_clicks INTEGER,
  eventual_calls INTEGER,
  eventual_meetings INTEGER,
  eventual_jobs INTEGER,
  eventual_revenue DECIMAL(10,2),

  -- Metadata
  approval_date TIMESTAMP NOT NULL,
  evaluation_period_days INTEGER DEFAULT 30,
  final_evaluation_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_approval_decision ON approval_learning_dataset(user_approval);
CREATE INDEX idx_approval_topic ON approval_learning_dataset(content_topic);
CREATE INDEX idx_approval_format ON approval_learning_dataset(content_format);
CREATE INDEX idx_approval_revenue ON approval_learning_dataset(eventual_revenue);
CREATE INDEX idx_approval_date ON approval_learning_dataset(approval_date);

-- Table 5: Agent Recommendations
-- Captures what the agent recommends each cycle
CREATE TABLE IF NOT EXISTS agent_recommendations (
  id SERIAL PRIMARY KEY,
  cycle_date DATE NOT NULL UNIQUE,

  -- Top performers
  top_3_topics TEXT, -- JSON array
  top_3_formats TEXT, -- JSON array
  top_3_revenue DECIMAL(10,2),

  -- Underperformers
  bottom_3_topics TEXT, -- JSON array
  bottom_3_formats TEXT, -- JSON array
  bottom_3_revenue DECIMAL(10,2),

  -- Recommendations
  double_down_on TEXT, -- What to create more of
  stop_creating TEXT, -- What's not working
  test_new_angles TEXT, -- Emerging opportunities

  -- Agent confidence
  recommendation_confidence DECIMAL(3,2),
  data_points_analyzed INTEGER, -- How much data did analysis use?

  -- Metadata
  recommendation_date TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT valid_cycle UNIQUE(cycle_date)
);

CREATE INDEX idx_rec_date ON agent_recommendations(recommendation_date);

-- Table 6: Performance Dashboard Materialized View
-- Quick access to key metrics (refresh daily)
CREATE MATERIALIZED VIEW content_performance_summary AS
SELECT
  cp.content_id,
  c.topic,
  c.format,
  c.published_date,
  COUNT(DISTINCT cp.measurement_period) as weeks_tracked,

  -- Aggregated metrics
  SUM(cp.clicks) as total_clicks,
  SUM(cp.phone_calls) as total_calls,
  SUM(cp.scheduled_meetings) as total_meetings,
  SUM(cp.closed_jobs) as total_jobs,
  SUM(cp.revenue_received) as total_revenue,

  -- Averages
  AVG(cp.roi_multiple) as avg_roi,
  AVG(cp.cost_per_click) as avg_cpc,
  AVG(cp.cost_per_call) as avg_cpc_call,

  -- Grade
  cg.grade,
  cg.grade_score,

  -- Recency
  MAX(cp.measurement_date) as last_measurement
FROM content_performance cp
JOIN content_published c ON cp.content_id = c.content_id
LEFT JOIN content_grades cg ON c.content_id = cg.content_id
GROUP BY cp.content_id, c.topic, c.format, c.published_date, cg.grade, cg.grade_score;

CREATE INDEX idx_perf_summary_revenue ON content_performance_summary(total_revenue DESC);
CREATE INDEX idx_perf_summary_roi ON content_performance_summary(avg_roi DESC);

-- Utility function: Calculate content ROI
CREATE OR REPLACE FUNCTION calculate_content_roi(p_content_id VARCHAR)
RETURNS DECIMAL AS $$
DECLARE
  v_revenue DECIMAL;
  v_cost DECIMAL;
BEGIN
  SELECT COALESCE(SUM(revenue_received), 0) INTO v_revenue
  FROM content_performance
  WHERE content_id = p_content_id;

  SELECT production_cost INTO v_cost
  FROM content_published
  WHERE content_id = p_content_id;

  IF v_cost = 0 OR v_cost IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN v_revenue / v_cost;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (if using separate user for n8n)
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO n8n_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO n8n_user;
