import type { BaseClientConfig } from './base-client';
import { BaseClient } from './base-client';
import { DealsModule } from '../modules/deals';

export class ZohoCRM extends BaseClient {
  readonly deals: DealsModule;

  constructor(config: BaseClientConfig) {
    super(config);
    this.deals = new DealsModule(this.http);
  }
}

export { DealsModule } from '../modules/deals';
export type { Deal, CreateDeal, UpdateDeal } from '../types/deals';
export type { BaseClientConfig as ZohoCRMConfig } from './base-client';
