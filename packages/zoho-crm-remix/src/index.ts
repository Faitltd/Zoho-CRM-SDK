import { ZohoAuth, ZohoCRM, verifyWebhookSignature } from '@yourcompany/zoho-crm';
import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import type { ZohoRegion } from '@yourcompany/zoho-crm';

export type RemixEnvConfig = {
  ZOHO_CLIENT_ID?: string;
  ZOHO_CLIENT_SECRET?: string;
  ZOHO_REFRESH_TOKEN?: string;
  ZOHO_REGION?: ZohoRegion;
};

export function createZohoCRMFromEnv(env: RemixEnvConfig = process.env): ZohoCRM {
  const region = env.ZOHO_REGION ?? 'US';
  const auth = new ZohoAuth({
    clientId: env.ZOHO_CLIENT_ID ?? '',
    clientSecret: env.ZOHO_CLIENT_SECRET ?? '',
    refreshToken: env.ZOHO_REFRESH_TOKEN ?? '',
    region
  });

  return new ZohoCRM({ auth, region });
}

export function withZohoCRMLoader<T>(
  factory: () => ZohoCRM,
  handler: (crm: ZohoCRM, args: LoaderFunctionArgs) => Promise<T>
) {
  return async (args: LoaderFunctionArgs) => handler(factory(), args);
}

export function withZohoCRMAction<T>(
  factory: () => ZohoCRM,
  handler: (crm: ZohoCRM, args: ActionFunctionArgs) => Promise<T>
) {
  return async (args: ActionFunctionArgs) => handler(factory(), args);
}

export async function verifyWebhookRequest(request: Request, secret: string): Promise<unknown> {
  const rawBody = Buffer.from(await request.arrayBuffer());
  const signature = request.headers.get('x-zoho-signature') ?? '';
  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    throw new Response('Unauthorized', { status: 401 });
  }
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const params = new URLSearchParams(rawBody.toString('utf8'));
    return Object.fromEntries(params.entries());
  }
  return JSON.parse(rawBody.toString('utf8'));
}
