import { describe, expect, it } from 'vitest';
import { createJsonAuditLogger, normalizeAudit, redactAuditContext } from '../../src/audit';

describe('audit helpers', () => {
  it('creates a JSON audit logger for destinations', () => {
    const writes: string[] = [];
    const destination = {
      write: (chunk: string) => {
        writes.push(chunk);
        return true;
      }
    } as NodeJS.WritableStream;

    const logger = createJsonAuditLogger(destination);
    logger.log({
      timestamp: '2024-01-01T00:00:00Z',
      method: 'GET',
      path: '/crm/v2/Leads',
      success: true
    });

    expect(writes[0]).toContain('"path":"/crm/v2/Leads"');
  });

  it('normalizes audit config with defaults', () => {
    const normalized = normalizeAudit({ enabled: true });
    expect(normalized).toBeDefined();
    expect(normalized?.redact.redactFields.length).toBeGreaterThan(0);
  });

  it('redacts, masks, hashes, and handles circular contexts', () => {
    const config = {
      redactFields: ['token'],
      maskFields: ['ip'],
      hashFields: ['email']
    };

    const context: Record<string, unknown> = {
      token: 'secret',
      ip: '192.168.1.100',
      email: 'test@example.com',
      nested: { token: 'nested-secret' }
    };
    context.self = context;

    const redacted = redactAuditContext(context, config);

    expect(redacted?.token).toBe('[redacted]');
    expect(redacted?.ip).toBe('19***00');
    expect(typeof redacted?.email).toBe('string');
    expect(redacted?.nested).toEqual({ token: '[redacted]' });
    expect(redacted?.self).toBe('[circular]');
  });
});
