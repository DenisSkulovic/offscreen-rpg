-- DESIGN ONLY: fresh dev baseline candidate, not approved or executed.
-- Verify CNPG internal access and bootstrap order before adoption.
BEGIN;
REVOKE CONNECT, TEMPORARY ON DATABASE postgres FROM PUBLIC;
REVOKE CONNECT, TEMPORARY ON DATABASE dev FROM PUBLIC;
COMMIT;
