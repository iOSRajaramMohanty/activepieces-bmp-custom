-- Script to add ABC organization and link ABC users
-- Run this using: psql $DATABASE_URL -f scripts/add-abc-organization.sql
-- Or: psql -h localhost -U postgres -d activepieces -f scripts/add-abc-organization.sql

-- First, get the platform ID (assuming there's one platform)
DO $$
DECLARE
    v_platform_id VARCHAR;
    v_org_id VARCHAR;
    v_user_count INTEGER;
BEGIN
    -- Get the first platform ID
    SELECT id INTO v_platform_id FROM platform LIMIT 1;
    
    IF v_platform_id IS NULL THEN
        RAISE EXCEPTION 'No platform found';
    END IF;
    
    RAISE NOTICE 'Using platform ID: %', v_platform_id;
    
    -- Check if ABC organization already exists
    SELECT id INTO v_org_id FROM organization WHERE name = 'ABC' AND "platformId" = v_platform_id;
    
    IF v_org_id IS NULL THEN
        -- Create ABC organization
        -- Generate ID in apId format (21 characters)
        v_org_id := SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', ''), 1, 21);
        INSERT INTO organization (id, name, "platformId", metadata, created, updated)
        VALUES (v_org_id, 'ABC', v_platform_id, '{}', NOW(), NOW());
        RAISE NOTICE 'Created organization ABC with ID: %', v_org_id;
    ELSE
        RAISE NOTICE 'Organization ABC already exists with ID: %', v_org_id;
    END IF;
    
    -- Update users with emails matching abc patterns (with hyphen, underscore, or just abc@)
    UPDATE "user" u
    SET "organizationId" = v_org_id
    FROM user_identity ui
    WHERE u."identityId" = ui.id
      AND (LOWER(ui.email) LIKE 'abc-dev@%' 
           OR LOWER(ui.email) LIKE 'abc-staging@%' 
           OR LOWER(ui.email) LIKE 'abc-production@%'
           OR LOWER(ui.email) LIKE 'abc_op@%'
           OR LOWER(ui.email) LIKE 'abc_operator@%'
           OR LOWER(ui.email) LIKE 'abc_member@%'
           OR LOWER(ui.email) = 'abc@demo.com')
      AND u."platformId" = v_platform_id
      AND (u."organizationId" IS NULL OR u."organizationId" != v_org_id);
    
    GET DIAGNOSTICS v_user_count = ROW_COUNT;
    RAISE NOTICE 'Updated % users with ABC organization (by email)', v_user_count;
    
    -- Also update users based on first name pattern (ABC Dev Admin, ABC Production Admin, etc.)
    UPDATE "user" u
    SET "organizationId" = v_org_id
    FROM user_identity ui
    WHERE u."identityId" = ui.id
      AND (ui."firstName" ~ '^ABC\s+(Dev|Staging|Production)'
           OR ui."firstName" = 'ABC'
           OR (ui."firstName" = 'ABC Dev' AND ui."lastName" LIKE '%Operator%'))
      AND u."platformId" = v_platform_id
      AND (u."organizationId" IS NULL OR u."organizationId" != v_org_id);
    
    GET DIAGNOSTICS v_user_count = ROW_COUNT;
    RAISE NOTICE 'Updated % additional users based on name pattern', v_user_count;
    
    RAISE NOTICE '✅ ABC organization setup complete!';
END $$;
