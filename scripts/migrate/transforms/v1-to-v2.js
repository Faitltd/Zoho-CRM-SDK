/**
 * Codemod: v1 -> v2
 * - crm.createLead(...) -> crm.leads.create(...)
 * - crm.getLead(...) -> crm.leads.get(...)
 * - crm.listLeads(...) -> crm.leads.list(...)
 * - crm.updateLead(...) -> crm.leads.update(...)
 * - crm.deleteLead(...) -> crm.leads.delete(...)
 * - camelCase known snake_case keys in lead payloads
 */

const LEAD_KEY_MAP = {
  first_name: 'firstName',
  last_name: 'lastName',
  lead_status: 'leadStatus',
  company: 'company',
  email: 'email',
  phone: 'phone',
  mobile: 'mobile',
  city: 'city',
  state: 'state',
  country: 'country'
};

const METHOD_MAP = {
  createLead: 'create',
  getLead: 'get',
  listLeads: 'list',
  updateLead: 'update',
  deleteLead: 'delete'
};

module.exports = function transformer(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);

  root.find(j.CallExpression).forEach((path) => {
    const callee = path.node.callee;
    if (callee.type !== 'MemberExpression') return;

    const object = callee.object;
    const property = callee.property;
    if (!property || property.type !== 'Identifier') return;

    const mapped = METHOD_MAP[property.name];
    if (!mapped) return;

    // transform crm.createLead(...) -> crm.leads.create(...)
    const newCallee = j.memberExpression(
      j.memberExpression(object, j.identifier('leads')),
      j.identifier(mapped)
    );

    path.node.callee = newCallee;

    // Attempt to map snake_case keys in the first argument object
    const firstArg = path.node.arguments[0];
    if (firstArg && firstArg.type === 'ObjectExpression') {
      firstArg.properties.forEach((prop) => {
        if (prop.type !== 'Property') return;
        if (prop.key.type === 'Identifier') {
          const key = prop.key.name;
          if (LEAD_KEY_MAP[key]) {
            prop.key.name = LEAD_KEY_MAP[key];
          }
        } else if (prop.key.type === 'Literal' || prop.key.type === 'StringLiteral') {
          const key = String(prop.key.value);
          if (LEAD_KEY_MAP[key]) {
            prop.key.value = LEAD_KEY_MAP[key];
          } else if (key.includes('_')) {
            prop.comments = prop.comments || [];
            prop.comments.push(
              j.commentLine(' TODO: verify snake_case field conversion ') 
            );
          }
        }
      });
    }
  });

  return root.toSource({ quote: 'single' });
};
