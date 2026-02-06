import type { Request, Response, NextFunction, RequestHandler, ErrorRequestHandler } from 'express';
import { ZohoError, verifyWebhookSignature, type RateLimiter, type ZohoCRM } from '@yourcompany/zoho-crm';

export type ZohoRequest = Request & { zoho?: ZohoCRM; rawBody?: Buffer };

export function createZohoCRMMiddleware(client: ZohoCRM): RequestHandler {
  return (req, _res, next) => {
    (req as ZohoRequest).zoho = client;
    next();
  };
}

export function createWebhookHandler(options: {
  secret: string;
  handler: (payload: unknown, req: ZohoRequest, res: Response) => void | Promise<void>;
}): RequestHandler {
  return async (req: ZohoRequest, res: Response) => {
    const signature = req.header('x-zoho-signature') ?? '';
    const raw = req.rawBody ?? Buffer.from('');
    if (!verifyWebhookSignature(raw, signature, options.secret)) {
      res.status(401).send('Unauthorized');
      return;
    }
    await options.handler(req.body, req, res);
  };
}

export function zohoErrorHandler(): ErrorRequestHandler {
  return (err, _req, res, _next) => {
    if (err instanceof ZohoError) {
      res.status(err.statusCode ?? 500).json({
        error: err.name,
        message: err.message,
        code: err.code
      });
      return;
    }
    res.status(500).json({ error: 'InternalServerError' });
  };
}

export function createZohoRateLimiterMiddleware(limiter: RateLimiter): RequestHandler {
  return (_req: Request, _res: Response, next: NextFunction) => {
    limiter
      .schedule(async () => {
        next();
      })
      .catch(next);
  };
}
