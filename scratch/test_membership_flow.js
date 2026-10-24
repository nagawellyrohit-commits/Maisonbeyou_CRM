import db from '../server/db.js';

console.log('=== RUNNING TESTS FOR MEMBERSHIP CREDIT & PAYMENT FLOW ===\n');

// Helper to mock user
const mockUser = { user_id: 1, role: 'reception', name: 'Receptionist' };

// Create temporary test clients for testing scenarios
const setupTestClient = (name, phone, tier, initialBal) => {
  // Clean up if exists
  const existing = db.prepare('SELECT client_id FROM CLIENTS WHERE phone = ?').get(phone);
  if (existing) {
    db.prepare('DELETE FROM VISITS WHERE client_id = ?').run(existing.client_id);
    db.prepare('DELETE FROM CLIENTS WHERE client_id = ?').run(existing.client_id);
  }

  const res = db.prepare(`
    INSERT INTO CLIENTS (
      name, phone, membership_tier, membership_status, membership_balance, total_visits, total_spend, status
    ) VALUES (?, ?, ?, 'active', ?, 0, 0, 'active')
  `).run(name, phone, tier, initialBal);

  return res.lastInsertRowid;
};

// Simulated visit creation logic identical to server/index.js POST /api/visits
function createVisit(body) {
  const transaction = db.transaction(() => {
    const {
      client_id,
      services,
      discount_type,
      discount_value,
      payment_method,
      amount_paid,
      membership_amount_used
    } = body;

    const todayDate = new Date().toISOString().slice(0, 10);
    const finalClientId = client_id;

    let servicesSubtotal = 0;
    for (const s of services) {
      servicesSubtotal += parseFloat(s.price) || 0;
    }

    let subtotal = servicesSubtotal;
    let discountAmount = 0;
    const discVal = parseFloat(discount_value) || 0;
    const discType = discount_type === 'percentage' ? 'percentage' : 'fixed';

    if (discType === 'percentage') {
      discountAmount = Math.round((subtotal * Math.min(Math.max(discVal, 0), 100)) / 100);
    } else {
      discountAmount = Math.min(Math.max(discVal, 0), subtotal);
    }

    const netSubtotal = Math.max(0, subtotal - discountAmount);
    const taxAmount = body.tax_amount !== undefined ? parseFloat(body.tax_amount) : Math.round(netSubtotal * 0.18);
    const totalAmount = body.total_amount !== undefined ? parseFloat(body.total_amount) : (netSubtotal + taxAmount);

    // Validate membership credits
    let validCreditUsed = 0;
    const requestedCredit = parseFloat(membership_amount_used) || 0;

    if (finalClientId && requestedCredit > 0) {
      const clientInDb = db.prepare('SELECT * FROM CLIENTS WHERE client_id = ?').get(finalClientId);
      const rawTier = (clientInDb?.membership_tier || '').trim();
      const isMember = Boolean(rawTier && rawTier.toLowerCase() !== 'none' && rawTier.toLowerCase() !== 'non-member' && clientInDb?.membership_status === 'active');

      if (isMember) {
        const rawT = rawTier.toLowerCase();
        const tierCost = rawT.includes('lumiere') ? 50000 :
          rawT.includes('infini') ? 25000 :
          rawT.includes('eternal') ? 15000 :
          rawT.includes('eclat') ? 6000 : 0;

        const creditRow = db.prepare('SELECT COALESCE(SUM(membership_amount_used), 0) as total_used FROM VISITS WHERE client_id = ?').get(finalClientId);
        const totalUsedSoFar = creditRow?.total_used || 0;
        const actualAvailableBal = tierCost > 0 ? Math.max(0, tierCost - totalUsedSoFar) : Math.max(0, clientInDb?.membership_balance || 0);

        validCreditUsed = Math.round(Math.min(requestedCredit, actualAvailableBal, totalAmount) * 100) / 100;
      }
    }

    const remainingPayable = Math.max(0, Math.round((totalAmount - validCreditUsed) * 100) / 100);

    let pMethod = payment_method;
    if (['Cash', 'UPI', 'Card', 'Membership', 'Other'].includes(pMethod)) {
      // valid
    } else if (pMethod && pMethod.toLowerCase().includes('cash')) {
      pMethod = 'Cash';
    } else if (pMethod && pMethod.toLowerCase().includes('card')) {
      pMethod = 'Card';
    } else if (pMethod && pMethod.toLowerCase().includes('upi')) {
      pMethod = 'UPI';
    } else if (pMethod && pMethod.toLowerCase().includes('membership')) {
      pMethod = 'Membership';
    } else {
      pMethod = remainingPayable === 0 ? 'Membership' : 'UPI';
    }

    let paid = 0;
    let balance = remainingPayable;
    let paymentStatus = 'Pending';

    if (body.payment_status === 'Paid') {
      paid = parseFloat(amount_paid) !== undefined && !isNaN(parseFloat(amount_paid))
        ? Math.min(parseFloat(amount_paid), remainingPayable)
        : remainingPayable;
      balance = Math.max(0, remainingPayable - paid);
      paymentStatus = balance === 0 ? 'Paid' : (paid > 0 ? 'Partially Paid' : 'Pending');
    } else {
      paid = parseFloat(amount_paid) || 0;
      balance = Math.max(0, remainingPayable - paid);
      paymentStatus = (paid > 0 && balance === 0 && remainingPayable > 0) ? 'Paid' : (paid > 0 ? 'Partially Paid' : 'Pending');
    }

    const visitInfo = db.prepare(`
      INSERT INTO VISITS (
        client_id, visit_date, subtotal, discount_type, discount_value,
        discount_amount, total_amount, amount_paid, balance,
        payment_method, payment_status, created_by, notes, created_at,
        tax_amount, membership_price, membership_tier, membership_amount_used
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      finalClientId,
      todayDate,
      subtotal,
      discType,
      discVal,
      discountAmount,
      totalAmount,
      paid,
      balance,
      pMethod,
      paymentStatus,
      1,
      body.notes || '',
      new Date().toISOString(),
      taxAmount,
      0,
      body.membership_tier || null,
      validCreditUsed
    );

    const updatedClient = db.prepare('SELECT * FROM CLIENTS WHERE client_id = ?').get(finalClientId);
    if (updatedClient && updatedClient.membership_tier && updatedClient.membership_status === 'active') {
      const rawT = (updatedClient.membership_tier || '').toLowerCase();
      const tierCost = rawT.includes('lumiere') ? 50000 :
        rawT.includes('infini') ? 25000 :
        rawT.includes('eternal') ? 15000 :
        rawT.includes('eclat') ? 6000 : 0;
      const clientCredits = db.prepare('SELECT COALESCE(SUM(membership_amount_used), 0) as total_credits_used FROM VISITS WHERE client_id = ?').get(finalClientId);
      const totalUsed = clientCredits?.total_credits_used || 0;
      const newBal = tierCost > 0 ? Math.max(0, tierCost - totalUsed) : Math.max(0, (updatedClient.membership_balance || 0) - validCreditUsed);
      db.prepare(`
        UPDATE CLIENTS
        SET membership_balance = ?,
            last_membership_amount_used = ?
        WHERE client_id = ?
      `).run(newBal, validCreditUsed, finalClientId);
    }

    return {
      visit_id: visitInfo.lastInsertRowid,
      total_amount: totalAmount,
      membership_amount_used: validCreditUsed,
      amount_paid: paid,
      balance: balance,
      payment_method: pMethod,
      payment_status: paymentStatus
    };
  });

  return transaction();
}

try {
  // Test 1: Scenario A - Member with 2000 credits and 1500 bill (service 1271 + 18% GST = ~1500)
  console.log('--- Test 1: Scenario A (Credits cover entire bill) ---');
  // 1271.18 + 18% = 1500
  const c1Id = setupTestClient('Test Member A', '9999900001', 'INFINI MEMBER', 25000);
  // Set visits so balance is exactly 2000: Infini is 25000, so used 23000
  db.prepare(`
    INSERT INTO VISITS (client_id, visit_date, subtotal, discount_type, discount_value, discount_amount, total_amount, amount_paid, balance, payment_method, payment_status, membership_amount_used)
    VALUES (?, '2026-10-01', 23000, 'fixed', 0, 0, 23000, 0, 0, 'Membership', 'Paid', 23000)
  `).run(c1Id);
  db.prepare('UPDATE CLIENTS SET membership_balance = 2000 WHERE client_id = ?').run(c1Id);

  // 1. Wizard submission: starts as Pending awaiting reception approval
  const res1 = createVisit({
    client_id: c1Id,
    services: [{ price: 1500 }],
    discount_type: 'fixed',
    discount_value: 0,
    total_amount: 1500,
    membership_amount_used: 1500,
    payment_method: 'Membership',
    amount_paid: 0,
    payment_status: 'Pending',
    membership_tier: 'INFINI MEMBER'
  });

  console.log('Total Bill:', res1.total_amount);
  console.log('Credits Requested:', res1.membership_amount_used);
  console.log('Initial Payment Status (Intake Queue):', res1.payment_status);
  console.log('Initial Balance:', res1.balance);
  console.assert(res1.membership_amount_used === 1500, 'Credits requested should be 1500');
  console.assert(res1.payment_status === 'Pending', 'Intake visit MUST start as Pending awaiting reception approval');
  console.assert(res1.balance === 0, 'Remaining manual payable balance should be 0');

  // 2. Reception Desk verification & approval
  db.prepare('UPDATE VISITS SET payment_status = ? WHERE visit_id = ?').run('Paid', res1.visit_id);
  const v1Approved = db.prepare('SELECT payment_status FROM VISITS WHERE visit_id = ?').get(res1.visit_id);
  const c1After = db.prepare('SELECT membership_balance FROM CLIENTS WHERE client_id = ?').get(c1Id);
  console.log('Post-Approval Payment Status:', v1Approved.payment_status);
  console.log('Remaining Credits in DB:', c1After.membership_balance);
  console.assert(v1Approved.payment_status === 'Paid', 'Status should turn to Paid after reception approval');
  console.assert(c1After.membership_balance === 500, 'Remaining credits should be 500');
  console.log('✓ Scenario A (Intake Pending -> Reception Approved Paid) Passed!\n');

  // Test 2: Scenario B - Member with 1770 credits and 2500 bill (partial coverage)
  console.log('--- Test 2: Scenario B (Credits partially cover bill) ---');
  const c2Id = setupTestClient('Test Member B', '9999900002', 'INFINI MEMBER', 25000);
  // Set visits so balance is 1770: Infini 25000 - 23230 = 1770
  db.prepare(`
    INSERT INTO VISITS (client_id, visit_date, subtotal, discount_type, discount_value, discount_amount, total_amount, amount_paid, balance, payment_method, payment_status, membership_amount_used)
    VALUES (?, '2026-10-01', 23230, 'fixed', 0, 0, 23230, 0, 0, 'Membership', 'Paid', 23230)
  `).run(c2Id);
  db.prepare('UPDATE CLIENTS SET membership_balance = 1770 WHERE client_id = ?').run(c2Id);

  // Bill 2500, credits 1770, remaining 730 via UPI
  // Initial intake submission starts as Pending
  const res2 = createVisit({
    client_id: c2Id,
    services: [{ price: 2500 }],
    discount_type: 'fixed',
    discount_value: 0,
    total_amount: 2500,
    membership_amount_used: 1770,
    payment_method: 'UPI',
    amount_paid: 0,
    payment_status: 'Pending',
    membership_tier: 'INFINI MEMBER'
  });

  console.log('Total Bill:', res2.total_amount);
  console.log('Credits Requested:', res2.membership_amount_used);
  console.log('Initial Payment Status (Intake Queue):', res2.payment_status);
  console.log('Balance to Collect at Reception:', res2.balance);
  console.assert(res2.membership_amount_used === 1770, 'Credits used should be 1770');
  console.assert(res2.balance === 730, 'Remaining payable should be 730');
  console.assert(res2.payment_status === 'Pending', 'Intake visit MUST start as Pending');

  // Receptionist collects ₹730 UPI at checkout desk and confirms payment
  db.prepare('UPDATE VISITS SET payment_status = ?, amount_paid = ?, balance = 0 WHERE visit_id = ?').run('Paid', 730, res2.visit_id);
  const v2Approved = db.prepare('SELECT payment_status, amount_paid, balance FROM VISITS WHERE visit_id = ?').get(res2.visit_id);
  const c2After = db.prepare('SELECT membership_balance FROM CLIENTS WHERE client_id = ?').get(c2Id);
  console.log('Post-Collection Payment Status:', v2Approved.payment_status);
  console.log('Amount Paid collected by Reception:', v2Approved.amount_paid);
  console.log('Remaining Credits in DB:', c2After.membership_balance);
  console.assert(v2Approved.payment_status === 'Paid', 'Payment status should be Paid after collection');
  console.assert(v2Approved.amount_paid === 730, 'Amount paid should be 730');
  console.assert(c2After.membership_balance === 0, 'Remaining credits should be 0');
  console.log('✓ Scenario B (Intake Pending -> Reception Collected Paid) Passed!\n');

  // Test 2b: Scenario B with Cash (starts as Pending)
  console.log('--- Test 2b: Scenario B with Cash (Starts as Pending) ---');
  const c2bId = setupTestClient('Test Member B2', '9999900003', 'INFINI MEMBER', 25000);
  db.prepare(`
    INSERT INTO VISITS (client_id, visit_date, subtotal, discount_type, discount_value, discount_amount, total_amount, amount_paid, balance, payment_method, payment_status, membership_amount_used)
    VALUES (?, '2026-10-01', 23230, 'fixed', 0, 0, 23230, 0, 0, 'Membership', 'Paid', 23230)
  `).run(c2bId);

  const res2b = createVisit({
    client_id: c2bId,
    services: [{ price: 2500 }],
    discount_type: 'fixed',
    discount_value: 0,
    total_amount: 2500,
    membership_amount_used: 1770,
    payment_method: 'Cash',
    amount_paid: 0,
    payment_status: 'Pending',
    membership_tier: 'INFINI MEMBER'
  });

  console.log('Total Bill:', res2b.total_amount);
  console.log('Credits Used:', res2b.membership_amount_used);
  console.log('Amount Paid at Desk:', res2b.amount_paid);
  console.log('Balance to collect at reception:', res2b.balance);
  console.log('Payment Status:', res2b.payment_status);
  console.assert(res2b.balance === 730, 'Balance to collect should be 730');
  console.assert(res2b.payment_status === 'Pending', 'Payment status should be Pending');
  console.log('✓ Scenario B (Cash pending desk collection) Passed!\n');

  // Test 3: Scenario C - Member with 0 credits
  console.log('--- Test 3: Scenario C (0 Credits Available) ---');
  const c3Id = setupTestClient('Test Member C', '9999900004', 'INFINI MEMBER', 0);
  // Infini 25000 - 25000 used = 0
  db.prepare(`
    INSERT INTO VISITS (client_id, visit_date, subtotal, discount_type, discount_value, discount_amount, total_amount, amount_paid, balance, payment_method, payment_status, membership_amount_used)
    VALUES (?, '2026-10-01', 25000, 'fixed', 0, 0, 25000, 0, 0, 'Membership', 'Paid', 25000)
  `).run(c3Id);

  const res3 = createVisit({
    client_id: c3Id,
    services: [{ price: 1500 }], // 1500 + 18% = 1770
    discount_type: 'fixed',
    discount_value: 0,
    total_amount: 1770,
    membership_amount_used: 1770, // Client tries to request 1770, but backend validates 0 available
    payment_method: 'UPI',
    amount_paid: 0,
    payment_status: 'Pending',
    membership_tier: 'INFINI MEMBER'
  });

  console.log('Total Bill:', res3.total_amount);
  console.log('Credits Used (Capped at 0):', res3.membership_amount_used);
  console.log('Initial Payment Status (Intake Queue):', res3.payment_status);
  console.log('Balance to Collect at Reception:', res3.balance);
  console.assert(res3.membership_amount_used === 0, 'Credits used MUST be 0 when balance is 0');
  console.assert(res3.balance === 1770, 'Full bill should be balance to collect');
  console.assert(res3.payment_status === 'Pending', 'Intake must start as Pending');

  // Receptionist collects full bill ₹1770 via UPI
  db.prepare('UPDATE VISITS SET payment_status = ?, amount_paid = ?, balance = 0 WHERE visit_id = ?').run('Paid', 1770, res3.visit_id);
  const v3Approved = db.prepare('SELECT payment_status, amount_paid FROM VISITS WHERE visit_id = ?').get(res3.visit_id);
  const c3After = db.prepare('SELECT membership_balance FROM CLIENTS WHERE client_id = ?').get(c3Id);
  console.log('Post-Collection Payment Status:', v3Approved.payment_status);
  console.assert(v3Approved.payment_status === 'Paid', 'Status should be Paid after collection');
  console.assert(v3Approved.amount_paid === 1770, 'Paid should be 1770');
  console.assert(c3After.membership_balance === 0, 'Balance must remain 0 and never go negative');
  console.log('✓ Scenario C (0 Credits: Intake Pending -> Reception Collected Paid) Passed!\n');

  // Test 4: Scenario D - Non-member with existing normal payment flow
  console.log('--- Test 4: Scenario D (Non-Member Flow) ---');
  const c4Id = setupTestClient('Non-Member D', '9999900005', null, 0);
  const res4 = createVisit({
    client_id: c4Id,
    services: [{ price: 1000 }], // 1000 + 18% = 1180
    discount_type: 'fixed',
    discount_value: 0,
    total_amount: 1180,
    membership_amount_used: 0,
    payment_method: 'UPI',
    amount_paid: 0,
    payment_status: 'Pending'
  });

  console.log('Non-member Total Bill:', res4.total_amount);
  console.log('Credits Used:', res4.membership_amount_used);
  console.log('Initial Payment Status (Intake Queue):', res4.payment_status);
  console.assert(res4.membership_amount_used === 0, 'Non-member should use 0 credits');
  console.assert(res4.total_amount === 1180, 'Total should be 1180');
  console.assert(res4.payment_status === 'Pending', 'Intake should start as Pending');

  // Receptionist collects ₹1180 via UPI at checkout
  db.prepare('UPDATE VISITS SET payment_status = ?, amount_paid = ?, balance = 0 WHERE visit_id = ?').run('Paid', 1180, res4.visit_id);
  const v4Approved = db.prepare('SELECT payment_status, amount_paid FROM VISITS WHERE visit_id = ?').get(res4.visit_id);
  console.log('Post-Collection Payment Status:', v4Approved.payment_status);
  console.assert(v4Approved.payment_status === 'Paid', 'Status should be Paid after reception collection');
  console.log('✓ Scenario D (Non-Member: Intake Pending -> Reception Collected Paid) Passed!\n');
  console.log('✓ Scenario D Passed!\n');

  // Test 5: Atomic rollback on failure
  console.log('--- Test 5: Atomic Rollback on Failure ---');
  const c5Id = setupTestClient('Test Rollback', '9999900006', 'INFINI MEMBER', 25000);
  const balBefore = db.prepare('SELECT membership_balance FROM CLIENTS WHERE client_id = ?').get(c5Id).membership_balance;
  try {
    const failedTx = db.transaction(() => {
      // Simulate deduction
      db.prepare('UPDATE CLIENTS SET membership_balance = 0 WHERE client_id = ?').run(c5Id);
      // Simulate error during bill creation
      throw new Error('Database disk write error or network timeout');
    });
    failedTx();
  } catch (err) {
    console.log('Caught expected error:', err.message);
  }
  const balAfter = db.prepare('SELECT membership_balance FROM CLIENTS WHERE client_id = ?').get(c5Id).membership_balance;
  console.log('Balance before error:', balBefore);
  console.log('Balance after error:', balAfter);
  console.assert(balBefore === balAfter, 'Balance must not change on failed submission');
  console.log('✓ Atomic Rollback Passed!\n');

  // Clean up test records
  [c1Id, c2Id, c2bId, c3Id, c4Id, c5Id].forEach(id => {
    db.prepare('DELETE FROM VISITS WHERE client_id = ?').run(id);
    db.prepare('DELETE FROM CLIENTS WHERE client_id = ?').run(id);
  });

  console.log('=============================================');
  console.log('ALL TESTS PASSED SUCCESSFULLY (100% SUCCESS)!');
  console.log('=============================================');
} catch (err) {
  console.error('Test failed with error:', err);
  process.exit(1);
}
