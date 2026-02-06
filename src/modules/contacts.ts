import type { HttpClient } from '../http/http-client';
import type { Contact, CreateContact, UpdateContact } from '../types/contacts';
import { ContactSchema } from '../validation';
import { BaseModule } from './base';
import { createRecordTransformer, type FieldNameStyle } from '../utils/field-mapping';
import { CONTACT_FIELD_MAP } from '../types/contacts';

/**
 * Contacts module (stable).
 *
 * @stability stable
 * @since 0.1.0
 */
export interface ContactsModuleOptions {
  fieldNameStyle?: FieldNameStyle;
}

export class ContactsModule extends BaseModule<Contact, CreateContact, UpdateContact> {
  constructor(http: HttpClient, options?: ContactsModuleOptions) {
    const fieldNameStyle = options?.fieldNameStyle ?? 'raw';
    const transformer =
      fieldNameStyle === 'camel'
        ? createRecordTransformer<Contact>(CONTACT_FIELD_MAP, fieldNameStyle)
        : undefined;
    super(http, 'Contacts', ContactSchema, transformer);
  }
}
