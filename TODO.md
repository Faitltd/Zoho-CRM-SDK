# Project TODO (Prioritized)

## P0 — Start Now (Release Blockers)
- [x] Tooling & CI baseline: add build/lint/test scripts + configs (tsup, vitest, biome) and confirm workflows run.
- [x] Audit core implementation vs Prompts 4–9 (auth, HTTP client, CRUD, types, errors) and fill any gaps.
- [~] Run unit tests; fix failures; confirm coverage targets.
- [ ] Increase coverage to >=80% (current ~65% overall, ~60% in src).
- [x] Verify package exports and ESM/CJS build output.
- [x] Update README/docs quickstart to match current API; add `.env.example`.
- [x] Security basics: redaction, HTTPS enforcement, webhook signature verification.

## P1 — Pre-release Polish
- [ ] Market validation (Prompts 1–2): searches, 5–10 interviews, landing page with 50+ signups, decision gate.
- [ ] Contract tests + chaos tests + performance baselines (Prompts 13, A1–A3, B1–B2).
- [ ] Documentation pack: README, docs/, TypeDoc, examples (Prompts 14–15).
- [ ] npm publish readiness (Prompt 16): pack/install test, engines, exports.
- [ ] Launch materials + community setup (Prompt 17, F3).

## P2 — Post-release / Iteration
- [ ] Webhooks module (Prompt 11) and Bulk operations (Prompt 12).
- [ ] Advanced performance + bundle size optimization (Prompts B1–B3).
- [ ] Security hardening + compliance tooling (Prompts C1–C2).
- [ ] Plugin system + framework integrations (Prompts F1–F2).
- [ ] Monetization + community roadmap (Prompts 18, F3).

## Execution (Status)
- [ ] Choose execution approach (manual / AI-assisted / hybrid).
- [ ] Confirm repo scaffolding from Prompt 4 (tsconfig, tsup, vitest, biome).
- [ ] Ensure CI/CD from Prompt 4 is in place and green.
- [ ] Build MVP: auth, HTTP, Leads CRUD, types, errors.
- [ ] Time estimate: 40–80 hours for full implementation.

## Validation & Testing
- [ ] Market validation: searches, interviews, landing page signups, decision gate.
- [ ] Unit tests (80%+), integration tests, contract tests, chaos tests.
- [ ] Performance benchmarks, memory leak testing, bundle size checks.
- [ ] Time estimate: 20–40 hours.

## Documentation
- [ ] README (Prompt 14).
- [ ] TypeDoc setup (Prompt 14).
- [ ] Usage guides in docs/ (Prompt 14).
- [ ] Example scripts (Prompt 15).
- [ ] Migration guides plan (Prompt H3).
- [ ] Time estimate: 10–20 hours.

## Launch Preparation
- [ ] Verify exports, npm pack/install, publish to npm (Prompt 16).
- [ ] Launch materials: Show HN, Reddit, Dev.to (Prompt 17).
- [ ] Issue templates + CONTRIBUTING (Prompt 17).
- [ ] Community setup (Discord/Slack, GitHub Discussions, social).
- [ ] Time estimate: 5–10 hours.

## Advanced Features (Optional for v1)
- [ ] Webhooks (Prompt 11).
- [ ] Bulk operations (Prompt 12).
- [ ] Advanced testing (Prompts A1–A3).
- [ ] Performance optimization (Prompts B1–B3).
- [ ] Security hardening (Prompts C1–C2).
- [ ] Advanced DX features (Prompts D1–D2).
- [ ] Plugin system (Prompt F1) — v2+.
- [ ] Framework integrations (Prompt F2) — v2+.
- [ ] Time estimate: 40–80+ hours (ongoing).

## Ongoing Operations
- [ ] Maintenance cadence + issue triage (Prompt 19).
- [ ] Monitoring & metrics (Prompt E2).
- [ ] Monetization setup (Prompt 18).
- [ ] Time estimate: 5–10 hours/month.

## Recommended Next Steps (Priority Order)
### Phase 0: Validate Before Building (1–2 weeks)
1. Run market research (Prompts 1–2).
2. Talk to 5–10 Zoho developers.
3. Set up landing page.
4. Decision: if <25 signups in 2 weeks, reconsider.

### Phase 1: MVP (3–4 weeks)
1. Initialize project (Prompt 4).
2. Build auth (Prompt 5), HTTP client (Prompt 6), Leads CRUD (Prompt 7).
3. Basic types (Prompt 8), error handling (Prompt 9).
4. Unit tests (Prompt 13).
5. README quickstart (Prompt 14).
6. Deliverable: v0.1.0-alpha with Leads CRUD.

### Phase 2: Polish for v1.0 (2–3 weeks)
1. Add Contacts/Deals modules.
2. Full test coverage.
3. Complete documentation + examples (Prompt 15).
4. Basic performance + security review.
5. Deliverable: v1.0.0 production-ready core CRUD.

### Phase 3: Launch (1 week)
1. Publish to npm (Prompt 16).
2. Launch on HN, Reddit, Dev.to (Prompt 17).
3. Set up community channels.
4. Deliverable: public, documented, supported v1.0.0.

### Phase 4: Iterate (ongoing)
1. Webhooks (Prompt 11), Bulk ops (Prompt 12).
2. Advanced features based on user requests.
3. Framework integrations (Prompt F2).
4. Monetization (Prompt 18).

## Status Summary
- Planning & Documentation: Complete (prompts drafted)
- Market Validation: Not started
- Core Implementation: In progress
- Testing: In progress
- Documentation: In progress
- Launch Prep: Not started
- Community: Not started
- Overall Completion: ~30% (core + tests in progress)
