import Database from 'better-sqlite3';

const db = new Database('server/maison_beyou.db');

db.prepare(`
  UPDATE VISITS
  SET payment_status = 'Pending',
      membership_amount_used = 0,
      amount_paid = 0,
      balance = 1770,
      payment_method = 'UPI'
  WHERE visit_id = 88
`).run();

db.prepare(`
  UPDATE CLIENTS
  SET membership_balance = 25000,
      last_membership_amount_used = 0
  WHERE client_id = 6
`).run();

console.log('Reset visit 88 to Pending with 25000 balance for client 6.');
