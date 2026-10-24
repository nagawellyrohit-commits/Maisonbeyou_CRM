import Database from 'better-sqlite3';

const db = new Database('server/maison_beyou.db');

// Reset Client 6 to fresh Infini member with 25000 credits
// Also clear older test visits' credits used so recalculation doesn't wipe it out
db.prepare(`
  UPDATE VISITS
  SET membership_amount_used = 0
  WHERE client_id = 6 AND visit_id IN (33, 35, 36)
`).run();

db.prepare(`
  UPDATE CLIENTS
  SET membership_tier = 'INFINI MEMBER',
      membership_status = 'active',
      membership_balance = 25000,
      membership_cost = 25000,
      last_membership_amount_used = 0
  WHERE client_id = 6
`).run();

// Also let's check visit 88 (today's visit for client 6)
db.prepare(`
  UPDATE VISITS
  SET membership_tier = 'INFINI MEMBER',
      membership_amount_used = 0,
      amount_paid = 0,
      balance = 1770,
      payment_status = 'Pending'
  WHERE visit_id = 88
`).run();

const updatedClient = db.prepare('SELECT client_id, name, membership_tier, membership_balance, membership_status FROM CLIENTS WHERE client_id = 6').get();
console.log('Updated Client 6:', updatedClient);

const updatedVisit = db.prepare('SELECT visit_id, client_id, total_amount, membership_tier, payment_status FROM VISITS WHERE visit_id = 88').get();
console.log('Updated Visit 88:', updatedVisit);
