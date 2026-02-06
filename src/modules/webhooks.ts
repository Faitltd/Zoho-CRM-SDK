import type { HttpClient } from '../http/http-client';
import { NotFoundError } from '../errors';
import type { WebhookConfig, WebhookResponse } from '../types/webhooks';
import { WebhookListResponseSchema, ZohoActionResponseSchema } from '../validation';
import {
  assertNonEmptyObject,
  assertOptionalRecordOfStrings,
  assertOptionalString,
  assertOptionalStringArray,
  assertPathSegment,
  assertStringArray,
  assertNonEmptyString
} from '../utils/input-validation';

// Zoho webhooks live under the CRM v8 settings automation endpoints.
const WEBHOOKS_BASE_PATH = '/crm/v8/settings/automation/webhooks';

type WebhookListResponse = {
  webhooks?: WebhookResponse[];
};

/**
 * Webhooks module (beta).
 *
 * @stability beta
 * @since 0.1.0
 */

export class WebhooksModule {
  private readonly http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  async list(): Promise<WebhookResponse[]> {
    const response = await this.http.get<WebhookListResponse>(
      WEBHOOKS_BASE_PATH,
      undefined,
      undefined,
      WebhookListResponseSchema
    );
    return response.data.webhooks ?? [];
  }

  async get(id: string): Promise<WebhookResponse> {
    assertPathSegment(id, 'id');
    const response = await this.http.get<WebhookListResponse>(
      this.webhookPath(id),
      undefined,
      undefined,
      WebhookListResponseSchema
    );
    const webhook = response.data.webhooks?.[0];

    if (!webhook) {
      throw new NotFoundError('Webhook not found.', { statusCode: 404, resource: 'webhooks', id });
    }

    return webhook;
  }

  async create(config: WebhookConfig): Promise<WebhookResponse> {
    validateWebhookConfig(config);
    const response = await this.http.post<WebhookListResponse>(
      WEBHOOKS_BASE_PATH,
      { webhooks: [config] },
      undefined,
      WebhookListResponseSchema
    );

    const webhook = response.data.webhooks?.[0];
    if (!webhook) {
      throw new Error('Zoho webhook create response was missing data.');
    }

    return webhook;
  }

  async update(id: string, config: Partial<WebhookConfig>): Promise<WebhookResponse> {
    assertPathSegment(id, 'id');
    validateWebhookUpdate(config);
    const response = await this.http.put<WebhookListResponse>(
      this.webhookPath(id),
      { webhooks: [config] },
      undefined,
      WebhookListResponseSchema
    );

    const webhook = response.data.webhooks?.[0];
    if (!webhook) {
      throw new Error('Zoho webhook update response was missing data.');
    }

    return webhook;
  }

  async delete(id: string): Promise<void> {
    assertPathSegment(id, 'id');
    await this.http.delete(this.webhookPath(id), undefined, undefined, ZohoActionResponseSchema);
  }

  private webhookPath(id: string): string {
    return `${WEBHOOKS_BASE_PATH}/${encodeURIComponent(id)}`;
  }
}

function validateWebhookConfig(config: WebhookConfig): void {
  assertNonEmptyObject(config, 'webhook');
  assertNonEmptyString(config.name, 'name');
  assertNonEmptyString(config.url, 'url');
  assertNonEmptyString(config.module, 'module');
  assertStringArray(config.events, 'events');
  assertOptionalString(config.description, 'description');
  assertOptionalString(config.httpMethod, 'httpMethod');
  assertOptionalString(config.channel, 'channel');
  assertOptionalRecordOfStrings(config.parameters, 'parameters');
}

function validateWebhookUpdate(config: Partial<WebhookConfig>): void {
  assertNonEmptyObject(config, 'webhook');
  assertOptionalString(config.name, 'name');
  assertOptionalString(config.url, 'url');
  assertOptionalString(config.module, 'module');
  assertOptionalStringArray(config.events, 'events');
  assertOptionalString(config.description, 'description');
  assertOptionalString(config.httpMethod, 'httpMethod');
  assertOptionalString(config.channel, 'channel');
  assertOptionalRecordOfStrings(config.parameters, 'parameters');
}
