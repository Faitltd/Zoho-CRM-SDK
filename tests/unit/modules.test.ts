import { describe, expect, it, vi } from 'vitest';
import { InputValidationError, NotFoundError } from '../../src/http/errors';
import type { HttpClient } from '../../src/http/http-client';
import { LeadsModule } from '../../src/modules/leads';
import { LEAD_FIELD_MAP } from '../../src/types/leads';
import type { Lead, CreateLead, UpdateLead } from '../../src/types/leads';

type HttpClientMock = {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  request: ReturnType<typeof vi.fn>;
};

const createHttpMock = (): HttpClientMock => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  request: vi.fn()
});

describe('BaseModule CRUD behavior', () => {
  it('lists records with correct params', async () => {
    const http = createHttpMock();
    const module = new LeadsModule(http as unknown as HttpClient);

    const data: Lead[] = [{ id: '1', lastName: 'Smith', company: 'Acme' }];

    http.get.mockResolvedValue({
      data: { data },
      status: 200,
      headers: {}
    });

    const result = await module.list({
      page: 2,
      perPage: 20,
      sortBy: LEAD_FIELD_MAP.lastName,
      sortOrder: 'asc'
    });

    expect(result).toEqual(data);
    expect(http.get).toHaveBeenCalledWith(
      '/crm/v2/Leads',
      {
        page: 2,
        per_page: 20,
        sort_by: LEAD_FIELD_MAP.lastName,
        sort_order: 'asc'
      },
      undefined,
      expect.anything()
    );
  });

  it('gets a single record by id', async () => {
    const http = createHttpMock();
    const module = new LeadsModule(http as unknown as HttpClient);

    const record: Lead = { id: '1', lastName: 'Smith', company: 'Acme' };

    http.get.mockResolvedValue({
      data: { data: [record] },
      status: 200,
      headers: {}
    });

    const result = await module.get('1');

    expect(result).toEqual(record);
    expect(http.get).toHaveBeenCalledWith('/crm/v2/Leads/1', undefined, undefined, expect.anything());
  });

  it('throws NotFoundError when get returns an empty data array', async () => {
    const http = createHttpMock();
    const module = new LeadsModule(http as unknown as HttpClient);

    http.get.mockResolvedValue({
      data: { data: [] },
      status: 200,
      headers: {}
    });

    await expect(module.get('missing')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('creates records using data wrapper', async () => {
    const http = createHttpMock();
    const module = new LeadsModule(http as unknown as HttpClient);

    const payload: CreateLead = { lastName: 'Smith', company: 'Acme' };
    const created: Lead = { id: '10', ...payload };

    http.post.mockResolvedValue({
      data: { data: [created] },
      status: 201,
      headers: {}
    });

    const result = await module.create(payload);

    expect(result).toEqual(created);
    expect(http.post).toHaveBeenCalledWith('/crm/v2/Leads', { data: [payload] }, undefined, expect.anything());
  });

  it('rejects empty create payloads before calling the API', async () => {
    const http = createHttpMock();
    const module = new LeadsModule(http as unknown as HttpClient);

    await expect(module.create({} as CreateLead)).rejects.toBeInstanceOf(InputValidationError);
    expect(http.post).not.toHaveBeenCalled();
  });

  it('rejects unsafe ids before calling the API', async () => {
    const http = createHttpMock();
    const module = new LeadsModule(http as unknown as HttpClient);

    await expect(module.get('../bad')).rejects.toBeInstanceOf(InputValidationError);
    expect(http.get).not.toHaveBeenCalled();
  });

  it('updates records using data wrapper', async () => {
    const http = createHttpMock();
    const module = new LeadsModule(http as unknown as HttpClient);

    const payload: UpdateLead = { company: 'Updated' };
    const updated: Lead = { id: '10', lastName: 'Smith', company: 'Updated' };

    http.put.mockResolvedValue({
      data: { data: [updated] },
      status: 200,
      headers: {}
    });

    const result = await module.update('10', payload);

    expect(result).toEqual(updated);
    expect(http.put).toHaveBeenCalledWith('/crm/v2/Leads/10', { data: [payload] }, undefined, expect.anything());
  });

  it('deletes records with correct path', async () => {
    const http = createHttpMock();
    const module = new LeadsModule(http as unknown as HttpClient);

    http.delete.mockResolvedValue({
      data: { data: [] },
      status: 200,
      headers: {}
    });

    await module.delete('10');

    expect(http.delete).toHaveBeenCalledWith('/crm/v2/Leads/10', undefined, undefined, expect.anything());
  });
});
