import { InputValidationError } from '../errors';

type FieldErrors = Record<string, string[]>;

export function assertNonEmptyString(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw buildError(field, 'non-empty string', value);
  }
}

export function assertPathSegment(value: unknown, field: string): asserts value is string {
  assertNonEmptyString(value, field);
  if (value.includes('/') || value.includes('\\') || value.includes('..')) {
    throw buildError(field, 'URL-safe path segment', value);
  }
}

export function assertPlainObject(value: unknown, field: string): asserts value is Record<string, unknown> {
  if (!isPlainObject(value)) {
    throw buildError(field, 'object', value);
  }
}

export function assertNonEmptyObject(value: unknown, field: string): asserts value is Record<string, unknown> {
  assertPlainObject(value, field);
  if (Object.keys(value as Record<string, unknown>).length === 0) {
    throw new InputValidationError(`${field} must contain at least one field.`, {
      statusCode: 400,
      fieldErrors: {
        [field]: ['Object must not be empty.']
      }
    });
  }
}

export function assertOptionalString(value: unknown, field: string): void {
  if (value === undefined) {
    return;
  }
  assertNonEmptyString(value, field);
}

export function assertOptionalNumber(value: unknown, field: string): void {
  if (value === undefined) {
    return;
  }
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw buildError(field, 'number', value);
  }
}

export function assertOptionalBoolean(value: unknown, field: string): void {
  if (value === undefined) {
    return;
  }
  if (typeof value !== 'boolean') {
    throw buildError(field, 'boolean', value);
  }
}

export function assertOptionalStringArray(value: unknown, field: string): void {
  if (value === undefined) {
    return;
  }
  assertStringArray(value, field);
}

export function assertStringArray(value: unknown, field: string): asserts value is string[] {
  if (!Array.isArray(value)) {
    throw buildError(field, 'array of strings', value);
  }
  for (const entry of value) {
    if (typeof entry !== 'string' || entry.trim().length === 0) {
      throw buildError(field, 'array of non-empty strings', value);
    }
  }
}

export function assertOptionalRecordOfStrings(value: unknown, field: string): void {
  if (value === undefined) {
    return;
  }
  assertRecordOfStrings(value, field);
}

export function assertRecordOfStrings(
  value: unknown,
  field: string
): asserts value is Record<string, string> {
  if (!isPlainObject(value)) {
    throw buildError(field, 'object of strings', value);
  }
  for (const entry of Object.values(value as Record<string, unknown>)) {
    if (typeof entry !== 'string') {
      throw buildError(field, 'object of strings', value);
    }
  }
}

export function assertOptionalEnum<T extends string>(
  value: unknown,
  field: string,
  allowed: readonly T[]
): asserts value is T | undefined {
  if (value === undefined) {
    return;
  }
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new InputValidationError(`${field} must be one of: ${allowed.join(', ')}.`, {
      statusCode: 400,
      fieldErrors: {
        [field]: [`Expected one of: ${allowed.join(', ')}.`]
      }
    });
  }
}

export function assertEnum<T extends string>(
  value: unknown,
  field: string,
  allowed: readonly T[]
): asserts value is T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new InputValidationError(`${field} must be one of: ${allowed.join(', ')}.`, {
      statusCode: 400,
      fieldErrors: {
        [field]: [`Expected one of: ${allowed.join(', ')}.`]
      }
    });
  }
}

function buildError(field: string, expected: string, actual: unknown): InputValidationError {
  const errors: FieldErrors = {
    [field]: [`Expected ${expected} but received ${describeType(actual)}.`]
  };
  return new InputValidationError(`Invalid ${field}.`, {
    statusCode: 400,
    fieldErrors: errors
  });
}

function describeType(value: unknown): string {
  if (value === null) {
    return 'null';
  }
  if (Array.isArray(value)) {
    return 'array';
  }
  return typeof value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
