import { describe, expect, it, vi } from 'vitest';
import type { HttpClient } from '../../src/http/http-client';
import { InputValidationError, NotFoundError } from '../../src/errors';
import { WebhooksModule } from '../../src/modules/webhooks';
import type { WebhookConfig, WebhookResponse } from '../../src/types/webhooks';

type HttpClientMock = {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

const createHttpMock = (): HttpClientMock => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn()
});

describe('WebhooksModule', () => {
  it('lists webhooks from the v8 endpoint', async () => {
    const http = createHttpMock();
    const module = new WebhooksModule(http as unknown as HttpClient);

    const webhooks: WebhookResponse[] = [{ id: '1', name: 'Test' }];

    http.get.mockResolvedValue({
      data: { webhooks },
      status: 200,
      headers: {}
    });

    const result = await module.list();

    expect(result).toEqual(webhooks);
    expect(http.get).toHaveBeenCalledWith(
      '/crm/v8/settings/automation/webhooks',
      undefined,
      undefined,
      expect.anything()
    );
  });

  it('gets a webhook by id', async () => {
    const http = createHttpMock();
    const module = new WebhooksModule(http as unknown as HttpClient);

    const webhook: WebhookResponse = { id: '1', name: 'Test' };

    http.get.mockResolvedValue({
      data: { webhooks: [webhook] },
      status: 200,
      headers: {}
    });

    const result = await module.get('1');

    expect(result).toEqual(webhook);
    expect(http.get).toHaveBeenCalledWith(
      '/crm/v8/settings/automation/webhooks/1',
      undefined,
      undefined,
      expect.anything()
    );
  });

  it('throws NotFoundError when get returns empty data', async () => {
    const http = createHttpMock();
    const module = new WebhooksModule(http as unknown as HttpClient);

    http.get.mockResolvedValue({
      data: { webhooks: [] },
      status: 200,
      headers: {}
    });

    await expect(module.get('missing')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('creates webhooks using the webhooks wrapper', async () => {
    const http = createHttpMock();
    const module = new WebhooksModule(http as unknown as HttpClient);

    const payload: WebhookConfig = {
      name: 'Deal updates',
      url: 'https://example.com/webhooks/zoho',
      module: 'Deals',
      events: ['create', 'edit']
    };

    const created: WebhookResponse = { id: '10', name: payload.name };

    http.post.mockResolvedValue({
      data: { webhooks: [created] },
      status: 201,
      headers: {}
    });

    const result = await module.create(payload);

    expect(result).toEqual(created);
    expect(http.post).toHaveBeenCalledWith(
      '/crm/v8/settings/automation/webhooks',
      { webhooks: [payload] },
      undefined,
      expect.anything()
    );
  });

  it('rejects invalid webhook configs before calling the API', async () => {
    const http = createHttpMock();
    const module = new WebhooksModule(http as unknown as HttpClient);

    await expect(
      module.create({
        name: '',
        url: '',
        module: '',
        events: []
      } as WebhookConfig)
    ).rejects.toBeInstanceOf(InputValidationError);
    expect(http.post).not.toHaveBeenCalled();
  });

  it('updates webhooks using the webhooks wrapper', async () => {
    const http = createHttpMock();
    const module = new WebhooksModule(http as unknown as HttpClient);

    const payload: Partial<WebhookConfig> = {
      description: 'Updated'
    };

    const updated: WebhookResponse = { id: '10', name: 'Updated' };

    http.put.mockResolvedValue({
      data: { webhooks: [updated] },
      status: 200,
      headers: {}
    });

    const result = await module.update('10', payload);

    expect(result).toEqual(updated);
    expect(http.put).toHaveBeenCalledWith(
      '/crm/v8/settings/automation/webhooks/10',
      { webhooks: [payload] },
      undefined,
      expect.anything()
    );
  });

  it('deletes webhooks with correct path', async () => {
    const http = createHttpMock();
    const module = new WebhooksModule(http as unknown as HttpClient);

    http.delete.mockResolvedValue({
      data: { webhooks: [] },
      status: 200,
      headers: {}
    });

    await module.delete('10');

    expect(http.delete).toHaveBeenCalledWith(
      '/crm/v8/settings/automation/webhooks/10',
      undefined,
      undefined,
      expect.anything()
    );
  });
});
