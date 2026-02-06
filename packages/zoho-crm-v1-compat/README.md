# @yourcompany/zoho-crm-v1-compat

Compatibility adapter that lets you keep a v1-style API while running on the v2 SDK.

```ts
import { ZohoCRM as ZohoCRMv2 } from '@yourcompany/zoho-crm';
import { createV1Adapter } from '@yourcompany/zoho-crm-v1-compat';

const crmV2 = new ZohoCRMv2(config);
const crm = createV1Adapter(crmV2);

await crm.createLead({ first_name: 'John', last_name: 'Doe', company: 'Acme' });
```

This adapter is a temporary bridge and will be removed after v3.
