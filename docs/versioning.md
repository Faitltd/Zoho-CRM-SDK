# Semantic Versioning Policy

This SDK follows strict Semantic Versioning (SemVer), including during the 0.x phase. Breaking changes still require a MAJOR bump even before 1.0.0.

## Version Bump Rules

**MAJOR (breaking changes)**
- Removing or renaming public methods/properties/types
- Changing method signatures (parameters, return types)
- Removing support for Node.js versions
- Changing error class hierarchies
- Removing or renaming modules
- Changing default behaviors that users rely on

**MINOR (backward-compatible additions)**
- Adding new modules (Accounts, Opportunities, etc.)
- Adding new methods to existing modules
- Adding new optional parameters to methods
- Adding new optional configuration options
- Adding new error classes (without changing existing ones)
- Adding new utility functions
- Improving performance without changing behavior

**PATCH (bug fixes)**
- Fixing bugs that don't change the public API
- Fixing incorrect TypeScript types
- Updating documentation
- Updating dependencies for security
- Internal refactoring with no external changes

## Automated Enforcement

We use API surface snapshots to detect breaking changes.

- `npm run api:extract` generates the current API snapshot.
- `npm run api:baseline` updates the baseline when a release is intended.
- `npm run semver:check` compares the snapshot against the baseline and validates the version bump.

Rules enforced in CI:
- Breaking change without MAJOR bump → fail.
- New public API additions without MINOR or MAJOR bump → fail.
- API changed but `package.json` version unchanged → fail.

## Pre-Release Workflow

Use pre-release versions for beta testing:

```bash
npm version premajor --preid=beta
npm version preminor --preid=beta
npm version prepatch --preid=beta
npm publish --tag beta
```

Pre-release policy:
- Minimum 1 week beta testing.
- No known regression or crash bugs in beta.
- Contract tests, chaos tests, and integration tests pass.
- Upgrade notes provided if there are breaking changes.

## Changelog Automation

We use Conventional Commits with `standard-version` to generate `CHANGELOG.md`.

Examples:
- `feat: add Accounts module`
- `fix: correct lead pagination`
- `docs: update auth guide`
- `chore: bump dependencies`
- `feat!: remove deprecated webhook fields`

Generate release notes:

```bash
npm run release
```

## Compatibility Matrix

See `docs/compatibility-matrix.md` for SDK ↔ Zoho API ↔ Node.js ↔ TypeScript compatibility.

## Support Policy

- Supported majors: current + previous major for security fixes.
- Support window: 12 months after the next major release.
- Deprecations: marked with `@deprecated` and documented in the changelog.
- Removal timeline: deprecated APIs remain for 2 major releases before removal.

## Versioned Documentation

- Each MAJOR version has its own documentation section.
- Docs must display the version clearly and link to migration guides.
- Migration guides live in `docs/migrations/` and are referenced in the release notes.
