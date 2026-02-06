import type { HttpClient } from '../http/http-client';
import type { Contact, CreateContact, UpdateContact } from '../types/contacts';
import { ContactSchema } from '../validation';
import { BaseModule } from './base';

export class ContactsModule extends BaseModule<Contact, CreateContact, UpdateContact> {
  constructor(http: HttpClient) {
    super(http, 'Contacts', ContactSchema);
  }
}
