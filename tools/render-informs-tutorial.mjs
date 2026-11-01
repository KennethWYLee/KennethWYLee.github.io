import assert from 'node:assert/strict';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const isHttps = value => {
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password; }
  catch { return false; }
};
const LABELS = Object.freeze({
  full: '已有全文',
  related: '找到相關文章，是否同篇待確認',
  unavailable: '已找到來源，本次未能下載',
  not_found: '尚未找到公開全文'
});

export function renderTutorialPage(data, template) {
  assert(data && Array.isArray(data.sessions) && data.sessions.length > 0, 'Tutorial sessions required');
  assert(/^\d{4}-\d{2}-\d{2}$/.test(data.checked_at), 'Invalid checked date');
  assert(isHttps(data.source_url), 'Invalid official source');
  assert(nonempty(template), 'Tutorial template required');
  const seen = new Set();
  for (const s of data.sessions) {
    assert(/^[A-Z]{2}\d+$/.test(s.code) && !seen.has(s.code), `Invalid or duplicate tutorial code ${s.code}`);
    seen.add(s.code);
    assert(/^2026-11-0[1-4]$/.test(s.date) && nonempty(s.time), `Invalid date or time for ${s.code}`);
    assert(nonempty(s.title) && Array.isArray(s.presenters) && s.presenters.length && s.presenters.every(nonempty), `Missing title or presenters for ${s.code}`);
    assert(Object.hasOwn(LABELS, s.status), `Invalid full-text status for ${s.code}`);
    assert(typeof s.note === 'string', `Missing source note for ${s.code}`);
    assert(typeof s.url === 'string' && (!s.url || isHttps(s.url)), `Invalid URL for ${s.code}`);
    if (s.status === 'full') assert(s.url, `Full text requires URL for ${s.code}`);
    assert(!Object.hasOwn(s, 'local_file'), `Local file path must not be published for ${s.code}`);
  }
  const byDate = new Map();
  for (const s of [...data.sessions].sort((a,b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time) || a.code.localeCompare(b.code))) {
    if (!byDate.has(s.date)) byDate.set(s.date, []);
    byDate.get(s.date).push(s);
  }
  const dayNames = {'2026-11-01':'11/1（日）','2026-11-02':'11/2（一）','2026-11-03':'11/3（二）','2026-11-04':'11/4（三）'};
  const cards = [...byDate].map(([date,sessions]) => `<section class="tutorial-day" aria-labelledby="tutorial-${esc(date)}"><h2 id="tutorial-${esc(date)}">${esc(dayNames[date])}</h2><div class="tutorial-list">${sessions.map(s => {
    const linkText = s.status === 'full' ? '閱讀全文' : s.status === 'related' ? '查看相關文章' : '查看來源';
    const link = s.url ? ` <a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(linkText)} ↗</a>` : '';
    return `<article class="tutorial-card" id="tutorial-${esc(s.code.toLowerCase())}" data-tutorial-code="${esc(s.code)}"><div class="tutorial-time"><strong>${esc(s.time)}</strong><span>${esc(s.code)}</span></div><div class="tutorial-body"><h3 lang="en">${esc(s.title)}</h3><p class="tutorial-presenters">${esc(s.presenters.join('；'))}</p><p class="fulltext-status is-${esc(s.status)}" data-tutorial-status="${esc(s.status)}"><strong>全文：</strong><span>${esc(LABELS[s.status])}</span>${link}${s.note ? `<span class="fulltext-note">${esc(s.note)}</span>` : ''}</p></div></article>`;
  }).join('')}</div></section>`).join('');
  const output = template.replace('{{CHECKED_AT}}', esc(data.checked_at)).replace('{{SOURCE_URL}}', esc(data.source_url)).replace('{{TUTORIAL_CARDS}}', cards);
  assert(!/\{\{[A-Z_]+\}\}/.test(output), 'Unresolved tutorial template placeholder');
  assert(!/[CD]:[\\/]|file:\/\/\//i.test(output), 'Local path in tutorial page');
  return output;
}
