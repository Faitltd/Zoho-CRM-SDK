import type { Schema } from '../validation';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestConfig<T = unknown> {
  method: HttpMethod;
  path: string;
  params?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
  timeout?: number; // ms
  schema?: Schema<T>;
  context?: Record<string, unknown>;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

export interface RawResponse {
  status: number;
  headers: Record<string, string>;
  body: NodeJS.ReadableStream;
}

export interface RetryConfig {
  maxRetries: number;
  initialDelay: number; // ms
  backoffMultiplier: number;
  maxDelay: number; // ms
}

export interface ConnectionPoolOptions {
  connections?: number;
  pipelining?: number;
  keepAliveTimeout?: number; // ms
  keepAliveMaxTimeout?: number; // ms
  headersTimeout?: number; // ms
  bodyTimeout?: number; // ms
}

export interface HttpClientOptions {
  timeoutMs?: number;
  connection?: ConnectionPoolOptions;
  /**
   * Allow plain HTTP requests for local testing only. Defaults to false.
   * Production usage should remain HTTPS-only.
   */
  allowInsecureHttp?: boolean;
}

export type { ZohoApiError } from '../types/shared';
