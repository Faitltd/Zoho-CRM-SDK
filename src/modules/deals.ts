import type { HttpClient } from '../http/http-client';
import type { CreateDeal, Deal, UpdateDeal } from '../types/deals';
import { DealSchema } from '../validation';
import { BaseModule } from './base';

/**
 * Deals module (stable).
 *
 * @stability stable
 * @since 0.1.0
 */
export class DealsModule extends BaseModule<Deal, CreateDeal, UpdateDeal> {
  constructor(http: HttpClient) {
    super(http, 'Deals', DealSchema);
  }
}
