# Stability Levels

This SDK uses explicit stability levels to balance innovation with reliability.

## Levels

### Stable (production-ready)
- Core auth + HTTP client
- Leads, Contacts, Deals modules
- Error classes
- Core type definitions

Guarantees:
- Strict SemVer
- Breaking changes only in MAJOR releases
- Extensive tests and documentation

### Beta (near stable)
- Webhooks module
- Bulk operations
- Advanced features

Guarantees:
- Minor breaking changes are possible in MINOR releases
- Clear documentation labeling
- Most tests in place

### Alpha (experimental)
- New modules and features under active development

Guarantees:
- Breaking changes can happen anytime
- Opt-in only (feature flags or experimental import)
- Limited documentation

### Deprecated (going away)
- Still works, but emits warnings
- Clear removal timeline
- Migration guide available

## Opt-in Experimental Imports

Stable usage:

```ts
import { ZohoCRM } from '@yourcompany/zoho-crm';
```

Experimental usage:

```ts
import { ExperimentalFeatures } from '@yourcompany/zoho-crm/experimental';

const crm = new ZohoCRM({ auth, region: 'US' });
const experimental = new ExperimentalFeatures(crm);
await experimental.aiScoring.scoreLeadWithAI('123');
```

## Feature Graduation Process

Alpha → Beta requires:
- Minimum 80% test coverage for the feature area
- Basic documentation in `docs/`
- Positive feedback from early adopters

Beta → Stable requires:
- 95%+ test coverage for the feature area
- Full documentation and examples
- 3+ months in Beta with no critical issues

## Deprecation Warnings

Deprecated APIs emit runtime warnings once per process by default. Suppress via:

- Env: `ZOHO_CRM_SDK_SUPPRESS_DEPRECATION_WARNINGS=1`
- Config: `deprecations: { enabled: false }`

## Telemetry (Opt-in)

Experimental features can emit anonymous usage telemetry when you opt in:

```ts
const crm = new ZohoCRM({
  auth,
  region: 'US',
  telemetry: {
    track: (event) => {
      console.log('telemetry', event.name, event.properties);
    }
  }
});
```

Telemetry should never include PII or secrets.
