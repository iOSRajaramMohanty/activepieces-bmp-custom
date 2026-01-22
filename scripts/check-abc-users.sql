-- Check ABC users in the database
SELECT 
    u.id,
    ui.email,
    ui."firstName",
    ui."lastName",
    u."organizationId",
    o.name as org_name
FROM "user" u
JOIN user_identity ui ON u."identityId" = ui.id
LEFT JOIN organization o ON u."organizationId" = o.id
WHERE LOWER(ui.email) LIKE '%abc%'
   OR ui."firstName" LIKE 'ABC%'
ORDER BY ui.email;
