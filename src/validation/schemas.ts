import { array, boolean, named, number, object, optional, record, string, unknown, type Schema } from './schema';

export const OAuthTokenResponseSchema = named(
  object(
    {
      access_token: string(),
      expires_in: number(),
      token_type: optional(string()),
      api_domain: optional(string()),
      refresh_token: optional(string())
    },
    { unknownKeys: 'passthrough' }
  ),
  'OAuthTokenResponse'
);

export const ZohoRecordSchema = named(
  object(
    {
      id: optional(string()),
      createdTime: optional(string()),
      modifiedTime: optional(string()),
      Created_Time: optional(string()),
      Modified_Time: optional(string())
    },
    { unknownKeys: 'passthrough' }
  ),
  'ZohoRecord'
);

export const LeadSchema = named(
  object(
    {
      id: optional(string()),
      firstName: optional(string()),
      lastName: optional(string()),
      company: optional(string()),
      email: optional(string()),
      phone: optional(string()),
      mobile: optional(string()),
      leadStatus: optional(string()),
      city: optional(string()),
      state: optional(string()),
      country: optional(string()),
      createdAt: optional(string()),
      modifiedAt: optional(string()),
      First_Name: optional(string()),
      Last_Name: optional(string()),
      Company: optional(string()),
      Email: optional(string()),
      Phone: optional(string()),
      Mobile: optional(string()),
      Lead_Status: optional(string()),
      City: optional(string()),
      State: optional(string()),
      Country: optional(string()),
      Created_Time: optional(string()),
      Modified_Time: optional(string())
    },
    { unknownKeys: 'passthrough' }
  ),
  'Lead'
);

export const ContactSchema = named(
  object(
    {
      id: optional(string()),
      firstName: optional(string()),
      lastName: optional(string()),
      email: optional(string()),
      phone: optional(string()),
      mobile: optional(string()),
      accountName: optional(string()),
      mailingCity: optional(string()),
      mailingState: optional(string()),
      mailingCountry: optional(string()),
      createdAt: optional(string()),
      modifiedAt: optional(string()),
      First_Name: optional(string()),
      Last_Name: optional(string()),
      Email: optional(string()),
      Phone: optional(string()),
      Mobile: optional(string()),
      Account_Name: optional(string()),
      Mailing_City: optional(string()),
      Mailing_State: optional(string()),
      Mailing_Country: optional(string()),
      Created_Time: optional(string()),
      Modified_Time: optional(string())
    },
    { unknownKeys: 'passthrough' }
  ),
  'Contact'
);

export const DealSchema = named(
  object(
    {
      id: optional(string()),
      name: optional(string()),
      stage: optional(string()),
      amount: optional(number()),
      closingDate: optional(string()),
      accountName: optional(string()),
      owner: optional(unknown()),
      createdAt: optional(string()),
      modifiedAt: optional(string()),
      Deal_Name: optional(string()),
      Stage: optional(string()),
      Amount: optional(number()),
      Closing_Date: optional(string()),
      Account_Name: optional(string()),
      Owner: optional(unknown()),
      Created_Time: optional(string()),
      Modified_Time: optional(string())
    },
    { unknownKeys: 'passthrough' }
  ),
  'Deal'
);

export const WebhookConfigSchema = named(
  object(
    {
      name: string(),
      url: string(),
      module: string(),
      events: array(string()),
      description: optional(string()),
      httpMethod: optional(string()),
      channel: optional(string()),
      parameters: optional(record(string()))
    },
    { unknownKeys: 'passthrough' }
  ),
  'WebhookConfig'
);

export const WebhookResponseSchema = named(
  object(
    {
      id: optional(string()),
      name: optional(string()),
      url: optional(string()),
      module: optional(string()),
      events: optional(array(string())),
      description: optional(string()),
      httpMethod: optional(string()),
      channel: optional(string()),
      parameters: optional(record(string())),
      isEnabled: optional(boolean()),
      createdTime: optional(string()),
      modifiedTime: optional(string()),
      is_enabled: optional(boolean()),
      created_time: optional(string()),
      modified_time: optional(string())
    },
    { unknownKeys: 'passthrough' }
  ),
  'WebhookResponse'
);

export const WebhookPayloadSchema = named(
  object(
    {
      module: optional(string()),
      event: optional(string()),
      channel_id: optional(string()),
      ids: optional(array(string())),
      payload: optional(unknown())
    },
    { unknownKeys: 'passthrough' }
  ),
  'WebhookPayload'
);

export const BulkReadJobResultSchema = named(
  object(
    {
      downloadUrl: optional(string()),
      page: optional(number()),
      moreRecords: optional(boolean()),
      fileType: optional(string()),
      download_url: optional(string()),
      more_records: optional(boolean()),
      file_type: optional(string())
    },
    { unknownKeys: 'passthrough' }
  ),
  'BulkReadJobResult'
);

export const BulkReadJobStatusSchema = named(
  object(
    {
      id: optional(string()),
      state: optional(string()),
      status: optional(string()),
      query: optional(record(unknown())),
      result: optional(BulkReadJobResultSchema),
      createdTime: optional(string()),
      modifiedTime: optional(string()),
      created_time: optional(string()),
      modified_time: optional(string())
    },
    { unknownKeys: 'passthrough' }
  ),
  'BulkReadJobStatus'
);

export const BulkWriteJobStatusSchema = named(
  object(
    {
      id: optional(string()),
      status: optional(string()),
      operation: optional(string()),
      result: optional(
        object(
          {
            downloadUrl: optional(string()),
            download_url: optional(string())
          },
          { unknownKeys: 'passthrough' }
        )
      ),
      createdTime: optional(string()),
      resource: optional(record(unknown())),
      created_time: optional(string())
    },
    { unknownKeys: 'passthrough' }
  ),
  'BulkWriteJobStatus'
);

export const ZohoDataResponseSchema = <T>(recordSchema: Schema<T>) =>
  named(
    object(
      {
        data: optional(array(recordSchema)),
        info: optional(record(unknown()))
      },
      { unknownKeys: 'passthrough' }
    ),
    `ZohoDataResponse<${recordSchema.name}>`
  );

export const ZohoActionResponseSchema = named(
  object(
    {
      data: optional(
        array(
          object(
            {
              status: optional(string()),
              code: optional(string()),
              message: optional(string()),
              details: optional(record(unknown()))
            },
            { unknownKeys: 'passthrough' }
          )
        )
      )
    },
    { unknownKeys: 'passthrough' }
  ),
  'ZohoActionResponse'
);

export const WebhookListResponseSchema = named(
  object(
    {
      webhooks: optional(array(WebhookResponseSchema))
    },
    { unknownKeys: 'passthrough' }
  ),
  'WebhookListResponse'
);
