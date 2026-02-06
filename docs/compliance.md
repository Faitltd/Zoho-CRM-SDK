# Compliance Guide

This SDK is a client-side library. You are the data controller for the information you send to Zoho CRM. The SDK is
designed to minimize data retention and make compliance easier, but it does not replace your legal obligations.

## Data Handling

### Data Processed
- Inputs: record data you submit (Leads, Contacts, Deals), query parameters, and webhook payloads you receive.
- Metadata: request timing, HTTP status codes, and endpoints for telemetry/audit (if enabled).

### Data Stored
- Access tokens are cached in memory for reuse.
- No API responses are cached.
- Rate limiter queues may temporarily hold pending request functions (no payloads persisted).
- Audit logs (if enabled) are written to the destination you configure.

### Data Transmitted
- All API calls are sent to Zoho CRM over HTTPS.
- OAuth access tokens are sent in the `Authorization` header.

### Retention
- Token cache is in-memory only and cleared on `crm.close()` or `auth.clearTokenCache()`.
- Audit log retention is controlled by your log destination.

## Log Redaction
SDK debug logs automatically redact common secret fields. You can customize redaction rules:

```ts
const crm = new ZohoCRM({
  auth,
  region: 'US',
  logRedaction: {
    redactFields: ['email', 'phone'],
    maskFields: ['ip'],
    hashFields: ['userId']
  }
});
```

## Audit Logging
Enable structured audit logging without PII:

```ts
import { ZohoCRM } from '@yourcompany/zoho-crm';

const crm = new ZohoCRM({
  auth,
  region: 'US',
  audit: {
    enabled: true,
    contextProvider: () => ({ userId: 'user-123', accountId: 'acct-9' })
  }
});
```

Audit events include timestamp, method, path, status, duration, and user context (redacted by default).
The default audit logger emits JSON lines (one JSON object per log entry).
You can use AsyncLocalStorage to set per-request context in Node services.

You can customize redaction rules:

```ts
const crm = new ZohoCRM({
  auth,
  region: 'US',
  audit: {
    enabled: true,
    redact: {
      redactFields: ['email', 'phone', 'ssn'],
      maskFields: ['ip'],
      hashFields: ['userId']
    }
  }
});
```

Log to a file or stream:

```ts
import { createWriteStream } from 'node:fs';

const auditStream = createWriteStream('audit.log', { flags: 'a' });
const crm = new ZohoCRM({
  auth,
  region: 'US',
  audit: { enabled: true, destination: auditStream }
});
```

## Data Minimization
- Use field selection to avoid over-fetching:
  - `crm.leads.list({ fields: ['Last_Name', 'Email'] })`
  - `crm.leads.get(id, { fields: ['Last_Name'] })`
- Use criteria and field lists for bulk read operations.
- Only request fields you actually need.

## Deletion and Cleanup
- Clear cached tokens: `auth.clearTokenCache()` or `crm.clearCachedState()`.
- Remove data from Zoho via standard module deletes.

## GDPR Considerations
This SDK helps you implement GDPR principles:
- Data minimization via field selection.
- Audit logs for accountability.
- In-memory only token storage.

For Data Processing Agreements (DPAs), you are the data controller and Zoho is typically the processor. Consult legal
counsel to ensure your DPA aligns with your processing activities.

## Data Subject Rights (Right to Erasure)
Implement erasure by deleting CRM records in Zoho. For example:

```ts
await crm.contacts.delete(contactId);
```

Ensure your application also deletes any replicated data outside Zoho.
