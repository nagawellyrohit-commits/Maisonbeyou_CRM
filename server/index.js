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
    const today = new Date().toISOString().split('T')[0];

    // Today's summary metrics
    const visitsToday = db.prepare(`
      SELECT v.*, c.name as client_name, c.phone as client_phone, c.first_visit_date
      FROM VISITS v
      JOIN CLIENTS c ON v.client_id = c.client_id
      WHERE date(v.visit_date) = date(?)
      ORDER BY v.visit_id DESC
    `).all(today);

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
      if (v.first_visit_date === today) {
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
      WHERE date(v.visit_date) = date(?)
    `).get(today).count;

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
        is_new_client: v.first_visit_date === today,
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

// Get client by ID with profile, last visit, previous services & full history
app.get('/api/clients/:id', authenticateToken, (req, res) => {
  try {
    const clientId = req.params.id;
    const client = db.prepare('SELECT * FROM CLIENTS WHERE client_id = ?').get(clientId);

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
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
    // Map by service_id or name snapshot to get most recent occurrence
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

    res.json({
      client,
      last_visit: lastVisit ? { ...lastVisit, services: lastVisitServices } : null,
      previous_services: previousServices,
      all_service_history: allServiceHistory,
      visit_history: fullVisits
    });
  } catch (error) {
    console.error('Client details error:', error);
    res.status(500).json({ error: 'Failed to fetch client details' });
  }
});

// Update client notes/info
app.put('/api/clients/:id', authenticateToken, (req, res) => {
  try {
    const { name, email, notes, status } = req.body;
    const clientId = req.params.id;

    db.prepare(`
      UPDATE CLIENTS
      SET name = COALESCE(?, name),
          email = COALESCE(?, email),
          notes = COALESCE(?, notes),
          status = COALESCE(?, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE client_id = ?
    `).run(name, email, notes, status, clientId);

    const updated = db.prepare('SELECT * FROM CLIENTS WHERE client_id = ?').get(clientId);
    res.json({ client: updated });
  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({ error: 'Failed to update client' });
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
app.get('/api/admin/categories', authenticateToken, authorizeRoles('admin', 'manager'), (req, res) => {
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
app.get('/api/admin/staff', authenticateToken, authorizeRoles('admin', 'manager'), (req, res) => {
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
app.post('/api/visits', authenticateToken, authorizeRoles('admin', 'reception', 'manager'), (req, res) => {
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
      notes
    } = req.body;

    if (!services || services.length === 0) {
      throw new Error('At least one service must be selected');
    }

    const todayDate = visit_date || new Date().toISOString().split('T')[0];
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
        INSERT INTO CLIENTS (name, phone, first_visit_date, last_visit_date, total_visits, total_spend, status)
        VALUES (?, ?, ?, ?, 0, 0, 'active')
      `).run(name.trim(), cleanPhone, todayDate, todayDate);

      finalClientId = clientInfo.lastInsertRowid;
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
    let subtotal = 0;
    for (const s of services) {
      if (!s.staff_id) {
        throw new Error(`Please assign a staff member for service "${s.service_name}"`);
      }
      subtotal += parseFloat(s.price);
    }

    let discountAmount = 0;
    const discVal = parseFloat(discount_value) || 0;
    const discType = discount_type === 'percentage' ? 'percentage' : 'fixed';

    if (discType === 'percentage') {
      discountAmount = Math.round((subtotal * Math.min(Math.max(discVal, 0), 100)) / 100);
    } else {
      discountAmount = Math.min(Math.max(discVal, 0), subtotal);
    }

    const totalAmount = Math.max(0, subtotal - discountAmount);
    const paid = parseFloat(amount_paid) !== undefined && !isNaN(parseFloat(amount_paid))
      ? parseFloat(amount_paid)
      : totalAmount;
    const balance = Math.max(0, totalAmount - paid);

    let paymentStatus = 'Pending';
    if (paid >= totalAmount) {
      paymentStatus = 'Paid';
    } else if (paid > 0) {
      paymentStatus = 'Partially Paid';
    }

    const pMethod = ['Cash', 'UPI', 'Card', 'Other'].includes(payment_method) ? payment_method : 'UPI';

    // 3. Insert Visit
    const visitInfo = db.prepare(`
      INSERT INTO VISITS (
        client_id, visit_date, subtotal, discount_type, discount_value,
        discount_amount, total_amount, amount_paid, balance,
        payment_method, payment_status, created_by, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      req.user.user_id,
      notes || ''
    );

    const visitId = visitInfo.lastInsertRowid;

    // 4. Insert Visit Services with immutable snapshots
    const insertVisitService = db.prepare(`
      INSERT INTO VISIT_SERVICES (
        visit_id, service_id, service_name_snapshot, price_snapshot, staff_id
      ) VALUES (?, ?, ?, ?, ?)
    `);

    for (const s of services) {
      insertVisitService.run(
        visitId,
        s.service_id || null,
        s.service_name,
        parseFloat(s.price),
        s.staff_id
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

    return {
      visit_id: visitId,
      client_id: finalClientId,
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
      SELECT v.*, c.name as client_name, c.phone as client_phone, u.name as created_by_name
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

// ==================== REPORTING (PHASE 1) ====================
app.get('/api/reports', authenticateToken, authorizeRoles('admin', 'manager'), (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Revenue metrics
    const revToday = db.prepare(`
      SELECT COALESCE(SUM(amount_paid), 0) as revenue, COUNT(*) as visits_count
      FROM VISITS WHERE date(visit_date) = date(?)
    `).get(today);

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


