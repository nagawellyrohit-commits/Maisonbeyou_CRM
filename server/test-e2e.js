// End-to-end automated integration test suite for Maison BeYou CRM
const BASE_URL = 'http://localhost:5001/api';

async function runTests() {
  console.log('=== Starting Maison BeYou CRM Automated Test Suite ===\n');
  let passCount = 0;
  let failCount = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passCount++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failCount++;
    }
  }

  // 1. Auth Test
  console.log('[1] Testing Authentication & Roles...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'reception@maisonbeyou.com', password: 'reception123' })
  });
  const loginData = await loginRes.json();
  assert(loginRes.status === 200, 'Reception login successful');
  assert(loginData.token && loginData.user.role === 'reception', 'Valid JWT token and role returned');
  const token = loginData.token;

  // 2. Admin Auth Test
  const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@maisonbeyou.com', password: 'admin123' })
  });
  const adminData = await adminLoginRes.json();
  assert(adminData.user.role === 'admin', 'Admin login successful');
  const adminToken = adminData.token;

  // 3. Dashboard Today Summary & Visits Table
  console.log('\n[2] Testing Today\'s Summary & Visits...');
  const dashRes = await fetch(`${BASE_URL}/dashboard/today`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const dashData = await dashRes.json();
  assert(dashRes.status === 200, 'Dashboard loaded');
  assert(typeof dashData.summary.total_clients === 'number', 'Summary has total_clients');
  assert(typeof dashData.summary.total_revenue === 'number', 'Summary has total_revenue');
  assert(typeof dashData.summary.pending_balance === 'number', 'Summary has pending_balance');
  assert(Array.isArray(dashData.visits), 'Today visits list is an array');
  console.log(`      Current summary: ${dashData.summary.total_clients} clients, ${dashData.summary.total_services} services, Revenue ₹${dashData.summary.total_revenue}, Pending ₹${dashData.summary.pending_balance}`);

  // 4. Instant Client Search (by phone & name)
  console.log('\n[3] Testing Client Search & Auto-identification...');
  const searchPhoneRes = await fetch(`${BASE_URL}/clients/search?q=98765`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const searchPhoneData = await searchPhoneRes.json();
  assert(searchPhoneData.clients.length > 0, 'Found client by phone prefix 98765');
  const priya = searchPhoneData.clients.find(c => c.name.includes('Priya'));
  assert(!!priya, 'Found Priya Shah');

  // 5. Client Profile, Last Visit & Repeat Services
  console.log('\n[4] Testing Client Profile & Repeat Previous Services...');
  const profileRes = await fetch(`${BASE_URL}/clients/${priya.client_id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const profileData = await profileRes.json();
  assert(profileData.client.name === 'Priya Shah', 'Retrieved Priya Shah dossier');
  assert(profileData.last_visit !== null, 'Loaded last visit details');
  assert(profileData.previous_services.length > 0, 'Loaded previous unique services for repeat flow');
  console.log(`      Previous services available for repeat: ${profileData.previous_services.map(s => s.service_name).join(', ')}`);

  // 6. Duplicate Phone Prevention (Rule 1)
  console.log('\n[5] Testing Duplicate Mobile Number Prevention...');
  const dupCheckRes = await fetch(`${BASE_URL}/clients/check-phone?phone=9876543210`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const dupCheckData = await dupCheckRes.json();
  assert(dupCheckData.exists === true, 'Correctly detected existing phone number');
  assert(dupCheckData.client.name === 'Priya Shah', 'Identified existing client Priya Shah');

  // 7. Categories & Sub-Services Catalog
  console.log('\n[6] Testing 6 Main Service Categories & Sub-services...');
  const catRes = await fetch(`${BASE_URL}/categories`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const catData = await catRes.json();
  assert(catData.categories.length === 6, 'Exactly 6 configurable main categories returned');
  const laserCat = catData.categories.find(c => c.category_name.toLowerCase().includes('laser'));
  assert(!!laserCat && laserCat.services.length >= 10, 'Laser category has sub-services with database prices');

  // 8. Staff List
  console.log('\n[7] Testing Staff Retrieval...');
  const staffRes = await fetch(`${BASE_URL}/staff`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const staffData = await staffRes.json();
  assert(staffData.staff.length >= 5, 'Active staff members available for assignment');

  // 9. Full Visit Creation Flow with Repeat Service + New Service + Staff + Discount + Payment
  console.log('\n[8] Testing Complete Visit Submission Workflow...');
  const visitPayload = {
    client_type: 'regular',
    client_id: priya.client_id,
    visit_date: new Date().toISOString().split('T')[0],
    services: [
      {
        service_id: 1,
        service_name: 'Underarms Laser',
        price: 1500,
        staff_id: staffData.staff[1].staff_id // Pooja Mehta
      },
      {
        service_id: 11,
        service_name: 'BEU Hydration Facial',
        price: 3500,
        staff_id: staffData.staff[0].staff_id // Dr. Ananya Sharma
      }
    ],
    discount_type: 'fixed',
    discount_value: 500,
    payment_method: 'UPI',
    amount_paid: 4500, // 5000 subtotal - 500 discount = 4500 total, paid in full
    notes: 'Repeat facial + laser, requested green tea'
  };

  const createVisitRes = await fetch(`${BASE_URL}/visits`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(visitPayload)
  });
  const createVisitData = await createVisitRes.json();
  assert(createVisitRes.status === 201, 'Visit created successfully');
  assert(createVisitData.visit.total_amount === 4500, 'Total amount after discount calculated accurately (₹4500)');
  assert(createVisitData.visit.payment_status === 'Paid', 'Payment status marked as Paid');
  assert(createVisitData.visit.balance === 0, 'Balance is ₹0');

  // Verify Visit Services Snapshot & Receipt
  const visitReceiptRes = await fetch(`${BASE_URL}/visits/${createVisitData.visit.visit_id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const receiptData = await visitReceiptRes.json();
  assert(receiptData.visit.services.length === 2, '2 service line items attached to visit');
  assert(receiptData.visit.services[0].service_name_snapshot === 'Underarms Laser', 'Service name snapshot preserved');
  assert(receiptData.visit.services[0].price_snapshot === 1500, 'Service price snapshot preserved');

  // 10. Admin Service & Price Management
  console.log('\n[9] Testing Admin Service & Price Modification...');
  const updateServiceRes = await fetch(`${BASE_URL}/admin/services/1`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({ price: 1600 })
  });
  assert(updateServiceRes.status === 200, 'Admin updated current price of Underarms Laser to ₹1600');

  // Verify Rule 3: Past visit snapshot did NOT change!
  const verifySnapshotRes = await fetch(`${BASE_URL}/visits/${createVisitData.visit.visit_id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const snapshotData = await verifySnapshotRes.json();
  assert(snapshotData.visit.services[0].price_snapshot === 1500, 'Rule 3 Verified: Historical invoice price remained ₹1500 despite catalog price update');

  // Revert price back to 1500
  await fetch(`${BASE_URL}/admin/services/1`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ price: 1500 })
  });

  // 11. Reporting (Phase 1)
  console.log('\n[10] Testing Phase 1 Executive Reports...');
  const reportsRes = await fetch(`${BASE_URL}/reports`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const reportsData = await reportsRes.json();
  assert(reportsRes.status === 200, 'Reports generated');
  assert(typeof reportsData.revenue.today === 'number', 'Revenue today calculated');
  assert(typeof reportsData.revenue.week === 'number', 'Revenue week calculated');
  assert(typeof reportsData.revenue.month === 'number', 'Revenue month calculated');
  assert(reportsData.top_services.length > 0, 'Top performed services ranked');
  assert(reportsData.categories.length > 0, 'Revenue by category aggregated');
  assert(reportsData.staff_performance.length > 0, 'Staff performance metrics aggregated');

  console.log('\n======================================================');
  console.log(`TEST RESULTS: ${passCount} Passed, ${failCount} Failed.`);
  if (failCount === 0) {
    console.log('ALL MAISON BEYOU CRM INTEGRATION TESTS PASSED PERFECTLY!');
  }
  console.log('======================================================\n');
}

runTests().catch(err => {
  console.error('Test suite execution error:', err);
});
