import type { BaseClientInitConfig } from './base-client';
import { BaseClient } from './base-client';
import { ContactsModule } from '../modules/contacts';

export class ZohoCRM extends BaseClient {
  readonly contacts: ContactsModule;

  constructor(config: BaseClientInitConfig) {
    super(config);
    this.contacts = new ContactsModule(this.http, { fieldNameStyle: this.fieldNameStyle });
  }
}

export { ContactsModule } from '../modules/contacts';
export type { Contact, CreateContact, UpdateContact } from '../types/contacts';
export type { BaseClientInitConfig as ZohoCRMConfig } from './base-client';
