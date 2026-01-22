-- Script to update organization_environment table for ABC organization
-- This creates Dev, Staging, and Production environment records

DO $$
DECLARE
    v_platform_id VARCHAR;
    v_org_id VARCHAR;
    v_dev_admin_id VARCHAR;
    v_staging_admin_id VARCHAR;
    v_production_admin_id VARCHAR;
    v_dev_project_id VARCHAR;
    v_staging_project_id VARCHAR;
    v_production_project_id VARCHAR;
    v_env_id VARCHAR;
    v_count INTEGER;
BEGIN
    -- Get platform ID (use the one that ABC users belong to)
    SELECT DISTINCT u."platformId" INTO v_platform_id 
    FROM "user" u
    JOIN user_identity ui ON u."identityId" = ui.id
    WHERE LOWER(ui.email) LIKE 'abc%@demo.com'
    LIMIT 1;
    
    IF v_platform_id IS NULL THEN
        -- Fallback to first platform
        SELECT id INTO v_platform_id FROM platform LIMIT 1;
    END IF;
    
    IF v_platform_id IS NULL THEN
        RAISE EXCEPTION 'No platform found';
    END IF;
    
    -- Get ABC organization ID
    SELECT id INTO v_org_id FROM organization WHERE name = 'ABC' AND "platformId" = v_platform_id;
    
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'ABC organization not found';
    END IF;
    
    RAISE NOTICE 'Using platform ID: %', v_platform_id;
    RAISE NOTICE 'Using ABC organization ID: %', v_org_id;
    
    -- Find Dev admin user and project
    SELECT u.id, p.id INTO v_dev_admin_id, v_dev_project_id
    FROM "user" u
    JOIN user_identity ui ON u."identityId" = ui.id
    LEFT JOIN project p ON p."ownerId" = u.id
    WHERE LOWER(TRIM(ui.email)) = 'abc-dev@demo.com'
      AND u."platformId" = v_platform_id
      AND u."platformRole" = 'ADMIN'
    LIMIT 1;
    
    IF v_dev_admin_id IS NULL THEN
        -- Try alternative: find by first name pattern
        SELECT u.id, p.id INTO v_dev_admin_id, v_dev_project_id
        FROM "user" u
        JOIN user_identity ui ON u."identityId" = ui.id
        LEFT JOIN project p ON p."ownerId" = u.id
        WHERE ui."firstName" = 'ABC' AND ui."lastName" = 'Dev Admin'
          AND u."platformId" = v_platform_id
          AND u."platformRole" = 'ADMIN'
        LIMIT 1;
    END IF;
    
    -- Find Staging admin user and project
    SELECT u.id, p.id INTO v_staging_admin_id, v_staging_project_id
    FROM "user" u
    JOIN user_identity ui ON u."identityId" = ui.id
    LEFT JOIN project p ON p."ownerId" = u.id
    WHERE LOWER(TRIM(ui.email)) = 'abc-staging@demo.com'
      AND u."platformId" = v_platform_id
      AND u."platformRole" = 'ADMIN'
    LIMIT 1;
    
    IF v_staging_admin_id IS NULL THEN
        SELECT u.id, p.id INTO v_staging_admin_id, v_staging_project_id
        FROM "user" u
        JOIN user_identity ui ON u."identityId" = ui.id
        LEFT JOIN project p ON p."ownerId" = u.id
        WHERE ui."firstName" = 'ABC' AND ui."lastName" = 'Staging Admin'
          AND u."platformId" = v_platform_id
          AND u."platformRole" = 'ADMIN'
        LIMIT 1;
    END IF;
    
    -- Find Production admin user and project
    SELECT u.id, p.id INTO v_production_admin_id, v_production_project_id
    FROM "user" u
    JOIN user_identity ui ON u."identityId" = ui.id
    LEFT JOIN project p ON p."ownerId" = u.id
    WHERE LOWER(TRIM(ui.email)) = 'abc-production@demo.com'
      AND u."platformId" = v_platform_id
      AND u."platformRole" = 'ADMIN'
    LIMIT 1;
    
    IF v_production_admin_id IS NULL THEN
        SELECT u.id, p.id INTO v_production_admin_id, v_production_project_id
        FROM "user" u
        JOIN user_identity ui ON u."identityId" = ui.id
        LEFT JOIN project p ON p."ownerId" = u.id
        WHERE ui."firstName" = 'ABC' AND ui."lastName" = 'Production Admin'
          AND u."platformId" = v_platform_id
          AND u."platformRole" = 'ADMIN'
        LIMIT 1;
    END IF;
    
    -- Create/Update Dev environment
    IF v_dev_admin_id IS NOT NULL THEN
        -- Check if Dev environment already exists
        SELECT id INTO v_env_id FROM organization_environment 
        WHERE "organizationId" = v_org_id AND environment = 'Dev';
        
        IF v_env_id IS NULL THEN
            v_env_id := SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', ''), 1, 21);
            INSERT INTO organization_environment (id, "organizationId", environment, "adminUserId", "projectId", "platformId", created, updated)
            VALUES (v_env_id, v_org_id, 'Dev', v_dev_admin_id, v_dev_project_id, v_platform_id, NOW(), NOW());
            RAISE NOTICE 'Created Dev environment with admin: %', v_dev_admin_id;
        ELSE
            UPDATE organization_environment
            SET "adminUserId" = v_dev_admin_id, "projectId" = v_dev_project_id, updated = NOW()
            WHERE id = v_env_id;
            RAISE NOTICE 'Updated Dev environment with admin: %', v_dev_admin_id;
        END IF;
    ELSE
        RAISE NOTICE '⚠️  Dev admin (abc-dev@demo.com) not found';
    END IF;
    
    -- Create/Update Staging environment
    IF v_staging_admin_id IS NOT NULL THEN
        SELECT id INTO v_env_id FROM organization_environment 
        WHERE "organizationId" = v_org_id AND environment = 'Staging';
        
        IF v_env_id IS NULL THEN
            v_env_id := SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', ''), 1, 21);
            INSERT INTO organization_environment (id, "organizationId", environment, "adminUserId", "projectId", "platformId", created, updated)
            VALUES (v_env_id, v_org_id, 'Staging', v_staging_admin_id, v_staging_project_id, v_platform_id, NOW(), NOW());
            RAISE NOTICE 'Created Staging environment with admin: %', v_staging_admin_id;
        ELSE
            UPDATE organization_environment
            SET "adminUserId" = v_staging_admin_id, "projectId" = v_staging_project_id, updated = NOW()
            WHERE id = v_env_id;
            RAISE NOTICE 'Updated Staging environment with admin: %', v_staging_admin_id;
        END IF;
    ELSE
        RAISE NOTICE '⚠️  Staging admin (abc-staging@demo.com) not found';
    END IF;
    
    -- Create/Update Production environment
    IF v_production_admin_id IS NOT NULL THEN
        SELECT id INTO v_env_id FROM organization_environment 
        WHERE "organizationId" = v_org_id AND environment = 'Production';
        
        IF v_env_id IS NULL THEN
            v_env_id := SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', ''), 1, 21);
            INSERT INTO organization_environment (id, "organizationId", environment, "adminUserId", "projectId", "platformId", created, updated)
            VALUES (v_env_id, v_org_id, 'Production', v_production_admin_id, v_production_project_id, v_platform_id, NOW(), NOW());
            RAISE NOTICE 'Created Production environment with admin: %', v_production_admin_id;
        ELSE
            UPDATE organization_environment
            SET "adminUserId" = v_production_admin_id, "projectId" = v_production_project_id, updated = NOW()
            WHERE id = v_env_id;
            RAISE NOTICE 'Updated Production environment with admin: %', v_production_admin_id;
        END IF;
    ELSE
        RAISE NOTICE '⚠️  Production admin (abc-production@demo.com) not found';
    END IF;
    
    -- Summary
    SELECT COUNT(*) INTO v_count FROM organization_environment WHERE "organizationId" = v_org_id;
    RAISE NOTICE '✅ ABC organization now has % environment(s) configured', v_count;
    
END $$;
