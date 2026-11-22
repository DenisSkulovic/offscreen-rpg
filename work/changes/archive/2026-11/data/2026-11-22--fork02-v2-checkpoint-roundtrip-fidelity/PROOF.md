# FORK02 | Full-contract proof requirements

Planning is source inspection, **no tests or kind calls performed**.

| Case | Expected success | Discriminating failure |
| --- | --- | --- |
| SQL JSON null distinct from SQL NULL | `game_offer.plans='null'::jsonb` survives NOT NULL, reads JS null; `IS NULL=false`, `jsonb_typeof='null'` | SQL NULL violates NOT NULL |
| Current scripted scene1 | mapped checkpoint offer `plans:null` round-trips with one game_offer row, all fictional fields equal | [] must differ from null in strict assertion |
| Genuine empty plans | `plans:{version:1,body:[]}` preserved | [] must not be normalized to null |
| Open nonempty plans | exact mapped `plans:{version:1,body:[...]}` preserved | schema parse must not strip or rewrite unknown allowed payload |
| Offer metadata/tree | id, source, meaning, and nested tree exact | removal of source or extra valid nested data causes test FAIL |
| Selected + none authorization | FORK01 historical projections remain round-trip exact | invalid wrapped access rejected |
| Active scene complete fields | tests cover all `COMPARE_FIELDS` including acceptedActivityPlan, action ID, conditions, activities, obligations and action | later-field mismatch is reported even if offer fails |
| Historical fork security | real `createStories().fork` commits one child, parent rev/checkpoint untouched, child independent | wrong owner/hash, malformed v2, duplicate conflicting ID -> no unauthorized child |
| Repeatability | same fork request follows established idempotence policy | no second duplicate child/effect |
| Provider-free operator | no production provider calls in disposable test | no externally funded traffic or paid-mode fallback |
| Live TURN03 | **not part of FORK02 acceptance** | no false claim from mock or disposable lab |

**Critical evidence warning:** TESTLAB/FORK01 fixture PASS is not representative of real scene1 null-plans case. A full diagnostic must evaluate the reconstructed mapped child's *all* expected fields against real SQL readback before returning to kind. Any recovery-matrix outage/restart belongs to TURN03 and is separately authorized.
