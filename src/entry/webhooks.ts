import type { BaseClientConfig } from './base-client';
import { BaseClient } from './base-client';
import { WebhooksModule } from '../modules/webhooks';

export class ZohoCRM extends BaseClient {
  readonly webhooks: WebhooksModule;

  constructor(config: BaseClientConfig) {
    super(config);
    this.webhooks = new WebhooksModule(this.http);
  }
}

export { WebhooksModule } from '../modules/webhooks';
export { generateWebhookSecret, signWebhookPayload, verifyWebhookSignature } from '../webhooks/signature';
export type { WebhookConfig, WebhookResponse } from '../types/webhooks';
export type { BaseClientConfig as ZohoCRMConfig } from './base-client';
