export type FieldMap = Record<string, string>;
export type FieldNameStyle = 'raw' | 'camel';

export function invertFieldMap(map: FieldMap): FieldMap {
  return Object.entries(map).reduce<FieldMap>((acc, [camel, raw]) => {
    acc[raw] = camel;
    return acc;
  }, {});
}

export function mapRecord<T extends Record<string, unknown>>(
  record: T,
  map: FieldMap,
  style: FieldNameStyle
): T {
  if (style === 'raw') {
    return record;
  }

  const inverse = invertFieldMap(map);
  const mapped: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(record)) {
    const nextKey = inverse[key] ?? key;
    mapped[nextKey] = value;
  }

  return mapped as T;
}

export function createRecordTransformer<T extends Record<string, unknown>>(
  map: FieldMap,
  style: FieldNameStyle
): (record: T) => T {
  return (record: T) => mapRecord(record, map, style);
}
