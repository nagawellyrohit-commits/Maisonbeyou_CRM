import fs from 'fs';

const content = fs.readFileSync('src/components/NewVisitWizard.jsx', 'utf8');
const lines = content.split('\n');

lines.forEach((line, index) => {
  if (line.includes('membership-plans') || line.includes('upgradeFromBilling')) {
    console.log(`Line ${index + 1}: ${line.trim()}`);
  }
});
