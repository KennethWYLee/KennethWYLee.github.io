import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(await readFile(path.join(root, 'assets/data/informs2026-sessions.json'), 'utf8'));
const template = await readFile(path.join(root, 'tools/informs-2026.template.html'), 'utf8');
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
assert.equal(data.sessions.length, 16);
assert.equal(data.alternatives.length, 15);
assert.equal(new Set([...data.sessions, ...data.alternatives].map(s => s.code)).size, 31);
for (const session of data.sessions) {
  assert(session.start < session.end);
  for (const code of session.alternative_codes) {
    const alternative = data.alternatives.find(a => a.code === code);
    assert(alternative);
    assert.equal(alternative.date, session.date);
    assert.equal(alternative.start, session.start);
    assert.equal(alternative.end, session.end);
  }
}
const fallback = data.days.map(day => {
  const rows = data.sessions.filter(s => s.date === day.date).map(s => `<tr><td data-label="時間"><div class="cell-content">${escape(s.start)}–${escape(s.end)}</div></td><td data-label="場次"><div class="cell-content"><strong>${escape(s.code)}</strong><br>${escape(s.title)}</div></td><td data-label="教室"><div class="cell-content">${escape(s.room)}</div></td><td data-label="安排"><div class="cell-content">${escape(s.priority)}</div></td></tr>`).join('\n');
  return `<section class="static-day"><h3>${escape(day.label)}</h3><div class="table-wrap"><table class="schedule-table"><caption>${escape(day.label)}建議場次 · 舊金山當地時間</caption><thead><tr><th scope="col">時間</th><th scope="col">場次</th><th scope="col">教室</th><th scope="col">安排</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}).join('\n');
const output = template.replace('{{STATIC_SCHEDULE}}', fallback).replace('{{SESSION_DATA}}', JSON.stringify(data).replace(/</g, '\\u003c'));
assert(!/\{\{(?:STATIC_SCHEDULE|SESSION_DATA)\}\}/.test(output));
assert(!/C:[\\/]|file:\/\/\//.test(output));
await writeFile(path.join(root, 'informs-2026.html'), output, 'utf8');
console.log('Generated informs-2026.html: 16 main sessions, 15 alternatives, 4 days.');
