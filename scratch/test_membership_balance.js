import db from '../server/db.js';
import { getFullClientRecord } from '../server/index.js';

const clients = db.prepare("SELECT client_id, name, phone, membership_tier, membership_balance, last_membership_amount_used FROM CLIENTS WHERE membership_tier IS NOT NULL AND membership_tier != '' AND membership_tier != 'Non-Member'").all();

console.log('--- ALL VIP MEMBERS IN DB ---');
for (const c of clients) {
  const full = getFullClientRecord(c.client_id);
  console.log({
    id: c.client_id,
    name: c.name,
    tier: c.membership_tier,
    cost: full.client.membership_cost,
    credits_used: full.client.total_membership_credits_used,
    calculated_balance: full.client.membership_balance,
    visits_count: full.visit_history.length,
    visits_with_credits_used: full.visit_history.filter(v => (v.membership_amount_used || 0) > 0).length
  });
}
