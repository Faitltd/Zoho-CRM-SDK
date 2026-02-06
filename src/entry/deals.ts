import type { BaseClientInitConfig } from './base-client';
import { BaseClient } from './base-client';
import { DealsModule } from '../modules/deals';

export class ZohoCRM extends BaseClient {
  readonly deals: DealsModule;

  constructor(config: BaseClientInitConfig) {
    super(config);
    this.deals = new DealsModule(this.http, { fieldNameStyle: this.fieldNameStyle });
  }
}

export { DealsModule } from '../modules/deals';
export type { Deal, CreateDeal, UpdateDeal } from '../types/deals';
export type { BaseClientInitConfig as ZohoCRMConfig } from './base-client';
