import { Injectable } from '@nestjs/common';
import { ZohoCRM } from '@yourcompany/zoho-crm';

@Injectable()
export class ZohoCRMHealthService {
  constructor(private readonly client: ZohoCRM) {}

  async check(): Promise<boolean> {
    try {
      await this.client.http.get('/crm/v2/users', { type: 'ActiveUsers' });
      return true;
    } catch {
      return false;
    }
  }
}
