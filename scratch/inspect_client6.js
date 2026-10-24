import Database from 'better-sqlite3';

const db = new Database('server/maison_beyou.db');
const client6 = db.prepare('SELECT * FROM CLIENTS WHERE client_id = 6').get();
console.log('Client 6:', client6);

const totalCreditsUsed = db.prepare('SELECT SUM(membership_amount_used) as total_used FROM VISITS WHERE client_id = 6').get();
console.log('Client 6 Total Credits Used across all visits:', totalCreditsUsed);

const paidCreditsUsed = db.prepare("SELECT SUM(membership_amount_used) as total_paid_used FROM VISITS WHERE client_id = 6 AND payment_status = 'Paid'").get();
console.log('Client 6 Total Paid Credits Used:', paidCreditsUsed);
