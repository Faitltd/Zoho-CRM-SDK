# Type Evolution Strategy

This SDK evolves TypeScript types without breaking users by following these rules:

## Principles

- **Additive changes only** in minor versions (new optional fields, new union members, new generics).
- **No removals** without a major bump.
- **Deprecated fields** remain optional until the next major.
- **Prefer generics** for extensibility.

## Patterns

### Generic responses
```ts
export interface ApiResponse<T = unknown, M = Record<string, unknown>> {
  data: T;
  status: number;
  headers: Record<string, string>;
  meta?: M;
}
```

### Unions for new capabilities
```ts
type SortOrder = 'asc' | 'desc' | 'relevance';
```

### Deprecate instead of removing
```ts
interface Lead {
  id: string;
  /** @deprecated Will be removed in v3 */
  oldField?: string;
}
```

### Conditional types for legacy shapes
```ts
type CompatibleLead<UseLegacy extends boolean = false> =
  UseLegacy extends true ? LegacyLead : Lead;
```

### Discriminated unions
```ts
type ZohoRecordUnion =
  | { module: 'Leads'; data: Lead }
  | { module: 'Contacts'; data: Contact }
  | { module: 'Deals'; data: Deal };
```

### Migration helper types
```ts
type FieldNames<T> = keyof T;
 type PartialUpdate<T> = Partial<T>;
```

## Documentation Standards

Use TSDoc to document changes:

```ts
/**
 * @since 2.0.0
 * @version 2.1.0 - added optional leadScore
 */
interface Lead {
  id: string;
  /** @since 2.1.0 */
  leadScore?: number;
}
```

## Module Augmentation

Users can safely extend SDK types with module augmentation:

```ts
declare module '@yourcompany/zoho-crm' {
  interface Lead {
    customField1?: string;
  }
}
```
