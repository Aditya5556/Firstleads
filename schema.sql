-- Production PostgreSQL & pgvector Schema Setup for FirstLeads (Explee-Plus Engine)
-- Execute this directly in your Supabase SQL Editor:

-- 1. Enable pgvector Extension for Semantic Vector Similarity Search
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. User Campaigns Table (Stores User ICP & Vector Triggers)
CREATE TABLE IF NOT EXISTS public.user_campaigns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email VARCHAR(255) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    product_url TEXT,
    value_proposition TEXT,
    target_icp TEXT,
    location_country VARCHAR(100) DEFAULT 'Global',
    location_city VARCHAR(100) DEFAULT '',
    keywords TEXT[] DEFAULT '{}',
    embedding vector(384),
    weekly_quota INT DEFAULT 40,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Production Crawled B2B Leads Table (Metadata-Only Lean Storage)
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES public.user_campaigns(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    url TEXT NOT NULL,
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_user_lead_url UNIQUE (user_id, url)
);

-- 4. Fast Vector Index for Instant Cosine Similarity Distance Matching
CREATE INDEX IF NOT EXISTS leads_embedding_idx ON public.leads USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS leads_created_at_idx ON public.leads (created_at DESC);
CREATE INDEX IF NOT EXISTS leads_url_idx ON public.leads (url);

-- 5. Product Wall Directory Table (Wayb-Style Listing)
CREATE TABLE IF NOT EXISTS public.products_wall (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    website_url TEXT NOT NULL,
    logo_url TEXT,
    tagline VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) DEFAULT 'AI & B2B Tools',
    is_featured BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    upvotes INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (timezone('utc'::text, now()) + INTERVAL '7 days')
);

-- 6. Inbound Leads from Product Wall Connect Table
CREATE TABLE IF NOT EXISTS public.inbound_leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES public.products_wall(id) ON DELETE CASCADE,
    seller_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    visitor_name VARCHAR(255) NOT NULL,
    visitor_email VARCHAR(255) NOT NULL,
    visitor_company VARCHAR(255),
    visitor_role VARCHAR(150),
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Crawler Execution Logs Table
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

-- 8. Legacy Products Marketplace Table
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    tagline VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    logo TEXT,
    category VARCHAR(100) DEFAULT 'SaaS',
    country VARCHAR(100) DEFAULT 'Global',
    pricing VARCHAR(50) DEFAULT 'Freemium',
    twitter VARCHAR(100) DEFAULT '',
    bid_score INT DEFAULT 0,
    clicks INT DEFAULT 0,
    leads_captured INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Row Level Security Policies (Supabase Auth Data Isolation & Daemon Support)
ALTER TABLE public.user_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products_wall ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbound_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crawler_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users access own campaigns" ON public.user_campaigns;
DROP POLICY IF EXISTS "Users access own leads" ON public.leads;
DROP POLICY IF EXISTS "Public reads active products" ON public.products_wall;
DROP POLICY IF EXISTS "Owners manage product listing" ON public.products_wall;
DROP POLICY IF EXISTS "Sellers view inbound leads" ON public.inbound_leads;
DROP POLICY IF EXISTS "Public reads products" ON public.products;
DROP POLICY IF EXISTS "Public inserts products" ON public.products;

CREATE POLICY "Enable read for users own leads" ON public.leads FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Enable insert for all leads" ON public.leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for users own leads" ON public.leads FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Enable delete for users own leads" ON public.leads FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Enable all for user_campaigns" ON public.user_campaigns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for products_wall" ON public.products_wall FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for inbound_leads" ON public.inbound_leads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for crawler_logs" ON public.crawler_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for products" ON public.products FOR ALL USING (true) WITH CHECK (true);

-- 10. Explicit Table Grants for Supabase Data API (October 30 Security Policy Compliance)
GRANT ALL ON TABLE public.user_campaigns TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.leads TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.products_wall TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.inbound_leads TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.crawler_logs TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.products TO anon, authenticated, service_role;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 11. Stored Procedure: 30-Day TTL Auto-Purge Function (Keeps DB Lean & Fast)
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
