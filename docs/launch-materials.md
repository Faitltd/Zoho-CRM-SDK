# Launch Materials

## Show HN Draft
**Title:** Show HN: A modern TypeScript Zoho CRM SDK (0.x, focused on DX)

**Body (draft):**
Hi HN!

I built a modern TypeScript SDK for Zoho CRM because the existing options feel dated, are hard to tree‑shake, and don't provide strict types or ergonomic modules. This SDK focuses on:

- Strong typing + runtime validation for API payloads
- Ergonomic CRUD modules (Leads/Contacts/Deals) + Webhooks/Bulk
- Auth refresh coalescing and retry/backoff logic
- Optional rate limiting, metrics hooks, and structured logging
- ESM/CJS builds with subpath exports

It's currently in 0.x while I validate the API and gather feedback. I'm looking for real‑world users to try it and point out gaps before 1.0.

Repo: (link)
Docs: (link)

Questions/feedback welcome.

## Reddit Draft (r/node or r/webdev)
**Title:** I built a modern TypeScript SDK for Zoho CRM — looking for feedback

**Body (draft):**
I just released a 0.x TypeScript SDK for Zoho CRM with strong types, OAuth refresh handling, retries, and modules for leads/contacts/deals + webhooks/bulk. It’s ESM/CJS, tree‑shakeable, and focused on developer experience.

If you’ve worked with Zoho CRM APIs, I’d love feedback on:
- Missing endpoints or modules
- Pain points with existing SDKs
- Features you’d expect before 1.0

Repo: (link)
Docs: (link)

## Dev.to / Blog Outline
**Title:** Building a modern Zoho CRM SDK in TypeScript (and why)

**Outline:**
1. The problem with existing Zoho SDKs (DX, typing, tree‑shaking, maintenance)
2. Goals for this SDK (strict types, modular, observability, perf)
3. Architecture overview (auth, http, modules, types)
4. Example usage (CRUD, bulk, webhooks)
5. Lessons learned (API quirks, retry behavior, validation tradeoffs)
6. What’s next (modules, tooling, community feedback)

## Launch Checklist (Quick)
- [ ] Update links in this doc (repo + docs)
- [ ] Confirm npm package name + version
- [ ] Publish to npm
- [ ] Post to HN + Reddit
- [ ] Publish blog post
- [ ] Announce in GitHub Discussions
