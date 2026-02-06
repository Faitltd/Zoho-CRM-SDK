# Compatibility Matrix

This document tracks SDK compatibility with Zoho CRM API versions and notable changes.

## Supported Versions

| SDK Version | Zoho API v2 | Zoho API v8 | Notes |
|-------------|-------------|-------------|-------|
| 0.1.x       | Yes         | Partial     | CRUD v2, Webhooks/Bulk v8 |
| 0.2.x       | Yes         | Partial     | Add modules, expand types |

## Known Zoho API Changes

| Date | Zoho Change | Impact | SDK Version | Mitigation |
|------|-------------|--------|-------------|------------|
| 2026-02-06 | Example: field renamed in Leads | Response parsing | 0.1.x | Added fallback mapping |

## Deprecations

| SDK Version | API | Deprecated Feature | Removal Target |
|-------------|-----|-------------------|----------------|
| 0.1.x       | v2  | Example endpoint  | 0.3.0 |

## Notes

- “Partial” indicates that only some endpoints are covered in that API version.
- When Zoho introduces breaking changes, contract fixtures will be updated and release notes will describe mitigation.
