import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { verifyWebhookSignature } from '@yourcompany/zoho-crm';

@Injectable()
export class ZohoCRMWebhookGuard implements CanActivate {
  constructor(private readonly secret: string) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const signature = request.headers['x-zoho-signature'] ?? '';
    const rawBody: Buffer | undefined = request.rawBody;

    if (!rawBody || !signature) {
      return false;
    }

    return verifyWebhookSignature(rawBody, String(signature), this.secret);
  }
}
