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

const metrics = ['total'];
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

const badges = metrics.map(metric => {
  let pct;
  let label;

  if (metric === 'total') {
    const m = ['lines', 'branches', 'functions'];
    pct = (m.reduce((acc, curr) => acc + summary.total[curr].pct, 0) / m.length).toFixed(2);
    label = 'Total';
  } else {
    pct = summary.total[metric].pct;
    label = metric.charAt(0).toUpperCase() + metric.slice(1);
  }

  const color = getColor(pct);
  return `![Coverage ${label}](https://img.shields.io/badge/Coverage-${pct}%25-${color})`;
});

const startTag = '<!-- jest_coverage_badge_start -->';
const endTag = '<!-- jest_coverage_badge_end -->';

const startIndex = readme.indexOf(startTag);
const endIndex = readme.indexOf(endTag);

if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
  const before = readme.substring(0, startIndex + startTag.length);
  const after = readme.substring(endIndex);
  readme = `${before}\n${badges.join('\n')}\n${after}`;
} else {
  // Fallback: If tags are missing or invalid, try to replace existing badges or do nothing
  console.warn('Badge tags not found or invalid. Make sure README.md has both start and end tags.');
}

fs.writeFileSync(readmePath, readme);
console.log('README.md updated with latest coverage badges.');
