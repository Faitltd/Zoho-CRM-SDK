# Failure Modes & Recovery

This document lists known failure modes and how the SDK responds.

## Network Errors (timeouts, resets)
- **Cause**: Connection reset, DNS failure, timeout.
- **SDK behavior**: Throws `RequestError` with message `Network error while calling Zoho CRM.`
- **User action**: Retry or increase timeouts; check network connectivity.

## Partial or Malformed JSON
- **Cause**: Truncated response or proxy issues.
- **SDK behavior**: Returns `{ message: "<raw text>" }` for successful responses, or `RequestError` for non-2xx.
- **User action**: Retry. Capture logs for diagnostics.

## 5xx Intermittent Errors
- **Cause**: Zoho outage or transient failure.
- **SDK behavior**: Retries with exponential backoff (configurable). Throws `RequestError` if retries exhausted.
- **User action**: Check Zoho status and adjust retry settings if needed.

## Rate Limits (429)
- **Cause**: Too many requests.
- **SDK behavior**: Throws `RateLimitError` with optional `retryAfter`.
- **User action**: Honor `retryAfter` and add client-side rate limiting.

## OAuth Refresh Failures
- **Cause**: Invalid refresh token, revoked credentials.
- **SDK behavior**: Throws `AuthError` with OAuth error details.
- **User action**: Re-authenticate, rotate refresh token.

## Missing/Unexpected Fields
- **Cause**: Zoho API changes or custom org fields.
- **SDK behavior**: Unrecognized fields are tolerated via index signatures.
- **User action**: Update field mappings or types as needed.

## Schema Mismatch (Runtime Validation)
- **Cause**: Response shape no longer matches SDK schemas.
- **SDK behavior**: Throws `SchemaMismatchError` with field path and expected vs actual type.
- **User action**: Update SDK, disable validation, or adjust custom field usage.

## Client Closed / Queue Limits
- **Cause**: SDK instance closed or rate limiter queue exceeds limits.
- **SDK behavior**: Throws `ClientClosedError` or `ResourceLimitError`.
- **User action**: Ensure `crm.close()` is only called on shutdown; increase queue limits if necessary.
