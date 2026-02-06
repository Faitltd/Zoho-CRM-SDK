export type EdgeRegion = 'US' | 'EU' | 'IN' | 'AU' | 'CN' | 'JP';

const REGION_API_BASE_URL: Record<EdgeRegion, string> = {
  US: 'https://www.zohoapis.com',
  EU: 'https://www.zohoapis.eu',
  IN: 'https://www.zohoapis.in',
  AU: 'https://www.zohoapis.com.au',
  CN: 'https://www.zohoapis.com.cn',
  JP: 'https://www.zohoapis.jp'
};

export interface EdgeClientConfig {
  region: EdgeRegion;
  getAccessToken: () => Promise<string>;
}

export function createEdgeClient(config: EdgeClientConfig) {
  const baseUrl = REGION_API_BASE_URL[config.region];

  return {
    async request<T>(method: string, path: string, body?: unknown): Promise<T> {
      const token = await config.getAccessToken();
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Zoho-oauthtoken ${token}`,
          'content-type': 'application/json'
        },
        body: body ? JSON.stringify(body) : undefined
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Zoho Edge request failed (${response.status}): ${text}`);
      }
      return (await response.json()) as T;
    }
  };
}

export async function verifyWebhookSignatureEdge(
  payload: ArrayBuffer | string,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const data = typeof payload === 'string' ? encoder.encode(payload) : new Uint8Array(payload);
  const computed = await crypto.subtle.sign('HMAC', key, data);
  const expected = bufferToHex(new Uint8Array(computed));
  const cleaned = signature.startsWith('sha256=') ? signature.slice(7) : signature;
  return timingSafeEqualHex(expected, cleaned);
}

function bufferToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
