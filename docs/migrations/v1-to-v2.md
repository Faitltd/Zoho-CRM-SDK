# Migration Guide: v1 → v2

## Executive Summary
v2 introduces a modular API (`crm.leads.create()`) with better TypeScript typing, runtime validation, and improved extensibility. Some v1 flat methods are removed or renamed.

## Is This Upgrade Worth It?
- Cleaner module-based API
- Improved error mapping and retry behavior
- Better typing and validation
- Future‑proof extensibility (builders, namespaces)

## Breaking Changes (Examples)

### 1) Flat lead methods → module methods

**v1**
```ts
const lead = await crm.createLead({ first_name: 'John', last_name: 'Doe' });
```

**v2**
```ts
const lead = await crm.leads.create({
  firstName: 'John',
  lastName: 'Doe'
});
```

### 2) Search now supports builder pattern

**v1**
```ts
const leads = await crm.searchLeads({ email: 'a@b.com' });
```

**v2**
```ts
const leads = await crm.leads
  .query()
  .where('Email', 'equals', 'a@b.com')
  .limit(20)
  .execute();
```

## Step‑by‑Step Upgrade Process

1. Upgrade the SDK version
2. Replace v1 flat methods with module methods
3. Convert snake_case payloads to camelCase
4. Validate against the new error classes
5. Run your tests and update mocks

## Estimated Migration Time
- Small codebase: 1–2 hours
- Medium codebase: 1–2 days
- Large codebase: 1–2 weeks

## Common Pitfalls
- Forgetting to update payload field names (snake_case → camelCase)
- Missing new module namespaces
- Custom error handling not updated to new error classes

## Where to Get Help
- GitHub Discussions
- Discord/Slack (migration channel)
- Paid migration support (enterprise)

## Tooling

### Migration CLI (codemod)
```bash
node scripts/migrate/cli.cjs v1-to-v2 ./src
```

### Validation scan
```bash
node scripts/migrate/validate.cjs ./src
```

## Compatibility Adapter (Optional)
Use the v1 adapter to migrate gradually:

```ts
import { ZohoCRM as ZohoCRMv2 } from '@yourcompany/zoho-crm';
import { createV1Adapter } from '@yourcompany/zoho-crm-v1-compat';

const crmV2 = new ZohoCRMv2(config);
const crm = createV1Adapter(crmV2);

await crm.createLead({ first_name: 'John', last_name: 'Doe' });
```
