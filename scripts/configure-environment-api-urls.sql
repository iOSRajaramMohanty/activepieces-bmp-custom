-- ================================================================
-- Configure Environment-Specific API URLs for ADA BMP
-- ================================================================
-- This script sets the ADA_BMP_API_URL metadata for each environment
-- ensuring strict environment isolation for token validation
--
-- Usage: psql -h localhost -U postgres -d activepieces -f configure-environment-api-urls.sql
-- ================================================================

\echo '🔧 Configuring Environment-Specific API URLs...'
\echo ''

-- Update Dev Environment
UPDATE organization_environment
SET metadata = jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    '{ADA_BMP_API_URL}',
    '"https://bmpapidev1.cl.bmp.ada-asia.my"'::jsonb
)
WHERE environment = 'Dev'
AND metadata->>'ADA_BMP_API_URL' IS NULL;

\echo '✅ Dev Environment: API URL set to https://bmpapidev1.cl.bmp.ada-asia.my'

-- Update Staging Environment
UPDATE organization_environment
SET metadata = jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    '{ADA_BMP_API_URL}',
    '"https://bmpapistgjkt.cl.bmp.ada-asia.my"'::jsonb
)
WHERE environment = 'Staging'
AND metadata->>'ADA_BMP_API_URL' IS NULL;

\echo '✅ Staging Environment: API URL set to https://bmpapistgjkt.cl.bmp.ada-asia.my'

-- Update Production Environment
UPDATE organization_environment
SET metadata = jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    '{ADA_BMP_API_URL}',
    '"https://bmpapiprod.cl.bmp.ada-asia.my"'::jsonb
)
WHERE environment = 'Production'
AND metadata->>'ADA_BMP_API_URL' IS NULL;

\echo '✅ Production Environment: API URL set to https://bmpapiprod.cl.bmp.ada-asia.my'
\echo ''

-- Display current configuration
\echo '📋 Current Environment API URLs:'
\echo '================================'
SELECT 
    org.name as organization,
    env.environment,
    env.metadata->>'ADA_BMP_API_URL' as api_url,
    CASE 
        WHEN env.metadata->>'ADA_BMP_API_URL' IS NOT NULL THEN '✅'
        ELSE '❌'
    END as configured
FROM organization_environment env
JOIN organization org ON env."organizationId" = org.id
ORDER BY org.name, 
    CASE env.environment 
        WHEN 'Dev' THEN 1 
        WHEN 'Staging' THEN 2 
        WHEN 'Production' THEN 3 
        ELSE 4 
    END;

\echo ''
\echo '✅ Environment API URL configuration complete!'
\echo ''
\echo '⚠️  IMPORTANT: Token validation will now be STRICT'
\echo '   - Dev tokens will ONLY work with Dev API URL'
\echo '   - Staging tokens will ONLY work with Staging API URL'
\echo '   - Production tokens will ONLY work with Production API URL'
\echo '   - Using a token from the wrong environment will result in validation failure'
