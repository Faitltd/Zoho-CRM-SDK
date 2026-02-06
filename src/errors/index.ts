import type { ZohoApiError } from '../types/shared';
import type { ZohoOAuthError } from '../auth/types';

export interface ZohoErrorOptions {
  statusCode?: number;
  code?: string;
  details?: Record<string, unknown>;
  rawResponse?: unknown;
  cause?: unknown;
}

export class ZohoError extends Error {
  readonly statusCode?: number;
  readonly code?: string;
  readonly details?: Record<string, unknown>;
  readonly rawResponse?: unknown;
  readonly cause?: unknown;

  constructor(message: string, options: ZohoErrorOptions = {}) {
    super(message);
    this.name = 'ZohoError';
    this.statusCode = options.statusCode;
    this.code = options.code;
    this.details = options.details;
    this.rawResponse = options.rawResponse;
    this.cause = options.cause;
  }
}

export class AuthError extends ZohoError {
  readonly oauthError?: ZohoOAuthError;

  constructor(message: string, options: ZohoErrorOptions & { oauthError?: ZohoOAuthError } = {}) {
    super(message, options);
    this.name = 'AuthError';
    this.oauthError = options.oauthError;
  }

  static fromOAuth(error: ZohoOAuthError, statusCode?: number): AuthError {
    const description = error.error_description ? `: ${error.error_description}` : '';
    return new AuthError(`Zoho OAuth error (${error.error})${description}`, {
      statusCode,
      code: error.error,
      oauthError: error,
      rawResponse: error
    });
  }
}

export class ValidationError extends ZohoError {
  readonly fieldErrors?: Record<string, string[]>;

  constructor(message: string, options: ZohoErrorOptions & { fieldErrors?: Record<string, string[]> } = {}) {
    super(message, options);
    this.name = 'ValidationError';
    this.fieldErrors = options.fieldErrors;
  }
}

export class InputValidationError extends ZohoError {
  readonly fieldErrors?: Record<string, string[]>;

  constructor(message: string, options: ZohoErrorOptions & { fieldErrors?: Record<string, string[]> } = {}) {
    super(message, options);
    this.name = 'InputValidationError';
    this.fieldErrors = options.fieldErrors;
  }
}

export class RateLimitError extends ZohoError {
  readonly retryAfter?: number;

  constructor(message: string, options: ZohoErrorOptions & { retryAfter?: number } = {}) {
    super(message, options);
    this.name = 'RateLimitError';
    this.retryAfter = options.retryAfter;
  }
}

export class NotFoundError extends ZohoError {
  readonly resource?: string;
  readonly id?: string;

  constructor(message: string, options: ZohoErrorOptions & { resource?: string; id?: string } = {}) {
    super(message, options);
    this.name = 'NotFoundError';
    this.resource = options.resource;
    this.id = options.id;
  }
}

export class RequestError extends ZohoError {
  constructor(message: string, options: ZohoErrorOptions = {}) {
    super(message, options);
    this.name = 'RequestError';
  }
}

export class ResourceLimitError extends ZohoError {
  readonly resource?: string;
  readonly limit?: number;

  constructor(message: string, options: ZohoErrorOptions & { resource?: string; limit?: number } = {}) {
    super(message, options);
    this.name = 'ResourceLimitError';
    this.resource = options.resource;
    this.limit = options.limit;
  }
}

export class ClientClosedError extends ZohoError {
  constructor(message: string, options: ZohoErrorOptions = {}) {
    super(message, options);
    this.name = 'ClientClosedError';
  }
}

export class SchemaMismatchError extends ZohoError {
  readonly schemaName?: string;
  readonly issues?: { path: string; expected: string; actual: string; message: string }[];

  constructor(
    message: string,
    options: ZohoErrorOptions & {
      schemaName?: string;
      issues?: { path: string; expected: string; actual: string; message: string }[];
    } = {}
  ) {
    super(message, options);
    this.name = 'SchemaMismatchError';
    this.schemaName = options.schemaName;
    this.issues = options.issues;
  }
}

export function extractZohoApiError(payload: unknown): ZohoApiError | undefined {
  if (!payload || typeof payload !== 'object') {
    return undefined;
  }

  if ('code' in payload && 'message' in payload && 'status' in payload) {
    return payload as ZohoApiError;
  }

  if ('data' in payload && Array.isArray((payload as { data?: unknown }).data)) {
    const [first] = (payload as { data?: unknown[] }).data ?? [];
    if (first && typeof first === 'object' && 'code' in first && 'message' in first && 'status' in first) {
      return first as ZohoApiError;
    }
  }

  return undefined;
}
