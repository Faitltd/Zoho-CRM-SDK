import { describe, expect, it, vi } from 'vitest';
import type { HttpClient } from '../../src/http/http-client';
import { LeadsModule } from '../../src/modules/leads';
import type { CreateLead, Lead, UpdateLead } from '../../src/types/leads';

vi.mock('../../src/deprecation', () => ({
  warnDeprecated: vi.fn()
}));

import { warnDeprecated } from '../../src/deprecation';

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

describe('LeadsModule legacy helpers', () => {
  it('calls create/get/update/delete via deprecated method names', async () => {
    const http = createHttpMock();
    const module = new LeadsModule(http as unknown as HttpClient);

    const created: Lead = { id: '1', lastName: 'Smith', company: 'Acme' };
    const payload: CreateLead = { lastName: 'Smith', company: 'Acme' };
    http.post.mockResolvedValue({ data: { data: [created] }, status: 201, headers: {} });

    await expect(module.createLead(payload)).resolves.toEqual(created);
    expect(warnDeprecated).toHaveBeenCalledWith(
      expect.objectContaining({ feature: 'LeadsModule.createLead' })
    );

    const record: Lead = { id: '2', lastName: 'Doe', company: 'Beta' };
    http.get.mockResolvedValue({ data: { data: [record] }, status: 200, headers: {} });
    await expect(module.getLead('2')).resolves.toEqual(record);
    expect(warnDeprecated).toHaveBeenCalledWith(
      expect.objectContaining({ feature: 'LeadsModule.getLead' })
    );

    const updated: Lead = { id: '2', lastName: 'Doe', company: 'Gamma' };
    const update: UpdateLead = { company: 'Gamma' };
    http.put.mockResolvedValue({ data: { data: [updated] }, status: 200, headers: {} });
    await expect(module.updateLead('2', update)).resolves.toEqual(updated);
    expect(warnDeprecated).toHaveBeenCalledWith(
      expect.objectContaining({ feature: 'LeadsModule.updateLead' })
    );

    http.delete.mockResolvedValue({ data: { data: [] }, status: 204, headers: {} });
    await expect(module.deleteLead('2')).resolves.toBeUndefined();
    expect(warnDeprecated).toHaveBeenCalledWith(
      expect.objectContaining({ feature: 'LeadsModule.deleteLead' })
    );
  });

  it('listLeads forwards to list with page defaults', async () => {
    const http = createHttpMock();
    const module = new LeadsModule(http as unknown as HttpClient);

    const data: Lead[] = [{ id: '1', lastName: 'Smith', company: 'Acme' }];
    http.get.mockResolvedValue({ data: { data }, status: 200, headers: {} });

    await expect(module.listLeads()).resolves.toEqual(data);
    expect(warnDeprecated).toHaveBeenCalledWith(
      expect.objectContaining({ feature: 'LeadsModule.listLeads' })
    );
    expect(http.get).toHaveBeenCalled();
  });
});

describe('LeadsModule advanced filters fallback', () => {
  it('falls back to list when advanced filters are not supported', async () => {
    const http = createHttpMock();
    const module = new LeadsModule(http as unknown as HttpClient, { supportsAdvancedFilters: false });

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const data: Lead[] = [{ id: '1', lastName: 'Smith', company: 'Acme' }];
    http.get.mockResolvedValue({ data: { data }, status: 200, headers: {} });

    const result = await module.listWithAdvancedFilters({ page: 1, perPage: 10 });
    expect(result).toEqual(data);
    expect(warn).toHaveBeenCalledWith(
      'Advanced filters not supported by this account. Falling back to basic list().'
    );
    warn.mockRestore();
  });
});
