-- Production PostgreSQL & pgvector Schema Setup for FirstLeads (Explee-Plus Engine)
-- Execute this directly in your Supabase SQL Editor:

-- 1. Enable pgvector Extension for Semantic Vector Similarity Search
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. User Campaigns Table (Stores User ICP & Vector Triggers)
CREATE TABLE IF NOT EXISTS public.user_campaigns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    product_url TEXT,
    value_proposition TEXT,
    target_icp TEXT,
    location_country VARCHAR(100) DEFAULT 'Global',
    location_city VARCHAR(100) DEFAULT '',
    keywords TEXT[] DEFAULT '{}',
    embedding vector(384),
    daily_quota INT DEFAULT 25,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Production Crawled B2B Leads Table (Metadata-Only Lean Storage)
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID REFERENCES public.user_campaigns(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    url TEXT UNIQUE NOT NULL,
    author VARCHAR(120),
    region VARCHAR(120) DEFAULT 'Global',
    query VARCHAR(150),
    intent_score SMALLINT DEFAULT 85,
    intent_badge VARCHAR(50) DEFAULT 'High Intent',
    intent_category VARCHAR(50) DEFAULT 'INTENT',
    decision_maker_email VARCHAR(255),
    company_email VARCHAR(255),
    office_phone VARCHAR(50),
    address VARCHAR(255),
    obscura_enriched BOOLEAN DEFAULT FALSE,
    draft TEXT,
    connected BOOLEAN DEFAULT FALSE,
    kanban_stage VARCHAR(50) DEFAULT 'new',
    embedding vector(384),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Fast Vector Index for Instant Cosine Similarity Distance Matching
CREATE INDEX IF NOT EXISTS leads_embedding_idx ON public.leads USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS leads_created_at_idx ON public.leads (created_at DESC);
CREATE INDEX IF NOT EXISTS leads_url_idx ON public.leads (url);

-- 5. Crawler Execution Logs Table
CREATE TABLE IF NOT EXISTS public.crawler_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    daemon_id VARCHAR(100) DEFAULT 'cloud-daemon-1',
    scanned_channels INT DEFAULT 0,
    items_scraped INT DEFAULT 0,
    high_intent_count INT DEFAULT 0,
    execution_time_ms INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'success',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Stored Procedure: 30-Day TTL Auto-Purge Function (Keeps DB Lean & Fast)
CREATE OR REPLACE FUNCTION purge_expired_leads(max_days INT DEFAULT 30)
RETURNS INT AS $$
DECLARE
    deleted_count INT;
BEGIN
    DELETE FROM public.leads
    WHERE connected = FALSE 
      AND created_at < NOW() - (max_days || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
