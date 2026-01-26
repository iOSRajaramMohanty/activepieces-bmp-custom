-- ============================================
-- Organization Metadata Configuration Script
-- ============================================
-- This script helps configure environment-specific
-- metadata for organizations via direct database access
-- ============================================
--
-- Usage:
--   psql $DATABASE_URL -f scripts/configure-organization-metadata.sql
--   Or: psql -h localhost -U postgres -d activepieces -f scripts/configure-organization-metadata.sql
--
-- ============================================

-- ============================================
-- CONFIGURATION SECTION
-- ============================================
-- Modify these variables for your organization

\set org_name 'ABC'
\set environment 'staging'  -- Options: dev, staging, production

-- ADA BMP Configuration
\set ada_api_url_dev 'https://bmpapidev1.cl.bmp.ada-asia.my'
\set ada_api_url_staging 'https://bmpapistg.cl.bmp.ada-asia.my'
\set ada_api_url_production 'https://bmpapiprod.cl.bmp.ada-asia.my'
\set ada_timeout '30000'
\set ada_debug 'false'

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to safely update metadata (preserves existing fields)
CREATE OR REPLACE FUNCTION update_organization_metadata(
    p_org_name TEXT,
    p_key TEXT,
    p_value JSONB
) RETURNS VOID AS $$
BEGIN
    UPDATE organization
    SET metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        ARRAY[p_key],
        p_value
    ),
    updated = NOW()
    WHERE name = p_org_name;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Organization "%" not found', p_org_name;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- MAIN CONFIGURATION
-- ============================================

DO $$
DECLARE
    v_org_id VARCHAR;
    v_api_url TEXT;
    v_metadata JSONB;
BEGIN
    -- Get organization ID
    SELECT id INTO v_org_id
    FROM organization
    WHERE name = :'org_name';
    
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Organization "%" not found', :'org_name';
    END IF;
    
    RAISE NOTICE 'Found organization: % (ID: %)', :'org_name', v_org_id;
    
    -- Determine API URL based on environment
    CASE :'environment'
        WHEN 'dev' THEN
            v_api_url := :'ada_api_url_dev';
        WHEN 'staging' THEN
            v_api_url := :'ada_api_url_staging';
        WHEN 'production' THEN
            v_api_url := :'ada_api_url_production';
        ELSE
            RAISE EXCEPTION 'Invalid environment: %. Must be: dev, staging, or production', :'environment';
    END CASE;
    
    RAISE NOTICE 'Configuring for environment: %', :'environment';
    RAISE NOTICE 'Using API URL: %', v_api_url;
    
    -- Get current metadata (preserve existing fields)
    SELECT COALESCE(metadata, '{}'::jsonb) INTO v_metadata
    FROM organization
    WHERE id = v_org_id;
    
    -- Update metadata with new values
    v_metadata := jsonb_set(v_metadata, '{ADA_BMP_API_URL}', to_jsonb(v_api_url));
    v_metadata := jsonb_set(v_metadata, '{ADA_BMP_TIMEOUT}', to_jsonb(:'ada_timeout'::integer));
    v_metadata := jsonb_set(v_metadata, '{ADA_BMP_DEBUG}', to_jsonb(:'ada_debug'::boolean));
    
    -- Save updated metadata
    UPDATE organization
    SET metadata = v_metadata,
        updated = NOW()
    WHERE id = v_org_id;
    
    RAISE NOTICE '✅ Metadata updated successfully!';
    RAISE NOTICE '';
    RAISE NOTICE 'Updated metadata:';
    RAISE NOTICE '  ADA_BMP_API_URL: %', v_metadata->>'ADA_BMP_API_URL';
    RAISE NOTICE '  ADA_BMP_TIMEOUT: %', v_metadata->>'ADA_BMP_TIMEOUT';
    RAISE NOTICE '  ADA_BMP_DEBUG: %', v_metadata->>'ADA_BMP_DEBUG';
    
END $$;

-- ============================================
-- VERIFICATION
-- ============================================

-- Display current metadata
SELECT 
    id,
    name,
    metadata,
    metadata->>'ADA_BMP_API_URL' as ada_bmp_api_url,
    metadata->>'ADA_BMP_TIMEOUT' as ada_bmp_timeout,
    metadata->>'ADA_BMP_DEBUG' as ada_bmp_debug,
    updated
FROM organization
WHERE name = :'org_name';

-- ============================================
-- USEFUL QUERIES
-- ============================================

-- View all organizations and their metadata
-- SELECT id, name, metadata FROM organization ORDER BY name;

-- View specific metadata field for all organizations
-- SELECT name, metadata->>'ADA_BMP_API_URL' as api_url FROM organization;

-- Reset metadata to empty (use with caution!)
-- UPDATE organization SET metadata = '{}'::jsonb WHERE name = 'ABC';

-- Update only API URL (preserves other fields)
-- UPDATE organization 
-- SET metadata = jsonb_set(
--     COALESCE(metadata, '{}'::jsonb),
--     '{ADA_BMP_API_URL}',
--     '"https://bmpapistg.cl.bmp.ada-asia.my"'
-- )
-- WHERE name = 'ABC';

-- ============================================
-- CLEANUP (optional)
-- ============================================

-- Drop helper function if no longer needed
-- DROP FUNCTION IF EXISTS update_organization_metadata(TEXT, TEXT, JSONB);
