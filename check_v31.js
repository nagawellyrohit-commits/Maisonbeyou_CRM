import db from './server/db.js';

console.log('USERS in DB:');
console.log(db.prepare('SELECT user_id, name, email, role FROM USERS').all());

