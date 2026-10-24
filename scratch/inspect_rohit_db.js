import Database from 'better-sqlite3';

const db = new Database('server/maison_beyou.db');

const rohit = db.prepare('SELECT * FROM CLIENTS WHERE name LIKE ?').all('%rohit%');
console.log('Rohit clients in DB:', rohit);

const rohitVisits = db.prepare('SELECT * FROM VISITS WHERE client_id IN (SELECT client_id FROM CLIENTS WHERE name LIKE ?)').all('%rohit%');
console.log('Rohit visits in DB:', rohitVisits);
