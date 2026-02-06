# Next.js Zoho CRM Starter (App Router)

This template shows a minimal App Router setup with:
- Server Actions for CRM calls.
- Webhook route handler.
- Environment-based configuration.

## Setup
1. Copy this folder into a new Next.js project.
2. Install dependencies:
   `npm install @yourcompany/zoho-crm @yourcompany/zoho-crm-nextjs`
3. Configure env vars in `.env.local`:
   `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`, `ZOHO_REGION`

## Suggested Files
- `app/actions/zoho.ts`
- `app/api/zoho/webhook/route.ts`
