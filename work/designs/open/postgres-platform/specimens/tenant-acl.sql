-- DESIGN ONLY: execute from maintenance DB after identity/closed-state proof.
BEGIN;
REVOKE CONNECT, TEMPORARY ON DATABASE dev_42 FROM PUBLIC;
GRANT CONNECT ON DATABASE dev_42 TO dev_42_mig, dev_42_run;
COMMIT;
