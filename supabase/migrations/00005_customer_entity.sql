-- ============================================================================
-- Migration 00005: Customer Entity (Bài #16) — Cross-Cutting
-- ============================================================================
-- Unified customer schema for B2C + B2B với discriminator pattern.
-- GDPR machinery: data inventory + retention support.
--
-- Tables:
-- - customers: unified entity (individual + organization)
-- - persons: individuals (separate from customer for B2B contacts)
-- - companies: organization records
-- - company_persons: M:N relation (employees)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- customers — unified customer entity (Bài #16)
-- ----------------------------------------------------------------------------
CREATE TABLE customers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  
  -- Discriminator (Bài #16 unified schema)
  customer_kind   text NOT NULL,                  -- 'individual' | 'organization'
  
  -- For individuals (NULL if organization)
  primary_person_id uuid,                         -- → persons.id
  
  -- For organizations (NULL if individual)
  primary_company_id uuid,                        -- → companies.id
  
  -- Universal fields
  display_name    text NOT NULL,
  primary_email   text,
  primary_locale  text,
  primary_timezone text,
  
  -- State machine (Bài #13 + Bài #16)
  state           text NOT NULL DEFAULT 'signed_up',
  state_since     timestamptz NOT NULL DEFAULT now(),
  state_payload   jsonb,
  state_version   text NOT NULL DEFAULT '1.0.0',
  
  -- Subscription/tier (project-specific, customize per business model)
  tier            text,                           -- 'free' | 'plus' | 'pro' | 'ultra' (Ritsu); customize per project
  tier_since      timestamptz,
  
  -- Lifecycle metadata
  activated_at    timestamptz,                    -- when first achieved value
  last_active_at  timestamptz,
  
  -- GDPR fields
  gdpr_consent_at timestamptz,
  data_region     text,                           -- 'eu' | 'us' | 'apac'
  marketing_consent boolean NOT NULL DEFAULT false,
  
  -- Soft delete (Bài #16 retention)
  deleted_at      timestamptz,
  deletion_reason text,
  
  CONSTRAINT customers_kind_valid CHECK (customer_kind IN ('individual', 'organization')),
  CONSTRAINT customers_state_valid CHECK (state IN ('signed_up', 'onboarding', 'activated', 'engaged', 'at_risk', 'churned', 'deleted'))
);

CREATE UNIQUE INDEX idx_customers_email_active ON customers (lower(primary_email)) WHERE deleted_at IS NULL AND primary_email IS NOT NULL;
CREATE INDEX idx_customers_state ON customers (state, state_since);
CREATE INDEX idx_customers_tier ON customers (tier) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_active ON customers (last_active_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_deleted ON customers (deleted_at) WHERE deleted_at IS NOT NULL;

CREATE TRIGGER trg_customers_state_since
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION ops.touch_state_since();

COMMENT ON TABLE customers IS 'Unified customer entity (Bài #16). customer_kind discriminator: individual or organization.';

-- ----------------------------------------------------------------------------
-- persons — individual records (Bài #16)
-- ----------------------------------------------------------------------------
CREATE TABLE persons (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  
  -- Identity (PII)
  full_name       text NOT NULL,
  email           text,
  phone           text,
  date_of_birth   date,                           -- for minor user verification (B2C EdTech)
  
  -- Demographics (optional, for analytics)
  locale          text,
  timezone        text,
  country         text,                            -- ISO 3166-1 alpha-2
  
  -- Linkage
  -- (Person can be customer themselves OR contact của organization customer)
  
  -- GDPR
  gdpr_consent_at timestamptz,
  data_region     text,
  
  -- Soft delete
  deleted_at      timestamptz,
  deletion_reason text
);

CREATE UNIQUE INDEX idx_persons_email_active ON persons (lower(email)) WHERE deleted_at IS NULL AND email IS NOT NULL;
CREATE INDEX idx_persons_country ON persons (country) WHERE deleted_at IS NULL;
CREATE INDEX idx_persons_dob ON persons (date_of_birth) WHERE date_of_birth IS NOT NULL;

COMMENT ON TABLE persons IS 'Individual records (Bài #16). Used cho both customers (individual kind) AND contacts at organization customers.';

-- ----------------------------------------------------------------------------
-- companies — organization records (Bài #16)
-- ----------------------------------------------------------------------------
CREATE TABLE companies (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  
  -- Identity
  legal_name      text NOT NULL,
  display_name    text,                           -- branded name if different
  domain          text,                           -- primary website
  
  -- Business details
  industry        text,
  size_band       text,                           -- 'small' | 'medium' | 'enterprise'
  founded_year    integer,
  hq_country      text,                            -- ISO 3166-1 alpha-2
  
  -- Compliance scope
  data_region     text,                            -- 'eu' | 'us' | 'apac'
  is_eu_subject   boolean NOT NULL DEFAULT false,  -- GDPR scope
  
  -- Soft delete
  deleted_at      timestamptz,
  deletion_reason text
);

CREATE UNIQUE INDEX idx_companies_domain_active ON companies (lower(domain)) WHERE deleted_at IS NULL AND domain IS NOT NULL;
CREATE INDEX idx_companies_industry ON companies (industry) WHERE deleted_at IS NULL;
CREATE INDEX idx_companies_size ON companies (size_band) WHERE deleted_at IS NULL;

COMMENT ON TABLE companies IS 'Organization records (Bài #16). For B2B customers + partner orgs.';

-- ----------------------------------------------------------------------------
-- company_persons — M:N relation (employees) 
-- ----------------------------------------------------------------------------
CREATE TABLE company_persons (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  person_id       uuid NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  
  -- Role at company
  role            text,                            -- 'CEO' | 'engineer' | 'admin' | etc.
  is_primary_contact boolean NOT NULL DEFAULT false,
  is_decision_maker boolean NOT NULL DEFAULT false,
  
  -- Lifecycle
  started_at      timestamptz,
  ended_at        timestamptz,                     -- NULL = currently employed
  
  UNIQUE (company_id, person_id)
);

CREATE INDEX idx_company_persons_company ON company_persons (company_id) WHERE ended_at IS NULL;
CREATE INDEX idx_company_persons_person ON company_persons (person_id) WHERE ended_at IS NULL;
CREATE INDEX idx_company_persons_primary ON company_persons (company_id) WHERE is_primary_contact = true AND ended_at IS NULL;

COMMENT ON TABLE company_persons IS 'M:N: persons working at companies (Bài #16). Track role + tenure.';

-- Add FK constraints back to customers
ALTER TABLE customers
  ADD CONSTRAINT customers_primary_person_fk FOREIGN KEY (primary_person_id) REFERENCES persons(id),
  ADD CONSTRAINT customers_primary_company_fk FOREIGN KEY (primary_company_id) REFERENCES companies(id),
  ADD CONSTRAINT customers_kind_consistency CHECK (
    (customer_kind = 'individual' AND primary_person_id IS NOT NULL AND primary_company_id IS NULL) OR
    (customer_kind = 'organization' AND primary_company_id IS NOT NULL)
  );
