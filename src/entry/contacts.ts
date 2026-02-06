import type { BaseClientConfig } from './base-client';
import { BaseClient } from './base-client';
import { ContactsModule } from '../modules/contacts';

export class ZohoCRM extends BaseClient {
  readonly contacts: ContactsModule;

  constructor(config: BaseClientConfig) {
    super(config);
    this.contacts = new ContactsModule(this.http);
  }
}

export { ContactsModule } from '../modules/contacts';
export type { Contact, CreateContact, UpdateContact } from '../types/contacts';
export type { BaseClientConfig as ZohoCRMConfig } from './base-client';
