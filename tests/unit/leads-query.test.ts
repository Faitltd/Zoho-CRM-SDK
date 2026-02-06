import { describe, expect, it, vi } from 'vitest';
import type { HttpClient } from '../../src/http/http-client';
import { InputValidationError } from '../../src/http/errors';
import { LeadsModule } from '../../src/modules/leads';
import { LeadQueryBuilder } from '../../src/modules/leads-query';
import type { Lead } from '../../src/types/leads';

type HttpClientMock = {
  get: ReturnType<typeof vi.fn>;
};

const createHttpMock = (): HttpClientMock => ({
  get: vi.fn()
});

describe('LeadQueryBuilder', () => {
  it('builds criteria and executes search', async () => {
    const http = createHttpMock();
    const builder = new LeadQueryBuilder(http as unknown as HttpClient);

    const data: Lead[] = [{ id: '1', lastName: 'Smith', company: 'Acme' }];
    http.get.mockResolvedValue({ data: { data }, status: 200, headers: {} });

    const result = await builder
      .where('Email', 'equals', 'a@b.com')
      .where('Lead_Status', 'equals', 'Qualified')
      .select(['id', 'Email'])
      .orderBy('Email', 'desc')
      .pageNumber(2)
      .perPageCount(5)
      .execute();

    expect(result).toEqual(data);
    expect(http.get).toHaveBeenCalledWith(
      '/crm/v2/Leads/search',
      {
        criteria: '(Email:equals:a@b.com)and(Lead_Status:equals:Qualified)',
        fields: 'id,Email',
        sort_by: 'Email',
        sort_order: 'desc',
        page: 2,
        per_page: 5
      },
      undefined,
      undefined
    );
  });

  it('throws when no criteria is provided', async () => {
    const http = createHttpMock();
    const builder = new LeadQueryBuilder(http as unknown as HttpClient);

    await expect(builder.execute()).rejects.toBeInstanceOf(InputValidationError);
  });
});

describe('LeadsModule search helpers', () => {
  it('searches by email via namespace', async () => {
    const http = createHttpMock();
    const module = new LeadsModule(http as unknown as HttpClient);
    const data: Lead[] = [{ id: '2', lastName: 'Doe', company: 'Beta' }];

    http.get.mockResolvedValue({ data: { data }, status: 200, headers: {} });

    const result = await module.search.byEmail('test@example.com', {
      fields: ['id'],
      page: 1,
      perPage: 10
    });

    expect(result).toEqual(data);
    expect(http.get).toHaveBeenCalledWith(
      '/crm/v2/Leads/search',
      {
        criteria: '(Email:equals:test@example.com)',
        fields: 'id',
        sort_by: undefined,
        sort_order: undefined,
        page: 1,
        per_page: 10
      },
      undefined,
      expect.anything()
    );
  });
});
