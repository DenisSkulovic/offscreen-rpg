# Evidence

Source implementation includes diagnostic.test.mjs (injected dependency/failure cases and real harmless subprocess tests). Run `node --test infra/verification/diagnostic.test.mjs infra/verification/verify.test.mjs` and then `pnpm infra:verify --suite diagnostic` on operator checkout. First operator run NOT-RUN. No claims of full-stack, storage mutation, service install, release or provider proof. Remaining smoke/full adapters: plan exact owned resource lifecycle, typed receipts, independent cleanup, mutation authorization, and scenario-specific oracles before enabling.
