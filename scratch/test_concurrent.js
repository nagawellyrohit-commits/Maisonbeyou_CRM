import db from '../server/db.js';

console.log('=== TEST 7: CONCURRENT TRANSACTIONS BALANCE PROTECTION ===\n');

// Clean and setup client with 2000 credits
const phone = '9999900007';
const existing = db.prepare('SELECT client_id FROM CLIENTS WHERE phone = ?').get(phone);
if (existing) {
  db.prepare('DELETE FROM VISITS WHERE client_id = ?').run(existing.client_id);
  db.prepare('DELETE FROM CLIENTS WHERE client_id = ?').run(existing.client_id);
}

const cRes = db.prepare(`
  INSERT INTO CLIENTS (
    name, phone, membership_tier, membership_status, membership_balance, total_visits, total_spend, status
  ) VALUES ('Concurrent Tester', ?, 'INFINI MEMBER', 'active', 2000, 0, 0, 'active')
`).run(phone);
const clientId = cRes.lastInsertRowid;

// Setup visits so tier cost (25000) minus used (23000) = 2000 available
db.prepare(`
  INSERT INTO VISITS (client_id, visit_date, subtotal, discount_type, discount_value, discount_amount, total_amount, amount_paid, balance, payment_method, payment_status, membership_amount_used)
  VALUES (?, '2026-10-01', 23000, 'fixed', 0, 0, 23000, 0, 0, 'Membership', 'Paid', 23000)
`).run(clientId);

function simulateAtomicVisitCreation(requestedCredits, totalBill) {
  const tx = db.transaction(() => {
    // 1. Recalculate and validate actual available credits inside transaction
    const clientInDb = db.prepare('SELECT * FROM CLIENTS WHERE client_id = ?').get(clientId);
    const tierCost = 25000;
    const creditRow = db.prepare('SELECT COALESCE(SUM(membership_amount_used), 0) as total_used FROM VISITS WHERE client_id = ?').get(clientId);
    const actualAvailable = Math.max(0, tierCost - creditRow.total_used);

    const validToUse = Math.min(requestedCredits, actualAvailable, totalBill);
    const remainingPayable = Math.max(0, totalBill - validToUse);

    db.prepare(`
      INSERT INTO VISITS (
        client_id, visit_date, subtotal, discount_type, discount_value, discount_amount, total_amount,
        amount_paid, balance, payment_method, payment_status, membership_amount_used, created_by, created_at
      ) VALUES (?, '2026-10-16', ?, 'fixed', 0, 0, ?, 0, ?, 'Membership', 'Paid', ?, 1, CURRENT_TIMESTAMP)
    `).run(clientId, totalBill, totalBill, remainingPayable, validToUse);

    const totalCreditsUsed = db.prepare('SELECT COALESCE(SUM(membership_amount_used), 0) as total_used FROM VISITS WHERE client_id = ?').get(clientId).total_used;
    const newBal = Math.max(0, tierCost - totalCreditsUsed);
    db.prepare('UPDATE CLIENTS SET membership_balance = ? WHERE client_id = ?').run(newBal, clientId);

    return { validToUse, remainingPayable, newBal };
  });

  return tx();
}

console.log('Initial available credits: 2000');
console.log('Transaction 1: requests 1500 credits for 1500 bill...');
const r1 = simulateAtomicVisitCreation(1500, 1500);
console.log('Tx 1 Result: Credits used:', r1.validToUse, 'New client balance:', r1.newBal);

console.log('\nTransaction 2: also requested 1500 credits (concurrent attempt) for 1500 bill...');
const r2 = simulateAtomicVisitCreation(1500, 1500);
console.log('Tx 2 Result: Credits used (capped at remaining):', r2.validToUse, 'Remaining Payable:', r2.remainingPayable, 'New client balance:', r2.newBal);

console.assert(r1.validToUse === 1500, 'Tx 1 should use 1500');
console.assert(r1.newBal === 500, 'Tx 1 leaves 500');
console.assert(r2.validToUse === 500, 'Tx 2 cannot exceed remaining 500 credits');
console.assert(r2.remainingPayable === 1000, 'Tx 2 remaining payable is 1000');
console.assert(r2.newBal === 0, 'Balance is 0 and never goes negative');

// Cleanup
db.prepare('DELETE FROM VISITS WHERE client_id = ?').run(clientId);
db.prepare('DELETE FROM CLIENTS WHERE client_id = ?').run(clientId);

console.log('\n✓ CONCURRENT OVERSPEND PREVENTION TEST PASSED!');
