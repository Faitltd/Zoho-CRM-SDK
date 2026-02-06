import type { ZohoCRMPlugin } from '@yourcompany/zoho-crm';
import { RequestError } from '@yourcompany/zoho-crm';

type RetryOptions = {
  maxRetries?: number;
  baseDelayMs?: number;
  jitterMs?: number;
};

export function createAdvancedRetryPlugin(options: RetryOptions = {}): ZohoCRMPlugin {
  const maxRetries = options.maxRetries ?? 4;
  const baseDelayMs = options.baseDelayMs ?? 250;
  const jitterMs = options.jitterMs ?? 100;

  return {
    name: '@yourcompany/zoho-crm-retry-advanced',
    version: '0.1.0',
    install(client) {
      client.registerMethod('requestWithAdvancedRetry', async <T>(fn: () => Promise<T>): Promise<T> => {
        let attempt = 0;
        while (true) {
          try {
            return await fn();
          } catch (error) {
            const retryable = error instanceof RequestError && (error.statusCode ?? 0) >= 500;
            if (!retryable || attempt >= maxRetries) {
              throw error;
            }
            const delay = Math.min(baseDelayMs * 2 ** attempt, 5_000) + Math.random() * jitterMs;
            await sleep(delay);
            attempt += 1;
          }
        }
      });
    },
    uninstall(client) {
      client.unregisterExtension('requestWithAdvancedRetry');
    }
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
