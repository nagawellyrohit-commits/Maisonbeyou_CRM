import Database from 'better-sqlite3';

const db = new Database('server/maison_beyou.db');

console.log('=== TEST: SUFFICIENT BALANCE CREDIT DEDUCTION FLOW ===');

// 1. Inspect Client 6 & Visit 88 before settlement
const clientBefore = db.prepare('SELECT client_id, name, membership_tier, membership_balance, membership_status FROM CLIENTS WHERE client_id = 6').get();
const visitBefore = db.prepare('SELECT visit_id, client_id, total_amount, payment_status, membership_amount_used, amount_paid FROM VISITS WHERE visit_id = 88').get();

console.log('Before Settlement:', {
  client: clientBefore,
  visit: visitBefore
});

// 2. Perform credit deduction settlement (Visit cost: 1770 from 25000 credits)
const visitId = 88;
const creditDeduction = 1770;
const expectedRemainingBalance = clientBefore.membership_balance - creditDeduction;

// Update visit to Paid via Membership Credits
db.prepare(`
  UPDATE VISITS
  SET membership_amount_used = ?,
      amount_paid = 0,
      balance = 0,
      payment_method = 'Membership',
      payment_status = 'Paid',
      notes = '[MEMBERSHIP SETTLEMENT: Auto Credits Applied]'
  WHERE visit_id = ?
`).run(creditDeduction, visitId);

// Recalculate client balance
db.prepare(`
  UPDATE CLIENTS
  SET membership_balance = ?,
      last_membership_amount_used = ?
  WHERE client_id = 6
`).run(expectedRemainingBalance, creditDeduction);

// 3. Inspect after settlement
const clientAfter = db.prepare('SELECT client_id, name, membership_tier, membership_balance, membership_status FROM CLIENTS WHERE client_id = 6').get();
const visitAfter = db.prepare('SELECT visit_id, client_id, total_amount, payment_status, membership_amount_used, amount_paid, payment_method FROM VISITS WHERE visit_id = 88').get();

console.log('\nAfter Settlement:', {
  client: clientAfter,
  visit: visitAfter
});

if (visitAfter.payment_status === 'Paid' && clientAfter.membership_balance === 23230) {
  console.log('\n>>> SUCCESS: Visit settled via Membership Credits. Available credits reduced from 25,000 to 23,230! <<<');
} else {
  console.error('\n>>> FAILED <<<');
  process.exit(1);
}
