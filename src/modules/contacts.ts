import type { HttpClient } from '../http/http-client';
import type { Contact, CreateContact, UpdateContact } from '../types/contacts';
import { ContactSchema } from '../validation';
import { BaseModule } from './base';

/**
 * Contacts module (stable).
 *
 * @stability stable
 * @since 0.1.0
 */
export class ContactsModule extends BaseModule<Contact, CreateContact, UpdateContact> {
  constructor(http: HttpClient) {
    super(http, 'Contacts', ContactSchema);
  }
}
