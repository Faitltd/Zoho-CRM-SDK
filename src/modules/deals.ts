import type { HttpClient } from '../http/http-client';
import type { CreateDeal, Deal, UpdateDeal } from '../types/deals';
import { DealSchema } from '../validation';
import { BaseModule } from './base';
import { createRecordTransformer, type FieldNameStyle } from '../utils/field-mapping';
import { DEAL_FIELD_MAP } from '../types/deals';

/**
 * Deals module (stable).
 *
 * @stability stable
 * @since 0.1.0
 */
export interface DealsModuleOptions {
  fieldNameStyle?: FieldNameStyle;
}

export class DealsModule extends BaseModule<Deal, CreateDeal, UpdateDeal> {
  constructor(http: HttpClient, options?: DealsModuleOptions) {
    const fieldNameStyle = options?.fieldNameStyle ?? 'raw';
    const transformer =
      fieldNameStyle === 'camel'
        ? createRecordTransformer<Deal>(DEAL_FIELD_MAP, fieldNameStyle)
        : undefined;
    super(http, 'Deals', DealSchema, transformer);
  }
}
