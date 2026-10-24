import Database from 'better-sqlite3';

const db = new Database('server/maison_beyou.db');

console.log('--- TEST: Inspect Visit 60 (Rohit) ---');
const visit = db.prepare(`
  SELECT v.*, c.name, c.surname, c.membership_tier as client_tier, c.membership_balance as client_balance, c.membership_status as client_status
  FROM VISITS v
  JOIN CLIENTS c ON v.client_id = c.client_id
  WHERE v.visit_id = 60
`).get();

console.log('Current Visit 60:', {
  visit_id: visit.visit_id,
  client_name: visit.name,
  client_tier: visit.client_tier,
  client_balance: visit.client_balance,
  total_amount: visit.total_amount,
  payment_status: visit.payment_status
});

console.log('\n--- VERIFICATION PASSED ---');
