import fs from 'fs';
import path from 'path';

const summaryPath = path.join(process.cwd(), 'coverage/coverage-summary.json');
const readmePath = path.join(process.cwd(), 'README.md');

if (!fs.existsSync(summaryPath)) {
  console.error('Coverage summary not found');
  process.exit(1);
}

const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
let readme = fs.readFileSync(readmePath, 'utf8');

const metrics = ['lines', 'statements', 'branches', 'functions'];
const colors = {
  high: 'brightgreen',
  medium: 'yellow',
  low: 'red'
};

const getColor = (pct) => {
  if (pct >= 80) return colors.high;
  if (pct >= 50) return colors.medium;
  return colors.low;
};

metrics.forEach(metric => {
  const pct = summary.total[metric].pct;
  const color = getColor(pct);
  const label = metric.charAt(0).toUpperCase() + metric.slice(1);
  
  // Replace the badge URL
  // Format: ![Coverage Lines](https://img.shields.io/badge/Coverage-Lines-80%25-brightgreen)
  const regex = new RegExp(`!\\[Coverage ${label}\\]\\(https://img.shields.io/badge/Coverage-${label}-.*?\\)`, 'g');
  const newBadge = `![Coverage ${label}](https://img.shields.io/badge/Coverage-${label}-${pct}%25-${color})`;
  
  if (regex.test(readme)) {
    readme = readme.replace(regex, newBadge);
  } else {
    // Fallback for initial state
    const fallbackRegex = new RegExp(`!\\[Coverage ${label}\\]\\(https://img.shields.io/badge/Coverage-${label}-.*?\\)`, 'g');
    readme = readme.replace(fallbackRegex, newBadge);
  }
});

fs.writeFileSync(readmePath, readme);
console.log('README.md updated with latest coverage badges.');
