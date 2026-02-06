import { createHash } from 'node:crypto';
import type { HttpMethod } from './http/types';
import type { ZohoRegion } from './auth/types';

export interface AuditEvent {
  timestamp: string;
  method: HttpMethod;
  path: string;
  status?: number;
  durationMs?: number;
  success: boolean;
  region?: ZohoRegion;
  requestId?: string;
  errorName?: string;
  context?: Record<string, unknown>;
}

export interface AuditLogger {
  log: (event: AuditEvent) => void;
}

export interface AuditRedactionConfig {
  redactFields?: string[];
  maskFields?: string[];
  hashFields?: string[];
}

export interface AuditConfig {
  enabled?: boolean;
  logger?: AuditLogger;
  destination?: NodeJS.WritableStream;
  contextProvider?: () => Record<string, unknown> | undefined;
  redact?: AuditRedactionConfig;
}

export type NormalizedAuditConfig = {
  logger: AuditLogger;
  contextProvider?: () => Record<string, unknown> | undefined;
  redact: Required<AuditRedactionConfig>;
};

const DEFAULT_REDACT_FIELDS = [
  'authorization',
  'token',
  'access_token',
  'refresh_token',
  'client_secret',
  'email',
  'phone',
  'mobile',
  'first_name',
  'last_name',
  'firstName',
  'lastName',
  'name'
];

const DEFAULT_MASK_FIELDS = ['ip', 'ip_address', 'address'];
const DEFAULT_HASH_FIELDS: string[] = [];

export function normalizeAudit(config?: AuditConfig | false): NormalizedAuditConfig | undefined {
  if (!config || config.enabled === false) {
    return undefined;
  }

  const destination = config.destination;
  const logger =
    config.logger ??
    createJsonAuditLogger(destination);

  const normalized: NormalizedAuditConfig = {
    logger,
    redact: {
      redactFields: config.redact?.redactFields ?? DEFAULT_REDACT_FIELDS,
      maskFields: config.redact?.maskFields ?? DEFAULT_MASK_FIELDS,
      hashFields: config.redact?.hashFields ?? DEFAULT_HASH_FIELDS
    }
  };

  if (config.contextProvider) {
    normalized.contextProvider = config.contextProvider;
  }

  return normalized;
}

export function createJsonAuditLogger(destination?: NodeJS.WritableStream): AuditLogger {
  if (destination) {
    return {
      log: (event) => {
        destination.write(`${JSON.stringify(event)}\n`);
      }
    };
  }

  return {
    log: (event) => {
      console.info(JSON.stringify(event));
    }
  };
}

export function redactAuditContext(
  context: Record<string, unknown> | undefined,
  config: Required<AuditRedactionConfig>
): Record<string, unknown> | undefined {
  if (!context) {
    return context;
  }
  const redactSet = new Set(config.redactFields.map((field) => field.toLowerCase()));
  const maskSet = new Set(config.maskFields.map((field) => field.toLowerCase()));
  const hashSet = new Set(config.hashFields.map((field) => field.toLowerCase()));

  const visited = new Set<unknown>();
  return redactValue(context, visited, 0, { redactSet, maskSet, hashSet }) as Record<string, unknown>;
}

type RedactState = {
  redactSet: Set<string>;
  maskSet: Set<string>;
  hashSet: Set<string>;
};

function redactValue(
  value: unknown,
  visited: Set<unknown>,
  depth: number,
  state: RedactState
): unknown {
  if (depth > 6) {
    return '[redacted]';
  }
  if (!value || typeof value !== 'object') {
    return value;
  }
  if (visited.has(value)) {
    return '[circular]';
  }
  visited.add(value);

  if (Array.isArray(value)) {
    return value.map((entry) => redactValue(entry, visited, depth + 1, state));
  }

  const output: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    const lower = key.toLowerCase();
    if (state.redactSet.has(lower) || lower.includes('token') || lower.includes('secret')) {
      output[key] = '[redacted]';
      continue;
    }
    if (state.hashSet.has(lower)) {
      output[key] = hashValue(entry);
      continue;
    }
    if (state.maskSet.has(lower)) {
      output[key] = maskValue(entry);
      continue;
    }
    output[key] = redactValue(entry, visited, depth + 1, state);
  }
  return output;
}

function maskValue(value: unknown): string {
  const text = String(value);
  if (text.length <= 4) {
    return '*'.repeat(text.length);
  }
  return `${text.slice(0, 2)}***${text.slice(-2)}`;
}

function hashValue(value: unknown): string {
  return createHash('sha256').update(String(value)).digest('hex');
}
