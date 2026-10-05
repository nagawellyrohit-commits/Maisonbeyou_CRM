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
    CREATE TABLE IF NOT EXISTS USERS (
      user_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'reception', 'therapist', 'manager')),
      active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS STAFF (
      staff_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      phone TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS SERVICE_CATEGORIES (
      category_id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS CLIENTS (
      client_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      email TEXT,
      notes TEXT,
      first_visit_date TEXT,
      last_visit_date TEXT,
      total_visits INTEGER NOT NULL DEFAULT 0,
      total_spend REAL NOT NULL DEFAULT 0.0,
      status TEXT NOT NULL DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS VISITS (
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
      payment_method TEXT NOT NULL CHECK(payment_method IN ('Cash', 'UPI', 'Card', 'Other')),
      payment_status TEXT NOT NULL CHECK(payment_status IN ('Paid', 'Partially Paid', 'Pending')),
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  seedData();
}

function seedData() {
  // Check if users exist
  const userCount = db.prepare('SELECT COUNT(*) as count FROM USERS').get().count;
  if (userCount === 0) {
    console.log('Seeding initial users...');
    const insertUser = db.prepare(`
      INSERT INTO USERS (name, email, password_hash, role, active)
      VALUES (?, ?, ?, ?, 1)
    `);

    const salt = bcrypt.genSaltSync(10);
    insertUser.run('Maison Admin', 'admin@maisonbeyou.com', bcrypt.hashSync('admin123', salt), 'admin');
    insertUser.run('Reception Desk', 'reception@maisonbeyou.com', bcrypt.hashSync('reception123', salt), 'reception');
    insertUser.run('Dr. Ananya Sharma', 'therapist@maisonbeyou.com', bcrypt.hashSync('therapist123', salt), 'therapist');
    insertUser.run('Studio Manager', 'manager@maisonbeyou.com', bcrypt.hashSync('manager123', salt), 'manager');
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
      INSERT INTO SERVICE_CATEGORIES (category_name, description, icon, display_order, active)
      VALUES (?, ?, ?, ?, 1)
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
    const prevDate1 = '2026-09-28';
    const prevDate2 = '2026-08-12';
    const prevDate3 = '2026-07-20';

    // Client 1: Priya Shah (+91 98765 43210)
    const priyaId = insertClient.run(
      'Priya Shah',
      '9876543210',
      'priya.shah@example.com',
      'Prefers herbal tea, sensitive skin near cheekbones',
      '2026-03-12',
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
}

export default db;
