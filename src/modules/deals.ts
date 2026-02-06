import type { HttpClient } from '../http/http-client';
import type { CreateDeal, Deal, UpdateDeal } from '../types/deals';
import { DealSchema } from '../validation';
import { BaseModule } from './base';

export class DealsModule extends BaseModule<Deal, CreateDeal, UpdateDeal> {
  constructor(http: HttpClient) {
    super(http, 'Deals', DealSchema);
  }
}
