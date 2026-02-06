Contract fixtures are "known good" request/response pairs for the SDK.

- Update `request` and `expected` by running:
  - `node scripts/update-contract-fixtures.ts --write`
- Use the pre-release validator against a Zoho sandbox:
  - `node scripts/validate-contracts.ts`

Notes:
- Fixtures should avoid secrets.
- `response` should mirror Zoho API response shapes.
