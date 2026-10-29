import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'maison_beyou.db');
const db = new Database(dbPath);

// Enable foreign keys and WAL mode for high performance
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS LOCATIONS (
      location_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE,
      type TEXT NOT NULL CHECK(type IN ('branch', 'franchise')),
      address TEXT,
      city TEXT,
      state TEXT,
      pincode TEXT,
      phone TEXT,
      email TEXT,
      status TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active', 'Inactive', 'Opening Soon')),
      manager_name TEXT,
      firm_type TEXT,
      firm_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS LOCATION_KYC (
      kyc_id INTEGER PRIMARY KEY AUTOINCREMENT,
      location_id INTEGER NOT NULL UNIQUE REFERENCES LOCATIONS(location_id) ON DELETE CASCADE,
      firm_type TEXT NOT NULL CHECK(firm_type IN ('Proprietor', 'Partnership', 'Pvt. Ltd.', 'LLP')),
      firm_name TEXT NOT NULL,
      address_line1 TEXT,
      address_line2 TEXT,
      pincode TEXT,
      city TEXT,
      state TEXT,
      mobile_numbers TEXT,
      email_ids TEXT,
      firm_pan TEXT,
      firm_pan_doc TEXT,
      gst_number TEXT,
      gst_doc TEXT,
      gumastha_number TEXT,
      gumastha_doc TEXT,
      cin_number TEXT,
      incorporation_doc TEXT,
      aoa_moa_doc TEXT,
      aoa_doc TEXT,
      moa_doc TEXT,
      bank_firm_name TEXT,
      bank_name TEXT,
      bank_account_number TEXT,
      bank_ifsc_code TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS LOCATION_STAKEHOLDERS (
      stakeholder_id INTEGER PRIMARY KEY AUTOINCREMENT,
      location_id INTEGER NOT NULL REFERENCES LOCATIONS(location_id) ON DELETE CASCADE,
      role_type TEXT NOT NULL,
      name TEXT NOT NULL,
      mobile TEXT,
      mobile_numbers TEXT,
      email TEXT,
      email_ids TEXT,
      gender TEXT,
      dob TEXT,
      marital_status TEXT,
      anniversary_date TEXT,
      pan_number TEXT,
      pan_doc TEXT,
      aadhaar_number TEXT,
      aadhaar_doc TEXT,
      din_number TEXT,
      display_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS USERS (
      user_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      designation TEXT,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'reception', 'visitor', 'staff', 'master_admin')),
      active INTEGER NOT NULL DEFAULT 1,
      location_id INTEGER REFERENCES LOCATIONS(location_id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS AUDIT_LOGS (
      log_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id INTEGER,
      location_id INTEGER,
      details TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS STAFF (
      staff_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      phone TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      location_id INTEGER REFERENCES LOCATIONS(location_id),
      aadhaar_number TEXT,
      aadhaar_doc TEXT,
      pan_number TEXT,
      pan_doc TEXT,
      photo_url TEXT,
      salary_type TEXT DEFAULT 'fixed',
      salary_amount REAL DEFAULT 0.0,
      incentive_percentage REAL DEFAULT 0.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS SERVICE_CATEGORIES (
      category_id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_name TEXT NOT NULL,
      location_id INTEGER REFERENCES LOCATIONS(location_id),
      description TEXT,
      icon TEXT,
      image_url TEXT,
      image_position TEXT,
      display_order INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS SERVICES (
      service_id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL REFERENCES SERVICE_CATEGORIES(category_id),
      service_name TEXT NOT NULL,
      price REAL NOT NULL,
      duration_mins INTEGER DEFAULT 45,
      description TEXT,
      display_order INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      has_sessions INTEGER DEFAULT 0,
      total_sessions INTEGER DEFAULT 1,
      session_interval INTEGER DEFAULT 0,
      session_interval_unit TEXT DEFAULT 'days',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS CLIENTS (
      client_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      surname TEXT,
      gender TEXT,
      phone TEXT NOT NULL,
      email TEXT,
      address_line1 TEXT,
      address_line2 TEXT,
      pincode TEXT,
      city TEXT,
      state TEXT,
      reg_no TEXT,
      notes TEXT,
      first_visit_date TEXT,
      last_visit_date TEXT,
      total_visits INTEGER NOT NULL DEFAULT 0,
      total_spend REAL NOT NULL DEFAULT 0.0,
      status TEXT NOT NULL DEFAULT 'active',
      location_id INTEGER REFERENCES LOCATIONS(location_id),
      membership_tier TEXT,
      membership_status TEXT DEFAULT 'active',
      membership_started_at TEXT,
      membership_expires_at TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      , UNIQUE(location_id, phone)
    );

    CREATE TABLE IF NOT EXISTS VISITS (
      visit_id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL REFERENCES CLIENTS(client_id),
      location_id INTEGER REFERENCES LOCATIONS(location_id),
      visit_date TEXT NOT NULL,
      subtotal REAL NOT NULL,
      discount_type TEXT NOT NULL DEFAULT 'fixed' CHECK(discount_type IN ('fixed', 'percentage')),
      discount_value REAL NOT NULL DEFAULT 0.0,
      discount_amount REAL NOT NULL DEFAULT 0.0,
      total_amount REAL NOT NULL,
      amount_paid REAL NOT NULL,
      balance REAL NOT NULL,
      payment_method TEXT CHECK(payment_method IN ('Cash', 'UPI', 'Card', 'Membership', 'Other')),
      payment_status TEXT NOT NULL CHECK(payment_status IN ('Paid', 'Partially Paid', 'Pending')),
      upi_ref TEXT,
      created_by INTEGER REFERENCES USERS(user_id),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS VISIT_SERVICES (
      visit_service_id INTEGER PRIMARY KEY AUTOINCREMENT,
      visit_id INTEGER NOT NULL REFERENCES VISITS(visit_id) ON DELETE CASCADE,
      service_id INTEGER REFERENCES SERVICES(service_id),
      service_name_snapshot TEXT NOT NULL,
      price_snapshot REAL NOT NULL,
      staff_id INTEGER REFERENCES STAFF(staff_id),
      course_id INTEGER,
      session_number INTEGER,
      total_sessions INTEGER,
      session_status TEXT DEFAULT 'completed',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Safe migrations for services spotlight/media details
  try { db.exec(`ALTER TABLE SERVICES ADD COLUMN subtitle TEXT;`); } catch(e) {}
  try { db.exec(`ALTER TABLE SERVICES ADD COLUMN tag TEXT;`); } catch(e) {}
  try { db.exec(`ALTER TABLE SERVICES ADD COLUMN downtime TEXT;`); } catch(e) {}
  try { db.exec(`ALTER TABLE SERVICES ADD COLUMN vsp_badges TEXT;`); } catch(e) {}
  try { db.exec(`ALTER TABLE SERVICES ADD COLUMN highlights TEXT;`); } catch(e) {}
  try { db.exec(`ALTER TABLE SERVICES ADD COLUMN video_url TEXT;`); } catch(e) {}
  try { db.exec(`ALTER TABLE SERVICES ADD COLUMN image_url TEXT;`); } catch(e) {}
  try { db.exec(`ALTER TABLE SERVICES ADD COLUMN gallery TEXT;`); } catch(e) {}

  // Safe migrations for membership and upi_ref columns
  try { db.exec(`ALTER TABLE CLIENTS ADD COLUMN membership_tier TEXT;`); } catch(e) {}
  try { db.exec(`ALTER TABLE CLIENTS ADD COLUMN membership_status TEXT DEFAULT 'active';`); } catch(e) {}
  try { db.exec(`ALTER TABLE CLIENTS ADD COLUMN membership_started_at TEXT;`); } catch(e) {}
  try { db.exec(`ALTER TABLE CLIENTS ADD COLUMN membership_expires_at TEXT;`); } catch(e) {}
  try { db.exec(`ALTER TABLE CLIENTS ADD COLUMN membership_balance REAL DEFAULT 10000.0;`); } catch(e) {}
  try { db.exec(`ALTER TABLE CLIENTS ADD COLUMN membership_benefit_status TEXT DEFAULT 'Available';`); } catch(e) {}
  try { db.exec(`ALTER TABLE CLIENTS ADD COLUMN last_benefit_used TEXT;`); } catch(e) {}
  try { db.exec(`ALTER TABLE CLIENTS ADD COLUMN last_benefit_date TEXT;`); } catch(e) {}
  try { db.exec(`ALTER TABLE CLIENTS ADD COLUMN last_membership_amount_used REAL DEFAULT 0.0;`); } catch(e) {}

  try { db.exec(`ALTER TABLE CLIENTS ADD COLUMN membership_cost REAL DEFAULT 0.0;`); } catch(e) {}
  try { db.exec(`ALTER TABLE CLIENTS ADD COLUMN last_membership_benefit_used TEXT;`); } catch(e) {}

  // Synchronize initial membership_balance with tier cost minus total credits used till date
  try {
    db.exec(`
      UPDATE CLIENTS 
      SET membership_cost = CASE
        WHEN LOWER(membership_tier) LIKE '%lumiere%' THEN 50000.0
        WHEN LOWER(membership_tier) LIKE '%infini%' THEN 25000.0
        WHEN LOWER(membership_tier) LIKE '%eternal%' THEN 15000.0
        WHEN LOWER(membership_tier) LIKE '%eclat%' THEN 6000.0
        ELSE 0.0
      END
      WHERE membership_tier IS NOT NULL 
        AND membership_tier != '' 
        AND LOWER(membership_tier) != 'non-member';

      UPDATE CLIENTS
      SET last_membership_benefit_used = last_benefit_used
      WHERE last_benefit_used IS NOT NULL AND (last_membership_benefit_used IS NULL OR last_membership_benefit_used = '');

      UPDATE CLIENTS 
      SET membership_balance = MAX(0.0, CASE
        WHEN LOWER(membership_tier) LIKE '%lumiere%' THEN 50000.0
        WHEN LOWER(membership_tier) LIKE '%infini%' THEN 25000.0
        WHEN LOWER(membership_tier) LIKE '%eternal%' THEN 15000.0
        WHEN LOWER(membership_tier) LIKE '%eclat%' THEN 6000.0
        ELSE 0.0
      END - COALESCE((SELECT SUM(membership_amount_used) FROM VISITS WHERE VISITS.client_id = CLIENTS.client_id), 0.0))
      WHERE membership_tier IS NOT NULL 
        AND membership_tier != '' 
        AND LOWER(membership_tier) != 'non-member';
    `);
  } catch(e) {}

  try { db.exec(`ALTER TABLE VISITS ADD COLUMN upi_ref TEXT;`); } catch(e) {}
  try { db.exec(`ALTER TABLE VISITS ADD COLUMN service_time TEXT;`); } catch(e) {}
  try { db.exec(`ALTER TABLE VISITS ADD COLUMN tax_amount REAL DEFAULT 0.0;`); } catch(e) {}
  try { db.exec(`ALTER TABLE VISITS ADD COLUMN membership_price REAL DEFAULT 0.0;`); } catch(e) {}
  try { db.exec(`ALTER TABLE VISITS ADD COLUMN membership_tier TEXT;`); } catch(e) {}
  try { db.exec(`ALTER TABLE VISITS ADD COLUMN membership_amount_used REAL DEFAULT 0.0;`); } catch(e) {}
  try { db.exec(`ALTER TABLE VISITS ADD COLUMN membership_benefit_used TEXT;`); } catch(e) {}
  try { db.exec(`ALTER TABLE VISITS ADD COLUMN benefit_used_date TEXT;`); } catch(e) {}
  try { db.exec(`ALTER TABLE VISITS ADD COLUMN benefit_status TEXT DEFAULT 'Available';`); } catch(e) {}

  // Safe migration for VISIT_SERVICES privilege tracking
  try { db.exec(`ALTER TABLE VISIT_SERVICES ADD COLUMN is_privilege INTEGER DEFAULT 0;`); } catch(e) {}
  try { db.exec(`ALTER TABLE VISIT_SERVICES ADD COLUMN privilege_id TEXT;`); } catch(e) {}

  // Safe migrations for Service Session Planning & Tracking
  try { db.exec(`ALTER TABLE SERVICES ADD COLUMN has_sessions INTEGER DEFAULT 0;`); } catch(e) {}
  try { db.exec(`ALTER TABLE SERVICES ADD COLUMN total_sessions INTEGER DEFAULT 1;`); } catch(e) {}
  try { db.exec(`ALTER TABLE SERVICES ADD COLUMN session_interval INTEGER DEFAULT 0;`); } catch(e) {}
  try { db.exec(`ALTER TABLE SERVICES ADD COLUMN session_interval_unit TEXT DEFAULT 'days';`); } catch(e) {}

  try { db.exec(`ALTER TABLE VISIT_SERVICES ADD COLUMN course_id INTEGER;`); } catch(e) {}
  try { db.exec(`ALTER TABLE VISIT_SERVICES ADD COLUMN session_number INTEGER;`); } catch(e) {}
  try { db.exec(`ALTER TABLE VISIT_SERVICES ADD COLUMN total_sessions INTEGER;`); } catch(e) {}
  try { db.exec(`ALTER TABLE VISIT_SERVICES ADD COLUMN session_status TEXT DEFAULT 'completed';`); } catch(e) {}

  // Schema for permanent Membership Purchase instances and Privilege Redemptions
  db.exec(`
    CREATE TABLE IF NOT EXISTS CLIENT_MEMBERSHIPS (
      membership_id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL REFERENCES CLIENTS(client_id) ON DELETE CASCADE,
      tier_name TEXT NOT NULL,
      cost REAL NOT NULL DEFAULT 0.0,
      credits_allocated REAL NOT NULL DEFAULT 0.0,
      start_date TEXT NOT NULL,
      expiry_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'expired', 'upgraded', 'renewed', 'cancelled')),
      purchase_visit_id INTEGER REFERENCES VISITS(visit_id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS MEMBERSHIP_PRIVILEGE_REDEMPTIONS (
      redemption_id INTEGER PRIMARY KEY AUTOINCREMENT,
      membership_id INTEGER NOT NULL REFERENCES CLIENT_MEMBERSHIPS(membership_id) ON DELETE CASCADE,
      client_id INTEGER NOT NULL REFERENCES CLIENTS(client_id) ON DELETE CASCADE,
      privilege_id TEXT NOT NULL,
      privilege_name TEXT NOT NULL,
      visit_id INTEGER REFERENCES VISITS(visit_id),
      redeemed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('completed', 'cancelled')),
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS CLIENT_TREATMENT_COURSES (
      course_id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL REFERENCES CLIENTS(client_id) ON DELETE CASCADE,
      service_id INTEGER NOT NULL REFERENCES SERVICES(service_id),
      service_name_snapshot TEXT NOT NULL,
      total_planned_sessions INTEGER NOT NULL DEFAULT 1,
      interval_value INTEGER NOT NULL DEFAULT 0,
      interval_unit TEXT NOT NULL DEFAULT 'days',
      completed_sessions_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed', 'cancelled')),
      start_date TEXT,
      last_completed_date TEXT,
      next_due_date TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS TREATMENT_COURSE_SESSIONS (
      session_id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL REFERENCES CLIENT_TREATMENT_COURSES(course_id) ON DELETE CASCADE,
      client_id INTEGER NOT NULL REFERENCES CLIENTS(client_id) ON DELETE CASCADE,
      service_id INTEGER NOT NULL REFERENCES SERVICES(service_id),
      session_number INTEGER NOT NULL,
      total_sessions INTEGER NOT NULL,
      visit_id INTEGER REFERENCES VISITS(visit_id),
      visit_service_id INTEGER REFERENCES VISIT_SERVICES(visit_service_id) UNIQUE,
      session_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('upcoming', 'completed', 'cancelled', 'no_show')),
      staff_id INTEGER REFERENCES STAFF(staff_id),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Backfill CLIENT_MEMBERSHIPS for existing active member clients
  try {
    const existingMembers = db.prepare(`
      SELECT client_id, membership_tier, membership_cost, membership_balance, 
             membership_started_at, membership_expires_at, membership_status
      FROM CLIENTS
      WHERE membership_tier IS NOT NULL 
        AND membership_tier != '' 
        AND LOWER(membership_tier) != 'non-member'
        AND (membership_status IS NULL OR membership_status = 'active')
    `).all();

    for (const mem of existingMembers) {
      const activeRec = db.prepare(`
        SELECT membership_id FROM CLIENT_MEMBERSHIPS 
        WHERE client_id = ? AND status = 'active'
      `).get(mem.client_id);

      if (!activeRec) {
        const rawT = (mem.membership_tier || '').toLowerCase();
        const tierCost = rawT.includes('lumiere') ? 50000 :
          rawT.includes('infini') ? 25000 :
          rawT.includes('eternal') ? 15000 :
          rawT.includes('eclat') ? 6000 : 25000;

        const info = db.prepare(`
          INSERT INTO CLIENT_MEMBERSHIPS (
            client_id, tier_name, cost, credits_allocated, start_date, expiry_date, status
          ) VALUES (?, ?, ?, ?, ?, ?, 'active')
        `).run(
          mem.client_id,
          mem.membership_tier,
          mem.membership_cost || tierCost,
          mem.membership_cost || tierCost,
          mem.membership_started_at || '2026-10-15',
          mem.membership_expires_at || '2027-10-15'
        );

        const newMemId = info.lastInsertRowid;

        // If this is an Infini member, seed initial used privileges (analysis x2 and VIP access) matching screenshot
        if (rawT.includes('infini')) {
          const insertRedemption = db.prepare(`
            INSERT INTO MEMBERSHIP_PRIVILEGE_REDEMPTIONS (membership_id, client_id, privilege_id, privilege_name, status)
            VALUES (?, ?, ?, ?, 'completed')
          `);
          // 3D skin & hair analysis twice a year: 2 redemptions (allowed 2 -> USED)
          insertRedemption.run(newMemId, mem.client_id, 'priv_infini_analysis', 'Free comprehensive 3D skin & hair analysis twice a year');
          insertRedemption.run(newMemId, mem.client_id, 'priv_infini_analysis', 'Free comprehensive 3D skin & hair analysis twice a year');
          // Dedicated relationship manager & VIP suite access: 1 redemption (allowed 1 -> USED)
          insertRedemption.run(newMemId, mem.client_id, 'priv_infini_vip', 'Dedicated relationship manager & VIP suite access');
        }
      }
    }
  } catch(e) {
    console.error('Membership backfill notice:', e.message);
  }

  // Safe migrations for location_id columns
  try { db.exec(`ALTER TABLE USERS ADD COLUMN location_id INTEGER;`); } catch(e) {}
  try { db.exec(`ALTER TABLE USERS ADD COLUMN designation TEXT;`); } catch(e) {}
  try { db.exec(`ALTER TABLE USERS ADD COLUMN deleted_at DATETIME;`); } catch(e) {}
  db.exec(`
    CREATE TABLE IF NOT EXISTS USER_ACCESS_PROFILES (
      user_id INTEGER PRIMARY KEY REFERENCES USERS(user_id) ON DELETE CASCADE,
      location_id INTEGER NOT NULL REFERENCES LOCATIONS(location_id) ON DELETE CASCADE,
      permissions TEXT NOT NULL DEFAULT '[]',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  // Give existing desk accounts the intended access profile when upgrading
  // from the legacy role-only setup. Admin accounts are intentionally excluded.
  db.prepare(`
    INSERT OR IGNORE INTO USER_ACCESS_PROFILES (user_id, location_id, permissions)
    SELECT user_id, location_id,
      CASE WHEN role = 'visitor' THEN '["visitor_intake"]'
           ELSE '["dashboard","visits","clients"]' END
    FROM USERS
    WHERE role IN ('reception', 'visitor') AND location_id IS NOT NULL
  `).run();
  const managerProfiles = db.prepare(`
    SELECT p.user_id, p.location_id, p.permissions
    FROM USER_ACCESS_PROFILES p
    JOIN USERS u ON u.user_id = p.user_id
    WHERE u.role = 'reception'
  `).all();
  const saveManagerPermissions = db.prepare(`
    UPDATE USER_ACCESS_PROFILES
    SET permissions = ?, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ? AND location_id = ?
  `);
  for (const profile of managerProfiles) {
    try {
      const permissions = JSON.parse(profile.permissions || '[]');
      if (Array.isArray(permissions) && permissions.includes('visitor_intake')) {
        saveManagerPermissions.run(JSON.stringify(permissions.filter(permission => permission !== 'visitor_intake')), profile.user_id, profile.location_id);
      }
    } catch (e) {}
  }
  try { db.exec(`ALTER TABLE STAFF ADD COLUMN location_id INTEGER;`); } catch(e) {}
  try { db.exec(`ALTER TABLE STAFF ADD COLUMN aadhaar_number TEXT;`); } catch(e) {}
  try { db.exec(`ALTER TABLE STAFF ADD COLUMN aadhaar_doc TEXT;`); } catch(e) {}
  try { db.exec(`ALTER TABLE STAFF ADD COLUMN pan_number TEXT;`); } catch(e) {}
  try { db.exec(`ALTER TABLE STAFF ADD COLUMN pan_doc TEXT;`); } catch(e) {}
  try { db.exec(`ALTER TABLE STAFF ADD COLUMN photo_url TEXT;`); } catch(e) {}
  try { db.exec(`ALTER TABLE STAFF ADD COLUMN salary_type TEXT DEFAULT 'fixed';`); } catch(e) {}
  try { db.exec(`ALTER TABLE STAFF ADD COLUMN salary_amount REAL DEFAULT 0.0;`); } catch(e) {}
  try { db.exec(`ALTER TABLE STAFF ADD COLUMN incentive_percentage REAL DEFAULT 0.0;`); } catch(e) {}
  try { db.exec(`ALTER TABLE CLIENTS ADD COLUMN location_id INTEGER;`); } catch(e) {}
  try { db.exec(`ALTER TABLE VISITS ADD COLUMN location_id INTEGER;`); } catch(e) {}
  try { db.exec(`ALTER TABLE LOCATIONS ADD COLUMN firm_type TEXT;`); } catch(e) {}
  try { db.exec(`ALTER TABLE LOCATIONS ADD COLUMN firm_name TEXT;`); } catch(e) {}
  try { db.exec(`ALTER TABLE SERVICE_CATEGORIES ADD COLUMN location_id INTEGER REFERENCES LOCATIONS(location_id);`); } catch(e) {}

  // Replace the legacy global client-phone uniqueness with per-branch uniqueness.
  // Rebuild in place so existing visit and membership foreign keys continue to target CLIENTS.
  try {
    const clientsSql = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'CLIENTS'").get()?.sql || '';
    if (/phone\s+TEXT\s+UNIQUE\s+NOT\s+NULL/i.test(clientsSql)) {
      const columns = db.pragma('table_info(CLIENTS)').map(column => `\"${column.name}\"`).join(', ');
      const branchScopedClientsSql = clientsSql
        .replace(/^CREATE TABLE\s+CLIENTS/i, 'CREATE TABLE CLIENTS_branch_scoped')
        .replace(/phone\s+TEXT\s+UNIQUE\s+NOT\s+NULL/i, 'phone TEXT NOT NULL')
        .replace(/\)\s*$/, ', UNIQUE(location_id, phone))');
      db.pragma('foreign_keys = OFF');
      try {
        db.exec('BEGIN IMMEDIATE');
        db.exec(branchScopedClientsSql);
        db.exec(`INSERT INTO CLIENTS_branch_scoped (${columns}) SELECT ${columns} FROM CLIENTS`);
        db.exec('DROP TABLE CLIENTS');
        db.exec('ALTER TABLE CLIENTS_branch_scoped RENAME TO CLIENTS');
        db.exec('COMMIT');
      } catch (migrationError) {
        try { db.exec('ROLLBACK'); } catch (e) {}
        throw migrationError;
      } finally {
        db.pragma('foreign_keys = ON');
      }
    }
  } catch (e) {
    console.error('Branch-scoped client phone migration notice:', e.message);
  }

  // Safe migration to support 'master_admin' in USERS role constraint if needed
  try {
    const userSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='USERS'").get()?.sql || '';
    if (userSql && !userSql.includes('master_admin')) {
      db.exec(`
        PRAGMA foreign_keys = OFF;
        CREATE TABLE USERS_new (
          user_id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('admin', 'reception', 'visitor', 'staff', 'master_admin')),
          active INTEGER NOT NULL DEFAULT 1,
          location_id INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        INSERT INTO USERS_new (user_id, name, email, password_hash, role, active, location_id, created_at, updated_at)
        SELECT user_id, name, email, password_hash, role, active, location_id, created_at, updated_at FROM USERS;
        DROP TABLE USERS;
        ALTER TABLE USERS_new RENAME TO USERS;
        PRAGMA foreign_keys = ON;
      `);
      console.log('USERS table migrated to support master_admin role.');
    }
  } catch (e) {
    console.error('Users migration notice:', e.message);
  }

  // Safe migration and seeding of default LOCATIONS
  try {
    const locCount = db.prepare("SELECT COUNT(*) as count FROM LOCATIONS").get().count;
    if (locCount === 0) {
      console.log('Seeding initial branches and franchises...');
      const insertLoc = db.prepare(`
        INSERT INTO LOCATIONS (name, code, type, address, city, state, pincode, phone, email, status, manager_name)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertLoc.run(
        'Maison BeYou — Jubilee Hills Flagship',
        'MB-B-HYD-001',
        'branch',
        'Road No. 36, Jubilee Hills',
        'Hyderabad',
        'Telangana',
        '500033',
        '+91 98200 12345',
        'jubilee@maisonbeyou.com',
        'Active',
        'Ayesha Khan'
      );

      insertLoc.run(
        'Maison BeYou — Bandra West Studio',
        'MB-B-MUM-001',
        'branch',
        'Linking Road, Bandra West',
        'Mumbai',
        'Maharashtra',
        '400050',
        '+91 98200 54321',
        'bandra@maisonbeyou.com',
        'Active',
        'Vikram Rathore'
      );

      insertLoc.run(
        'Maison BeYou — Indiranagar Franchise',
        'MB-F-BEN-001',
        'franchise',
        '100ft Road, Indiranagar',
        'Bengaluru',
        'Karnataka',
        '560038',
        '+91 98800 11223',
        'indiranagar@maisonbeyou.com',
        'Active',
        'Karan Verma'
      );

      insertLoc.run(
        'Maison BeYou — Koregaon Park Franchise',
        'MB-F-PUN-001',
        'franchise',
        'North Main Road, Koregaon Park',
        'Pune',
        'Maharashtra',
        '411001',
        '+91 98900 33445',
        'koregaon@maisonbeyou.com',
        'Active',
        'Tanvi Deshmukh'
      );
    }

    // Associate existing records with flagship branch (location_id = 1) if not already associated
    db.exec(`
      UPDATE USERS SET location_id = 1 WHERE location_id IS NULL AND role != 'master_admin';
      UPDATE STAFF SET location_id = 1 WHERE location_id IS NULL;
      UPDATE CLIENTS SET location_id = 1 WHERE location_id IS NULL;
      UPDATE VISITS SET location_id = 1 WHERE location_id IS NULL;
      UPDATE SERVICE_CATEGORIES SET location_id = 1 WHERE location_id IS NULL;
    `);
  } catch (e) {
    console.error('Locations migration notice:', e.message);
  }

  // Safe migration to support 'Membership' in VISITS payment_method constraint
  try {
    const visitSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='VISITS'").get()?.sql || '';
    if (visitSql && !visitSql.includes("'Membership'")) {
      db.exec(`
        PRAGMA foreign_keys = OFF;
        CREATE TABLE VISITS_new (
          visit_id INTEGER PRIMARY KEY AUTOINCREMENT,
          client_id INTEGER NOT NULL REFERENCES CLIENTS(client_id),
          visit_date TEXT NOT NULL,
          subtotal REAL NOT NULL,
          discount_type TEXT NOT NULL DEFAULT 'fixed' CHECK(discount_type IN ('fixed', 'percentage')),
          discount_value REAL NOT NULL DEFAULT 0.0,
          discount_amount REAL NOT NULL DEFAULT 0.0,
          total_amount REAL NOT NULL,
          amount_paid REAL NOT NULL,
          balance REAL NOT NULL,
          payment_method TEXT CHECK(payment_method IN ('Cash', 'UPI', 'Card', 'Membership', 'Other')),
          payment_status TEXT NOT NULL CHECK(payment_status IN ('Paid', 'Partially Paid', 'Pending')),
          upi_ref TEXT,
          created_by INTEGER REFERENCES USERS(user_id),
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          service_time TEXT,
          tax_amount REAL DEFAULT 0.0,
          membership_price REAL DEFAULT 0.0,
          membership_tier TEXT,
          membership_amount_used REAL DEFAULT 0.0,
          membership_benefit_used TEXT,
          benefit_used_date TEXT,
          benefit_status TEXT DEFAULT 'Available'
        );
        INSERT INTO VISITS_new (
          visit_id, client_id, visit_date, subtotal, discount_type, discount_value,
          discount_amount, total_amount, amount_paid, balance, payment_method,
          payment_status, upi_ref, created_by, notes, created_at, service_time,
          tax_amount, membership_price, membership_tier, membership_amount_used,
          membership_benefit_used, benefit_used_date, benefit_status
        )
        SELECT 
          visit_id, client_id, visit_date, subtotal, discount_type, discount_value,
          discount_amount, total_amount, amount_paid, balance, payment_method,
          payment_status, upi_ref, created_by, notes, created_at, service_time,
          tax_amount, membership_price, membership_tier, membership_amount_used,
          membership_benefit_used, benefit_used_date, benefit_status
        FROM VISITS;
        DROP TABLE VISITS;
        ALTER TABLE VISITS_new RENAME TO VISITS;
        PRAGMA foreign_keys = ON;
      `);
      console.log('VISITS table migrated to support Membership payment_method.');
    }
  } catch (e) {
    console.error('VISITS migration notice:', e.message);
  }

  seedData();
}

function seedData() {
  const insertUser = db.prepare(`
    INSERT INTO USERS (name, email, password_hash, role, active)
    VALUES (?, ?, ?, ?, 1)
  `);
  const salt = bcrypt.genSaltSync(10);

  // Check if users exist
  const userCount = db.prepare('SELECT COUNT(*) as count FROM USERS').get().count;
  if (userCount === 0) {
    console.log('Seeding initial users...');
    insertUser.run('Maison Admin', 'admin@maisonbeyou.com', bcrypt.hashSync('admin123', salt), 'admin');
    insertUser.run('Reception Desk', 'reception@maisonbeyou.com', bcrypt.hashSync('reception123', salt), 'reception');
  }

  // Ensure visitor user exists
  const visitorUser = db.prepare('SELECT * FROM USERS WHERE email = ?').get('visitor@maisonbeyou.com');
  if (!visitorUser) {
    console.log('Seeding visitor user...');
    insertUser.run('Visitor Desk', 'visitor@maisonbeyou.com', bcrypt.hashSync('visitor123', salt), 'visitor');
  }

  // Ensure master admin user exists
  const masterUser = db.prepare('SELECT * FROM USERS WHERE email = ?').get('master@maisonbeyou.com');
  if (!masterUser) {
    console.log('Seeding Master Admin user...');
    insertUser.run('Maison Master Admin', 'master@maisonbeyou.com', bcrypt.hashSync('master123', salt), 'master_admin');
  }

  // Multi-location sample staff and clients for isolation demo
  try {
    const loc2Staff = db.prepare('SELECT COUNT(*) as count FROM STAFF WHERE location_id = 2').get().count;
    if (loc2Staff === 0) {
      const insertStaffLoc = db.prepare(`INSERT INTO STAFF (name, role, phone, active, location_id) VALUES (?, ?, ?, 1, ?)`);
      insertStaffLoc.run('Dr. Sameer Sen', 'Aesthetic Physician', '+91 98205 11223', 2);
      insertStaffLoc.run('Natasha Rao', 'Skin & Laser Specialist', '+91 98205 22334', 2);
    }

    const loc3Staff = db.prepare('SELECT COUNT(*) as count FROM STAFF WHERE location_id = 3').get().count;
    if (loc3Staff === 0) {
      const insertStaffLoc = db.prepare(`INSERT INTO STAFF (name, role, phone, active, location_id) VALUES (?, ?, ?, 1, ?)`);
      insertStaffLoc.run('Dr. Kavita Reddy', 'Consultant Dermatologist', '+91 98801 11223', 3);
      insertStaffLoc.run('Deepak Nair', 'Senior Laser Therapist', '+91 98801 22334', 3);
    }

    const loc2Clients = db.prepare('SELECT COUNT(*) as count FROM CLIENTS WHERE location_id = 2').get().count;
    if (loc2Clients === 0) {
      const insertClientLoc = db.prepare(`
        INSERT OR IGNORE INTO CLIENTS (name, surname, phone, email, location_id, total_visits, total_spend, status, membership_tier)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)
      `);
      insertClientLoc.run('Meera', 'Singhania', '9820500001', 'meera.s@example.com', 2, 3, 24000, 'LUMIÈRE PRIVILEGE');
      insertClientLoc.run('Arjun', 'Kapoor', '9820500002', 'arjun.k@example.com', 2, 1, 8500, 'ÉCLAT ESSENTIALS');
    }

    const loc3Clients = db.prepare('SELECT COUNT(*) as count FROM CLIENTS WHERE location_id = 3').get().count;
    if (loc3Clients === 0) {
      const insertClientLoc = db.prepare(`
        INSERT OR IGNORE INTO CLIENTS (name, surname, phone, email, location_id, total_visits, total_spend, status, membership_tier)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)
      `);
      insertClientLoc.run('Ananya', 'Iyer', '9880100003', 'ananya.iyer@example.com', 3, 2, 18500, 'INFINI PRIVILEGE');
    }
  } catch(e) {
    console.error('Multi-location seed notice:', e.message);
  }

  // Check if staff exist
  const staffCount = db.prepare('SELECT COUNT(*) as count FROM STAFF').get().count;
  if (staffCount === 0) {
    console.log('Seeding initial staff...');
    const insertStaff = db.prepare(`
      INSERT INTO STAFF (name, role, phone, active)
      VALUES (?, ?, ?, 1)
    `);

    insertStaff.run('Dr. Ananya Sharma', 'Senior Aesthetician', '+91 98201 11223');
    insertStaff.run('Pooja Mehta', 'Laser & Hair Specialist', '+91 98202 22334');
    insertStaff.run('Sneha Patel', 'Skin & Medi-Facial Expert', '+91 98203 33445');
    insertStaff.run('Priya Roy', 'Cosmetologist & Brow Artist', '+91 98204 44556');
    insertStaff.run('Ritu Kapoor', 'Body Contouring Therapist', '+91 98205 55667');
  }

  // Check if categories exist
  const catCount = db.prepare('SELECT COUNT(*) as count FROM SERVICE_CATEGORIES').get().count;
  if (catCount === 0) {
    console.log('Seeding 6 main service categories & sub-services...');
    const insertCat = db.prepare(`
      INSERT INTO SERVICE_CATEGORIES (category_name, location_id, description, icon, display_order, active)
      VALUES (?, 1, ?, ?, ?, 1)
    `);

    const insertService = db.prepare(`
      INSERT INTO SERVICES (category_id, service_name, price, duration_mins, description, display_order, active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `);

    const categories = [
      {
        name: 'Laser Hair Reduction',
        desc: 'Advanced diode & alexandrite precision laser for smooth, hair-free skin',
        icon: 'Sparkles',
        order: 1,
        services: [
          { name: 'Underarms Laser', price: 1500, duration: 20, desc: 'Painless underarm hair reduction' },
          { name: 'Full Arms Laser', price: 3500, duration: 45, desc: 'Complete arm coverage including hands' },
          { name: 'Half Arms Laser', price: 2200, duration: 30, desc: 'Upper or lower arms' },
          { name: 'Full Legs Laser', price: 5500, duration: 60, desc: 'Thighs, calves and feet' },
          { name: 'Half Legs Laser', price: 3200, duration: 35, desc: 'Calves or thighs' },
          { name: 'Bikini Line Laser', price: 2500, duration: 30, desc: 'Clean, hygienic bikini contour' },
          { name: 'Full Body Laser', price: 14999, duration: 120, desc: 'Comprehensive full-body laser package' },
          { name: 'Back & Shoulders', price: 4000, duration: 45, desc: 'Complete back laser reduction' },
          { name: 'Chest & Stomach', price: 4000, duration: 45, desc: 'Chest and abdomen contour' },
          { name: 'Feet & Toes', price: 1200, duration: 15, desc: 'Feet and toes clean up' }
        ]
      },
      {
        name: 'Facials & Medi-Facials',
        desc: 'Customized clinical-grade facials for cellular rejuvenation and glass skin',
        icon: 'Smile',
        order: 2,
        services: [
          { name: 'BEU Hydration Facial', price: 3500, duration: 60, desc: 'Intensive hyaluronic acid infusion and cold hammer therapy' },
          { name: 'BEU Clear Skin Therapy', price: 2800, duration: 50, desc: 'Deep pore extraction and blue LED clarifying light' },
          { name: '24K Gold Radiance Facial', price: 4800, duration: 75, desc: 'Luxury gold leaf lymphatic massage & brightening mask' },
          { name: 'OxyGeneo Super Facial', price: 4500, duration: 60, desc: '3-in-1 oxygenation, gentle exfoliation and serum infusion' },
          { name: 'Carbon Laser Hollywood Peel', price: 5200, duration: 60, desc: 'Carbon cream laser peel for instant red-carpet glow' },
          { name: 'Vitamin C Brightening Facial', price: 3200, duration: 50, desc: 'Antioxidant power booster for pigmented skin' }
        ]
      },
      {
        name: 'Skin Aesthetics & Peels',
        desc: 'Dermatological resurfacing, gentle chemical peels, and microneedling',
        icon: 'Feather',
        order: 3,
        services: [
          { name: 'Salicylic Acne Peel', price: 2200, duration: 30, desc: 'Targeted beta-hydroxy peel for active blemishes' },
          { name: 'Glycolic Rejuvenation Peel', price: 2800, duration: 35, desc: 'Fine lines softening and deep texture renewal' },
          { name: 'Dermapen Microneedling', price: 5500, duration: 60, desc: 'Collagen induction therapy for scars & elasticity' },
          { name: 'Glutathione Glow Infusion', price: 4200, duration: 45, desc: 'Pure antioxidant dermal booster for even tone' },
          { name: 'Vampire Facial PRP', price: 7500, duration: 90, desc: 'Platelet-rich plasma cellular renewal' },
          { name: 'Pigmentation Correction Peel', price: 3800, duration: 40, desc: 'Mandelic-lactic combination for melasma & spots' }
        ]
      },
      {
        name: 'Body Sculpting & Contouring',
        desc: 'Non-invasive targeted fat reduction, muscle toning, and lymphatic drainage',
        icon: 'Flame',
        order: 4,
        services: [
          { name: 'Cryolipolysis Fat Freeze (1 Area)', price: 6500, duration: 60, desc: 'Controlled cooling to eliminate stubborn fat cells' },
          { name: 'EMS High-Intensity Muscle Sculpt', price: 4000, duration: 45, desc: 'Electromagnetic muscle contraction workout' },
          { name: 'Cellulite Reduction Therapy', price: 3500, duration: 50, desc: 'Radiofrequency skin tightening and smoothing' },
          { name: 'Lymphatic Drainage Contouring', price: 3000, duration: 60, desc: 'Full body detox massage with compression boots' }
        ]
      },
      {
        name: 'Hair & Scalp Therapy',
        desc: 'Luxurious restorative scalp care, hair spa, and growth stimulation',
        icon: 'Crown',
        order: 5,
        services: [
          { name: 'Maison Luxury Hair Spa', price: 2500, duration: 60, desc: 'Deep conditioning steam therapy and scalp ritual' },
          { name: 'Scalp Detox & Micro-Exfoliation', price: 2200, duration: 45, desc: 'Salicylic scalp peel and high frequency treatment' },
          { name: 'Hair PRP Growth Therapy', price: 6000, duration: 75, desc: 'Platelet therapy for thinning hair & density boost' },
          { name: 'Keratin & Moisture Infusion', price: 4500, duration: 90, desc: 'Frizz-free silk finish protein seal' },
          { name: 'Anti-Dandruff Scalp Clarifying', price: 2000, duration: 40, desc: 'Antibacterial botanical scalp purification' }
        ]
      },
      {
        name: 'Brows & Semi-Permanent',
        desc: 'Precision microblading, ombre shading, lip blush, and lash enhancements',
        icon: 'Eye',
        order: 6,
        services: [
          { name: 'Microblading Feather Brows', price: 8500, duration: 120, desc: 'Natural hair-stroke brow definition' },
          { name: 'Ombre Powder Brows', price: 9500, duration: 120, desc: 'Soft misty powder makeup finish' },
          { name: 'Velvet Lip Blush Tint', price: 7500, duration: 120, desc: 'Semi-permanent tinted lip contour and pigment' },
          { name: 'Keratin Lash Lift & Tint', price: 2800, duration: 45, desc: 'Curl enhancement and deep noir tinting' },
          { name: 'Brow Lamination & Tint', price: 2200, duration: 40, desc: 'Fluffy brushed-up fuller brow styling' },
          { name: 'BB Glow Meso Foundation', price: 4500, duration: 60, desc: 'Semi-permanent semi-matte even skin tone tint' }
        ]
      }
    ];

    for (const cat of categories) {
      const catRes = insertCat.run(cat.name, cat.desc, cat.icon, cat.order);
      const catId = catRes.lastInsertRowid;
      let sOrder = 1;
      for (const serv of cat.services) {
        insertService.run(catId, serv.name, serv.price, serv.duration, serv.desc, sOrder++);
      }
    }
  }

  // Seed sample clients & visits if empty
  const clientCount = db.prepare('SELECT COUNT(*) as count FROM CLIENTS').get().count;
  if (clientCount === 0) {
    console.log('Seeding initial clients, visits & service history...');
    const insertClient = db.prepare(`
      INSERT INTO CLIENTS (name, phone, email, notes, first_visit_date, last_visit_date, total_visits, total_spend, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `);

    const insertVisit = db.prepare(`
      INSERT INTO VISITS (client_id, visit_date, subtotal, discount_type, discount_value, discount_amount, total_amount, amount_paid, balance, payment_method, payment_status, created_by, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertVisitService = db.prepare(`
      INSERT INTO VISIT_SERVICES (visit_id, service_id, service_name_snapshot, price_snapshot, staff_id)
      VALUES (?, ?, ?, ?, ?)
    `);

    // Today's date in YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];
    const prevDate1 = '2026-10-05';
    const prevDate2 = '2026-10-05';
    const prevDate3 = '2026-10-05';

    // Client 1: Priya Shah (+91 98765 43210)
    const priyaId = insertClient.run(
      'Priya Shah',
      '9876543210',
      'priya.shah@example.com',
      'Prefers herbal tea, sensitive skin near cheekbones',
      '2026-10-05',
      today,
      9,
      39000
    ).lastInsertRowid;

    // Priya's past visit 3
    const v1 = insertVisit.run(priyaId, prevDate3, 2500, 'fixed', 0, 0, 2500, 2500, 0, 'Card', 'Paid', 1, 'Regular monthly care').lastInsertRowid;
    insertVisitService.run(v1, 21, 'Maison Luxury Hair Spa', 2500, 4);

    // Priya's past visit 2
    const v2 = insertVisit.run(priyaId, prevDate2, 4300, 'fixed', 0, 0, 4300, 4300, 0, 'UPI', 'Paid', 1, 'Laser + Skin therapy').lastInsertRowid;
    insertVisitService.run(v2, 1, 'Underarms Laser', 1500, 2);
    insertVisitService.run(v2, 12, 'BEU Clear Skin Therapy', 2800, 3);

    // Priya's past visit 1
    const v3 = insertVisit.run(priyaId, prevDate1, 5000, 'fixed', 0, 0, 5000, 5000, 0, 'UPI', 'Paid', 1, 'Hydration and Underarms').lastInsertRowid;
    insertVisitService.run(v3, 11, 'BEU Hydration Facial', 3500, 1);
    insertVisitService.run(v3, 1, 'Underarms Laser', 1500, 2);

    // Priya's visit TODAY
    const vTodayPriya = insertVisit.run(priyaId, today, 5000, 'fixed', 500, 500, 4500, 4500, 0, 'UPI', 'Paid', 2, 'Repeat Hydration Facial & Laser').lastInsertRowid;
    insertVisitService.run(vTodayPriya, 11, 'BEU Hydration Facial', 3500, 1);
    insertVisitService.run(vTodayPriya, 1, 'Underarms Laser', 1500, 2);

    // Client 2: Tanya Kapoor (+91 98111 22334)
    const tanyaId = insertClient.run(
      'Tanya Kapoor',
      '9811122334',
      'tanya.k@example.com',
      'Allergic to strong glycolic acid',
      '2026-05-10',
      today,
      5,
      22700
    ).lastInsertRowid;

    const vTodayTanya = insertVisit.run(tanyaId, today, 4500, 'percentage', 10, 450, 4050, 4050, 0, 'Card', 'Paid', 2, 'OxyGeneo facial').lastInsertRowid;
    insertVisitService.run(vTodayTanya, 14, 'OxyGeneo Super Facial', 4500, 3);

    // Client 3: Meera Singhania (+91 98222 33445)
    const meeraId = insertClient.run(
      'Meera Singhania',
      '9822233445',
      'meera.s@example.com',
      'VIP member, booked upcoming bridal package discussion',
      '2026-04-18',
      today,
      7,
      36000
    ).lastInsertRowid;

    const vTodayMeera = insertVisit.run(meeraId, today, 9500, 'fixed', 1000, 1000, 8500, 6500, 2000, 'UPI', 'Partially Paid', 1, 'Ombre Powder Brows + follow up').lastInsertRowid;
    insertVisitService.run(vTodayMeera, 27, 'Ombre Powder Brows', 9500, 4);

    // Client 4: Ayesha Khan (+91 98333 44556)
    const ayeshaId = insertClient.run(
      'Ayesha Khan',
      '9833344556',
      'ayesha.khan@example.com',
      'Body contouring consultation complete',
      '2026-06-22',
      today,
      3,
      13500
    ).lastInsertRowid;

    const vTodayAyesha = insertVisit.run(ayeshaId, today, 6500, 'fixed', 0, 0, 6500, 6500, 0, 'Cash', 'Paid', 2, 'Cryolipolysis Fat Freeze').lastInsertRowid;
    insertVisitService.run(vTodayAyesha, 17, 'Cryolipolysis Fat Freeze (1 Area)', 6500, 5);

    // Client 5: Neha Gupta (+91 98444 55667) - New Client Today!
    const nehaId = insertClient.run(
      'Neha Gupta',
      '9844455667',
      'neha.g@example.com',
      'Walk-in first visit, recommended by Priya Shah',
      today,
      today,
      1,
      4800
    ).lastInsertRowid;

    const vTodayNeha = insertVisit.run(nehaId, today, 4800, 'fixed', 0, 0, 4800, 4800, 0, 'UPI', 'Paid', 2, 'First time 24K Gold Facial').lastInsertRowid;
    insertVisitService.run(vTodayNeha, 13, '24K Gold Radiance Facial', 4800, 1);
  }

  // Runtime Migration: Ensure columns exist in existing database tables
  const clientCols = [
    ['surname', 'TEXT'],
    ['gender', 'TEXT'],
    ['address_line1', 'TEXT'],
    ['address_line2', 'TEXT'],
    ['pincode', 'TEXT'],
    ['city', 'TEXT'],
    ['state', 'TEXT'],
    ['reg_no', 'TEXT'],
    ['marital_status', 'TEXT'],
    ['dob', 'TEXT'],
    ['anniversary_date', 'TEXT']
  ];
  for (const [colName, colType] of clientCols) {
    try {
      db.prepare(`ALTER TABLE CLIENTS ADD COLUMN ${colName} ${colType}`).run();
    } catch (e) {
      // Column already exists
    }
  }

  // Runtime Migration for LOCATIONS: daily_income and return_tier
  const locationCols = [
    ['daily_income', 'REAL DEFAULT 0'],
    ['return_tier', "TEXT DEFAULT 'Good'"]
  ];
  for (const [colName, colType] of locationCols) {
    try {
      db.prepare(`ALTER TABLE LOCATIONS ADD COLUMN ${colName} ${colType}`).run();
    } catch (e) {
      // Column already exists
    }
  }

  // Runtime Migration for LOCATION_STAKEHOLDERS: din_number, aadhaar_number, aadhaar_doc, mobile_numbers, email_ids
  const stakeholderCols = [
    ['din_number', 'TEXT'],
    ['aadhaar_number', 'TEXT'],
    ['aadhaar_doc', 'TEXT'],
    ['mobile_numbers', 'TEXT'],
    ['email_ids', 'TEXT']
  ];
  for (const [colName, colType] of stakeholderCols) {
    try {
      db.prepare(`ALTER TABLE LOCATION_STAKEHOLDERS ADD COLUMN ${colName} ${colType}`).run();
    } catch (e) {
      // Column already exists
    }
  }

  // Runtime Migration for LOCATION_KYC: bank details
  const kycBankCols = [
    ['bank_firm_name', 'TEXT'],
    ['bank_name', 'TEXT'],
    ['bank_account_number', 'TEXT'],
    ['bank_ifsc_code', 'TEXT']
  ];
  for (const [colName, colType] of kycBankCols) {
    try {
      db.prepare(`ALTER TABLE LOCATION_KYC ADD COLUMN ${colName} ${colType}`).run();
    } catch (e) {
      // Column already exists
    }
  }

  // Runtime Migration for USERS: phone
  try {
    db.prepare("ALTER TABLE USERS ADD COLUMN phone TEXT").run();
  } catch (e) {
    // Column already exists
  }
  try {
    // Master Admin (HQ & Global Network)
    db.prepare("UPDATE USERS SET phone = '+91 98205 99000' WHERE role = 'master_admin'").run();

    // Jubilee Hills Flagship (Location 1)
    db.prepare("UPDATE USERS SET phone = '+91 98201 99001' WHERE location_id = 1 AND role = 'admin'").run();
    db.prepare("UPDATE USERS SET phone = '+91 98201 99002' WHERE location_id = 1 AND role = 'reception'").run();
    db.prepare("UPDATE USERS SET phone = '+91 98201 99003' WHERE location_id = 1 AND role = 'visitor'").run();

    // Bandra West Studio (Location 2)
    db.prepare("UPDATE USERS SET phone = '+91 98202 99001' WHERE location_id = 2 AND role = 'admin'").run();
    db.prepare("UPDATE USERS SET phone = '+91 98202 99002' WHERE location_id = 2 AND role = 'reception'").run();
    db.prepare("UPDATE USERS SET phone = '+91 98202 99003' WHERE location_id = 2 AND role = 'visitor'").run();

    // Indiranagar Franchise (Location 3)
    db.prepare("UPDATE USERS SET phone = '+91 98801 99001' WHERE location_id = 3 AND role = 'admin'").run();
    db.prepare("UPDATE USERS SET phone = '+91 98801 99002' WHERE location_id = 3 AND role = 'reception'").run();
    db.prepare("UPDATE USERS SET phone = '+91 98801 99003' WHERE location_id = 3 AND role = 'visitor'").run();

    // Koregaon Park Franchise (Location 4)
    db.prepare("UPDATE USERS SET phone = '+91 98900 99001' WHERE location_id = 4 AND role = 'admin'").run();
    db.prepare("UPDATE USERS SET phone = '+91 98900 99002' WHERE location_id = 4 AND role = 'reception'").run();
    db.prepare("UPDATE USERS SET phone = '+91 98900 99003' WHERE location_id = 4 AND role = 'visitor'").run();

    // Gachibowli Studio (Location 5)
    db.prepare("UPDATE USERS SET phone = '+91 98400 99881' WHERE location_id = 5 AND role = 'admin'").run();
    db.prepare("UPDATE USERS SET phone = '+91 98400 99882' WHERE location_id = 5 AND role = 'reception'").run();
    db.prepare("UPDATE USERS SET phone = '+91 98400 99883' WHERE location_id = 5 AND role = 'visitor'").run();

    // Juhu Studio (Location 69)
    db.prepare("UPDATE USERS SET phone = '+91 98205 99001' WHERE (location_id = 69 OR email LIKE '%juhu.admin%') AND role = 'admin'").run();
    db.prepare("UPDATE USERS SET phone = '+91 98205 99002' WHERE (location_id = 69 OR email LIKE '%juhu.reception%') AND role = 'reception'").run();
    db.prepare("UPDATE USERS SET phone = '+91 98205 99003' WHERE (location_id = 69 OR email LIKE '%juhu.visitor%') AND role = 'visitor'").run();
  } catch (e) {
    // Ignore update errors
  }

  // 90-day Inactivity threshold: ensure sample older visits exist and update status
  try {
    const inactiveCount = db.prepare(`
      SELECT COUNT(*) as c FROM CLIENTS 
      WHERE last_visit_date IS NOT NULL AND (julianday('now') - julianday(last_visit_date)) > 90
    `).get()?.c || 0;

    if (inactiveCount === 0) {
      db.prepare(`UPDATE CLIENTS SET last_visit_date = date('now', '-96 days') WHERE client_id = 4`).run();
      db.prepare(`UPDATE CLIENTS SET last_visit_date = date('now', '-125 days') WHERE client_id = 5`).run();
      db.prepare(`UPDATE CLIENTS SET last_visit_date = date('now', '-150 days') WHERE client_id = 10`).run();
      db.prepare(`UPDATE CLIENTS SET last_visit_date = date('now', '-110 days') WHERE client_id = 60`).run();
      db.prepare(`UPDATE CLIENTS SET last_visit_date = date('now', '-135 days') WHERE client_id = 62`).run();
    }

    // Auto-update status for all clients: Active if visited within 90 days, else Inactive
    db.prepare(`
      UPDATE CLIENTS 
      SET status = CASE 
        WHEN last_visit_date IS NOT NULL AND (julianday('now') - julianday(last_visit_date)) <= 90 THEN 'active'
        WHEN last_visit_date IS NULL AND (julianday('now') - julianday(created_at)) <= 90 THEN 'active'
        ELSE 'inactive'
      END
    `).run();
  } catch (e) {
    console.error('Clients 90-day status migration notice:', e.message);
  }

  // Runtime Migration for LOCATION_KYC: cin_number, incorporation_doc, aoa_moa_doc, aoa_doc, moa_doc
  const kycCols = [
    ['cin_number', 'TEXT'],
    ['incorporation_doc', 'TEXT'],
    ['aoa_moa_doc', 'TEXT'],
    ['aoa_doc', 'TEXT'],
    ['moa_doc', 'TEXT'],
    ['primary_login_phone', 'TEXT'],
    ['primary_login_email', 'TEXT']
  ];
  for (const [colName, colType] of kycCols) {
    try {
      db.prepare(`ALTER TABLE LOCATION_KYC ADD COLUMN ${colName} ${colType}`).run();
    } catch (e) {
      // Column already exists
    }
  }

  // Safe migrations for Login Preference columns
  try { db.exec(`ALTER TABLE LOCATIONS ADD COLUMN primary_login_phone TEXT;`); } catch(e) {}
  try { db.exec(`ALTER TABLE LOCATIONS ADD COLUMN primary_login_email TEXT;`); } catch(e) {}
  try { db.exec(`ALTER TABLE LOCATION_STAKEHOLDERS ADD COLUMN primary_login_phone TEXT;`); } catch(e) {}
  try { db.exec(`ALTER TABLE LOCATION_STAKEHOLDERS ADD COLUMN primary_login_email TEXT;`); } catch(e) {}
  try { db.exec(`ALTER TABLE CLIENTS ADD COLUMN mobile_numbers TEXT;`); } catch(e) {}
  try { db.exec(`ALTER TABLE CLIENTS ADD COLUMN email_ids TEXT;`); } catch(e) {}
  try { db.exec(`ALTER TABLE CLIENTS ADD COLUMN primary_login_phone TEXT;`); } catch(e) {}
  try { db.exec(`ALTER TABLE CLIENTS ADD COLUMN primary_login_email TEXT;`); } catch(e) {}

  // Backfill existing LOCATIONS and CLIENTS primary login credentials
  try {
    db.prepare(`UPDATE LOCATIONS SET primary_login_phone = phone WHERE primary_login_phone IS NULL AND phone IS NOT NULL`).run();
    db.prepare(`UPDATE LOCATIONS SET primary_login_email = email WHERE primary_login_email IS NULL AND email IS NOT NULL`).run();
    db.prepare(`UPDATE LOCATION_KYC SET primary_login_phone = (SELECT phone FROM LOCATIONS WHERE LOCATIONS.location_id = LOCATION_KYC.location_id) WHERE primary_login_phone IS NULL`).run();
    db.prepare(`UPDATE LOCATION_KYC SET primary_login_email = (SELECT email FROM LOCATIONS WHERE LOCATIONS.location_id = LOCATION_KYC.location_id) WHERE primary_login_email IS NULL`).run();
    db.prepare(`UPDATE CLIENTS SET primary_login_phone = phone WHERE primary_login_phone IS NULL AND phone IS NOT NULL`).run();
    db.prepare(`UPDATE CLIENTS SET primary_login_email = email WHERE primary_login_email IS NULL AND email IS NOT NULL`).run();
  } catch(e) {}

  // Reset any hardcoded mock daily_income in LOCATIONS table to 0 so values strictly reflect real branch metrics
  try {
    db.prepare("UPDATE LOCATIONS SET daily_income = 0").run();
  } catch (e) {
    // Ignore
  }

  // Migration for SERVICE_CATEGORIES image_url and image_position
  try {
    db.prepare(`ALTER TABLE SERVICE_CATEGORIES ADD COLUMN image_url TEXT`).run();
  } catch (e) {
    // Column already exists
  }
  try {
    db.prepare(`ALTER TABLE SERVICE_CATEGORIES ADD COLUMN image_position TEXT`).run();
  } catch (e) {
    // Column already exists
  }

  // Backfill default luxury images for categories if missing
  try {
    const defaultCategoryImages = {
      1: '/services/categories/cat_03_laser_treatments.png',
      2: '/services/categories/cat_01_signature_facials.png?v=44',
      3: '/services/categories/cat_02_skin_treatments.png?v=42',
      4: '/services/categories/cat_05_body_sculpting.png?v=2',
      5: '/services/categories/cat_04_hair_rituals.png',
      6: '/services/categories/cat_06_salon_services.png?v=3'
    };
    const updateCatImg = db.prepare(`UPDATE SERVICE_CATEGORIES SET image_url = ? WHERE category_id = ? AND (image_url IS NULL OR image_url = '')`);
    for (const [id, url] of Object.entries(defaultCategoryImages)) {
      updateCatImg.run(url, id);
    }
  } catch (e) {
    // Ignore
  }

  // Give Juhu its own editable catalog when the branch has no categories yet.
  // These are copied once from the existing catalog; later changes stay branch-local.
  try {
    const juhuBranch = db.prepare(`
      SELECT location_id FROM LOCATIONS
      WHERE type = 'branch' AND lower(name) LIKE '%juhu%'
      ORDER BY location_id ASC LIMIT 1
    `).get();
    const sourceCategories = db.prepare(`
      SELECT * FROM SERVICE_CATEGORIES WHERE location_id = 1
      ORDER BY display_order ASC, category_id ASC
    `).all();
    const juhuCategoryCount = juhuBranch
      ? db.prepare('SELECT COUNT(*) AS count FROM SERVICE_CATEGORIES WHERE location_id = ?').get(juhuBranch.location_id).count
      : 0;

    if (juhuBranch && juhuCategoryCount === 0 && sourceCategories.length > 0) {
      const categoryColumns = db.prepare('PRAGMA table_info(SERVICE_CATEGORIES)').all()
        .map(column => column.name)
        .filter(name => !['category_id', 'location_id', 'created_at', 'updated_at'].includes(name));
      const serviceColumns = db.prepare('PRAGMA table_info(SERVICES)').all()
        .map(column => column.name)
        .filter(name => !['service_id', 'category_id', 'created_at', 'updated_at'].includes(name));
      const insertCategory = db.prepare(`
        INSERT INTO SERVICE_CATEGORIES (${[...categoryColumns, 'location_id'].join(', ')})
        VALUES (${[...categoryColumns, 'location_id'].map(() => '?').join(', ')})
      `);
      const insertService = db.prepare(`
        INSERT INTO SERVICES (category_id, ${serviceColumns.join(', ')})
        VALUES (${['category_id', ...serviceColumns].map(() => '?').join(', ')})
      `);
      const getServices = db.prepare('SELECT * FROM SERVICES WHERE category_id = ? ORDER BY display_order ASC, service_id ASC');
      const copyJuhuCatalog = db.transaction(() => {
        let copiedServices = 0;
        for (const category of sourceCategories) {
          const info = insertCategory.run(
            ...categoryColumns.map(column => category[column]),
            juhuBranch.location_id
          );
          const newCategoryId = info.lastInsertRowid;
          for (const service of getServices.all(category.category_id)) {
            insertService.run(newCategoryId, ...serviceColumns.map(column => service[column]));
            copiedServices++;
          }
        }
        return copiedServices;
      });
      const copiedServices = copyJuhuCatalog();
      console.log(`Created Juhu's branch-specific catalog: ${sourceCategories.length} categories and ${copiedServices} sub-services.`);
    }
  } catch (error) {
    console.error('Juhu catalog setup notice:', error.message);
  }

  // Runtime migration: Normalize all branch & franchise codes to MB-B-<CITY>-001 / MB-F-<CITY>-001
  try {
    migrateLocationCodes(db);
  } catch (e) {
    console.error('Location code normalization notice:', e.message);
  }
}

export function generateLocationCode(dbInstance = db, { type = 'branch', city = 'LOC', excludeLocationId = null } = {}) {
  const cleanType = (type || 'branch').trim().toLowerCase();
  const typeChar = cleanType === 'franchise' ? 'F' : 'B';
  const cityCode = (city || 'LOC').replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'LOC';
  const basePrefix = `MB-${typeChar}-${cityCode}`;

  let seq = 1;
  let candidateCode = `${basePrefix}-${String(seq).padStart(3, '0')}`;
  while (true) {
    const existing = excludeLocationId
      ? dbInstance.prepare('SELECT location_id FROM LOCATIONS WHERE code = ? AND location_id != ?').get(candidateCode, excludeLocationId)
      : dbInstance.prepare('SELECT location_id FROM LOCATIONS WHERE code = ?').get(candidateCode);
    if (!existing) break;
    seq++;
    candidateCode = `${basePrefix}-${String(seq).padStart(3, '0')}`;
  }
  return candidateCode;
}

export function migrateLocationCodes(dbInstance = db) {
  const codePattern = /^MB-[BF]-[A-Z]{3}-\d{3}$/;
  const allLocs = dbInstance.prepare('SELECT * FROM LOCATIONS ORDER BY location_id ASC').all();

  const defaultPinByCity = {
    hyderabad: '500033',
    mumbai: '400050',
    bengaluru: '560038',
    bangalore: '560038',
    pune: '411001'
  };

  const tx = dbInstance.transaction(() => {
    // Temporarily clear non-conforming codes to avoid UNIQUE collisions while re-sequencing
    for (const loc of allLocs) {
      if (!loc.code || !codePattern.test(loc.code)) {
        dbInstance.prepare('UPDATE LOCATIONS SET code = ? WHERE location_id = ?').run(`__TMP_LOC_${loc.location_id}__`, loc.location_id);
      }
    }
    for (const loc of allLocs) {
      let newCode = loc.code;
      if (!newCode || !codePattern.test(newCode)) {
        newCode = generateLocationCode(dbInstance, {
          type: loc.type,
          city: loc.city,
          excludeLocationId: loc.location_id
        });
      }

      let cleanName = String(loc.name || '').trim()
        .replace(/\((?:Proprietor|Partnership|Pvt\.?\s*Ltd\.?|LLP|Updated\s*&\s*Verified|Updated|Verified)\)/gi, '')
        .replace(/\b\d{10,}\b/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (!/^maison\s*beyou/i.test(cleanName)) {
        cleanName = `Maison BeYou — ${cleanName || 'Flagship Studio'}`;
      } else {
        cleanName = cleanName.replace(/^maison\s*beyou\s*[-–—]?\s*/i, 'Maison BeYou — ');
      }

      const cityStr = (loc.city || 'Hyderabad').trim();
      const stateStr = (loc.state || 'Telangana').trim();
      const addrStr = (loc.address || 'Road No. 36, Jubilee Hills').trim();
      let pinStr = (loc.pincode || '').trim();
      if (!pinStr) {
        if (/gachibowli/i.test(addrStr)) pinStr = '500032';
        else if (/whitefield/i.test(addrStr)) pinStr = '560066';
        else if (/juhu/i.test(addrStr)) pinStr = '400049';
        else pinStr = defaultPinByCity[cityStr.toLowerCase()] || '500033';
      }

      const storedPhone = String(loc.phone || '').trim();
      const phoneStr = storedPhone.replace(/\D/g, '') === String(loc.primary_login_phone || '').replace(/\D/g, '')
        ? ''
        : storedPhone;
      const mgrStr = String(loc.manager_name || '').trim();

      dbInstance.prepare(`
        UPDATE LOCATIONS
        SET code = ?, name = ?, address = ?, city = ?, state = ?, pincode = ?, phone = ?, manager_name = ?
        WHERE location_id = ?
      `).run(newCode, cleanName, addrStr, cityStr, stateStr, pinStr, phoneStr, mgrStr, loc.location_id);
    }
  });
  tx();
}

export function recordAuditLog({ userId, action, targetType, targetId, locationId, details, ipAddress }) {
  try {
    const detailsStr = typeof details === 'object' ? JSON.stringify(details) : (details || null);
    db.prepare(`
      INSERT INTO AUDIT_LOGS (user_id, action, target_type, target_id, location_id, details, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userId || null, action, targetType, targetId || null, locationId || null, detailsStr, ipAddress || null);
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

export function ensureLocationAccounts(location) {
  if (!location || !location.location_id) return [];
  const locId = location.location_id;
  const cleanCode = (location.code || `LOC${locId}`).toLowerCase().replace(/[^a-z0-9]/g, '');
  const salt = bcrypt.genSaltSync(10);
  const defaultPass = `${cleanCode}123`;
  const defaultHash = bcrypt.hashSync(defaultPass, salt);
  const phone = (location.primary_login_phone || location.phone || '').trim() || null;

  const existingUsers = db.prepare('SELECT role, user_id, phone FROM USERS WHERE location_id = ?').all(locId);
  const existingRoles = new Set(existingUsers.map(u => u.role));

  const created = [];
  const rolesToEnsure = [
    { role: 'admin', title: `${location.name} Admin`, email: `admin.${cleanCode}@maisonbeyou.com` },
    { role: 'reception', title: `${location.name} Reception`, email: `reception.${cleanCode}@maisonbeyou.com` },
    { role: 'visitor', title: `${location.name} Visitor Desk`, email: `visitor.${cleanCode}@maisonbeyou.com` }
  ];

  for (const r of rolesToEnsure) {
    if (!existingRoles.has(r.role)) {
      let targetEmail = r.email;
      const emailExists = db.prepare('SELECT user_id FROM USERS WHERE email = ?').get(targetEmail);
      if (emailExists) {
        targetEmail = `${r.role}.${cleanCode}.${locId}@maisonbeyou.com`;
      }
      const res = db.prepare(`
        INSERT INTO USERS (name, email, phone, password_hash, role, active, location_id)
        VALUES (?, ?, ?, ?, ?, 1, ?)
      `).run(r.title, targetEmail, phone, defaultHash, r.role, locId);

      created.push({
        user_id: res.lastInsertRowid,
        role: r.role,
        email: targetEmail,
        location_id: locId
      });
    } else {
      // Sync phone number if missing
      const existing = existingUsers.find(u => u.role === r.role);
      if (existing && !existing.phone && phone) {
        db.prepare('UPDATE USERS SET phone = ? WHERE user_id = ?').run(phone, existing.user_id);
      }
    }
  }
  return created;
}

export default db;
