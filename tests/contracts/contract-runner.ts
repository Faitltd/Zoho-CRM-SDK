import { Readable } from 'node:stream';
import type { HttpClient } from '../../src/http/http-client';
import { BulkModule } from '../../src/modules/bulk';
import { LeadsModule } from '../../src/modules/leads';
import { WebhooksModule } from '../../src/modules/webhooks';
import type { ContractFixture, ContractRequest } from './contract-fixture';

type MockFn<TArgs extends unknown[], TResult> = ((...args: TArgs) => TResult) & {
  mock: { calls: TArgs[] };
  mockResolvedValue: (value: TResult extends Promise<unknown> ? Awaited<TResult> : TResult) => void;
  mockImplementation: (fn: (...args: TArgs) => TResult) => void;
};

type HttpClientMock = {
  get: MockFn<unknown[], Promise<unknown>>;
  post: MockFn<unknown[], Promise<unknown>>;
  put: MockFn<unknown[], Promise<unknown>>;
  delete: MockFn<unknown[], Promise<unknown>>;
  requestRaw: MockFn<unknown[], Promise<unknown>>;
};

export async function runContractFixture(fixture: ContractFixture) {
  const http = createHttpMock();
  const responsePayload = fixture.response;

  switch (fixture.call.module) {
    case 'leads':
      return runLeadsFixture(http, fixture, responsePayload);
    case 'webhooks':
      return runWebhooksFixture(http, fixture, responsePayload);
    case 'bulk':
      return runBulkFixture(http, fixture, responsePayload);
    default:
      throw new Error(`Unsupported contract module: ${fixture.call.module}`);
  }
}

function createHttpMock(): HttpClientMock {
  return {
    get: createMockFn(),
    post: createMockFn(),
    put: createMockFn(),
    delete: createMockFn(),
    requestRaw: createMockFn()
  };
}

function createMockFn<TArgs extends unknown[], TResult>(): MockFn<TArgs, TResult> {
  let impl: (...args: TArgs) => TResult = () => undefined as TResult;
  const calls: TArgs[] = [];

  const fn = ((...args: TArgs) => {
    calls.push(args);
    return impl(...args);
  }) as MockFn<TArgs, TResult>;

  fn.mock = { calls };
  fn.mockResolvedValue = (value) => {
    impl = () => Promise.resolve(value) as TResult;
  };
  fn.mockImplementation = (next) => {
    impl = next;
  };

  return fn;
}

async function runLeadsFixture(
  http: HttpClientMock,
  fixture: ContractFixture,
  responsePayload: unknown
) {
  const leads = new LeadsModule(http as unknown as HttpClient);

  if (fixture.call.method === 'list') {
    http.get.mockResolvedValue({ data: responsePayload, status: 200, headers: {} });
    const options = fixture.input.options as Record<string, unknown> | undefined;
    const result = await leads.list(options as never);
    return {
      request: getRequestFromMock(http, 'get'),
      result
    };
  }

  if (fixture.call.method === 'get') {
    http.get.mockResolvedValue({ data: responsePayload, status: 200, headers: {} });
    const result = await leads.get(fixture.input.id as string);
    return {
      request: getRequestFromMock(http, 'get'),
      result
    };
  }

  if (fixture.call.method === 'create') {
    http.post.mockResolvedValue({ data: responsePayload, status: 201, headers: {} });
    const result = await leads.create(fixture.input.payload);
    return {
      request: getRequestFromMock(http, 'post'),
      result
    };
  }

  if (fixture.call.method === 'update') {
    http.put.mockResolvedValue({ data: responsePayload, status: 200, headers: {} });
    const result = await leads.update(fixture.input.id as string, fixture.input.payload);
    return {
      request: getRequestFromMock(http, 'put'),
      result
    };
  }

  if (fixture.call.method === 'delete') {
    http.delete.mockResolvedValue({ data: responsePayload, status: 200, headers: {} });
    const result = await leads.delete(fixture.input.id as string);
    return {
      request: getRequestFromMock(http, 'delete'),
      result
    };
  }

  throw new Error(`Unsupported leads method: ${fixture.call.method}`);
}

async function runWebhooksFixture(
  http: HttpClientMock,
  fixture: ContractFixture,
  responsePayload: unknown
) {
  const webhooks = new WebhooksModule(http as unknown as HttpClient);

  if (fixture.call.method === 'list') {
    http.get.mockResolvedValue({ data: responsePayload, status: 200, headers: {} });
    const result = await webhooks.list();
    return {
      request: getRequestFromMock(http, 'get'),
      result
    };
  }

  if (fixture.call.method === 'get') {
    http.get.mockResolvedValue({ data: responsePayload, status: 200, headers: {} });
    const result = await webhooks.get(fixture.input.id as string);
    return {
      request: getRequestFromMock(http, 'get'),
      result
    };
  }

  if (fixture.call.method === 'create') {
    http.post.mockResolvedValue({ data: responsePayload, status: 201, headers: {} });
    const result = await webhooks.create(fixture.input.payload);
    return {
      request: getRequestFromMock(http, 'post'),
      result
    };
  }

  if (fixture.call.method === 'update') {
    http.put.mockResolvedValue({ data: responsePayload, status: 200, headers: {} });
    const result = await webhooks.update(fixture.input.id as string, fixture.input.payload);
    return {
      request: getRequestFromMock(http, 'put'),
      result
    };
  }

  if (fixture.call.method === 'delete') {
    http.delete.mockResolvedValue({ data: responsePayload, status: 200, headers: {} });
    const result = await webhooks.delete(fixture.input.id as string);
    return {
      request: getRequestFromMock(http, 'delete'),
      result
    };
  }

  throw new Error(`Unsupported webhooks method: ${fixture.call.method}`);
}

async function runBulkFixture(
  http: HttpClientMock,
  fixture: ContractFixture,
  responsePayload: unknown
) {
  const bulk = new BulkModule(http as unknown as HttpClient);

  if (fixture.call.method === 'initRead') {
    http.post.mockResolvedValue({ data: responsePayload, status: 200, headers: {} });
    const result = await bulk.initRead(fixture.input.config as never);
    return {
      request: getRequestFromMock(http, 'post'),
      result
    };
  }

  if (fixture.call.method === 'getReadStatus') {
    http.get.mockResolvedValue({ data: responsePayload, status: 200, headers: {} });
    const result = await bulk.getReadStatus(fixture.input.id as string);
    return {
      request: getRequestFromMock(http, 'get'),
      result
    };
  }

  if (fixture.call.method === 'downloadReadResult') {
    const raw = (responsePayload as { raw?: string[] })?.raw ?? [];
    http.requestRaw.mockResolvedValue({
      status: 200,
      headers: {},
      body: Readable.from(raw)
    });
    const result = await bulk.downloadReadResult(fixture.input.id as string);
    return {
      request: getRequestFromMock(http, 'requestRaw'),
      result
    };
  }

  throw new Error(`Unsupported bulk method: ${fixture.call.method}`);
}

function getRequestFromMock(http: HttpClientMock, method: keyof HttpClientMock): ContractRequest {
  const call = http[method].mock.calls[0] ?? [];
  const [path, paramsOrBody] = call;

  switch (method) {
    case 'get':
    case 'delete':
      return {
        method: method === 'get' ? 'GET' : 'DELETE',
        path,
        params: paramsOrBody ?? undefined
      };
    case 'post':
      return {
        method: 'POST',
        path,
        body: paramsOrBody
      };
    case 'put':
      return {
        method: 'PUT',
        path,
        body: paramsOrBody
      };
    case 'requestRaw': {
      const config = (call[0] ?? {}) as {
        method?: ContractRequest['method'];
        path?: string;
        params?: ContractRequest['params'];
        body?: ContractRequest['body'];
      };
      return {
        method: config.method ?? 'GET',
        path: config.path ?? '',
        params: config.params,
        body: config.body
      };
    }
    default:
      return {
        method: 'GET',
        path
      };
  }
}
