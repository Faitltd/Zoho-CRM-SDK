import { ZohoAuth, ZohoCRM } from '@yourcompany/zoho-crm';

interface JobRequest {
  customerName: string;
  company: string;
  email?: string;
  phone?: string;
  projectType: 'Remodel' | 'New Build' | 'Repair';
  budget?: number;
  requestedStart?: string;
}

const auth = new ZohoAuth({
  clientId: process.env.ZOHO_CLIENT_ID ?? '',
  clientSecret: process.env.ZOHO_CLIENT_SECRET ?? '',
  refreshToken: process.env.ZOHO_REFRESH_TOKEN ?? '',
  region: (process.env.ZOHO_REGION as 'US' | 'EU' | 'IN' | 'AU' | 'CN' | 'JP') ?? 'US'
});

const crm = new ZohoCRM({
  auth,
  region: (process.env.ZOHO_REGION as 'US' | 'EU' | 'IN' | 'AU' | 'CN' | 'JP') ?? 'US'
});

async function handleJobRequest(request: JobRequest) {
  // Create a lead with core fields.
  const lead = await crm.leads.create({
    lastName: request.customerName,
    company: request.company,
    email: request.email,
    phone: request.phone,
    // Custom fields should use Zoho API field names.
    Project_Type: request.projectType,
    Budget: request.budget,
    Requested_Start_Date: request.requestedStart
  });

  console.log('Created lead', lead.id);

  // Optionally create a deal for qualified requests.
  if (request.budget && request.budget > 50_000) {
    const deal = await crm.deals.create({
      dealName: `${request.company} - ${request.projectType}`,
      amount: request.budget,
      stage: 'Qualification',
      // Custom fields can also be added here.
      Project_Type: request.projectType,
      Lead_Reference: lead.id
    });

    console.log('Created deal', deal.id);
  }
}

const sampleRequest: JobRequest = {
  customerName: 'Jordan Lee',
  company: 'Lee Construction',
  email: 'jordan@example.com',
  phone: '+1-555-0100',
  projectType: 'Remodel',
  budget: 75000,
  requestedStart: '2026-03-01'
};

handleJobRequest(sampleRequest).catch((error) => {
  console.error('Failed to process job request:', error);
  process.exitCode = 1;
});
