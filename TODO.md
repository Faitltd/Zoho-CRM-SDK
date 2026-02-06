# Project TODO

1. Define final scope and MVP feature set (modules, auth, webhooks, bulk, rate limiting).
2. Verify API coverage vs Zoho docs and fill any gaps in modules/endpoints.
3. Finalize public API surface and ensure backwards compatibility rules.
4. Run and fix all unit, contract, chaos, and integration tests.
5. Add integration test env var docs and sample `.env.example`.
6. Ensure `package.json` exports and subpath exports are correct and tree-shakeable.
7. Build pipeline validation: `build`, `lint`, `test`, `contracts`, `bench`, `bundle-size`.
8. Verify CI workflows pass on Node 18/20/21.
9. Update README and docs for accuracy, add missing sections if any.
10. Review examples for correctness and API consistency, then run them.
11. Security review: token handling, log redaction, webhook signature verification.
12. Compliance review: audit logging, redaction rules, data lifecycle docs.
13. Performance review: benchmark baselines and budgets; update if needed.
14. Compatibility matrix: confirm supported Zoho API versions and known breaks.
15. Dependency audit and license review for all packages.
16. Add release process docs and final CHANGELOG entry for v0.1.0.
17. Tag a release and publish to npm (if desired).
18. Post-launch: open issues for roadmap items and solicit early feedback.
