const fs = require('fs');
const content = fs.readFileSync('src/components/NewVisitWizard.jsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes("step === 'client-info'") || line.includes("step === \"client-info\"") || line.includes("client-info") || line.includes("New Guest Registration") || line.includes("NEW VISITOR")) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
