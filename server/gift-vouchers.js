import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHmac, randomBytes, timingSafeEqual, verify as verifySignature } from 'node:crypto';
import QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
import sharp from 'sharp';

const serverDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(serverDir, '..');
const cardDir = path.join(projectDir, 'public', 'uploads', 'gift-vouchers');
const brandLogoPath = path.join(projectDir, 'public', 'brand-logo.png');
const today = () => new Date().toISOString().slice(0, 10);
const money = value => Math.round((Number(value) || 0) * 100) / 100;
const toText = value => String(value ?? '').trim();
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const json = value => { try { return JSON.parse(value || '[]'); } catch { return []; } };
const validEmail = value => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
const normalizePhone = value => {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0') && digits.length === 11) digits = `91${digits.slice(1)}`;
  if (digits.length === 10) digits = `91${digits}`;
  return digits.length >= 11 && digits.length <= 15 ? `+${digits}` : '';
};

function initializeGiftVoucherTables(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS GIFT_VOUCHER_SETTINGS (
      settings_id INTEGER PRIMARY KEY CHECK(settings_id = 1),
      default_validity_days INTEGER NOT NULL DEFAULT 365,
      max_validity_days INTEGER NOT NULL DEFAULT 1095,
      minimum_value REAL NOT NULL DEFAULT 1,
      require_recipient_contact INTEGER NOT NULL DEFAULT 0,
      allow_unrestricted INTEGER NOT NULL DEFAULT 1,
      updated_by INTEGER REFERENCES USERS(user_id),
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    INSERT OR IGNORE INTO GIFT_VOUCHER_SETTINGS (settings_id) VALUES (1);
    CREATE TABLE IF NOT EXISTS GIFT_VOUCHERS (
      voucher_id INTEGER PRIMARY KEY AUTOINCREMENT,
      voucher_code TEXT NOT NULL UNIQUE,
      issuing_location_id INTEGER NOT NULL REFERENCES LOCATIONS(location_id),
      created_by INTEGER NOT NULL REFERENCES USERS(user_id),
      voucher_type TEXT NOT NULL CHECK(voucher_type IN ('service', 'amount')),
      title TEXT NOT NULL,
      eligibility_mode TEXT NOT NULL DEFAULT 'selected' CHECK(eligibility_mode IN ('selected', 'all', 'exclude', 'unrestricted')),
      category_snapshot_json TEXT NOT NULL DEFAULT '[]',
      service_snapshot_json TEXT NOT NULL DEFAULT '[]',
      original_value REAL NOT NULL CHECK(original_value >= 0),
      remaining_balance REAL NOT NULL DEFAULT 0 CHECK(remaining_balance >= 0),
      service_redemptions_allowed INTEGER NOT NULL DEFAULT 1 CHECK(service_redemptions_allowed > 0),
      service_redemptions_used INTEGER NOT NULL DEFAULT 0 CHECK(service_redemptions_used >= 0),
      issue_date TEXT NOT NULL,
      expiry_date TEXT NOT NULL,
      purchaser_name TEXT,
      purchaser_phone TEXT,
      purchaser_email TEXT,
      recipient_name TEXT,
      recipient_phone TEXT,
      recipient_email TEXT,
      gift_message TEXT,
      payment_status TEXT NOT NULL DEFAULT 'pending' CHECK(payment_status IN ('pending', 'paid', 'refunded')),
      status TEXT NOT NULL DEFAULT 'pending_payment' CHECK(status IN ('draft', 'pending_payment', 'active', 'partially_redeemed', 'fully_redeemed', 'expired', 'cancelled', 'refunded')),
      payment_method TEXT,
      notes TEXT,
      send_whatsapp INTEGER NOT NULL DEFAULT 0,
      send_email INTEGER NOT NULL DEFAULT 0,
      send_purchaser_copy INTEGER NOT NULL DEFAULT 0,
      card_image_path TEXT,
      card_pdf_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS IDX_GIFT_VOUCHERS_ISSUING_LOCATION ON GIFT_VOUCHERS(issuing_location_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS IDX_GIFT_VOUCHERS_STATUS ON GIFT_VOUCHERS(status, expiry_date);
    CREATE TABLE IF NOT EXISTS GIFT_VOUCHER_PAYMENTS (
      payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
      voucher_id INTEGER NOT NULL REFERENCES GIFT_VOUCHERS(voucher_id),
      amount REAL NOT NULL CHECK(amount >= 0),
      payment_method TEXT,
      payment_reference TEXT,
      payment_status TEXT NOT NULL CHECK(payment_status IN ('pending', 'paid', 'refunded')),
      recorded_by INTEGER NOT NULL REFERENCES USERS(user_id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS GIFT_VOUCHER_BALANCE_LEDGER (
      ledger_id INTEGER PRIMARY KEY AUTOINCREMENT,
      voucher_id INTEGER NOT NULL REFERENCES GIFT_VOUCHERS(voucher_id),
      location_id INTEGER REFERENCES LOCATIONS(location_id),
      entry_type TEXT NOT NULL CHECK(entry_type IN ('issue', 'redeem', 'refund', 'adjustment')),
      amount REAL NOT NULL,
      previous_balance REAL NOT NULL,
      updated_balance REAL NOT NULL,
      reference TEXT NOT NULL UNIQUE,
      notes TEXT,
      created_by INTEGER REFERENCES USERS(user_id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS GIFT_VOUCHER_REDEMPTIONS (
      redemption_id INTEGER PRIMARY KEY AUTOINCREMENT,
      voucher_id INTEGER NOT NULL REFERENCES GIFT_VOUCHERS(voucher_id),
      redeeming_location_id INTEGER NOT NULL REFERENCES LOCATIONS(location_id),
      redeeming_user_id INTEGER NOT NULL REFERENCES USERS(user_id),
      transaction_ref TEXT NOT NULL UNIQUE,
      amount REAL NOT NULL CHECK(amount >= 0),
      services_json TEXT NOT NULL DEFAULT '[]',
      previous_balance REAL NOT NULL,
      updated_balance REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS GIFT_VOUCHER_DELIVERIES (
      delivery_id INTEGER PRIMARY KEY AUTOINCREMENT,
      voucher_id INTEGER NOT NULL REFERENCES GIFT_VOUCHERS(voucher_id),
      channel TEXT NOT NULL CHECK(channel IN ('whatsapp', 'email')),
      recipient_kind TEXT NOT NULL CHECK(recipient_kind IN ('recipient', 'purchaser')),
      recipient TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'sending', 'sent', 'delivered', 'failed', 'retry_required', 'not_configured')),
      provider TEXT,
      provider_reference TEXT,
      error TEXT,
      attempts INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      sent_at DATETIME,
      UNIQUE(voucher_id, channel, recipient_kind, recipient)
    );
    CREATE TABLE IF NOT EXISTS GIFT_VOUCHER_AUDIT (
      audit_id INTEGER PRIMARY KEY AUTOINCREMENT,
      voucher_id INTEGER NOT NULL REFERENCES GIFT_VOUCHERS(voucher_id),
      user_id INTEGER REFERENCES USERS(user_id),
      location_id INTEGER REFERENCES LOCATIONS(location_id),
      action TEXT NOT NULL,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TRIGGER IF NOT EXISTS GIFT_VOUCHER_REDEMPTIONS_NO_UPDATE
    BEFORE UPDATE ON GIFT_VOUCHER_REDEMPTIONS BEGIN SELECT RAISE(ABORT, 'Gift voucher redemption records are immutable'); END;
    CREATE TRIGGER IF NOT EXISTS GIFT_VOUCHER_REDEMPTIONS_NO_DELETE
    BEFORE DELETE ON GIFT_VOUCHER_REDEMPTIONS BEGIN SELECT RAISE(ABORT, 'Gift voucher redemption records are immutable'); END;
    CREATE TRIGGER IF NOT EXISTS GIFT_VOUCHER_LEDGER_NO_UPDATE
    BEFORE UPDATE ON GIFT_VOUCHER_BALANCE_LEDGER BEGIN SELECT RAISE(ABORT, 'Gift voucher ledger records are immutable'); END;
    CREATE TRIGGER IF NOT EXISTS GIFT_VOUCHER_LEDGER_NO_DELETE
    BEFORE DELETE ON GIFT_VOUCHER_BALANCE_LEDGER BEGIN SELECT RAISE(ABORT, 'Gift voucher ledger records are immutable'); END;
    CREATE TRIGGER IF NOT EXISTS GIFT_VOUCHER_PAYMENTS_NO_UPDATE
    BEFORE UPDATE ON GIFT_VOUCHER_PAYMENTS BEGIN SELECT RAISE(ABORT, 'Gift voucher payment records are immutable'); END;
    CREATE TRIGGER IF NOT EXISTS GIFT_VOUCHER_PAYMENTS_NO_DELETE
    BEFORE DELETE ON GIFT_VOUCHER_PAYMENTS BEGIN SELECT RAISE(ABORT, 'Gift voucher payment records are immutable'); END;
  `);
}

function parseVoucher(row) {
  if (!row) return null;
  return {
    ...row,
    categories: json(row.category_snapshot_json),
    eligible_services: json(row.service_snapshot_json),
    send_whatsapp: Boolean(row.send_whatsapp),
    send_email: Boolean(row.send_email),
    send_purchaser_copy: Boolean(row.send_purchaser_copy)
  };
}

function statusForVoucher(voucher) {
  if (['draft', 'pending_payment', 'cancelled', 'refunded', 'fully_redeemed'].includes(voucher.status)) return voucher.status;
  if (voucher.expiry_date < today()) return 'expired';
  if (voucher.voucher_type === 'service') {
    if (Number(voucher.service_redemptions_used) >= Number(voucher.service_redemptions_allowed)) return 'fully_redeemed';
    return Number(voucher.service_redemptions_used) > 0 ? 'partially_redeemed' : 'active';
  }
  if (Number(voucher.remaining_balance) <= 0) return 'fully_redeemed';
  return Number(voucher.remaining_balance) < Number(voucher.original_value) ? 'partially_redeemed' : 'active';
}

function voucherAccessible(req, voucher, allowCrossBranchLookup = false) {
  if (req.user.role === 'master_admin') return true;
  return Number(voucher.issuing_location_id) === Number(req.locationId) || allowCrossBranchLookup;
}

function buildVoucherMessage(voucher, recipientName, branchName) {
  const greeting = recipientName ? `Hello ${recipientName},` : 'Hello,';
  const gift = voucher.voucher_type === 'amount' ? `INR ${Number(voucher.original_value).toLocaleString('en-IN')}` : `${voucher.title} · service gift`;
  return `${greeting}\n\nSomeone special has sent you a gift from Maison Beyou!\n\nGift: ${voucher.title}\nValue: ${gift}\nVoucher code: ${voucher.voucher_code}\nValid until: ${voucher.expiry_date}\n\nPresent this card or code at any participating Maison Beyou branch. The branch will check service eligibility and remaining balance.\n\nWith love,\nMaison Beyou${branchName ? `\nIssued by: ${branchName}` : ''}`;
}

async function makePdfBuffer(voucher, qrBuffer, logoBuffer) {
  const doc = new PDFDocument({ size: [840, 520], margin: 0, autoFirstPage: true, info: { Title: `Maison Beyou Gift Voucher ${voucher.voucher_code}`, Author: 'Maison Beyou' } });
  const chunks = [];
  const result = new Promise((resolve, reject) => {
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
  doc.rect(0, 0, 840, 520).fill('#F8F3EB');
  doc.roundedRect(22, 22, 796, 476, 18).lineWidth(1.4).stroke('#C89555');
  doc.image(logoBuffer, 52, 40, { fit: [228, 58] });
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#9D6A2E').text('GIFT VOUCHER', 52, 126, { characterSpacing: 2 });
  doc.font('Helvetica-Bold').fontSize(28).fillColor('#302820').text(voucher.title, 52, 153, { width: 520, height: 68 });
  doc.font('Helvetica').fontSize(13).fillColor('#786D62').text(voucher.voucher_type === 'amount' ? `Gift value · INR ${Number(voucher.original_value).toLocaleString('en-IN')}` : `Service voucher · ${Number(voucher.service_redemptions_allowed)} use(s)`, 52, 232);
  doc.font('Helvetica-Bold').fontSize(18).fillColor('#A97735').text(voucher.voucher_code, 52, 280, { characterSpacing: 1.2 });
  doc.font('Helvetica').fontSize(11).fillColor('#51463D').text(`For: ${voucher.recipient_name || 'Someone special'}`, 52, 320);
  doc.text(`From: ${voucher.purchaser_name || 'Maison Beyou'}`, 52, 341);
  doc.text(`Issued: ${voucher.issue_date}     Valid until: ${voucher.expiry_date}`, 52, 362);
  const serviceList = voucher.eligible_services?.map(service => service.service_name).join(', ') || 'All participating services';
  doc.text(`Eligible services: ${serviceList}`, 52, 389, { width: 540, height: 36 });
  if (voucher.gift_message) doc.font('Helvetica-Oblique').fontSize(11).fillColor('#72501F').text(`“${voucher.gift_message.slice(0, 180)}”`, 52, 437, { width: 520, height: 28 });
  doc.image(qrBuffer, 642, 151, { fit: [150, 150] });
  doc.font('Helvetica').fontSize(9).fillColor('#786D62').text('Scan or enter this code at any participating branch', 604, 312, { width: 224, align: 'center' });
  doc.text('Voucher must be active and unexpired. Eligible services and balance are verified centrally.', 608, 410, { width: 210, align: 'center', height: 46 });
  doc.end();
  return result;
}

async function generateVoucherCard(voucher, db) {
  fs.mkdirSync(cardDir, { recursive: true });
  const qrBuffer = await QRCode.toBuffer(voucher.voucher_code, { type: 'png', width: 360, margin: 1, color: { dark: '#302820', light: '#FFFFFF' }, errorCorrectionLevel: 'H' });
  const logoBuffer = fs.existsSync(brandLogoPath) ? fs.readFileSync(brandLogoPath) : null;
  const logo = logoBuffer ? `<image href="data:image/png;base64,${logoBuffer.toString('base64')}" x="90" y="65" width="330" height="80" preserveAspectRatio="xMinYMid meet"/>` : '<text x="90" y="115" fill="#302820" font-size="34" font-family="Arial">MAISON BEYOU</text>';
  const title = escapeHtml(voucher.title);
  const voucherValue = voucher.voucher_type === 'amount' ? `INR ${Number(voucher.original_value).toLocaleString('en-IN')}` : `${Number(voucher.service_redemptions_allowed)} service use(s)`;
  const servicesText = voucher.eligible_services?.map(service => service.service_name).join(' · ') || 'All participating services';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="900" viewBox="0 0 1400 900"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#FBF7F0"/><stop offset="1" stop-color="#EFE3D0"/></linearGradient></defs><rect width="1400" height="900" rx="34" fill="url(#bg)"/><rect x="24" y="24" width="1352" height="852" rx="28" fill="none" stroke="#C89555" stroke-width="3"/>${logo}<text x="92" y="240" fill="#9D6A2E" font-size="26" font-family="Arial" font-weight="700" letter-spacing="6">A GIFT FOR YOU</text><text x="92" y="322" fill="#302820" font-size="58" font-family="Arial" font-weight="700">${title.slice(0, 48)}</text><text x="92" y="395" fill="#786D62" font-size="31" font-family="Arial">${escapeHtml(voucherValue)}</text><text x="92" y="510" fill="#51463D" font-size="25" font-family="Arial">For: ${escapeHtml(voucher.recipient_name || 'Someone special')}</text><text x="92" y="558" fill="#51463D" font-size="25" font-family="Arial">From: ${escapeHtml(voucher.purchaser_name || 'Maison Beyou')}</text><text x="92" y="625" fill="#A97735" font-size="40" font-family="Arial" font-weight="700" letter-spacing="2">${escapeHtml(voucher.voucher_code)}</text><text x="92" y="680" fill="#786D62" font-size="21" font-family="Arial">Valid until ${escapeHtml(voucher.expiry_date)}</text><text x="92" y="742" fill="#72501F" font-size="18" font-family="Arial">${escapeHtml(servicesText.slice(0, 90))}</text><text x="92" y="800" fill="#786D62" font-size="16" font-family="Arial">Present this QR or code at any participating Maison Beyou branch.</text><image href="data:image/png;base64,${qrBuffer.toString('base64')}" x="970" y="280" width="310" height="310"/><text x="970" y="630" fill="#786D62" font-size="18" font-family="Arial" text-anchor="middle">Scan to verify voucher</text></svg>`;
  const fileStem = voucher.voucher_code.toLowerCase();
  const imagePath = path.join(cardDir, `${fileStem}.png`);
  const pdfPath = path.join(cardDir, `${fileStem}.pdf`);
  await sharp(Buffer.from(svg)).png().toFile(imagePath);
  const pdfBuffer = await makePdfBuffer(voucher, qrBuffer, logoBuffer);
  fs.writeFileSync(pdfPath, pdfBuffer);
  const publicImage = `/uploads/gift-vouchers/${fileStem}.png`;
  const publicPdf = `/uploads/gift-vouchers/${fileStem}.pdf`;
  db.prepare('UPDATE GIFT_VOUCHERS SET card_image_path = ?, card_pdf_path = ?, updated_at = CURRENT_TIMESTAMP WHERE voucher_id = ?').run(publicImage, publicPdf, voucher.voucher_id);
  return { imagePath, pdfPath, imageUrl: publicImage, pdfUrl: publicPdf, imageBuffer: fs.readFileSync(imagePath), pdfBuffer };
}

function readGiftVoucherSettings(db) {
  return db.prepare('SELECT default_validity_days, max_validity_days, minimum_value, require_recipient_contact, allow_unrestricted, updated_at FROM GIFT_VOUCHER_SETTINGS WHERE settings_id = 1').get();
}

function isVoucherAdmin(req, voucher) {
  return req.user.role === 'master_admin' || Number(req.locationId) === Number(voucher.issuing_location_id);
}

export function registerGiftVoucherRoutes({ app, db, authenticateToken, authorizeRoles, recordAuditLog, deliverNotification }) {
  initializeGiftVoucherTables(db);

  const audit = (voucherId, userId, locationId, action, details = {}) => {
    db.prepare('INSERT INTO GIFT_VOUCHER_AUDIT (voucher_id, user_id, location_id, action, details) VALUES (?, ?, ?, ?, ?)')
      .run(voucherId, userId || null, locationId || null, action, JSON.stringify(details));
    recordAuditLog({ userId, action: `GIFT_VOUCHER_${action.toUpperCase()}`, targetType: 'GIFT_VOUCHER', targetId: voucherId, locationId, details });
  };

  const getVoucherById = voucherId => db.prepare(`SELECT v.*, l.name AS issuing_branch_name, u.name AS created_by_name
    FROM GIFT_VOUCHERS v JOIN LOCATIONS l ON l.location_id = v.issuing_location_id
    LEFT JOIN USERS u ON u.user_id = v.created_by WHERE v.voucher_id = ?`).get(voucherId);

  const canManage = (req, voucher) => isVoucherAdmin(req, voucher);

  const applyDeliveryStatus = (channel, provider, providerReference, recipient, providerStatus, errorText = '') => {
    const normalizedRecipient = channel === 'whatsapp' ? normalizePhone(recipient) : String(recipient || '').trim().toLowerCase();
    const status = /^(delivered|read)$/i.test(providerStatus) ? 'delivered'
      : /^(sent|accepted|queued|sending)$/i.test(providerStatus) ? 'sent'
        : /^(failed|undelivered|rejected)$/i.test(providerStatus) ? 'failed' : null;
    if (!status) return 0;
    let query = `UPDATE GIFT_VOUCHER_DELIVERIES SET status = ?, error = ?, updated_at = CURRENT_TIMESTAMP WHERE channel = ? AND provider = ?`;
    const params = [status, errorText ? String(errorText).slice(0, 500) : null, channel, provider];
    if (providerReference) { query += ' AND provider_reference = ?'; params.push(providerReference); }
    else if (normalizedRecipient) { query += " AND recipient = ? AND status IN ('sending', 'sent')"; params.push(normalizedRecipient); }
    else return 0;
    if (status !== 'delivered') query += " AND status != 'delivered'";
    return db.prepare(query).run(...params).changes;
  };

  app.post('/api/gift-vouchers/webhooks/twilio', (req, res) => {
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const signature = req.get('x-twilio-signature') || '';
    const callbackUrl = `${String(process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '')}${req.originalUrl}`;
    if (!authToken || !signature || !process.env.PUBLIC_BASE_URL) return res.status(403).send('Webhook signature validation is not configured.');
    const params = req.body || {};
    const signedValue = Object.keys(params).sort().reduce((text, key) => text + key + String(params[key]), callbackUrl);
    const expected = createHmac('sha1', authToken).update(signedValue).digest('base64');
    const suppliedBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (suppliedBuffer.length !== expectedBuffer.length || !timingSafeEqual(suppliedBuffer, expectedBuffer)) return res.status(403).send('Invalid signature.');
    applyDeliveryStatus('whatsapp', 'Twilio WhatsApp', params.MessageSid, params.To, params.MessageStatus || params.SmsStatus || '', params.ErrorMessage || '');
    res.status(204).end();
  });

  app.get('/api/gift-vouchers/webhooks/meta', (req, res) => {
    const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
    if (req.query['hub.mode'] === 'subscribe' && verifyToken && req.query['hub.verify_token'] === verifyToken) return res.status(200).send(String(req.query['hub.challenge'] || ''));
    res.sendStatus(403);
  });

  app.post('/api/gift-vouchers/webhooks/meta', (req, res) => {
    const appSecret = process.env.WHATSAPP_APP_SECRET;
    const signature = req.get('x-hub-signature-256') || '';
    if (!appSecret || !req.rawBody || !signature.startsWith('sha256=')) return res.sendStatus(403);
    const expected = createHmac('sha256', appSecret).update(req.rawBody).digest();
    const supplied = Buffer.from(signature.slice(7), 'hex');
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return res.sendStatus(403);
    for (const entry of req.body?.entry || []) for (const change of entry.changes || []) {
      for (const status of change.value?.statuses || []) {
        applyDeliveryStatus('whatsapp', 'WhatsApp Cloud API', status.id, status.recipient_id, status.status, status.errors?.[0]?.title || status.errors?.[0]?.message || '');
      }
    }
    res.sendStatus(200);
  });

  app.post('/api/gift-vouchers/webhooks/resend', (req, res) => {
    const secret = String(process.env.RESEND_WEBHOOK_SECRET || '');
    const id = req.get('svix-id') || '';
    const timestamp = req.get('svix-timestamp') || '';
    const signatures = req.get('svix-signature') || '';
    if (!secret.startsWith('whsec_') || !id || !timestamp || !req.rawBody) return res.sendStatus(403);
    const timestampNumber = Number(timestamp);
    if (!Number.isFinite(timestampNumber) || Math.abs(Date.now() / 1000 - timestampNumber) > 300) return res.sendStatus(403);
    const signingSecret = Buffer.from(secret.slice(6), 'base64');
    const expected = createHmac('sha256', signingSecret).update(`${id}.${timestamp}.${req.rawBody.toString('utf8')}`).digest();
    const matches = signatures.split(' ').some(item => {
      const [version, value] = item.split(',', 2);
      if (version !== 'v1' || !value) return false;
      const supplied = Buffer.from(value, 'base64');
      return supplied.length === expected.length && timingSafeEqual(supplied, expected);
    });
    if (!matches) return res.sendStatus(403);
    const event = req.body || {};
    const state = String(event.type || '').toLowerCase();
    const providerStatus = state === 'email.delivered' ? 'delivered'
      : ['email.bounced', 'email.complained', 'email.failed'].includes(state) ? 'failed'
        : state === 'email.sent' ? 'sent' : '';
    if (providerStatus) applyDeliveryStatus('email', 'Resend', event.data?.email_id, event.data?.to?.[0], providerStatus, event.data?.bounce?.message || event.data?.failed?.reason || '');
    res.sendStatus(200);
  });

  app.post('/api/gift-vouchers/webhooks/sendgrid', (req, res) => {
    const publicKey = process.env.SENDGRID_WEBHOOK_PUBLIC_KEY;
    const signature = req.get('x-twilio-email-event-webhook-signature') || '';
    const timestamp = req.get('x-twilio-email-event-webhook-timestamp') || '';
    if (!publicKey || !signature || !timestamp || !req.rawBody) return res.sendStatus(403);
    const signedPayload = Buffer.concat([Buffer.from(timestamp), req.rawBody]);
    let verified = false;
    try { verified = verifySignature('sha256', signedPayload, publicKey, Buffer.from(signature, 'base64')); } catch {}
    if (!verified) return res.sendStatus(403);
    for (const event of Array.isArray(req.body) ? req.body : []) {
      const type = String(event.event || '').toLowerCase();
      const providerStatus = type === 'delivered' ? 'delivered'
        : ['bounce', 'dropped', 'blocked'].includes(type) ? 'failed'
          : type === 'processed' ? 'sent' : '';
      if (providerStatus) applyDeliveryStatus('email', 'SendGrid', event.sg_message_id || event.message_id, event.email, providerStatus, event.reason || event.response || '');
    }
    res.sendStatus(200);
  });

  async function deliverVoucherMessage(voucher, channel, recipient, recipientKind, assets, publicBaseUrl, sender) {
    if (!recipient) return null;
    const normalizedRecipient = channel === 'email' ? String(recipient).trim().toLowerCase() : normalizePhone(recipient);
    if (!normalizedRecipient || (channel === 'email' && !validEmail(normalizedRecipient))) {
      throw new Error(`The ${recipientKind} ${channel} address is invalid.`);
    }
    db.prepare(`INSERT OR IGNORE INTO GIFT_VOUCHER_DELIVERIES (voucher_id, channel, recipient_kind, recipient, status)
      VALUES (?, ?, ?, ?, 'pending')`).run(voucher.voucher_id, channel, recipientKind, normalizedRecipient);
    const delivery = db.prepare(`SELECT * FROM GIFT_VOUCHER_DELIVERIES WHERE voucher_id = ? AND channel = ? AND recipient_kind = ? AND recipient = ?`)
      .get(voucher.voucher_id, channel, recipientKind, normalizedRecipient);
    if (!delivery || ['sent', 'delivered'].includes(delivery.status)) return delivery;
    const staleSending = delivery.status === 'sending' && Date.now() - Date.parse(`${String(delivery.updated_at).replace(' ', 'T')}Z`) > 5 * 60 * 1000;
    if (delivery.status === 'sending' && !staleSending) return delivery;
    const claim = db.prepare(`UPDATE GIFT_VOUCHER_DELIVERIES SET status = 'sending', attempts = attempts + 1, error = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE delivery_id = ? AND (status IN ('pending', 'failed', 'retry_required', 'not_configured') OR (status = 'sending' AND updated_at < datetime('now', '-5 minutes')))`)
      .run(delivery.delivery_id);
    if (!claim.changes) return delivery;
    const recipientName = recipientKind === 'purchaser' ? (voucher.purchaser_name || 'there') : (voucher.recipient_name || 'there');
    const branchName = voucher.issuing_branch_name || 'Maison Beyou';
    const message = buildVoucherMessage(voucher, recipientName, branchName);
    const subject = 'A Special Gift Is Waiting for You – Maison Beyou';
    const imageData = assets.imageBuffer.toString('base64');
    const html = `<div style="max-width:680px;margin:0 auto;padding:28px;background:#FBF7F0;color:#302820;font-family:Arial,sans-serif;border:1px solid #D9B47D;border-radius:18px"><div style="text-align:center"><img alt="Maison Beyou" src="data:image/png;base64,${imageData}" style="width:100%;max-width:620px;border-radius:12px"/></div><h2 style="color:#8C6228">Hello ${escapeHtml(recipientName)},</h2><p>Someone special has sent you a gift from Maison Beyou. We hope you enjoy your experience.</p><p><strong>Gift:</strong> ${escapeHtml(voucher.title)}<br/><strong>Voucher code:</strong> ${escapeHtml(voucher.voucher_code)}<br/><strong>Valid until:</strong> ${escapeHtml(voucher.expiry_date)}</p><p>Present the QR code or voucher code at any participating Maison Beyou branch. Our team will verify eligibility and remaining balance.</p><p style="color:#786D62">Your print-ready gift card is attached as a PDF.</p><p>With love,<br/>Maison Beyou</p></div>`;
    try {
      if (channel === 'whatsapp' && !publicBaseUrl) throw new Error('Set PUBLIC_BASE_URL to an externally reachable HTTPS address so WhatsApp can fetch the gift card image.');
      const mediaUrl = channel === 'whatsapp' ? `${publicBaseUrl}${assets.imageUrl}` : null;
      const result = await sender(channel, normalizedRecipient, message, subject, html,
        channel === 'email' ? [
          { filename: `Maison-Beyou-${voucher.voucher_code}.pdf`, contentType: 'application/pdf', content: assets.pdfBuffer },
          { filename: `Maison-Beyou-${voucher.voucher_code}.png`, contentType: 'image/png', content: assets.imageBuffer }
        ] : [], mediaUrl, {
          requireApprovedTemplate: channel === 'whatsapp',
          statusCallbackUrl: publicBaseUrl ? `${publicBaseUrl}/api/gift-vouchers/webhooks/twilio` : null,
          templateParams: [recipientName, voucher.title, voucher.voucher_code, voucher.voucher_type === 'amount' ? `INR ${Number(voucher.original_value).toFixed(2)}` : 'Service gift', voucher.expiry_date]
        });
      db.prepare(`UPDATE GIFT_VOUCHER_DELIVERIES SET status = 'sent', provider = ?, provider_reference = ?, sent_at = CURRENT_TIMESTAMP, error = NULL, updated_at = CURRENT_TIMESTAMP WHERE delivery_id = ?`)
        .run(result.provider, result.provider_reference || null, delivery.delivery_id);
      return { ...delivery, status: 'sent', provider: result.provider, provider_reference: result.provider_reference || null };
    } catch (error) {
      const message = String(error?.message || 'Delivery failed').slice(0, 500);
      const status = /not configured|approved .* template|required|PUBLIC_BASE_URL/i.test(message) ? 'not_configured' : 'failed';
      db.prepare('UPDATE GIFT_VOUCHER_DELIVERIES SET status = ?, error = ?, updated_at = CURRENT_TIMESTAMP WHERE delivery_id = ?')
        .run(status, message, delivery.delivery_id);
      return { ...delivery, status, error: message };
    }
  }

  async function activateAndDeliver(voucherId, sender, publicBaseUrl) {
    const voucher = parseVoucher(getVoucherById(voucherId));
    if (!voucher || voucher.payment_status !== 'paid' || voucher.status !== 'active') return;
    let assets;
    try {
      assets = await generateVoucherCard(voucher, db);
    } catch (error) {
      console.error(`Gift voucher card generation failed for ${voucher.voucher_code}:`, error.message);
      audit(voucher.voucher_id, null, voucher.issuing_location_id, 'card_generation_failed', { error: String(error.message || 'Card generation failed').slice(0, 300) });
      return;
    }
    const channels = [];
    if (voucher.send_whatsapp) channels.push('whatsapp');
    if (voucher.send_email) channels.push('email');
    const deliveries = [];
    for (const channel of channels) {
      const recipient = channel === 'whatsapp' ? voucher.recipient_phone : voucher.recipient_email;
      if (recipient) deliveries.push(deliverVoucherMessage(voucher, channel, recipient, 'recipient', assets, publicBaseUrl, sender));
      if (voucher.send_purchaser_copy) {
        const purchaserAddress = channel === 'whatsapp' ? voucher.purchaser_phone : voucher.purchaser_email;
        if (purchaserAddress) deliveries.push(deliverVoucherMessage(voucher, channel, purchaserAddress, 'purchaser', assets, publicBaseUrl, sender));
      }
    }
    await Promise.allSettled(deliveries);
  }

  app.get('/api/gift-vouchers/settings', authenticateToken, authorizeRoles('admin', 'reception', 'master_admin'), (req, res) => {
    res.json({ settings: readGiftVoucherSettings(db) });
  });

  app.put('/api/gift-vouchers/settings', authenticateToken, authorizeRoles('master_admin'), (req, res) => {
    try {
      const defaultValidity = Math.min(3650, Math.max(1, Math.floor(Number(req.body?.default_validity_days) || 365)));
      const maxValidity = Math.min(3650, Math.max(defaultValidity, Math.floor(Number(req.body?.max_validity_days) || 1095)));
      const minimumValue = Math.max(1, money(req.body?.minimum_value) || 1);
      const requireRecipient = Boolean(req.body?.require_recipient_contact);
      const allowUnrestricted = Boolean(req.body?.allow_unrestricted);
      db.prepare(`UPDATE GIFT_VOUCHER_SETTINGS SET default_validity_days = ?, max_validity_days = ?, minimum_value = ?, require_recipient_contact = ?, allow_unrestricted = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE settings_id = 1`)
        .run(defaultValidity, maxValidity, minimumValue, requireRecipient ? 1 : 0, allowUnrestricted ? 1 : 0, req.user.user_id);
      res.json({ success: true, settings: readGiftVoucherSettings(db) });
    } catch (error) {
      console.error('Save gift voucher settings error:', error);
      res.status(500).json({ error: 'Could not save gift voucher settings.' });
    }
  });

  app.get('/api/gift-vouchers/catalog', authenticateToken, authorizeRoles('admin', 'reception', 'master_admin'), (req, res) => {
    try {
      const locationId = req.user.role === 'master_admin' ? Number(req.query.location_id || req.locationId) : Number(req.locationId);
      if (!locationId) return res.status(400).json({ error: 'Select a branch before loading its service catalogue.' });
      const categories = db.prepare(`SELECT category_id, category_name FROM SERVICE_CATEGORIES WHERE location_id = ? AND active = 1 ORDER BY display_order, category_id`).all(locationId);
      const servicesQuery = db.prepare(`SELECT service_id, category_id, service_name, price, duration_mins FROM SERVICES WHERE category_id = ? AND active = 1 ORDER BY display_order, service_id`);
      res.json({ location_id: locationId, categories: categories.map(category => ({ ...category, services: servicesQuery.all(category.category_id) })) });
    } catch (error) {
      console.error('Gift voucher catalogue error:', error);
      res.status(500).json({ error: 'Could not load gift voucher categories and services.' });
    }
  });

  app.get('/api/gift-vouchers/reports', authenticateToken, authorizeRoles('admin', 'master_admin'), (req, res) => {
    try {
      const locationFilter = req.user.role === 'master_admin' ? (req.query.location_id ? Number(req.query.location_id) : null) : Number(req.locationId);
      const where = locationFilter ? 'WHERE issuing_location_id = ?' : '';
      const params = locationFilter ? [locationFilter] : [];
      const totals = db.prepare(`SELECT COUNT(*) AS total_created,
        SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) AS total_sold,
        COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN original_value ELSE 0 END), 0) AS sales_value,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN status = 'partially_redeemed' THEN 1 ELSE 0 END) AS partially_redeemed,
        SUM(CASE WHEN status = 'fully_redeemed' THEN 1 ELSE 0 END) AS fully_redeemed,
        SUM(CASE WHEN status = 'expired' OR (status IN ('active','partially_redeemed') AND expiry_date < date('now')) THEN 1 ELSE 0 END) AS expired,
        COALESCE(SUM(CASE WHEN status IN ('active','partially_redeemed') AND expiry_date >= date('now') THEN remaining_balance ELSE 0 END), 0) AS outstanding_balance
        FROM GIFT_VOUCHERS ${where}`).get(...params);
      const redeemedWhere = locationFilter ? 'WHERE redeeming_location_id = ?' : '';
      const redeemed = db.prepare(`SELECT COALESCE(SUM(amount), 0) AS redeemed_value FROM GIFT_VOUCHER_REDEMPTIONS ${redeemedWhere}`).get(...(locationFilter ? [locationFilter] : []));
      const branches = db.prepare(`SELECT l.location_id, l.name, l.type,
        COUNT(DISTINCT v.voucher_id) AS vouchers_issued,
        COALESCE(SUM(CASE WHEN v.payment_status = 'paid' THEN v.original_value ELSE 0 END), 0) AS sales_value,
        COALESCE((SELECT SUM(r.amount) FROM GIFT_VOUCHER_REDEMPTIONS r WHERE r.redeeming_location_id = l.location_id), 0) AS redeemed_value
        FROM LOCATIONS l LEFT JOIN GIFT_VOUCHERS v ON v.issuing_location_id = l.location_id
        ${locationFilter ? 'WHERE l.location_id = ?' : ''}
        GROUP BY l.location_id ORDER BY l.name`).all(...(locationFilter ? [locationFilter] : []));
      res.json({ totals: { ...totals, redeemed_value: redeemed.redeemed_value }, branches });
    } catch (error) {
      console.error('Gift voucher report error:', error);
      res.status(500).json({ error: 'Could not load gift voucher reports.' });
    }
  });

  app.get('/api/gift-vouchers', authenticateToken, authorizeRoles('admin', 'master_admin'), (req, res) => {
    try {
      const locationFilter = req.user.role === 'master_admin' ? (req.query.location_id ? Number(req.query.location_id) : null) : Number(req.locationId);
      const clauses = [];
      const params = [];
      if (locationFilter) { clauses.push('(v.issuing_location_id = ? OR EXISTS (SELECT 1 FROM GIFT_VOUCHER_REDEMPTIONS r WHERE r.voucher_id = v.voucher_id AND r.redeeming_location_id = ?))'); params.push(locationFilter, locationFilter); }
      if (req.query.status && req.query.status !== 'all') { clauses.push('v.status = ?'); params.push(String(req.query.status)); }
      const search = toText(req.query.search);
      if (search) { clauses.push('(v.voucher_code LIKE ? OR v.title LIKE ? OR v.recipient_name LIKE ? OR v.purchaser_name LIKE ?)'); params.push(...Array(4).fill(`%${search}%`)); }
      const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      const rows = db.prepare(`SELECT v.*, l.name AS issuing_branch_name,
        (SELECT rl.name FROM GIFT_VOUCHER_REDEMPTIONS rr JOIN LOCATIONS rl ON rl.location_id = rr.redeeming_location_id WHERE rr.voucher_id = v.voucher_id ORDER BY rr.redemption_id DESC LIMIT 1) AS last_redemption_branch,
        CASE WHEN v.issuing_location_id = ? THEN 1 ELSE 0 END AS is_issuer_branch
        FROM GIFT_VOUCHERS v JOIN LOCATIONS l ON l.location_id = v.issuing_location_id ${where} ORDER BY v.created_at DESC LIMIT 500`).all(locationFilter || -1, ...params);
      const vouchers = rows.map(row => {
        const voucher = { ...parseVoucher(row), status: statusForVoucher(row) };
        if (locationFilter && !row.is_issuer_branch && req.user.role !== 'master_admin') {
          voucher.purchaser_name = null;
          voucher.purchaser_phone = null;
          voucher.purchaser_email = null;
          voucher.recipient_phone = null;
          voucher.recipient_email = null;
        }
        delete voucher.is_issuer_branch;
        return voucher;
      });
      res.json({ vouchers });
    } catch (error) {
      console.error('Gift voucher list error:', error);
      res.status(500).json({ error: 'Could not load gift vouchers.' });
    }
  });

  app.get('/api/gift-vouchers/lookup/:code', authenticateToken, authorizeRoles('admin', 'reception', 'master_admin'), (req, res) => {
    try {
      const code = toText(req.params.code).toUpperCase();
      const row = db.prepare(`SELECT v.*, l.name AS issuing_branch_name FROM GIFT_VOUCHERS v JOIN LOCATIONS l ON l.location_id = v.issuing_location_id WHERE upper(v.voucher_code) = ?`).get(code);
      if (!row) return res.status(404).json({ error: 'Gift voucher not found.' });
      const voucher = parseVoucher(row);
      voucher.status = statusForVoucher(row);
      const isIssuer = req.user.role === 'master_admin' || Number(req.locationId) === Number(row.issuing_location_id);
      const redemptions = db.prepare(`SELECT r.*, l.name AS redeeming_branch_name, u.name AS redeeming_user_name FROM GIFT_VOUCHER_REDEMPTIONS r JOIN LOCATIONS l ON l.location_id = r.redeeming_location_id LEFT JOIN USERS u ON u.user_id = r.redeeming_user_id WHERE r.voucher_id = ?${isIssuer ? '' : ' AND r.redeeming_location_id = ?'} ORDER BY r.redemption_id DESC`)
        .all(...(isIssuer ? [row.voucher_id] : [row.voucher_id, req.locationId])).map(item => ({ ...item, services: json(item.services_json) }));
      const deliveryHistory = isIssuer ? db.prepare(`SELECT delivery_id, channel, recipient_kind, recipient, status, provider, provider_reference, error, attempts, sent_at, updated_at FROM GIFT_VOUCHER_DELIVERIES WHERE voucher_id = ? ORDER BY delivery_id DESC`).all(row.voucher_id) : [];
      const ledger = isIssuer ? db.prepare(`SELECT * FROM GIFT_VOUCHER_BALANCE_LEDGER WHERE voucher_id = ? ORDER BY ledger_id DESC`).all(row.voucher_id) : [];
      if (!isIssuer) {
        voucher.purchaser_name = null;
        voucher.purchaser_phone = null;
        voucher.purchaser_email = null;
        voucher.recipient_phone = null;
        voucher.recipient_email = null;
      }
      res.json({ voucher, redemptions, delivery_history: deliveryHistory, ledger });
    } catch (error) {
      console.error('Gift voucher lookup error:', error);
      res.status(500).json({ error: 'Could not retrieve gift voucher.' });
    }
  });

  app.get('/api/gift-vouchers/:id', authenticateToken, authorizeRoles('admin', 'reception', 'master_admin'), (req, res) => {
    try {
      const row = getVoucherById(Number(req.params.id));
      if (!row || !voucherAccessible(req, row)) return res.status(404).json({ error: 'Gift voucher not found.' });
      res.json({ voucher: { ...parseVoucher(row), status: statusForVoucher(row) } });
    } catch (error) {
      console.error('Gift voucher details error:', error);
      res.status(500).json({ error: 'Could not retrieve gift voucher details.' });
    }
  });

  app.post('/api/gift-vouchers', authenticateToken, authorizeRoles('admin', 'master_admin'), async (req, res) => {
    try {
      const requestedLocation = req.user.role === 'master_admin' ? Number(req.body?.issuing_location_id || req.locationId) : Number(req.locationId);
      if (!requestedLocation) return res.status(400).json({ error: 'Choose a branch of origin for this voucher.' });
      const location = db.prepare('SELECT location_id, name FROM LOCATIONS WHERE location_id = ?').get(requestedLocation);
      if (!location) return res.status(404).json({ error: 'Issuing branch was not found.' });
      const settings = readGiftVoucherSettings(db);
      const voucherType = req.body?.voucher_type === 'service' ? 'service' : req.body?.voucher_type === 'amount' ? 'amount' : '';
      const title = toText(req.body?.title);
      const value = money(req.body?.original_value);
      const expiryDate = toText(req.body?.expiry_date);
      const issueDate = today();
      if (!voucherType || !title || title.length > 100) return res.status(400).json({ error: 'Choose the voucher type and enter a title up to 100 characters.' });
      if (value < Number(settings.minimum_value)) return res.status(400).json({ error: `Voucher value must be at least INR ${Number(settings.minimum_value).toFixed(2)}.` });
      const parsedExpiryDate = new Date(`${expiryDate}T00:00:00.000Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(expiryDate) || Number.isNaN(parsedExpiryDate.getTime()) || parsedExpiryDate.toISOString().slice(0, 10) !== expiryDate || expiryDate <= issueDate) return res.status(400).json({ error: 'Choose a valid expiry date after today.' });
      const expiryMillis = Date.parse(`${expiryDate}T00:00:00Z`) - Date.parse(`${issueDate}T00:00:00Z`);
      if (expiryMillis / 86400000 > Number(settings.max_validity_days)) return res.status(400).json({ error: `Voucher validity cannot exceed ${settings.max_validity_days} days.` });
      const purchaserEmail = toText(req.body?.purchaser_email).toLowerCase();
      const recipientEmail = toText(req.body?.recipient_email).toLowerCase();
      if (!validEmail(purchaserEmail) || !validEmail(recipientEmail)) return res.status(400).json({ error: 'Enter valid purchaser and recipient email addresses.' });
      if (settings.require_recipient_contact && !normalizePhone(req.body?.recipient_phone) && !recipientEmail) return res.status(400).json({ error: 'A recipient mobile number or email is required by the global voucher policy.' });
      const eligibilityMode = toText(req.body?.eligibility_mode || 'selected');
      if (!['selected', 'all', 'exclude', 'unrestricted'].includes(eligibilityMode)) return res.status(400).json({ error: 'Choose a valid service eligibility mode.' });
      if (eligibilityMode === 'unrestricted' && (req.user.role !== 'master_admin' || !settings.allow_unrestricted)) return res.status(403).json({ error: 'Unrestricted service vouchers are limited to authorised Master Admin users.' });

      const categoryIds = [...new Set((Array.isArray(req.body?.category_ids) ? req.body.category_ids : []).map(Number).filter(id => Number.isInteger(id) && id > 0))];
      const serviceIds = [...new Set((Array.isArray(req.body?.service_ids) ? req.body.service_ids : []).map(Number).filter(id => Number.isInteger(id) && id > 0))];
      let categorySnapshot = [];
      let serviceSnapshot = [];
      if (eligibilityMode !== 'unrestricted') {
        if (!categoryIds.length) return res.status(400).json({ error: 'Select at least one category before choosing services.' });
        const placeholders = categoryIds.map(() => '?').join(',');
        categorySnapshot = db.prepare(`SELECT category_id, category_name FROM SERVICE_CATEGORIES WHERE location_id = ? AND active = 1 AND category_id IN (${placeholders}) ORDER BY display_order, category_id`).all(requestedLocation, ...categoryIds);
        if (categorySnapshot.length !== categoryIds.length) return res.status(400).json({ error: 'One or more categories are unavailable at the issuing branch.' });
        const serviceRows = db.prepare(`SELECT s.service_id, s.category_id, s.service_name, s.price, c.category_name FROM SERVICES s JOIN SERVICE_CATEGORIES c ON c.category_id = s.category_id WHERE c.location_id = ? AND c.active = 1 AND s.active = 1 AND s.category_id IN (${placeholders}) ORDER BY c.display_order, s.display_order, s.service_id`).all(requestedLocation, ...categoryIds);
        if (eligibilityMode === 'selected' && !serviceIds.length) return res.status(400).json({ error: 'Select at least one eligible service.' });
        if (eligibilityMode === 'selected' && serviceIds.some(id => !serviceRows.some(service => Number(service.service_id) === id))) return res.status(400).json({ error: 'Selected services must belong to the selected active categories.' });
        const eligibleRows = eligibilityMode === 'selected' ? serviceRows.filter(service => serviceIds.includes(Number(service.service_id)))
          : eligibilityMode === 'exclude' ? serviceRows.filter(service => !serviceIds.includes(Number(service.service_id))) : serviceRows;
        if (!eligibleRows.length) return res.status(400).json({ error: 'The selected rules do not leave any eligible services.' });
        serviceSnapshot = eligibleRows.map(service => ({ service_id: service.service_id, service_name: service.service_name, category_name: service.category_name, price: Number(service.price) || 0 }));
      }
      const usesAllowed = voucherType === 'service' ? Math.max(1, Math.min(100, Math.floor(Number(req.body?.service_redemptions_allowed) || 1))) : 1;
      const requestedDraft = req.body?.status === 'draft';
      const paymentStatus = req.body?.payment_status === 'paid' && !requestedDraft ? 'paid' : 'pending';
      const initialStatus = requestedDraft ? 'draft' : paymentStatus === 'paid' ? 'active' : 'pending_payment';
      const code = `MBV-${randomBytes(10).toString('hex').toUpperCase()}`;
      const purchaserPhone = normalizePhone(req.body?.purchaser_phone);
      const recipientPhone = normalizePhone(req.body?.recipient_phone);
      if (req.body?.purchaser_phone && !purchaserPhone) return res.status(400).json({ error: 'Enter a valid purchaser mobile number.' });
      if (req.body?.recipient_phone && !recipientPhone) return res.status(400).json({ error: 'Enter a valid recipient mobile number.' });
      if (req.body?.send_whatsapp && !recipientPhone) return res.status(400).json({ error: 'Enter the recipient mobile number before requesting WhatsApp delivery.' });
      if (req.body?.send_email && !recipientEmail) return res.status(400).json({ error: 'Enter the recipient email before requesting email delivery.' });
      if (req.body?.send_purchaser_copy && req.body?.send_whatsapp && !purchaserPhone) return res.status(400).json({ error: 'Enter the purchaser mobile number to send them a WhatsApp copy.' });
      if (req.body?.send_purchaser_copy && req.body?.send_email && !purchaserEmail) return res.status(400).json({ error: 'Enter the purchaser email to send them an email copy.' });
      if (req.body?.send_purchaser_copy && !req.body?.send_whatsapp && !req.body?.send_email) return res.status(400).json({ error: 'Choose WhatsApp or email before requesting a purchaser copy.' });
      const createVoucher = db.transaction(() => {
        const result = db.prepare(`INSERT INTO GIFT_VOUCHERS (voucher_code, issuing_location_id, created_by, voucher_type, title, eligibility_mode,
          category_snapshot_json, service_snapshot_json, original_value, remaining_balance, service_redemptions_allowed, issue_date, expiry_date,
          purchaser_name, purchaser_phone, purchaser_email, recipient_name, recipient_phone, recipient_email, gift_message, payment_status, status,
          payment_method, notes, send_whatsapp, send_email, send_purchaser_copy)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(code, requestedLocation, req.user.user_id, voucherType, title, eligibilityMode, JSON.stringify(categorySnapshot), JSON.stringify(serviceSnapshot), value,
            paymentStatus === 'paid' ? value : 0, usesAllowed, issueDate, expiryDate, toText(req.body?.purchaser_name), purchaserPhone || null, purchaserEmail || null,
            toText(req.body?.recipient_name), recipientPhone || null, recipientEmail || null, toText(req.body?.gift_message), paymentStatus, initialStatus,
            toText(req.body?.payment_method) || null, toText(req.body?.notes), req.body?.send_whatsapp ? 1 : 0, req.body?.send_email ? 1 : 0, req.body?.send_purchaser_copy ? 1 : 0);
        const voucherId = Number(result.lastInsertRowid);
        const paymentAmount = paymentStatus === 'paid' ? value : 0;
        db.prepare('INSERT INTO GIFT_VOUCHER_PAYMENTS (voucher_id, amount, payment_method, payment_reference, payment_status, recorded_by) VALUES (?, ?, ?, ?, ?, ?)')
          .run(voucherId, paymentAmount, toText(req.body?.payment_method) || null, toText(req.body?.payment_reference) || null, paymentStatus, req.user.user_id);
        if (paymentStatus === 'paid') db.prepare(`INSERT INTO GIFT_VOUCHER_BALANCE_LEDGER (voucher_id, location_id, entry_type, amount, previous_balance, updated_balance, reference, notes, created_by) VALUES (?, ?, 'issue', ?, 0, ?, ?, ?, ?)`)
          .run(voucherId, requestedLocation, value, value, `issue:${code}`, 'Voucher activated after payment confirmation', req.user.user_id);
        return voucherId;
      });
      const voucherId = createVoucher();
      audit(voucherId, req.user.user_id, requestedLocation, 'created', { voucher_code: code, voucher_type: voucherType, payment_status: paymentStatus });
      if (paymentStatus === 'paid') {
        const publicBaseUrl = String(process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
        await activateAndDeliver(voucherId, deliverNotification, publicBaseUrl);
      }
      const voucher = parseVoucher(getVoucherById(voucherId));
      const deliveryHistory = db.prepare('SELECT * FROM GIFT_VOUCHER_DELIVERIES WHERE voucher_id = ? ORDER BY delivery_id').all(voucherId);
      res.status(201).json({ success: true, voucher: { ...voucher, status: statusForVoucher(voucher) }, delivery_history: deliveryHistory });
    } catch (error) {
      console.error('Create gift voucher error:', error);
      res.status(500).json({ error: error.message?.includes('UNIQUE constraint') ? 'A duplicate voucher code was generated. Please try again.' : error.message || 'Could not create gift voucher.' });
    }
  });

  app.patch('/api/gift-vouchers/:id/payment', authenticateToken, authorizeRoles('admin', 'master_admin'), async (req, res) => {
    try {
      const voucherId = Number(req.params.id);
      const row = getVoucherById(voucherId);
      if (!row || !canManage(req, row)) return res.status(404).json({ error: 'Gift voucher not found in your permitted branch.' });
      if (row.status !== 'pending_payment' && row.status !== 'draft') return res.status(409).json({ error: 'Only a draft or pending-payment voucher can be activated.' });
      const paymentMethod = toText(req.body?.payment_method);
      const paymentReference = toText(req.body?.payment_reference);
      const activate = db.transaction(() => {
        const current = db.prepare('SELECT * FROM GIFT_VOUCHERS WHERE voucher_id = ?').get(voucherId);
        if (!current || !['pending_payment', 'draft'].includes(current.status)) throw new Error('Voucher is no longer awaiting payment.');
        db.prepare(`INSERT INTO GIFT_VOUCHER_PAYMENTS (voucher_id, amount, payment_method, payment_reference, payment_status, recorded_by) VALUES (?, ?, ?, ?, 'paid', ?)`)
          .run(voucherId, current.original_value, paymentMethod || null, paymentReference || null, req.user.user_id);
        db.prepare(`UPDATE GIFT_VOUCHERS SET payment_status = 'paid', payment_method = ?, status = 'active', remaining_balance = original_value, updated_at = CURRENT_TIMESTAMP WHERE voucher_id = ?`)
          .run(paymentMethod || null, voucherId);
        db.prepare(`INSERT INTO GIFT_VOUCHER_BALANCE_LEDGER (voucher_id, location_id, entry_type, amount, previous_balance, updated_balance, reference, notes, created_by) VALUES (?, ?, 'issue', ?, 0, ?, ?, ?, ?)`)
          .run(voucherId, current.issuing_location_id, current.original_value, current.original_value, `issue:${current.voucher_code}`, 'Voucher activated after payment confirmation', req.user.user_id);
      });
      activate();
      audit(voucherId, req.user.user_id, row.issuing_location_id, 'payment_confirmed', { payment_method: paymentMethod, payment_reference: paymentReference });
      const publicBaseUrl = String(process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
      await activateAndDeliver(voucherId, deliverNotification, publicBaseUrl);
      const voucher = parseVoucher(getVoucherById(voucherId));
      res.json({ success: true, voucher: { ...voucher, status: statusForVoucher(voucher) }, delivery_history: db.prepare('SELECT * FROM GIFT_VOUCHER_DELIVERIES WHERE voucher_id = ?').all(voucherId) });
    } catch (error) {
      if (error.message?.includes('no longer awaiting payment')) return res.status(409).json({ error: error.message });
      console.error('Confirm gift voucher payment error:', error);
      res.status(500).json({ error: 'Could not confirm gift voucher payment.' });
    }
  });

  app.post('/api/gift-vouchers/redeem', authenticateToken, authorizeRoles('admin', 'reception', 'master_admin'), (req, res) => {
    try {
      const code = toText(req.body?.voucher_code).toUpperCase();
      const locationId = Number(req.locationId);
      if (!code || !locationId) return res.status(400).json({ error: 'Enter a voucher code and select a redemption branch.' });
      const location = db.prepare('SELECT location_id, name FROM LOCATIONS WHERE location_id = ?').get(locationId);
      if (!location) return res.status(404).json({ error: 'Redemption branch was not found.' });
      const requestedServices = Array.isArray(req.body?.services) ? req.body.services.map(item => ({ service_name: toText(item?.service_name || item), amount: money(item?.amount) })).filter(item => item.service_name) : [];
      if (!requestedServices.length) return res.status(400).json({ error: 'Select at least one service being purchased.' });
      const reference = toText(req.body?.transaction_ref) || `GVR-${randomBytes(12).toString('hex').toUpperCase()}`;
      const amountRequested = money(req.body?.amount);
      const redeemTransaction = db.transaction(() => {
        const voucher = db.prepare('SELECT * FROM GIFT_VOUCHERS WHERE upper(voucher_code) = ?').get(code);
        if (!voucher) throw Object.assign(new Error('Gift voucher not found.'), { statusCode: 404 });
        let status = statusForVoucher(voucher);
        if (status === 'expired') {
          db.prepare(`UPDATE GIFT_VOUCHERS SET status = 'expired', updated_at = CURRENT_TIMESTAMP WHERE voucher_id = ? AND status IN ('active','partially_redeemed')`).run(voucher.voucher_id);
          throw Object.assign(new Error('This gift voucher has expired.'), { statusCode: 409 });
        }
        if (!['active', 'partially_redeemed'].includes(status) || voucher.payment_status !== 'paid') throw Object.assign(new Error(`This voucher cannot be redeemed while its status is ${status.replaceAll('_', ' ')}.`), { statusCode: 409 });
        const eligible = json(voucher.service_snapshot_json);
        const eligibleNames = new Set(eligible.map(service => service.service_name.toLocaleLowerCase()));
        for (const item of requestedServices) {
          if (voucher.eligibility_mode !== 'unrestricted' && !eligibleNames.has(item.service_name.toLocaleLowerCase())) {
            throw Object.assign(new Error(`${item.service_name} is not eligible for this voucher.`), { statusCode: 400 });
          }
        }
        if (voucher.voucher_type === 'service' && requestedServices.length !== 1) throw Object.assign(new Error('Redeem a service voucher against one service per transaction.'), { statusCode: 400 });
        const previousBalance = Number(voucher.remaining_balance) || 0;
        let amount = amountRequested;
        let serviceUses = Number(voucher.service_redemptions_used) || 0;
        if (voucher.voucher_type === 'service') {
          const usesLeft = Number(voucher.service_redemptions_allowed) - serviceUses;
          if (usesLeft <= 0) throw Object.assign(new Error('All service uses on this voucher have been redeemed.'), { statusCode: 409 });
          amount = money(usesLeft === 1 ? previousBalance : Number(voucher.original_value) / Number(voucher.service_redemptions_allowed));
          serviceUses += 1;
        } else {
          if (amount <= 0) throw Object.assign(new Error('Enter a redemption amount greater than zero.'), { statusCode: 400 });
          if (amount > previousBalance) throw Object.assign(new Error('Redemption amount exceeds the remaining voucher balance.'), { statusCode: 409 });
        }
        const updatedBalance = money(Math.max(0, previousBalance - amount));
        const statusAfter = voucher.voucher_type === 'service'
          ? serviceUses >= Number(voucher.service_redemptions_allowed) ? 'fully_redeemed' : 'partially_redeemed'
          : updatedBalance <= 0 ? 'fully_redeemed' : 'partially_redeemed';
        const apply = db.prepare(`UPDATE GIFT_VOUCHERS SET remaining_balance = ?, service_redemptions_used = ?, status = ?, updated_at = CURRENT_TIMESTAMP
          WHERE voucher_id = ? AND remaining_balance = ? AND status IN ('active','partially_redeemed') AND payment_status = 'paid'`)
          .run(updatedBalance, serviceUses, statusAfter, voucher.voucher_id, previousBalance);
        if (!apply.changes) throw Object.assign(new Error('Voucher balance changed during redemption. Refresh and try again.'), { statusCode: 409 });
        db.prepare(`INSERT INTO GIFT_VOUCHER_REDEMPTIONS (voucher_id, redeeming_location_id, redeeming_user_id, transaction_ref, amount, services_json, previous_balance, updated_balance)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(voucher.voucher_id, locationId, req.user.user_id, reference, amount, JSON.stringify(requestedServices), previousBalance, updatedBalance);
        db.prepare(`INSERT INTO GIFT_VOUCHER_BALANCE_LEDGER (voucher_id, location_id, entry_type, amount, previous_balance, updated_balance, reference, notes, created_by)
          VALUES (?, ?, 'redeem', ?, ?, ?, ?, ?, ?)`)
          .run(voucher.voucher_id, locationId, -amount, previousBalance, updatedBalance, `redeem:${reference}`, `Redeemed at ${location.name}`, req.user.user_id);
        return { voucherId: voucher.voucher_id, amount, previousBalance, updatedBalance, status: statusAfter, code: voucher.voucher_code };
      });
      const result = redeemTransaction.immediate();
      audit(result.voucherId, req.user.user_id, locationId, 'redeemed', { amount: result.amount, previous_balance: result.previousBalance, updated_balance: result.updatedBalance, transaction_ref: reference });
      const voucher = parseVoucher(getVoucherById(result.voucherId));
      const redemptions = db.prepare(`SELECT r.*, l.name AS redeeming_branch_name, u.name AS redeeming_user_name FROM GIFT_VOUCHER_REDEMPTIONS r JOIN LOCATIONS l ON l.location_id = r.redeeming_location_id LEFT JOIN USERS u ON u.user_id = r.redeeming_user_id WHERE r.voucher_id = ? ORDER BY r.redemption_id DESC`).all(result.voucherId).map(item => ({ ...item, services: json(item.services_json) }));
      res.json({ success: true, voucher: { ...voucher, status: result.status }, redeemed_amount: result.amount, redemptions });
    } catch (error) {
      const status = Number(error.statusCode) || (String(error.message || '').includes('UNIQUE constraint') ? 409 : 500);
      if (status >= 500) console.error('Gift voucher redemption error:', error);
      res.status(status).json({ error: status === 500 ? 'Could not redeem this gift voucher.' : error.message });
    }
  });

  app.post('/api/gift-vouchers/:id/cancel', authenticateToken, authorizeRoles('admin', 'master_admin'), (req, res) => {
    try {
      const voucher = getVoucherById(Number(req.params.id));
      if (!voucher || !canManage(req, voucher)) return res.status(404).json({ error: 'Gift voucher not found in your permitted branch.' });
      if (!['draft', 'pending_payment'].includes(voucher.status) || voucher.payment_status === 'paid') return res.status(409).json({ error: 'Paid vouchers must be refunded. Redeemed vouchers cannot be cancelled.' });
      db.prepare(`UPDATE GIFT_VOUCHERS SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE voucher_id = ?`).run(voucher.voucher_id);
      audit(voucher.voucher_id, req.user.user_id, voucher.issuing_location_id, 'cancelled');
      res.json({ success: true, voucher: parseVoucher(getVoucherById(voucher.voucher_id)) });
    } catch (error) {
      console.error('Cancel gift voucher error:', error);
      res.status(500).json({ error: 'Could not cancel gift voucher.' });
    }
  });

  app.post('/api/gift-vouchers/:id/refund', authenticateToken, authorizeRoles('admin', 'master_admin'), (req, res) => {
    try {
      const voucherId = Number(req.params.id);
      const voucher = getVoucherById(voucherId);
      if (!voucher || !canManage(req, voucher)) return res.status(404).json({ error: 'Gift voucher not found in your permitted branch.' });
      if (voucher.payment_status !== 'paid' || voucher.status === 'fully_redeemed') return res.status(409).json({ error: 'Only an unused, paid voucher can be refunded.' });
      const redemptionCount = Number(db.prepare('SELECT COUNT(*) AS count FROM GIFT_VOUCHER_REDEMPTIONS WHERE voucher_id = ?').get(voucherId)?.count) || 0;
      if (redemptionCount > 0) return res.status(409).json({ error: 'A voucher with redemption activity cannot be refunded automatically. Review and resolve its ledger first.' });
      const refund = db.transaction(() => {
        const fresh = db.prepare('SELECT * FROM GIFT_VOUCHERS WHERE voucher_id = ?').get(voucherId);
        if (fresh.payment_status !== 'paid' || Number(db.prepare('SELECT COUNT(*) AS count FROM GIFT_VOUCHER_REDEMPTIONS WHERE voucher_id = ?').get(voucherId).count) > 0) throw new Error('Voucher status changed before refund. Refresh and try again.');
        const previousBalance = Number(fresh.remaining_balance) || 0;
        db.prepare(`UPDATE GIFT_VOUCHERS SET status = 'refunded', payment_status = 'refunded', remaining_balance = 0, updated_at = CURRENT_TIMESTAMP WHERE voucher_id = ?`).run(voucherId);
        db.prepare(`INSERT INTO GIFT_VOUCHER_PAYMENTS (voucher_id, amount, payment_method, payment_reference, payment_status, recorded_by) VALUES (?, ?, ?, ?, 'refunded', ?)`)
          .run(voucherId, previousBalance, toText(req.body?.payment_method) || null, toText(req.body?.payment_reference) || null, req.user.user_id);
        db.prepare(`INSERT INTO GIFT_VOUCHER_BALANCE_LEDGER (voucher_id, location_id, entry_type, amount, previous_balance, updated_balance, reference, notes, created_by) VALUES (?, ?, 'refund', ?, ?, 0, ?, ?, ?)`)
          .run(voucherId, fresh.issuing_location_id, -previousBalance, previousBalance, `refund:${voucherId}:${Date.now()}`, toText(req.body?.reason) || 'Voucher refunded', req.user.user_id);
      });
      refund();
      audit(voucherId, req.user.user_id, voucher.issuing_location_id, 'refunded', { reason: toText(req.body?.reason) });
      res.json({ success: true, voucher: { ...parseVoucher(getVoucherById(voucherId)), status: 'refunded' } });
    } catch (error) {
      console.error('Refund gift voucher error:', error);
      res.status(500).json({ error: error.message || 'Could not refund gift voucher.' });
    }
  });

  app.post('/api/gift-vouchers/deliveries/:id/retry', authenticateToken, authorizeRoles('admin', 'master_admin'), async (req, res) => {
    try {
      const delivery = db.prepare('SELECT * FROM GIFT_VOUCHER_DELIVERIES WHERE delivery_id = ?').get(Number(req.params.id));
      if (!delivery) return res.status(404).json({ error: 'Voucher delivery record not found.' });
      const voucherRow = getVoucherById(delivery.voucher_id);
      if (!voucherRow || !voucherAccessible(req, voucherRow)) return res.status(404).json({ error: 'Voucher delivery record not found in your permitted branch.' });
      const staleSending = delivery.status === 'sending' && Date.now() - Date.parse(`${String(delivery.updated_at).replace(' ', 'T')}Z`) > 5 * 60 * 1000;
      if (!['failed', 'retry_required', 'not_configured'].includes(delivery.status) && !staleSending) return res.status(409).json({ error: 'Only failed, unconfigured, or stale deliveries can be retried.' });
      const voucher = parseVoucher(voucherRow);
      const assets = voucher.card_image_path && voucher.card_pdf_path
        ? { imageUrl: voucher.card_image_path, imageBuffer: fs.readFileSync(path.join(projectDir, 'public', voucher.card_image_path.replace(/^\//, ''))), pdfBuffer: fs.readFileSync(path.join(projectDir, 'public', voucher.card_pdf_path.replace(/^\//, ''))) }
        : await generateVoucherCard(voucher, db);
      const address = delivery.recipient;
      const recipientKind = delivery.recipient_kind;
      const result = await deliverVoucherMessage(voucher, delivery.channel, address, recipientKind, assets, String(process.env.PUBLIC_BASE_URL || '').replace(/\/$/, ''), deliverNotification);
      audit(voucher.voucher_id, req.user.user_id, req.locationId, 'delivery_retry', { delivery_id: delivery.delivery_id, channel: delivery.channel, status: result?.status || 'unknown' });
      const updated = db.prepare('SELECT * FROM GIFT_VOUCHER_DELIVERIES WHERE delivery_id = ?').get(delivery.delivery_id);
      res.json({ success: true, delivery: updated });
    } catch (error) {
      console.error('Retry voucher delivery error:', error);
      res.status(500).json({ error: 'Could not retry gift voucher delivery.' });
    }
  });
}
