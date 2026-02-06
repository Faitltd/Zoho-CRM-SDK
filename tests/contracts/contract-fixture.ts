export type ContractModule = 'leads' | 'webhooks' | 'bulk';

export type ContractMethod =
  | 'list'
  | 'get'
  | 'create'
  | 'update'
  | 'delete'
  | 'initRead'
  | 'getReadStatus'
  | 'downloadReadResult';

export interface ContractRequest {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  params?: Record<string, string | number | boolean>;
  body?: unknown;
}

export interface ContractFixture {
  name: string;
  description?: string;
  call: {
    module: ContractModule;
    method: ContractMethod;
  };
  input: Record<string, unknown>;
  request: ContractRequest;
  response: unknown;
  expected: {
    result?: unknown;
  };
  live?: {
    enabled: boolean;
    requiresMutation?: boolean;
    env?: Record<string, string>;
  };
}
