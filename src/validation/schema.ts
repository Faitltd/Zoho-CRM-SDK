import type { NormalizedValidationOptions, UnknownFieldInfo, ValidationIssue } from './types';

export type Schema<T> = {
  name: string;
  _parse: (value: unknown, ctx: ValidationContext, path: string[]) => ValidationResult<T>;
  _typeName?: string;
  _optional?: boolean;
  _nullable?: boolean;
  _keys?: string[];
  _unknownKeys?: 'passthrough' | 'error';
};

export type ValidationResult<T> =
  | { success: true; data: T; unknownFields?: UnknownFieldInfo[] }
  | { success: false; issues: ValidationIssue[]; unknownFields?: UnknownFieldInfo[] };

type ValidationContext = {
  options: NormalizedValidationOptions;
  issues: ValidationIssue[];
  unknownFields: UnknownFieldInfo[];
  schemaName: string;
};

const ok = <T>(data: T, ctx: ValidationContext): ValidationResult<T> => {
  const extra = ctx.unknownFields.length > 0 ? { unknownFields: ctx.unknownFields } : {};
  return { success: true, data, ...extra };
};

const fail = <T>(ctx: ValidationContext): ValidationResult<T> => {
  const extra = ctx.unknownFields.length > 0 ? { unknownFields: ctx.unknownFields } : {};
  return { success: false, issues: ctx.issues, ...extra };
};

const createIssue = (path: string[], expected: string, actual: unknown): ValidationIssue => ({
  path: formatPath(path),
  expected,
  actual: describeType(actual),
  message: `${formatPath(path)} expected ${expected} but received ${describeType(actual)}`
});

export function validateSchema<T>(
  schema: Schema<T>,
  value: unknown,
  options: NormalizedValidationOptions
): ValidationResult<T> {
  if (!options.enabled || options.mode === 'off') {
    return { success: true, data: value as T };
  }

  const ctx: ValidationContext = {
    options,
    issues: [],
    unknownFields: [],
    schemaName: schema.name
  };

  const result = schema._parse(value, ctx, []);
  if (result.success) {
    return ok(result.data, ctx);
  }

  return fail(ctx);
}

export function named<T>(schema: Schema<T>, name: string): Schema<T> {
  return { ...schema, name };
}

export function optional<T>(schema: Schema<T>): Schema<T | undefined> {
  return {
    ...schema,
    _optional: true,
    _parse: (value, ctx, path) => {
      if (value === undefined) {
        return ok(value as T | undefined, ctx);
      }
      return schema._parse(value, ctx, path);
    }
  };
}

export function nullable<T>(schema: Schema<T>): Schema<T | null> {
  return {
    ...schema,
    _nullable: true,
    _parse: (value, ctx, path) => {
      if (value === null) {
        return ok(value as T | null, ctx);
      }
      return schema._parse(value, ctx, path);
    }
  };
}

export function string(): Schema<string> {
  return {
    name: 'string',
    _typeName: 'string',
    _parse: (value, ctx, path) => {
      if (typeof value !== 'string') {
        ctx.issues.push(createIssue(path, 'string', value));
        return fail(ctx);
      }
      return ok(value, ctx);
    }
  };
}

export function number(): Schema<number> {
  return {
    name: 'number',
    _typeName: 'number',
    _parse: (value, ctx, path) => {
      if (typeof value !== 'number' || Number.isNaN(value)) {
        ctx.issues.push(createIssue(path, 'number', value));
        return fail(ctx);
      }
      return ok(value, ctx);
    }
  };
}

export function boolean(): Schema<boolean> {
  return {
    name: 'boolean',
    _typeName: 'boolean',
    _parse: (value, ctx, path) => {
      if (typeof value !== 'boolean') {
        ctx.issues.push(createIssue(path, 'boolean', value));
        return fail(ctx);
      }
      return ok(value, ctx);
    }
  };
}

export function literal<T extends string | number | boolean>(value: T): Schema<T> {
  return {
    name: `literal(${String(value)})`,
    _typeName: `literal(${String(value)})`,
    _parse: (input, ctx, path) => {
      if (input !== value) {
        ctx.issues.push(createIssue(path, JSON.stringify(value), input));
        return fail(ctx);
      }
      return ok(input as T, ctx);
    }
  };
}

export function array<T>(item: Schema<T>): Schema<T[]> {
  return {
    name: `array(${item.name})`,
    _typeName: `array(${item.name})`,
    _parse: (value, ctx, path) => {
      if (!Array.isArray(value)) {
        ctx.issues.push(createIssue(path, 'array', value));
        return fail(ctx);
      }

      value.forEach((entry, index) => {
        item._parse(entry, ctx, [...path, `[${index}]`]);
      });

      return ctx.issues.length > 0 ? fail(ctx) : ok(value as T[], ctx);
    }
  };
}

export function record<T>(item: Schema<T>): Schema<Record<string, T>> {
  return {
    name: `record(${item.name})`,
    _typeName: `record(${item.name})`,
    _parse: (value, ctx, path) => {
      if (!isPlainObject(value)) {
        ctx.issues.push(createIssue(path, 'object', value));
        return fail(ctx);
      }

      for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
        item._parse(entry, ctx, [...path, key]);
      }

      return ctx.issues.length > 0 ? fail(ctx) : ok(value as Record<string, T>, ctx);
    }
  };
}

export function unknown(): Schema<unknown> {
  return {
    name: 'unknown',
    _typeName: 'unknown',
    _parse: (value, ctx) => ok(value, ctx)
  };
}

export function object<T extends Record<string, Schema<unknown>>>(
  shape: T,
  options: { unknownKeys?: 'passthrough' | 'error' } = {}
): Schema<{ [K in keyof T]: SchemaType<T[K]> }> {
  return {
    name: 'object',
    _typeName: 'object',
    _keys: Object.keys(shape),
    _unknownKeys: options.unknownKeys ?? 'passthrough',
    _parse: (value, ctx, path) => {
      if (!isPlainObject(value)) {
        ctx.issues.push(createIssue(path, 'object', value));
        return fail(ctx);
      }

      const recordValue = value as Record<string, unknown>;

      for (const [key, schema] of Object.entries(shape)) {
        if (key in recordValue) {
          schema._parse(recordValue[key], ctx, [...path, key]);
          continue;
        }

        if (!schema._optional) {
          ctx.issues.push(createIssue([...path, key], schema._typeName ?? 'unknown', undefined));
        }
      }

      const extraKeys = Object.keys(recordValue).filter((key) => !(key in shape));
      if (extraKeys.length > 0) {
        const behavior = ctx.options.mode === 'strict' ? 'error' : options.unknownKeys ?? 'passthrough';
        if (behavior === 'error') {
          for (const key of extraKeys) {
            ctx.issues.push(createIssue([...path, key], 'unknown key', recordValue[key]));
          }
        } else if (ctx.options.warnUnknownFields) {
          ctx.unknownFields.push({
            schema: ctx.schemaName,
            path: formatPath(path),
            fields: extraKeys,
            sample: buildSample(recordValue, extraKeys)
          });
        }
      }

      return ctx.issues.length > 0 ? fail(ctx) : ok(value as { [K in keyof T]: SchemaType<T[K]> }, ctx);
    }
  };
}

export function union<T extends Schema<unknown>[]>(schemas: T): Schema<SchemaType<T[number]>> {
  return {
    name: `union(${schemas.map((schema) => schema.name).join('|')})`,
    _typeName: 'union',
    _parse: (value, ctx, path) => {
      for (const schema of schemas) {
        const localCtx = createChildContext(ctx);
        const result = schema._parse(value, localCtx, path);
        if (result.success) {
          return ok(value as SchemaType<T[number]>, ctx);
        }
      }

      ctx.issues.push(createIssue(path, 'union', value));
      return fail(ctx);
    }
  };
}

export function describeType(value: unknown): string {
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

function formatPath(path: string[]): string {
  if (path.length === 0) {
    return '$';
  }

  return path
    .map((part, index) => {
      if (part.startsWith('[')) {
        return part;
      }
      return index === 0 ? part : `.${part}`;
    })
    .join('');
}

function buildSample(recordValue: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  const sample: Record<string, unknown> = {};
  for (const key of keys.slice(0, 5)) {
    sample[key] = recordValue[key];
  }
  return sample;
}

function createChildContext(ctx: ValidationContext): ValidationContext {
  return {
    options: ctx.options,
    issues: [],
    unknownFields: [],
    schemaName: ctx.schemaName
  };
}

type SchemaType<T> = T extends Schema<infer U> ? U : never;
