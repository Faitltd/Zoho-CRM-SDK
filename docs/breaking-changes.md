# Breaking Changes Policy & Process

Breaking changes are inevitable. This SDK treats them as a high-trust contract with users and applies strict processes before any removal or incompatible behavior change.

## Staged Deprecation Process

Version N.0.0: Feature works normally
Version N.x.0: Deprecation announced in docs, no code changes yet
Version N+1.0.0: Runtime warnings added, feature still works
Version N+2.0.0: Feature removed (or behind feature flag)

## Deprecation Warnings

Runtime warnings are emitted once per process by default and can be suppressed.

- Env var: `ZOHO_CRM_SDK_SUPPRESS_DEPRECATION_WARNINGS=1`
- Config: `deprecations: { enabled: false }`

Warnings include what is deprecated, why, alternative, and the removal target version.

Example usage in code:

```ts
import { warnDeprecated } from '../deprecation';

/** @deprecated Use `newMethod()` instead. */
oldMethod() {
  warnDeprecated({
    feature: 'ZohoCRM.oldMethod',
    message: 'This method will be removed in the next major release.',
    alternative: 'ZohoCRM.newMethod',
    removalVersion: '2.0.0',
    reason: 'Replaced by a safer auth flow.'
  });
  return this.newMethod();
}
```

## Feature Flags for Early Access

Breaking changes can ship behind feature flags for early feedback:

```ts
const crm = new ZohoCRM({
  auth,
  region: 'US',
  experimentalFeatures: {
    newAuthFlow: true
  }
});
```

## Impact Analyzer

Use the built-in scanner to detect usage of deprecated APIs in downstream codebases (with permission):

```bash
node scripts/deprecation-analyzer.cjs --path /path/to/your/app --format json --out deprecations-report.json
```

The scanner is configured via `scripts/deprecations.json` and produces a summary plus file/line findings.

## Communication Plan

Announcement channels:
- GitHub Discussions
- Blog post / project website
- npm subscribers (if available)
- Discord/Slack
- Social channels (Twitter/X, Reddit)

Timing guidance:
- Major breaking changes: 6+ months notice
- Moderate breaking changes: 3+ months notice

Each announcement includes:
- What changed and why
- Timeline and removal version
- Migration guide link
- Support/help options

## Breaking Changes Log

| Version | Change | Impact | Migration | Notes |
|---------|--------|--------|-----------|-------|
| None yet | — | — | — | — |

## Proposal Template

Use `docs/breaking-change-proposal-template.md` for new proposals.
