-- Contact Rep Feature Migration
-- Phase 1: Foundation tables for industry contact functionality
-- Run this migration in Supabase SQL Editor

-- ============================================================================
-- COMPANIES TABLE
-- Stores implant manufacturers/device companies
-- ============================================================================
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  website TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Index for quick lookup by name
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_active ON companies(is_active) WHERE is_active = true;

-- ============================================================================
-- PRODUCTS TABLE
-- Stores specific implants/devices linked to companies
-- ============================================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT,  -- Product category for filtering (e.g., "Knee", "Hip", "Spine")
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(company_id, name)
);

-- Indexes for product queries
CREATE INDEX IF NOT EXISTS idx_products_company ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active) WHERE is_active = true;

-- ============================================================================
-- COMPANY_CONTACTS TABLE
-- Industry representatives who can receive inquiries
-- ============================================================================
CREATE TABLE IF NOT EXISTS company_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- Links to Supabase auth (for future industry portal)
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT,  -- "Regional Manager", "Sales Rep", etc.
  territory TEXT,  -- Geographic coverage description
  is_primary BOOLEAN DEFAULT false,  -- Primary contact receives all inquiries for routing
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Indexes for contact queries
CREATE INDEX IF NOT EXISTS idx_company_contacts_company ON company_contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_company_contacts_primary ON company_contacts(company_id, is_primary) WHERE is_primary = true;
CREATE INDEX IF NOT EXISTS idx_company_contacts_user ON company_contacts(user_id) WHERE user_id IS NOT NULL;

-- ============================================================================
-- REP_INQUIRIES TABLE
-- Contact requests from surgeons to company representatives
-- ============================================================================
CREATE TABLE IF NOT EXISTS rep_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who's asking
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- Logged-in surgeon
  surgeon_name TEXT NOT NULL,
  surgeon_email TEXT NOT NULL,
  surgeon_phone TEXT,

  -- What they're asking about
  resource_id UUID REFERENCES resources(id) ON DELETE SET NULL,  -- Which resource triggered this
  company_name TEXT,  -- Company name (text, not FK)
  product_name TEXT,  -- Product/implant name (text, not FK)

  -- Contact preferences
  contact_method TEXT NOT NULL DEFAULT 'either',  -- 'email', 'phone', 'either'
  preferred_time TEXT,  -- "Mornings", "Afternoons", etc.

  -- Location for rep routing
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'USA',

  -- Message
  message TEXT,  -- Optional custom message

  -- Status tracking
  status TEXT DEFAULT 'pending',  -- 'pending', 'assigned', 'contacted', 'closed'

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_at TIMESTAMPTZ,
  contacted_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,

  -- Notes from rep
  rep_notes TEXT
);

-- Indexes for inquiry queries
CREATE INDEX IF NOT EXISTS idx_rep_inquiries_company_name ON rep_inquiries(company_name) WHERE company_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rep_inquiries_status ON rep_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_rep_inquiries_user ON rep_inquiries(user_id);
CREATE INDEX IF NOT EXISTS idx_rep_inquiries_created ON rep_inquiries(created_at DESC);

-- ============================================================================
-- ADD COLUMNS TO RESOURCES TABLE
-- Link resources to companies and products
-- ============================================================================
-- For now, store as text fields (simple input). Later can link to company/product tables.
ALTER TABLE resources ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE resources ADD COLUMN IF NOT EXISTS product_name TEXT;

-- Indexes for resource company/product queries
CREATE INDEX IF NOT EXISTS idx_resources_company_name ON resources(company_name) WHERE company_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_resources_product_name ON resources(product_name) WHERE product_name IS NOT NULL;

-- ============================================================================
-- ADD COLUMNS TO RESOURCE_SUGGESTIONS TABLE
-- Store suggested company/product names (not IDs, since they might not exist yet)
-- ============================================================================
ALTER TABLE resource_suggestions ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE resource_suggestions ADD COLUMN IF NOT EXISTS product_name TEXT;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE rep_inquiries ENABLE ROW LEVEL SECURITY;

-- COMPANIES: Anyone can read active companies, only super_admin can manage
CREATE POLICY "Anyone can view active companies"
  ON companies FOR SELECT
  USING (is_active = true);

CREATE POLICY "Super admins can manage companies"
  ON companies FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- PRODUCTS: Anyone can read active products, only super_admin can manage
CREATE POLICY "Anyone can view active products"
  ON products FOR SELECT
  USING (is_active = true);

CREATE POLICY "Super admins can manage products"
  ON products FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- COMPANY_CONTACTS: Company contacts can view their own records, super_admin can manage all
CREATE POLICY "Company contacts can view own record"
  ON company_contacts FOR SELECT
  USING (user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can manage company contacts"
  ON company_contacts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- REP_INQUIRIES: Users can create and view their own inquiries
-- Super admins can view all
CREATE POLICY "Users can create rep inquiries"
  ON rep_inquiries FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view own inquiries"
  ON rep_inquiries FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can manage rep inquiries"
  ON rep_inquiries FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- ============================================================================
-- SEED DATA (Optional - uncomment to add sample companies)
-- ============================================================================
-- INSERT INTO companies (name, website) VALUES
--   ('Stryker', 'https://www.stryker.com'),
--   ('Zimmer Biomet', 'https://www.zimmerbiomet.com'),
--   ('Smith & Nephew', 'https://www.smith-nephew.com'),
--   ('DePuy Synthes', 'https://www.depuysynthes.com'),
--   ('Medtronic', 'https://www.medtronic.com'),
--   ('Arthrex', 'https://www.arthrex.com')
-- ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES (run after migration to verify)
-- ============================================================================
-- SELECT * FROM companies;
-- SELECT * FROM products;
-- SELECT * FROM company_contacts;
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'resources' AND column_name IN ('company_id', 'product_id');
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'resource_suggestions' AND column_name IN ('company_name', 'product_name');
