import { createHash } from 'node:crypto';

export interface Logger {
  debug?: (msg: string, meta?: Record<string, unknown>) => void;
  info?: (msg: string, meta?: Record<string, unknown>) => void;
  warn?: (msg: string, meta?: Record<string, unknown>) => void;
  error?: (msg: string, meta?: Record<string, unknown>) => void;
}

export interface RedactionConfig {
  redactFields?: string[];
  maskFields?: string[];
  hashFields?: string[];
}

const noop = () => {
  // intentionally empty
};

export const noopLogger: Required<Logger> = {
  debug: noop,
  info: noop,
  warn: noop,
  error: noop
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

const ALWAYS_REDACT = new Set([
  'secret',
  'password',
  'cookie',
  'set-cookie',
  'api_key',
  'apikey',
  'x-zoho-signature',
  'x-zoho-webhook-signature'
]);

export function normalizeLogger(logger?: Logger, redaction?: RedactionConfig): Required<Logger> {
  if (!logger) {
    return noopLogger;
  }

  const normalized = normalizeRedaction(redaction);

  return {
    debug: wrap(logger.debug, normalized),
    info: wrap(logger.info, normalized),
    warn: wrap(logger.warn, normalized),
    error: wrap(logger.error, normalized)
  };
}

type RedactionState = {
  redactSet: Set<string>;
  maskSet: Set<string>;
  hashSet: Set<string>;
};

function normalizeRedaction(config?: RedactionConfig): RedactionState {
  return {
    redactSet: new Set((config?.redactFields ?? DEFAULT_REDACT_FIELDS).map((field) => field.toLowerCase())),
    maskSet: new Set((config?.maskFields ?? DEFAULT_MASK_FIELDS).map((field) => field.toLowerCase())),
    hashSet: new Set((config?.hashFields ?? DEFAULT_HASH_FIELDS).map((field) => field.toLowerCase()))
  };
}

function wrap(fn?: (msg: string, meta?: Record<string, unknown>) => void, redaction?: RedactionState) {
  if (!fn) {
    return noop;
  }
  return (msg: string, meta?: Record<string, unknown>) => {
    fn(msg, redactMeta(meta, redaction));
  };
}

function redactMeta(meta?: Record<string, unknown>, redaction?: RedactionState): Record<string, unknown> | undefined {
  if (!meta) {
    return meta;
  }
  const visited = new Set<unknown>();
  return redactValue(meta, visited, 0, redaction) as Record<string, unknown>;
}

function redactValue(
  value: unknown,
  visited: Set<unknown>,
  depth: number,
  redaction?: RedactionState
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
    return value.map((entry) => redactValue(entry, visited, depth + 1, redaction));
  }

  const output: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    const lower = key.toLowerCase();
    if (
      ALWAYS_REDACT.has(lower) ||
      redaction?.redactSet.has(lower) ||
      lower.includes('token') ||
      lower.includes('secret')
    ) {
      output[key] = '[redacted]';
      continue;
    }
    if (redaction?.hashSet.has(lower)) {
      output[key] = hashValue(entry);
      continue;
    }
    if (redaction?.maskSet.has(lower)) {
      output[key] = maskValue(entry);
      continue;
    }
    output[key] = redactValue(entry, visited, depth + 1, redaction);
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
