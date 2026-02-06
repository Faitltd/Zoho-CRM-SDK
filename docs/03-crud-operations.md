# CRUD Operations

## Modules
- Leads, Contacts, Deals

## Common Patterns
- list, get, create, update, delete
- Pagination and sorting
- Field selection (data minimization)

## Payload Shape
- { data: [payload] } wrapper
- Unwrapping response data

## Examples
- Create a lead
- Update a contact
- Delete a deal
- Fetch specific fields: `crm.leads.get(id, { fields: ['Last_Name', 'Email'] })`
