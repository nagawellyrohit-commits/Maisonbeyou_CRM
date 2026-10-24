import fs from 'fs';
const lines = fs.readFileSync('server/index.js', 'utf8').split('\n');
lines.forEach((l, i) => {
  if (l.includes("'/api/visits") || l.includes("'/api/dashboard")) {
    console.log(`${i + 1}: ${l.trim()}`);
  }
});
