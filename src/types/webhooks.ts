import type { ZohoRecord } from './shared';

// Maps ergonomic camelCase properties to Zoho API field names.
// Zoho's webhook payloads typically use snake_case keys like created_time, modified_time.
export const WEBHOOK_FIELD_MAP = {
  id: 'id',
  name: 'name',
  url: 'url',
  module: 'module',
  events: 'events',
  description: 'description',
  httpMethod: 'http_method',
  channel: 'channel',
  parameters: 'params',
  isEnabled: 'is_enabled',
  createdTime: 'created_time',
  modifiedTime: 'modified_time'
} as const;

export interface WebhookConfig {
  // name -> name
  name: string;
  // url -> url
  url: string;
  // module -> module
  module: string;
  // events -> events
  events: string[];
  // description -> description
  description?: string;
  // httpMethod -> http_method
  httpMethod?: 'GET' | 'POST' | 'PUT' | 'PATCH';
  // channel -> channel
  channel?: string;
  // parameters -> params
  parameters?: Record<string, string>;
  [key: string]: unknown;
}

export interface WebhookResponse extends ZohoRecord {
  name?: string;
  url?: string;
  module?: string;
  events?: string[];
  description?: string;
  httpMethod?: string;
  channel?: string;
  parameters?: Record<string, string>;
  isEnabled?: boolean;
  createdTime?: string;
  modifiedTime?: string;
  [key: string]: unknown;
}
