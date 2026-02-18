
SELECT 
    f.id as form_id,
    f.title as form_title,
    f.organization_id,
    om.user_id,
    p.email,
    om.role
FROM forms f
JOIN organization_members om ON om.organization_id = f.organization_id
JOIN profiles p ON p.id = om.user_id
WHERE f.id = '38692b0c-65bb-47d8-98e0-1aa4355684ef'
AND om.user_id = '3ba70f9c-921b-4cc9-9421-8e04ecc992ed';
