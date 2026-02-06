import type { ZohoCRM } from '@yourcompany/zoho-crm';

declare global {
  namespace Express {
    interface Request {
      zoho?: ZohoCRM;
      rawBody?: Buffer;
    }
  }
}

export {};
