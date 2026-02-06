import { Injectable } from '@nestjs/common';
import { ZohoCRM } from '@yourcompany/zoho-crm';

@Injectable()
export class ZohoCRMService {
  constructor(readonly client: ZohoCRM) {}
}
