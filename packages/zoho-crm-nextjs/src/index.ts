import { ZohoAuth, ZohoCRM, verifyWebhookSignature } from '@yourcompany/zoho-crm';
import type { ZohoRegion } from '@yourcompany/zoho-crm';

export type ZohoEnvConfig = {
  ZOHO_CLIENT_ID?: string;
  ZOHO_CLIENT_SECRET?: string;
  ZOHO_REFRESH_TOKEN?: string;
  ZOHO_REGION?: ZohoRegion;
};

export function createZohoCRMFromEnv(env: ZohoEnvConfig = process.env): ZohoCRM {
  const region = env.ZOHO_REGION ?? 'US';
  const auth = new ZohoAuth({
    clientId: env.ZOHO_CLIENT_ID ?? '',
    clientSecret: env.ZOHO_CLIENT_SECRET ?? '',
    refreshToken: env.ZOHO_REFRESH_TOKEN ?? '',
    region
  });

  return new ZohoCRM({ auth, region });
}

export function createServerAction<Args extends unknown[], Result>(
  clientFactory: () => ZohoCRM,
  handler: (client: ZohoCRM, ...args: Args) => Promise<Result>
) {
  return async (...args: Args) => {
    const client = clientFactory();
    return handler(client, ...args);
  };
}

export type WebhookRouteHandler = (payload: unknown, req: Request) => Promise<Response> | Response;

export function createWebhookRouteHandler(options: { secret: string; handler: WebhookRouteHandler }) {
  return async (req: Request) => {
    const signature = req.headers.get('x-zoho-signature') ?? '';
    const rawBuffer = await req.arrayBuffer();
    const rawBody = Buffer.from(rawBuffer);

    if (!verifyWebhookSignature(rawBody, signature, options.secret)) {
      return new Response('Unauthorized', { status: 401 });
    }

    const contentType = req.headers.get('content-type') ?? '';
    const payload = await parseBody(rawBody, contentType);
    return options.handler(payload, req);
  };
}

async function parseBody(rawBody: Buffer, contentType: string): Promise<unknown> {
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const params = new URLSearchParams(rawBody.toString('utf8'));
    return Object.fromEntries(params.entries());
  }
  if (!rawBody.length) {
    return {};
  }
  return JSON.parse(rawBody.toString('utf8'));
}
