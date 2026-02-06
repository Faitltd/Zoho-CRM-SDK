import { describe, expect, it } from 'vitest';
import { createRecordTransformer, invertFieldMap, mapRecord } from '../../src/utils/field-mapping';

describe('field mapping utilities', () => {
  it('inverts a field map', () => {
    const map = { firstName: 'First_Name', lastName: 'Last_Name' };
    expect(invertFieldMap(map)).toEqual({
      First_Name: 'firstName',
      Last_Name: 'lastName'
    });
  });

  it('maps records to camelCase when requested', () => {
    const map = { firstName: 'First_Name', lastName: 'Last_Name' };
    const record = { First_Name: 'Ada', Last_Name: 'Lovelace', Company: 'Analytical' };
    const mapped = mapRecord(record, map, 'camel');

    expect(mapped).toEqual({
      firstName: 'Ada',
      lastName: 'Lovelace',
      Company: 'Analytical'
    });
  });

  it('returns raw records when style is raw', () => {
    const map = { firstName: 'First_Name' };
    const record = { First_Name: 'Grace' };
    expect(mapRecord(record, map, 'raw')).toBe(record);
  });

  it('creates a record transformer', () => {
    const map = { firstName: 'First_Name' };
    const transform = createRecordTransformer(map, 'camel');
    expect(transform({ First_Name: 'Linus' })).toEqual({ firstName: 'Linus' });
  });
});
