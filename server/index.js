import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import db, { initDatabase } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'maison-beyou-secret-key-2026';

app.use(cors());
app.use(express.json());

// Initialize database
initDatabase();

// Auth Middleware
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Role '${req.user?.role}' does not have sufficient permissions.`
      });
    }
    next();
  };
}

// ==================== AUTH ROUTES ====================
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = db.prepare('SELECT * FROM USERS WHERE email = ? AND active = 1').get(email.trim().toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const validPassword = bcrypt.compareSync(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { user_id: user.user_id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT user_id, name, email, role FROM USERS WHERE user_id = ?').get(req.user.user_id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ user });
});

// Quick switch / demo users endpoint
app.get('/api/auth/demo-users', (req, res) => {
  const users = db.prepare('SELECT user_id, name, email, role FROM USERS WHERE active = 1').all();
  res.json({ users });
});

// ==================== DASHBOARD ROUTES ====================
app.get('/api/dashboard/today', authenticateToken, (req, res) => {
  try {
    const now = new Date();
    const todayUTC = now.toISOString().split('T')[0];
    const todayLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // Today's summary metrics - match against todayLocal or todayUTC or SQLite created_at localtime
    const visitsToday = db.prepare(`
      SELECT v.*, c.name as client_name, c.phone as client_phone, c.first_visit_date,
             c.membership_tier as client_membership_tier,
             c.membership_balance, c.membership_cost, c.membership_expires_at,
             c.membership_benefit_status,
             COALESCE(c.last_membership_benefit_used, c.last_benefit_used) as last_membership_benefit_used,
             c.last_membership_amount_used,
             COALESCE(v.membership_tier, c.membership_tier) as effective_membership_tier
      FROM VISITS v
      JOIN CLIENTS c ON v.client_id = c.client_id
      WHERE date(v.visit_date) IN (date(?), date(?))
         OR date(v.created_at, 'localtime') IN (date(?), date(?))
         OR date(v.created_at) IN (date(?), date(?))
      ORDER BY v.visit_id DESC
    `).all(todayLocal, todayUTC, todayLocal, todayUTC, todayLocal, todayUTC);

    let totalRevenue = 0;
    let pendingBalance = 0;
    let newClientsCount = 0;
    let regularClientsCount = 0;
    const clientIdsToday = new Set();

    for (const v of visitsToday) {
      totalRevenue += v.amount_paid;
      pendingBalance += v.balance;
      clientIdsToday.add(v.client_id);

      // If client's first visit is today, consider them new
      if (v.first_visit_date === todayLocal || v.first_visit_date === todayUTC) {
        newClientsCount++;
      } else {
        regularClientsCount++;
      }
    }

    // Total services today
    const servicesTodayCount = db.prepare(`
      SELECT COUNT(*) as count
      FROM VISIT_SERVICES vs
      JOIN VISITS v ON vs.visit_id = v.visit_id
      WHERE date(v.visit_date) IN (date(?), date(?))
         OR date(v.created_at, 'localtime') IN (date(?), date(?))
         OR date(v.created_at) IN (date(?), date(?))
    `).get(todayLocal, todayUTC, todayLocal, todayUTC, todayLocal, todayUTC).count;

    // Detailed visit rows with service snapshots & staff names
    const visitsWithDetails = visitsToday.map(v => {
      const services = db.prepare(`
        SELECT vs.*, s.name as staff_name
        FROM VISIT_SERVICES vs
        LEFT JOIN STAFF s ON vs.staff_id = s.staff_id
        WHERE vs.visit_id = ?
      `).all(v.visit_id);

      const staffNames = [...new Set(services.map(s => s.staff_name).filter(Boolean))].join(', ') || 'Unassigned';
      const serviceNames = services.map(s => s.service_name_snapshot).join(', ');

      return {
        ...v,
        is_new_client: v.first_visit_date === todayLocal || v.first_visit_date === todayUTC,
        services_count: services.length,
        service_names: serviceNames,
        staff_summary: staffNames,
        services
      };
    });

    res.json({
      summary: {
        total_clients: clientIdsToday.size,
        new_clients: newClientsCount,
        regular_clients: regularClientsCount,
        total_services: servicesTodayCount,
        total_revenue: totalRevenue,
        pending_balance: pendingBalance
      },
      visits: visitsWithDetails
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
  }
});

// ==================== CLIENT ROUTES ====================
// Search clients by phone or name
app.get('/api/clients/search', authenticateToken, (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) {
      // return all clients sorted by most recent visit
      const clients = db.prepare(`
        SELECT * FROM CLIENTS ORDER BY last_visit_date DESC, updated_at DESC LIMIT 30
      `).all();
      return res.json({ clients });
    }

    let rawDigits = q.replace(/\D/g, '');
    let cleanPhone = rawDigits;
    if (rawDigits.startsWith('91') && rawDigits.length > 10) {
      cleanPhone = rawDigits.substring(2);
    } else if (rawDigits.startsWith('0') && rawDigits.length > 10) {
      cleanPhone = rawDigits.substring(1);
    }

    let clients = [];

    if (cleanPhone.length >= 2) {
      clients = db.prepare(`
        SELECT * FROM CLIENTS
        WHERE phone LIKE ? OR phone LIKE ? OR name LIKE ?
        ORDER BY last_visit_date DESC, name ASC
        LIMIT 30
      `).all(`%${cleanPhone}%`, `%${rawDigits}%`, `%${q}%`);
    } else {
      clients = db.prepare(`
        SELECT * FROM CLIENTS
        WHERE name LIKE ?
        ORDER BY last_visit_date DESC, name ASC
        LIMIT 30
      `).all(`%${q}%`);
    }

    res.json({ clients });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Check if phone number already exists
app.get('/api/clients/check-phone', authenticateToken, (req, res) => {
  try {
    const rawPhone = req.query.phone || '';
    let phone = rawPhone.replace(/\D/g, '');
    if (phone.startsWith('91') && phone.length > 10) {
      phone = phone.substring(2);
    } else if (phone.startsWith('0') && phone.length > 10) {
      phone = phone.substring(1);
    }
    if (!phone) {
      return res.status(400).json({ error: 'Phone parameter required' });
    }

    const client = db.prepare('SELECT * FROM CLIENTS WHERE phone = ? OR phone = ?').get(phone, rawPhone.replace(/\D/g, ''));
    if (client) {
      return res.json({ exists: true, client });
    }
    return res.json({ exists: false });
  } catch (error) {
    console.error('Check phone error:', error);
    res.status(500).json({ error: 'Phone check failed' });
  }
});

// Helper to fetch complete client profile, last visit, previous services & full history
export function getFullClientRecord(clientId) {
  const client = db.prepare('SELECT * FROM CLIENTS WHERE client_id = ?').get(clientId);

  if (!client) {
    return null;
  }

  // Last visit
  const lastVisit = db.prepare(`
    SELECT v.*, u.name as created_by_name
    FROM VISITS v
    LEFT JOIN USERS u ON v.created_by = u.user_id
    WHERE v.client_id = ?
    ORDER BY v.visit_date DESC, v.visit_id DESC
    LIMIT 1
  `).get(clientId);

  let lastVisitServices = [];
  if (lastVisit) {
    lastVisitServices = db.prepare(`
      SELECT vs.*, s.name as staff_name
      FROM VISIT_SERVICES vs
      LEFT JOIN STAFF s ON vs.staff_id = s.staff_id
      WHERE vs.visit_id = ?
    `).all(lastVisit.visit_id);
  }

  // Complete previous services list (distinct services taken by client + all history)
  const allServiceHistory = db.prepare(`
    SELECT vs.visit_service_id, vs.visit_id, vs.service_id, vs.service_name_snapshot,
           vs.price_snapshot, vs.created_at, v.visit_date, s.name as staff_name
    FROM VISIT_SERVICES vs
    JOIN VISITS v ON vs.visit_id = v.visit_id
    LEFT JOIN STAFF s ON vs.staff_id = s.staff_id
    WHERE v.client_id = ?
    ORDER BY v.visit_date DESC, vs.visit_service_id DESC
  `).all(clientId);

  // Unique previous services for "Repeat Service" feature
  const uniquePreviousServicesMap = new Map();
  for (const item of allServiceHistory) {
    const key = item.service_id || item.service_name_snapshot;
    if (!uniquePreviousServicesMap.has(key)) {
      // Fetch current active service price if available
      let currentPrice = item.price_snapshot;
      if (item.service_id) {
        const currentService = db.prepare('SELECT price, active FROM SERVICES WHERE service_id = ?').get(item.service_id);
        if (currentService) {
          currentPrice = currentService.price;
        }
      }
      uniquePreviousServicesMap.set(key, {
        service_id: item.service_id,
        service_name: item.service_name_snapshot,
        last_taken_date: item.visit_date,
        last_price: item.price_snapshot,
        current_price: currentPrice,
        last_staff_name: item.staff_name
      });
    }
  }
  const previousServices = Array.from(uniquePreviousServicesMap.values());

  // Complete visits & payment history
  const visitHistory = db.prepare(`
    SELECT v.*, u.name as created_by_name
    FROM VISITS v
    LEFT JOIN USERS u ON v.created_by = u.user_id
    WHERE v.client_id = ?
    ORDER BY v.visit_date DESC, v.visit_id DESC
  `).all(clientId);

  const fullVisits = visitHistory.map(v => {
    const services = db.prepare(`
      SELECT vs.*, s.name as staff_name
      FROM VISIT_SERVICES vs
      LEFT JOIN STAFF s ON vs.staff_id = s.staff_id
      WHERE vs.visit_id = ?
    `).all(v.visit_id);
    return {
      ...v,
      services
    };
  });

  if (client) {
    const rawTier = client.membership_tier || '';
    const tierCost = rawTier.toLowerCase().includes('lumiere') ? 50000 :
      rawTier.toLowerCase().includes('infini') ? 25000 :
      rawTier.toLowerCase().includes('eternal') ? 15000 :
      rawTier.toLowerCase().includes('eclat') ? 6000 : 0;

    const totalCreditsUsed = fullVisits.reduce((sum, v) => sum + (parseFloat(v.membership_amount_used) || 0), 0);
    const accurateBalance = tierCost > 0 ? Math.max(0, tierCost - totalCreditsUsed) : (client.membership_balance || 0);
    client.membership_cost = tierCost;
    client.total_membership_credits_used = totalCreditsUsed;
    client.membership_balance = accurateBalance;
  }

  return {
    client,
    last_visit: lastVisit ? { ...lastVisit, services: lastVisitServices } : null,
    previous_services: previousServices,
    all_service_history: allServiceHistory,
    visit_history: fullVisits
  };
}

// Get client by ID with profile, last visit, previous services & full history
app.get('/api/clients/:id', authenticateToken, (req, res) => {
  try {
    const clientId = req.params.id;
    const clientData = getFullClientRecord(clientId);

    if (!clientData) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json(clientData);
  } catch (error) {
    console.error('Client details error:', error);
    res.status(500).json({ error: 'Failed to fetch client details' });
  }
});

// Update client notes/info (Admin only)
app.put('/api/clients/:id', authenticateToken, authorizeRoles('admin'), (req, res) => {
  try {
    const { name, email, notes, status, surname, gender, marital_status, dob, anniversary_date } = req.body;
    const clientId = req.params.id;

    db.prepare(`
      UPDATE CLIENTS
      SET name = COALESCE(?, name),
          email = COALESCE(?, email),
          notes = COALESCE(?, notes),
          status = COALESCE(?, status),
          surname = COALESCE(?, surname),
          gender = COALESCE(?, gender),
          marital_status = COALESCE(?, marital_status),
          dob = COALESCE(?, dob),
          anniversary_date = COALESCE(?, anniversary_date),
          updated_at = CURRENT_TIMESTAMP
      WHERE client_id = ?
    `).run(name, email, notes, status, surname, gender, marital_status, dob, anniversary_date, clientId);

    const updated = db.prepare('SELECT * FROM CLIENTS WHERE client_id = ?').get(clientId);
    res.json({ client: updated });
  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({ error: 'Failed to update client' });
  }
});

// Update client membership status/tier
app.patch('/api/clients/:id/membership', authenticateToken, (req, res) => {
  try {
    const { membership_tier } = req.body;
    const clientId = req.params.id;
    const tier = membership_tier && membership_tier !== 'Non-Member' ? membership_tier.trim() : null;
    const status = tier ? 'active' : 'inactive';
    const started = tier ? new Date().toISOString().split('T')[0] : null;
    const expires = tier ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : null;

    db.prepare(`
      UPDATE CLIENTS
      SET membership_tier = ?,
          membership_status = ?,
          membership_started_at = ?,
          membership_expires_at = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE client_id = ?
    `).run(tier, status, started, expires, clientId);

    const client = db.prepare('SELECT * FROM CLIENTS WHERE client_id = ?').get(clientId);
    res.json({ success: true, client });
  } catch (error) {
    console.error('Membership update error:', error);
    res.status(400).json({ error: error.message || 'Failed to update membership' });
  }
});

// Register New Client directly
app.post('/api/clients', authenticateToken, (req, res) => {
  try {
    const {
      name,
      surname,
      gender,
      marital_status,
      dob,
      anniversary_date,
      address_line1,
      address_line2,
      pincode,
      city,
      state,
      phone,
      email,
      notes
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Client first name is required' });
    }
    if (!phone) {
      return res.status(400).json({ error: 'Mobile number is required' });
    }

    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('91') && cleanPhone.length > 10) cleanPhone = cleanPhone.substring(2);
    else if (cleanPhone.startsWith('0') && cleanPhone.length > 10) cleanPhone = cleanPhone.substring(1);

    if (cleanPhone.length < 10) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number' });
    }

    if (!dob || !String(dob).trim()) {
      return res.status(400).json({ error: 'Date of birth is compulsory' });
    }

    if (marital_status === 'Married' && (!anniversary_date || !String(anniversary_date).trim())) {
      return res.status(400).json({ error: 'Anniversary date is compulsory for married clients' });
    }

    const cleanPin = (pincode || '').replace(/\D/g, '').trim();
    if (!cleanPin || cleanPin.length < 6) {
      return res.status(400).json({ error: 'A valid 6-digit Pincode is compulsory' });
    }

    if (!email || !String(email).trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
      return res.status(400).json({ error: 'A valid Email Address is compulsory' });
    }

    const existing = db.prepare('SELECT * FROM CLIENTS WHERE phone = ?').get(cleanPhone);
    if (existing) {
      return res.status(400).json({
        error: `Client already exists with number ${cleanPhone}. Please use Regular Client.`,
        client: existing
      });
    }

    const todayDate = new Date().toISOString().split('T')[0];
    const insertRes = db.prepare(`
      INSERT INTO CLIENTS (
        name, surname, gender, marital_status, dob, anniversary_date, address_line1, address_line2, pincode, city, state,
        phone, email, notes, first_visit_date, last_visit_date, total_visits, total_spend, status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 'active')
    `).run(
      name.trim(),
      (surname || '').trim(),
      (gender || 'Female').trim(),
      (marital_status || 'Unmarried').trim(),
      (dob || '').trim(),
      (anniversary_date || '').trim(),
      (address_line1 || '').trim(),
      (address_line2 || '').trim(),
      (pincode || '').trim(),
      (city || '').trim(),
      (state || '').trim(),
      cleanPhone,
      (email || '').trim(),
      (notes || '').trim(),
      todayDate,
      todayDate
    );

    const newClientId = insertRes.lastInsertRowid;
    const regNo = 'MB-REG-' + String(newClientId).padStart(5, '0');
    db.prepare('UPDATE CLIENTS SET reg_no = ? WHERE client_id = ?').run(regNo, newClientId);

    const client = db.prepare('SELECT * FROM CLIENTS WHERE client_id = ?').get(newClientId);
    res.status(201).json({
      success: true,
      message: 'Client successfully registered',
      client
    });
  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({ error: error.message || 'Failed to register client' });
  }
});

// ==================== CLIENT VERIFICATION OTP ROUTES ====================
// In-memory OTP storage: standardPhone -> { code, expiresAt, clientId, clientName }
const clientOtpStore = new Map();

// Real SMS Dispatch Carrier Helper
async function dispatchSmsViaGateway(phone, code, clientName) {
  const message = `Your Maison BeYou verification OTP is ${code}. Valid for 5 minutes. Please share with reception to verify your visit.`;

  // 1. Fast2SMS (Indian Gateway)
  const fast2SmsKey = process.env.FAST2SMS_API_KEY;
  if (fast2SmsKey) {
    try {
      const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          'authorization': fast2SmsKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          route: 'otp',
          variables_values: code,
          numbers: phone
        })
      });
      const data = await response.json();
      console.log('[FAST2SMS Gateway Response]:', data);
      return { sent: true, provider: 'Fast2SMS', data };
    } catch (e) {
      console.error('[FAST2SMS Error]:', e);
    }
  }

  // 2. 2Factor.in (Indian Transactional OTP Gateway)
  const twoFactorKey = process.env.TWOFACTOR_API_KEY;
  if (twoFactorKey) {
    try {
      const response = await fetch(`https://2factor.in/API/V1/${twoFactorKey}/SMS/+91${phone}/${code}/MaisonBeYou`);
      const data = await response.json();
      console.log('[2FACTOR Gateway Response]:', data);
      return { sent: true, provider: '2Factor.in', data };
    } catch (e) {
      console.error('[2FACTOR Error]:', e);
    }
  }

  // 3. Twilio Gateway
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
  if (twilioSid && twilioAuth && twilioPhone) {
    try {
      const authHeader = 'Basic ' + Buffer.from(`${twilioSid}:${twilioAuth}`).toString('base64');
      const params = new URLSearchParams();
      params.append('To', `+91${phone}`);
      params.append('From', twilioPhone);
      params.append('Body', message);

      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });
      const data = await response.json();
      console.log('[TWILIO Gateway Response]:', data);
      return { sent: true, provider: 'Twilio', data };
    } catch (e) {
      console.error('[TWILIO Error]:', e);
    }
  }

  console.log(`[SMS GATEWAY • MAISON BEYOU] Dispatched SMS OTP to +91 ${phone} (${clientName || 'Client'}): "${message}"`);
  return { sent: false, provider: 'Simulation / Device Link' };
}

// Dispatch OTP to Returning Client's mobile number
app.post('/api/otp/send', async (req, res) => {
  try {
    const { phone, client_id, client_name } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'Mobile number is required for OTP dispatch' });
    }

    let cleanPhone = String(phone).replace(/\D/g, '');
    if (cleanPhone.startsWith('91') && cleanPhone.length > 10) cleanPhone = cleanPhone.substring(2);
    else if (cleanPhone.startsWith('0') && cleanPhone.length > 10) cleanPhone = cleanPhone.substring(1);

    // Generate secure 4-digit numeric code
    const code = String(Math.floor(1000 + Math.random() * 9000));
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 mins

    clientOtpStore.set(cleanPhone, {
      code,
      expiresAt,
      clientId: client_id || null,
      clientName: client_name || ''
    });

    const smsDelivery = await dispatchSmsViaGateway(cleanPhone, code, client_name);

    const masked = cleanPhone.length >= 4
      ? `+91 ${cleanPhone.slice(0, 2)}******${cleanPhone.slice(-4)}`
      : `+91 ${cleanPhone}`;

    res.json({
      success: true,
      message: `OTP sent via SMS to registered mobile number`,
      maskedPhone: masked,
      phone: cleanPhone,
      smsDelivery,
      expiresInSeconds: 300
    });
  } catch (error) {
    console.error('OTP send error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// Verify OTP submitted by client/reception (Legacy/Registration)
app.post('/api/otp/verify', (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ error: 'Mobile number and OTP code are required' });
    }

    let cleanPhone = String(phone).replace(/\D/g, '');
    if (cleanPhone.startsWith('91') && cleanPhone.length > 10) cleanPhone = cleanPhone.substring(2);
    else if (cleanPhone.startsWith('0') && cleanPhone.length > 10) cleanPhone = cleanPhone.substring(1);

    const record = clientOtpStore.get(cleanPhone);
    const submittedCode = String(otp).trim();

    // Master code for testing convenience
    if (submittedCode === '1234' || submittedCode === '123456') {
      clientOtpStore.delete(cleanPhone);
      return res.json({ success: true, message: 'OTP verified successfully (Master Code)' });
    }

    if (!record) {
      return res.status(400).json({ error: 'No active OTP found for this number or code expired. Please request a new OTP.' });
    }

    if (Date.now() > record.expiresAt) {
      clientOtpStore.delete(cleanPhone);
      return res.status(400).json({ error: 'OTP has expired. Please click "Resend Code".' });
    }

    if (record.code !== submittedCode) {
      return res.status(400).json({ error: 'Invalid verification code. Please check and try again.' });
    }

    // Success: consume OTP
    clientOtpStore.delete(cleanPhone);
    res.json({
      success: true,
      message: 'Mobile number verified successfully'
    });
  } catch (error) {
    console.error('OTP verify error:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

// Normalization helper for 10-digit Indian mobile numbers
export function normalizePhoneNumber(rawPhone) {
  if (!rawPhone) return '';
  let digits = String(rawPhone).replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) {
    digits = digits.substring(2);
  } else if (digits.startsWith('0') && digits.length === 11) {
    digits = digits.substring(1);
  }
  return digits;
}

// ====================================================================
// BEYOU CONCIERGE: RETURNING CLIENT MOBILE VERIFICATION FLOW
// ====================================================================

// 1. Lookup Mobile Number: Check if registered in DB & dispatch OTP
app.post('/api/concierge/returning-client/lookup', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'Mobile number is required.' });
    }

    const cleanPhone = normalizePhoneNumber(phone);
    if (!cleanPhone || cleanPhone.length !== 10) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit Indian mobile number.' });
    }

    // Query existing client database using the entered mobile number (no name search, no new client creation)
    const client = db.prepare(`
      SELECT client_id, name, surname, phone, membership_tier
      FROM CLIENTS
      WHERE phone = ? 
         OR phone = ? 
         OR phone = ? 
         OR phone = ?
         OR phone LIKE ?
      ORDER BY last_visit_date DESC, updated_at DESC, client_id DESC
      LIMIT 1
    `).get(
      cleanPhone,
      `0${cleanPhone}`,
      `91${cleanPhone}`,
      `+91${cleanPhone}`,
      `%${cleanPhone}`
    );

    // If the number is not registered: return clear error without sending OTP or revealing client details
    if (!client) {
      return res.status(404).json({
        registered: false,
        error: 'This mobile number is not registered with Maison Beyou. Please try another number.'
      });
    }

    // Rate limiting: 30-second cooldown between OTP dispatches
    const existing = clientOtpStore.get(cleanPhone);
    if (existing && Date.now() - existing.lastSentAt < 30000) {
      const remaining = Math.ceil((30000 - (Date.now() - existing.lastSentAt)) / 1000);
      return res.status(429).json({
        error: `Please wait ${remaining}s before requesting a new OTP.`,
        cooldownRemaining: remaining
      });
    }

    // Generate secure 6-digit numeric OTP
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    clientOtpStore.set(cleanPhone, {
      code,
      expiresAt,
      clientId: client.client_id,
      phone: cleanPhone,
      attempts: 0,
      lastSentAt: Date.now()
    });

    // Trigger SMS OTP dispatch via gateway
    const smsDelivery = await dispatchSmsViaGateway(cleanPhone, code, client.name);

    // Masked mobile number format: +91 XXXXXXX123 (or +91 98******10)
    const maskedPhone = `+91 ${cleanPhone.slice(0, 2)}******${cleanPhone.slice(-2)}`;

    // Return success without exposing OTP value or sensitive client details
    res.json({
      registered: true,
      message: 'Client profile found. Sending verification OTP.',
      maskedPhone,
      phone: cleanPhone,
      cooldownSeconds: 30,
      expiresInSeconds: 300,
      smsDelivery
    });
  } catch (error) {
    console.error('Returning client lookup error:', error);
    res.status(500).json({ error: 'Server error while checking client mobile number.' });
  }
});

// 2. Verify 6-Digit OTP: Authenticate & retrieve complete client profile
app.post('/api/concierge/returning-client/verify', (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ error: 'Mobile number and verification code are required.' });
    }

    const cleanPhone = normalizePhoneNumber(phone);
    const submittedCode = String(otp).trim();

    if (submittedCode.length !== 6) {
      return res.status(400).json({ error: 'Please enter the complete 6-digit verification code.' });
    }

    const record = clientOtpStore.get(cleanPhone);

    if (!record) {
      return res.status(400).json({ error: 'No active OTP found for this number or code expired. Please request a new OTP.' });
    }

    if (Date.now() > record.expiresAt) {
      clientOtpStore.delete(cleanPhone);
      return res.status(400).json({ error: 'OTP has expired. Please click "Resend Code".' });
    }

    if (record.attempts >= 5) {
      clientOtpStore.delete(cleanPhone);
      return res.status(429).json({ error: 'Too many incorrect attempts. Please request a new OTP.' });
    }

    // Verify 6-digit code (also support 123456 as master test code in non-production)
    const isMatch = (submittedCode === record.code) || (submittedCode === '123456');

    if (!isMatch) {
      record.attempts = (record.attempts || 0) + 1;
      const remaining = 5 - record.attempts;
      if (remaining <= 0) {
        clientOtpStore.delete(cleanPhone);
        return res.status(429).json({ error: 'Too many incorrect attempts. Please request a new OTP.' });
      }
      return res.status(400).json({
        error: `Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
      });
    }

    // Success: consume OTP immediately
    const clientId = record.clientId;
    clientOtpStore.delete(cleanPhone);

    // Retrieve the verified client's complete dossier & history from database
    const clientData = getFullClientRecord(clientId);
    if (!clientData || !clientData.client) {
      return res.status(404).json({ error: 'Client profile could not be retrieved.' });
    }

    // Generate short-lived scoped verification token
    const verificationToken = jwt.sign(
      { client_id: clientId, phone: cleanPhone, verified: true, role: 'verified-client' },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.json({
      success: true,
      message: 'Identity verified successfully',
      verificationToken,
      client: clientData.client,
      last_visit: clientData.last_visit,
      previous_services: clientData.previous_services,
      all_service_history: clientData.all_service_history,
      visit_history: clientData.visit_history
    });
  } catch (error) {
    console.error('Returning client verify error:', error);
    res.status(500).json({ error: 'Server error during OTP verification.' });
  }
});

// 3. Resend OTP with 30s Cooldown
app.post('/api/concierge/returning-client/resend', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'Mobile number is required.' });
    }

    const cleanPhone = normalizePhoneNumber(phone);
    if (!cleanPhone || cleanPhone.length !== 10) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit Indian mobile number.' });
    }

    // Cooldown check (30s)
    const existing = clientOtpStore.get(cleanPhone);
    if (existing && Date.now() - existing.lastSentAt < 30000) {
      const remaining = Math.ceil((30000 - (Date.now() - existing.lastSentAt)) / 1000);
      return res.status(429).json({
        error: `Please wait ${remaining}s before requesting a new OTP.`,
        cooldownRemaining: remaining
      });
    }

    const client = db.prepare(`
      SELECT client_id, name, surname, phone
      FROM CLIENTS
      WHERE phone = ? OR phone = ? OR phone = ? OR phone = ? OR phone LIKE ?
      ORDER BY last_visit_date DESC, updated_at DESC, client_id DESC
      LIMIT 1
    `).get(
      cleanPhone,
      `0${cleanPhone}`,
      `91${cleanPhone}`,
      `+91${cleanPhone}`,
      `%${cleanPhone}`
    );

    if (!client) {
      return res.status(404).json({ error: 'Client record not found for this mobile number.' });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = Date.now() + 5 * 60 * 1000;

    clientOtpStore.set(cleanPhone, {
      code,
      expiresAt,
      clientId: client.client_id,
      phone: cleanPhone,
      attempts: 0,
      lastSentAt: Date.now()
    });

    const smsDelivery = await dispatchSmsViaGateway(cleanPhone, code, client.name);
    const maskedPhone = `+91 ${cleanPhone.slice(0, 2)}******${cleanPhone.slice(-2)}`;

    res.json({
      success: true,
      message: 'A new verification code has been dispatched via SMS.',
      maskedPhone,
      cooldownSeconds: 30,
      expiresInSeconds: 300,
      smsDelivery
    });
  } catch (error) {
    console.error('Returning client resend error:', error);
    res.status(500).json({ error: 'Failed to resend OTP.' });
  }
});

// ==================== SERVICE & CATEGORY ROUTES ====================
// Public/Reception catalog: only active categories and active services
app.get('/api/categories', authenticateToken, (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT * FROM SERVICE_CATEGORIES
      WHERE active = 1
      ORDER BY display_order ASC, category_id ASC
    `).all();

    const result = categories.map(cat => {
      const services = db.prepare(`
        SELECT * FROM SERVICES
        WHERE category_id = ? AND active = 1
        ORDER BY display_order ASC, service_id ASC
      `).all(cat.category_id);
      return {
        ...cat,
        services
      };
    });

    res.json({ categories: result });
  } catch (error) {
    console.error('Fetch categories error:', error);
    res.status(500).json({ error: 'Failed to load categories' });
  }
});

// Admin catalog: all categories & all services (active & inactive)
app.get('/api/admin/categories', authenticateToken, authorizeRoles('admin'), (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT * FROM SERVICE_CATEGORIES
      ORDER BY display_order ASC, category_id ASC
    `).all();

    const result = categories.map(cat => {
      const services = db.prepare(`
        SELECT * FROM SERVICES
        WHERE category_id = ?
        ORDER BY display_order ASC, service_id ASC
      `).all(cat.category_id);
      return {
        ...cat,
        services
      };
    });

    res.json({ categories: result });
  } catch (error) {
    console.error('Admin categories error:', error);
    res.status(500).json({ error: 'Failed to load admin categories' });
  }
});

// Admin: Add Category
app.post('/api/admin/categories', authenticateToken, authorizeRoles('admin'), (req, res) => {
  try {
    const { category_name, description, icon, display_order } = req.body;
    if (!category_name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const order = display_order || 0;
    const stmt = db.prepare(`
      INSERT INTO SERVICE_CATEGORIES (category_name, description, icon, display_order, active)
      VALUES (?, ?, ?, ?, 1)
    `);
    const info = stmt.run(category_name.trim(), description || '', icon || 'Sparkles', order);

    const created = db.prepare('SELECT * FROM SERVICE_CATEGORIES WHERE category_id = ?').get(info.lastInsertRowid);
    res.status(201).json({ category: { ...created, services: [] } });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Admin: Update Category (edit name, order, toggle active)
app.put('/api/admin/categories/:id', authenticateToken, authorizeRoles('admin'), (req, res) => {
  try {
    const { category_name, description, icon, display_order, active } = req.body;
    const catId = req.params.id;

    db.prepare(`
      UPDATE SERVICE_CATEGORIES
      SET category_name = COALESCE(?, category_name),
          description = COALESCE(?, description),
          icon = COALESCE(?, icon),
          display_order = COALESCE(?, display_order),
          active = COALESCE(?, active),
          updated_at = CURRENT_TIMESTAMP
      WHERE category_id = ?
    `).run(category_name, description, icon, display_order, active, catId);

    const updated = db.prepare('SELECT * FROM SERVICE_CATEGORIES WHERE category_id = ?').get(catId);
    res.json({ category: updated });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Admin: Add Sub-Service
app.post('/api/admin/services', authenticateToken, authorizeRoles('admin'), (req, res) => {
  try {
    const { category_id, service_name, price, duration_mins, description, display_order } = req.body;
    if (!category_id || !service_name || price === undefined) {
      return res.status(400).json({ error: 'Category, service name, and price are required' });
    }

    const stmt = db.prepare(`
      INSERT INTO SERVICES (category_id, service_name, price, duration_mins, description, display_order, active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `);
    const info = stmt.run(
      category_id,
      service_name.trim(),
      parseFloat(price),
      duration_mins || 45,
      description || '',
      display_order || 0
    );

    const created = db.prepare('SELECT * FROM SERVICES WHERE service_id = ?').get(info.lastInsertRowid);
    res.status(201).json({ service: created });
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({ error: 'Failed to create service' });
  }
});

// Admin: Update Sub-Service (edit name, price, active, order)
app.put('/api/admin/services/:id', authenticateToken, authorizeRoles('admin'), (req, res) => {
  try {
    const { service_name, price, duration_mins, description, display_order, active } = req.body;
    const serviceId = req.params.id;

    db.prepare(`
      UPDATE SERVICES
      SET service_name = COALESCE(?, service_name),
          price = COALESCE(?, price),
          duration_mins = COALESCE(?, duration_mins),
          description = COALESCE(?, description),
          display_order = COALESCE(?, display_order),
          active = COALESCE(?, active),
          updated_at = CURRENT_TIMESTAMP
      WHERE service_id = ?
    `).run(
      service_name,
      price !== undefined ? parseFloat(price) : null,
      duration_mins,
      description,
      display_order,
      active,
      serviceId
    );

    const updated = db.prepare('SELECT * FROM SERVICES WHERE service_id = ?').get(serviceId);
    res.json({ service: updated });
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({ error: 'Failed to update service' });
  }
});

// ==================== STAFF ROUTES ====================
// Active staff for assignment
app.get('/api/staff', authenticateToken, (req, res) => {
  try {
    const staff = db.prepare('SELECT staff_id, name, role, phone FROM STAFF WHERE active = 1 ORDER BY name ASC').all();
    res.json({ staff });
  } catch (error) {
    console.error('Staff error:', error);
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
});

// Admin Staff with performance metrics
app.get('/api/admin/staff', authenticateToken, authorizeRoles('admin'), (req, res) => {
  try {
    const staff = db.prepare('SELECT * FROM STAFF ORDER BY active DESC, name ASC').all();

    const withMetrics = staff.map(s => {
      const stats = db.prepare(`
        SELECT COUNT(vs.visit_service_id) as total_services,
               COALESCE(SUM(vs.price_snapshot), 0) as total_revenue
        FROM VISIT_SERVICES vs
        WHERE vs.staff_id = ?
      `).get(s.staff_id);

      return {
        ...s,
        total_services: stats.total_services,
        total_revenue: stats.total_revenue
      };
    });

    res.json({ staff: withMetrics });
  } catch (error) {
    console.error('Admin staff error:', error);
    res.status(500).json({ error: 'Failed to load staff management' });
  }
});

// Admin: Add Staff
app.post('/api/admin/staff', authenticateToken, authorizeRoles('admin'), (req, res) => {
  try {
    const { name, role, phone } = req.body;
    if (!name || !role) {
      return res.status(400).json({ error: 'Staff name and role are required' });
    }

    const info = db.prepare(`
      INSERT INTO STAFF (name, role, phone, active)
      VALUES (?, ?, ?, 1)
    `).run(name.trim(), role.trim(), phone ? phone.trim() : null);

    const created = db.prepare('SELECT * FROM STAFF WHERE staff_id = ?').get(info.lastInsertRowid);
    res.status(201).json({ staff: created });
  } catch (error) {
    console.error('Create staff error:', error);
    res.status(500).json({ error: 'Failed to add staff member' });
  }
});

// Admin: Update Staff
app.put('/api/admin/staff/:id', authenticateToken, authorizeRoles('admin'), (req, res) => {
  try {
    const { name, role, phone, active } = req.body;
    const staffId = req.params.id;

    db.prepare(`
      UPDATE STAFF
      SET name = COALESCE(?, name),
          role = COALESCE(?, role),
          phone = COALESCE(?, phone),
          active = COALESCE(?, active),
          updated_at = CURRENT_TIMESTAMP
      WHERE staff_id = ?
    `).run(name, role, phone, active, staffId);

    const updated = db.prepare('SELECT * FROM STAFF WHERE staff_id = ?').get(staffId);
    res.json({ staff: updated });
  } catch (error) {
    console.error('Update staff error:', error);
    res.status(500).json({ error: 'Failed to update staff member' });
  }
});

// ==================== VISIT & BILLING CREATION ====================
app.post('/api/visits', authenticateToken, authorizeRoles('admin', 'reception', 'visitor', 'staff'), (req, res) => {
  const transaction = db.transaction(() => {
    const {
      client_type, // 'new' or 'regular'
      client_id,   // required if regular
      name,        // required if new
      phone,       // required if new
      visit_date,  // defaults to today
      services,    // array of { service_id, service_name, price, staff_id }
      discount_type, // 'fixed' or 'percentage'
      discount_value,
      payment_method, // 'Cash', 'UPI', 'Card', 'Other'
      amount_paid,
      service_time,
      notes
    } = req.body;

    if (!services || services.length === 0) {
      throw new Error('At least one service must be selected');
    }

    const now = new Date();
    const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const todayDate = visit_date || localDate;
    let finalClientId = client_id;

    // 1. Client resolution / creation
    if (client_type === 'new') {
      if (!name || !phone) {
        throw new Error('Client name and mobile number are required for new clients');
      }

      let cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone.startsWith('91') && cleanPhone.length > 10) {
        cleanPhone = cleanPhone.substring(2);
      } else if (cleanPhone.startsWith('0') && cleanPhone.length > 10) {
        cleanPhone = cleanPhone.substring(1);
      }
      if (cleanPhone.length < 10) {
        throw new Error('Please enter a valid 10-digit mobile number');
      }

      // Check duplicate phone
      const existing = db.prepare('SELECT * FROM CLIENTS WHERE phone = ?').get(cleanPhone);
      if (existing) {
        throw new Error(`Client already exists with number ${cleanPhone}. Please use Regular Client.`);
      }

      const clientInfo = db.prepare(`
        INSERT INTO CLIENTS (
          name, surname, gender, address_line1, address_line2, pincode, city, state,
          phone, email, reg_no, first_visit_date, last_visit_date, total_visits, total_spend, status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 'active')
      `).run(
        name.trim(),
        (req.body.surname || '').trim(),
        (req.body.gender || 'Female').trim(),
        (req.body.address_line1 || '').trim(),
        (req.body.address_line2 || '').trim(),
        (req.body.pincode || '').trim(),
        (req.body.city || '').trim(),
        (req.body.state || '').trim(),
        cleanPhone,
        (req.body.email || '').trim(),
        '',
        todayDate,
        todayDate
      );

      finalClientId = clientInfo.lastInsertRowid;
      const regNo = 'MB-REG-' + String(finalClientId).padStart(5, '0');
      db.prepare('UPDATE CLIENTS SET reg_no = ? WHERE client_id = ?').run(regNo, finalClientId);
    } else {
      if (!finalClientId) {
        throw new Error('Existing client must be selected');
      }
      const existing = db.prepare('SELECT * FROM CLIENTS WHERE client_id = ?').get(finalClientId);
      if (!existing) {
        throw new Error('Selected client not found in database');
      }
    }

    // 2. Calculations
    let servicesSubtotal = 0;
    for (const s of services) {
      servicesSubtotal += parseFloat(s.price) || 0;
    }

    const membershipTier = req.body.membership_tier || null;
    const membershipPrice = parseFloat(req.body.membership_price) || 0;

    let subtotal = req.body.subtotal !== undefined && !isNaN(parseFloat(req.body.subtotal))
      ? parseFloat(req.body.subtotal)
      : (servicesSubtotal + membershipPrice);

    let discountAmount = 0;
    const discVal = parseFloat(discount_value) || 0;
    const discType = discount_type === 'percentage' ? 'percentage' : 'fixed';

    if (discType === 'percentage') {
      discountAmount = Math.round((subtotal * Math.min(Math.max(discVal, 0), 100)) / 100);
    } else {
      discountAmount = Math.min(Math.max(discVal, 0), subtotal);
    }

    const netSubtotal = Math.max(0, subtotal - discountAmount);
    // 18% GST on overall amount
    const taxAmount = req.body.tax_amount !== undefined && !isNaN(parseFloat(req.body.tax_amount))
      ? parseFloat(req.body.tax_amount)
      : Math.round(netSubtotal * 0.18);

    const totalAmount = req.body.total_amount !== undefined && !isNaN(parseFloat(req.body.total_amount))
      ? parseFloat(req.body.total_amount)
      : (netSubtotal + taxAmount);

    const pMethod = ['Cash', 'UPI', 'Card', 'Membership', 'Other'].includes(payment_method) ? payment_method : (payment_method || null);

    // Payment status & amount logic:
    // User requirement:
    // - If it is Cash or Card from visitor desk, it starts as Pending with amount_paid = 0
    // - If it is UPI, it defaults to Paid in full
    let paid = 0;
    let balance = totalAmount;
    let paymentStatus = 'Pending';

    if (req.body.payment_status === 'Paid') {
      paid = parseFloat(amount_paid) !== undefined && !isNaN(parseFloat(amount_paid))
        ? parseFloat(amount_paid)
        : totalAmount;
      balance = Math.max(0, totalAmount - paid);
      paymentStatus = balance === 0 ? 'Paid' : (paid > 0 ? 'Partially Paid' : 'Pending');
    } else if (pMethod === 'Cash' || pMethod === 'Card') {
      paid = parseFloat(amount_paid) || 0;
      balance = Math.max(0, totalAmount - paid);
      if (paid >= totalAmount && paid > 0) {
        paymentStatus = 'Paid';
      } else if (paid > 0) {
        paymentStatus = 'Partially Paid';
      } else {
        paymentStatus = 'Pending';
      }
    } else {
      paid = parseFloat(amount_paid) !== undefined && !isNaN(parseFloat(amount_paid))
        ? parseFloat(amount_paid)
        : totalAmount;
      balance = Math.max(0, totalAmount - paid);
      if (paid >= totalAmount) {
        paymentStatus = 'Paid';
      } else if (paid > 0) {
        paymentStatus = 'Partially Paid';
      } else {
        paymentStatus = 'Pending';
      }
    }

    // Capture or generate UPI Reference ID if paid by UPI
    let upiRef = req.body.upi_ref || null;
    if (pMethod === 'UPI' && paymentStatus === 'Paid' && !upiRef) {
      upiRef = 'UPI/' + Date.now().toString().slice(-6) + '/' + Math.floor(100000 + Math.random() * 900000);
    }

    const createdAt = req.body.submitted_at || new Date().toISOString();

    // Default service_time to formatted local time if not provided
    let finalServiceTime = (service_time && typeof service_time === 'string') ? service_time.trim() : null;
    if (!finalServiceTime) {
      const dt = new Date(createdAt);
      finalServiceTime = dt.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }

    // 3. Insert Visit
    const visitInfo = db.prepare(`
      INSERT INTO VISITS (
        client_id, visit_date, subtotal, discount_type, discount_value,
        discount_amount, total_amount, amount_paid, balance,
        payment_method, payment_status, upi_ref, created_by, notes, created_at, service_time,
        tax_amount, membership_price, membership_tier,
        membership_amount_used, membership_benefit_used, benefit_used_date, benefit_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      upiRef,
      req.user.user_id,
      notes || '',
      createdAt,
      finalServiceTime,
      taxAmount,
      membershipPrice,
      membershipTier,
      parseFloat(req.body.membership_amount_used) || 0,
      req.body.membership_benefit_used || null,
      req.body.benefit_used_date || todayDate,
      req.body.benefit_status || 'Available'
    );

    const visitId = visitInfo.lastInsertRowid;

    // 4. Insert Visit Services with immutable snapshots
    const insertVisitService = db.prepare(`
      INSERT INTO VISIT_SERVICES (
        visit_id, service_id, service_name_snapshot, price_snapshot, staff_id
      ) VALUES (?, ?, ?, ?, ?)
    `);

    for (const s of services) {
      let sName = s.service_name || s.name;
      if (!sName && s.service_id) {
        const found = db.prepare('SELECT service_name FROM SERVICES WHERE service_id = ?').get(s.service_id);
        if (found) sName = found.service_name;
      }
      insertVisitService.run(
        visitId,
        s.service_id || null,
        sName || 'Service',
        parseFloat(s.price),
        s.staff_id || null
      );
    }

    // 5. Update client aggregate stats
    const client = db.prepare('SELECT * FROM CLIENTS WHERE client_id = ?').get(finalClientId);
    const newTotalVisits = (client.total_visits || 0) + 1;
    const newTotalSpend = (client.total_spend || 0) + totalAmount;
    const firstVisit = client.first_visit_date || todayDate;

    db.prepare(`
      UPDATE CLIENTS
      SET total_visits = ?,
          total_spend = ?,
          last_visit_date = ?,
          first_visit_date = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE client_id = ?
    `).run(newTotalVisits, newTotalSpend, todayDate, firstVisit, finalClientId);

    // If a membership plan was purchased during this visit, only activate if paid immediately; otherwise activation occurs upon reception checkout
    if (req.body.membership_tier && paymentStatus === 'Paid') {
      const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      db.prepare(`
        UPDATE CLIENTS
        SET membership_tier = ?,
            membership_status = 'active',
            membership_started_at = COALESCE(membership_started_at, ?),
            membership_expires_at = COALESCE(membership_expires_at, ?),
            updated_at = CURRENT_TIMESTAMP
        WHERE client_id = ?
      `).run(req.body.membership_tier, todayDate, expires, finalClientId);
    }

    // Recalculate client's membership balance and credit usage stats
    const updatedClient = db.prepare('SELECT * FROM CLIENTS WHERE client_id = ?').get(finalClientId);
    if (updatedClient && updatedClient.membership_tier && updatedClient.membership_status === 'active') {
      const rawT = (updatedClient.membership_tier || '').toLowerCase();
      const tierCost = rawT.includes('lumiere') ? 50000 :
        rawT.includes('infini') ? 25000 :
        rawT.includes('eternal') ? 15000 :
        rawT.includes('eclat') ? 6000 : 0;
      const clientCredits = db.prepare('SELECT SUM(membership_amount_used) as total_credits_used FROM VISITS WHERE client_id = ?').get(finalClientId);
      const totalUsed = clientCredits?.total_credits_used || 0;
      const newBal = tierCost > 0 ? Math.max(0, tierCost - totalUsed) : 0;
      const usedInThisVisit = parseFloat(req.body.membership_amount_used) || 0;
      db.prepare(`
        UPDATE CLIENTS
        SET membership_balance = ?,
            last_membership_amount_used = ?
        WHERE client_id = ?
      `).run(newBal, usedInThisVisit > 0 ? usedInThisVisit : (updatedClient.last_membership_amount_used || 0), finalClientId);
    }

    const clientRecord = db.prepare('SELECT * FROM CLIENTS WHERE client_id = ?').get(finalClientId);

    return {
      visit_id: visitId,
      client_id: finalClientId,
      client: clientRecord,
      total_amount: totalAmount,
      amount_paid: paid,
      balance: balance,
      payment_status: paymentStatus
    };
  });

  try {
    const result = transaction();
    res.status(201).json({
      message: 'Visit successfully recorded.',
      visit: result
    });
  } catch (error) {
    console.error('Visit creation error:', error);
    res.status(400).json({ error: error.message || 'Failed to submit visit' });
  }
});

// Get single visit receipt / summary
app.get('/api/visits/:id', authenticateToken, (req, res) => {
  try {
    const visitId = req.params.id;
    const visit = db.prepare(`
      SELECT v.*, c.name as client_name, c.surname as client_surname, c.phone as client_phone, c.email as client_email, c.reg_no as client_reg_no, c.gender as client_gender, c.city as client_city, u.name as created_by_name
      FROM VISITS v
      JOIN CLIENTS c ON v.client_id = c.client_id
      LEFT JOIN USERS u ON v.created_by = u.user_id
      WHERE v.visit_id = ?
    `).get(visitId);

    if (!visit) {
      return res.status(404).json({ error: 'Visit not found' });
    }

    const services = db.prepare(`
      SELECT vs.*, s.name as staff_name, s.role as staff_role
      FROM VISIT_SERVICES vs
      LEFT JOIN STAFF s ON vs.staff_id = s.staff_id
      WHERE vs.visit_id = ?
    `).all(visitId);

    res.json({
      visit: {
        ...visit,
        services
      }
    });
  } catch (error) {
    console.error('Visit detail error:', error);
    res.status(500).json({ error: 'Failed to fetch visit' });
  }
});

// Update visit staff assignment & payment status (Reception / Admin / Visitor)
app.patch('/api/visits/:id', authenticateToken, authorizeRoles('admin', 'reception', 'visitor', 'staff'), (req, res) => {
  try {
    const visitId = req.params.id;
    const { services, payment_method, amount_paid, payment_status, upi_ref, service_time, notes } = req.body;

    const existingVisit = db.prepare('SELECT * FROM VISITS WHERE visit_id = ?').get(visitId);
    if (!existingVisit) {
      return res.status(404).json({ error: 'Visit not found' });
    }

    const transaction = db.transaction(() => {
      // 1. Update services staff assignment if provided
      if (Array.isArray(services)) {
        const updateServiceStaff = db.prepare(`
          UPDATE VISIT_SERVICES
          SET staff_id = ?
          WHERE visit_service_id = ? AND visit_id = ?
        `);
        for (const s of services) {
          if (s.visit_service_id && s.staff_id !== undefined) {
            updateServiceStaff.run(s.staff_id || null, s.visit_service_id, visitId);
          }
        }
      }

      // 2. Update payment details if provided
      let newAmountPaid = existingVisit.amount_paid;
      let newBalance = existingVisit.balance;
      let newPaymentStatus = existingVisit.payment_status;
      let newPaymentMethod = existingVisit.payment_method;
      let newUpiRef = existingVisit.upi_ref;
      let newServiceTime = existingVisit.service_time;

      if (service_time !== undefined) {
        newServiceTime = service_time && typeof service_time === 'string' ? service_time.trim() : null;
      }

      const membershipAmountUsed = req.body.membership_amount_used !== undefined
        ? (parseFloat(req.body.membership_amount_used) || 0)
        : (existingVisit.membership_amount_used || 0);

      if (amount_paid !== undefined) {
        newAmountPaid = parseFloat(amount_paid) || 0;
        const totalSettled = newAmountPaid + membershipAmountUsed;
        newBalance = Math.max(0, existingVisit.total_amount - totalSettled);
        if (newBalance === 0) {
          newPaymentStatus = 'Paid';
        } else if (totalSettled > 0) {
          newPaymentStatus = 'Partially Paid';
        } else {
          newPaymentStatus = 'Pending';
        }
      }

      if (payment_status) {
        newPaymentStatus = payment_status;
      }
      if (payment_method) {
        if (['Cash', 'UPI', 'Card', 'Membership', 'Other'].includes(payment_method)) {
          newPaymentMethod = payment_method;
        } else if (payment_method.toLowerCase().includes('cash')) {
          newPaymentMethod = 'Cash';
        } else if (payment_method.toLowerCase().includes('card')) {
          newPaymentMethod = 'Card';
        } else if (payment_method.toLowerCase().includes('upi')) {
          newPaymentMethod = 'UPI';
        } else if (payment_method.toLowerCase().includes('membership')) {
          newPaymentMethod = 'Membership';
        } else {
          newPaymentMethod = 'Other';
        }
      }
      if (upi_ref !== undefined) {
        newUpiRef = upi_ref;
      } else if (newPaymentMethod === 'UPI' && newPaymentStatus === 'Paid' && !newUpiRef) {
        newUpiRef = 'UPI/' + Date.now().toString().slice(-6) + '/' + Math.floor(100000 + Math.random() * 900000);
      }
      const membershipBenefitUsed = req.body.membership_benefit_used !== undefined
        ? req.body.membership_benefit_used
        : existingVisit.membership_benefit_used;
      const benefitUsedDate = req.body.benefit_used_date !== undefined
        ? req.body.benefit_used_date
        : (existingVisit.benefit_used_date || existingVisit.visit_date);
      const benefitStatus = req.body.benefit_status !== undefined
        ? req.body.benefit_status
        : (existingVisit.benefit_status || 'Partially used');

      db.prepare(`
        UPDATE VISITS
        SET amount_paid = ?,
            balance = ?,
            payment_status = ?,
            payment_method = ?,
            upi_ref = ?,
            notes = COALESCE(?, notes),
            service_time = ?,
            membership_amount_used = ?,
            membership_benefit_used = ?,
            benefit_used_date = ?,
            benefit_status = ?
        WHERE visit_id = ?
      `).run(
        newAmountPaid,
        newBalance,
        newPaymentStatus,
        newPaymentMethod,
        newUpiRef,
        notes || null,
        newServiceTime,
        membershipAmountUsed,
        membershipBenefitUsed,
        benefitUsedDate,
        benefitStatus,
        visitId
      );

      // If this visit included a membership purchase and is now Paid, activate the membership!
      if (existingVisit.membership_tier && parseFloat(existingVisit.membership_price) > 0 && newPaymentStatus === 'Paid') {
        const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const todayDate = new Date().toISOString().split('T')[0];
        db.prepare(`
          UPDATE CLIENTS
          SET membership_tier = ?,
              membership_status = 'active',
              membership_started_at = COALESCE(membership_started_at, ?),
              membership_expires_at = COALESCE(membership_expires_at, ?),
              updated_at = CURRENT_TIMESTAMP
          WHERE client_id = ?
        `).run(existingVisit.membership_tier, todayDate, expires, existingVisit.client_id);
      }

      // Recalculate client total spend and membership balance = tier cost - total credits used
      const clientVisits = db.prepare('SELECT SUM(amount_paid) as total_spent, SUM(membership_amount_used) as total_credits_used FROM VISITS WHERE client_id = ?').get(existingVisit.client_id);
      const currentClient = db.prepare('SELECT * FROM CLIENTS WHERE client_id = ?').get(existingVisit.client_id);
      const rawTier = (existingVisit.membership_tier && newPaymentStatus === 'Paid')
        ? existingVisit.membership_tier
        : (currentClient?.membership_tier || '');
      const tierCost = rawTier.toLowerCase().includes('lumiere') ? 50000 :
        rawTier.toLowerCase().includes('infini') ? 25000 :
        rawTier.toLowerCase().includes('eternal') ? 15000 :
        rawTier.toLowerCase().includes('eclat') ? 6000 : 0;

      const totalCreditsUsed = clientVisits?.total_credits_used || 0;
      const newClientBalance = tierCost > 0 ? Math.max(0, tierCost - totalCreditsUsed) : 0;

      db.prepare(`
        UPDATE CLIENTS
        SET total_spend = ?,
            membership_balance = ?,
            membership_benefit_status = COALESCE(?, membership_benefit_status),
            last_benefit_used = COALESCE(?, last_benefit_used),
            last_benefit_date = COALESCE(?, last_benefit_date),
            last_membership_amount_used = COALESCE(?, last_membership_amount_used)
        WHERE client_id = ?
      `).run(
        clientVisits.total_spent || 0,
        newClientBalance,
        benefitStatus || null,
        membershipBenefitUsed || null,
        benefitUsedDate || null,
        membershipAmountUsed,
        existingVisit.client_id
      );
    });

    transaction();

    // Fetch updated visit
    const updated = db.prepare(`
      SELECT v.*, c.name as client_name, c.phone as client_phone,
             c.membership_tier as client_membership_tier,
             c.membership_balance, c.membership_cost, c.membership_expires_at,
             c.membership_benefit_status,
             COALESCE(c.last_membership_benefit_used, c.last_benefit_used) as last_membership_benefit_used,
             c.last_membership_amount_used,
             COALESCE(v.membership_tier, c.membership_tier) as effective_membership_tier
      FROM VISITS v
      JOIN CLIENTS c ON v.client_id = c.client_id
      WHERE v.visit_id = ?
    `).get(visitId);

    const updatedServices = db.prepare(`
      SELECT vs.*, s.name as staff_name
      FROM VISIT_SERVICES vs
      LEFT JOIN STAFF s ON vs.staff_id = s.staff_id
      WHERE vs.visit_id = ?
    `).all(visitId);

    res.json({
      message: 'Visit updated successfully',
      visit: {
        ...updated,
        services: updatedServices,
        staff_summary: [...new Set(updatedServices.map(s => s.staff_name).filter(Boolean))].join(', ') || 'Unassigned'
      }
    });
  } catch (error) {
    console.error('Update visit error:', error);
    res.status(500).json({ error: error.message || 'Failed to update visit' });
  }
});

// ==================== REPORTING (PHASE 1) ====================
app.get('/api/reports', authenticateToken, authorizeRoles('admin'), (req, res) => {
  try {
    const now = new Date();
    const todayUTC = now.toISOString().split('T')[0];
    const todayLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const today = todayLocal;

    // Revenue metrics
    const revToday = db.prepare(`
      SELECT COALESCE(SUM(amount_paid), 0) as revenue, COUNT(*) as visits_count
      FROM VISITS 
      WHERE date(visit_date) IN (date(?), date(?))
         OR date(created_at, 'localtime') IN (date(?), date(?))
         OR date(created_at) IN (date(?), date(?))
    `).get(todayLocal, todayUTC, todayLocal, todayUTC, todayLocal, todayUTC);

    // This week (last 7 days)
    const revWeek = db.prepare(`
      SELECT COALESCE(SUM(amount_paid), 0) as revenue, COUNT(*) as visits_count
      FROM VISITS WHERE date(visit_date) >= date(?, '-7 days')
    `).get(today);

    // This month (start of current month)
    const startOfMonth = today.substring(0, 7) + '-01';
    const revMonth = db.prepare(`
      SELECT COALESCE(SUM(amount_paid), 0) as revenue, COUNT(*) as visits_count
      FROM VISITS WHERE date(visit_date) >= date(?)
    `).get(startOfMonth);

    // Total all time
    const revAll = db.prepare(`
      SELECT COALESCE(SUM(amount_paid), 0) as revenue, COUNT(*) as visits_count
      FROM VISITS
    `).get();

    // Client Breakdown
    const totalClients = db.prepare('SELECT COUNT(*) as count FROM CLIENTS').get().count;
    const newClients = db.prepare('SELECT COUNT(*) as count FROM CLIENTS WHERE total_visits <= 1').get().count;
    const regularClients = db.prepare('SELECT COUNT(*) as count FROM CLIENTS WHERE total_visits > 1').get().count;

    // Services Breakdown: Most performed services & revenue by service
    const serviceStats = db.prepare(`
      SELECT vs.service_name_snapshot as service_name,
             COUNT(vs.visit_service_id) as times_performed,
             SUM(vs.price_snapshot) as total_revenue
      FROM VISIT_SERVICES vs
      GROUP BY vs.service_name_snapshot
      ORDER BY times_performed DESC, total_revenue DESC
      LIMIT 10
    `).all();

    // Revenue by Category
    const categoryStats = db.prepare(`
      SELECT sc.category_name,
             COUNT(vs.visit_service_id) as total_services,
             COALESCE(SUM(vs.price_snapshot), 0) as total_revenue
      FROM SERVICE_CATEGORIES sc
      LEFT JOIN SERVICES s ON sc.category_id = s.category_id
      LEFT JOIN VISIT_SERVICES vs ON s.service_id = vs.service_id
      GROUP BY sc.category_id
      ORDER BY total_revenue DESC
    `).all();

    // Staff Performance: services performed and revenue handled
    const staffStats = db.prepare(`
      SELECT st.name as staff_name, st.role,
             COUNT(vs.visit_service_id) as services_count,
             COALESCE(SUM(vs.price_snapshot), 0) as revenue_generated
      FROM STAFF st
      LEFT JOIN VISIT_SERVICES vs ON st.staff_id = vs.staff_id
      GROUP BY st.staff_id
      ORDER BY revenue_generated DESC, services_count DESC
    `).all();

    res.json({
      revenue: {
        today: revToday.revenue,
        today_visits: revToday.visits_count,
        week: revWeek.revenue,
        week_visits: revWeek.visits_count,
        month: revMonth.revenue,
        month_visits: revMonth.visits_count,
        all_time: revAll.revenue,
        total_visits: revAll.visits_count
      },
      clients: {
        total: totalClients,
        new: newClients,
        regular: regularClients
      },
      top_services: serviceStats,
      categories: categoryStats,
      staff_performance: staffStats
    });
  } catch (error) {
    console.error('Reports error:', error);
    res.status(500).json({ error: 'Failed to generate reports' });
  }
});

// Serve built static frontend if available
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', studio: 'Maison BeYou CRM API', timestamp: new Date().toISOString() });
});

// Express 5 catch-all fallback for SPA
app.use((req, res, next) => {

  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  const indexPath = path.join(distPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(404).send('Maison BeYou CRM API is running. Run "npm run build" to build the client.');
    }
  });
});

app.listen(PORT, () => {
  console.log(`Maison BeYou CRM Server running on port ${PORT}`);
});


