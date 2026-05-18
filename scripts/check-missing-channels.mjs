import { resolveYoutubeUrl } from '../src/lib/youtube-live.ts';
import remates from '../src/lib/data/remates.json' with { type: 'json' };

const now = new Date();
const weekEnd = new Date(now);
weekEnd.setDate(weekEnd.getDate() + 7);

const upcoming = remates.filter(r => {
  const d = new Date(r.date);
  return d >= now && d <= weekEnd;
});

const confirmed = [], probable = [], missing = [];
for (const r of upcoming) {
  const res = resolveYoutubeUrl(r);
  if (!res) missing.push(r);
  else if (res.confidence === 'confirmed') confirmed.push(r);
  else probable.push(r);
}

console.log('Upcoming this week:', upcoming.length);
console.log('  confirmed:', confirmed.length);
console.log('  probable:', probable.length);
console.log('  missing:', missing.length);
console.log('\nMissing slugs:');
const missingBySlug = {};
for (const r of missing) {
  const s = r.consignatariaSlug || 'NULL';
  if (!missingBySlug[s]) missingBySlug[s] = { count: 0, title: r.title, location: r.location, date: r.date };
  missingBySlug[s].count++;
}
for (const [slug, info] of Object.entries(missingBySlug)) {
  console.log(`  ${slug} (${info.count}x) — ${info.title || ''} [${info.location || ''}] ${info.date || ''}`);
}
