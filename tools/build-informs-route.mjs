import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import { renderReadingGuides } from './render-informs-reading.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(await readFile(path.join(root, 'assets/data/informs2026-sessions.json'), 'utf8'));
const template = await readFile(path.join(root, 'tools/informs-2026.template.html'), 'utf8');
const reading = JSON.parse(await readFile(path.join(root, 'assets/data/informs2026-reading.json'), 'utf8'));
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
assert.equal(data.sessions.length, 16);
assert.equal(data.alternatives.length, 15);
assert.equal(data.special_talks.length, 13);
assert.equal(new Set(data.special_talks.map(t => t.key)).size, 13);
assert.equal(new Set([...data.sessions, ...data.alternatives].map(s => s.code)).size, 31);
const papers = [...data.sessions, ...data.alternatives].flatMap(session => session.papers || []);
assert.equal(papers.length, 147);
assert.equal(new Set(papers.map(paper => paper.key)).size, 147);
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
const overlaps = (a, b) => a.date === b.date && a.start < b.end && a.end > b.start;
function abstractDetails(item) {
  assert(item.abstract?.summary_zh, `Missing abstract: ${item.key || item.code}`);
  const abstract = item.abstract;
  const paragraphs = abstract.summary_zh.split(/\n+/).filter(Boolean).map(text => `<p>${escape(text)}</p>`).join('');
  assert(abstract.source_url?.startsWith('https://'), `Missing abstract source: ${item.key || item.code}`);
  return `<details class="event-abstract"><summary aria-label="查看 ${escape(item.speaker || item.code)} 的摘要">摘要</summary><div class="abstract-body" lang="zh-Hant"><p class="abstract-meta">${escape(abstract.summary_label)}</p>${paragraphs}<p class="abstract-source">${escape(abstract.abstract_version_note)} · <a href="${escape(abstract.source_url)}" target="_blank" rel="noopener noreferrer">查看來源 ↗</a></p></div></details>`;
}
function paperList(session, collapsed = false) {
  assert.equal(session.papers?.length, session.abstract.paper_count, `Missing papers: ${session.code}`);
  const heading = `論文題目與作者（${session.papers.length}）`;
  const papers = session.papers.map(paper => {
    assert(paper.title && paper.authors?.length && paper.summary_zh && paper.source_note, `Incomplete paper: ${paper.key}`);
    assert(paper.source_url?.startsWith('https://'), `Missing paper source: ${paper.key}`);
    const paragraphs = paper.summary_zh.split(/\n+/).filter(Boolean).map(text => `<p>${escape(text)}</p>`).join('');
    const authorSource = paper.authors_source_url?.startsWith('https://') ? ` · <a href="${escape(paper.authors_source_url)}" target="_blank" rel="noopener noreferrer">作者資料 ↗</a>` : '';
    if (paper.recommendation) assert(paper.recommendation.reason_zh, `Missing recommendation reason: ${paper.key}`);
    const badge = paper.recommendation ? '<span class="paper-focus-badge">重點</span> ' : '';
    const reason = paper.recommendation ? `<span class="paper-recommendation"><strong>推薦理由：</strong>${escape(paper.recommendation.reason_zh)}</span>` : '';
    return `<details class="paper-item${paper.recommendation ? ' is-recommended' : ''}" data-paper-key="${paper.key}" data-session-code="${session.code}"><summary class="paper-summary"><span class="paper-heading"><span class="paper-number">${paper.number}.</span> ${badge}<span class="paper-title" lang="en">${escape(paper.title)}</span></span><span class="paper-authors"><span>作者：</span><span lang="en">${escape(paper.authors.join('; '))}</span></span>${reason}</summary><div class="abstract-body paper-abstract" lang="zh-Hant"><p class="abstract-meta">${escape(paper.summary_label)}</p>${paragraphs}<p class="abstract-source">${escape(paper.source_note)} · <a href="${escape(paper.source_url)}" target="_blank" rel="noopener noreferrer">查看來源 ↗</a>${authorSource}</p></div></details>`;
  }).join('');
  return collapsed ? `<details class="paper-list-disclosure"><summary>${heading}</summary><div class="paper-items">${papers}</div></details>` : `<section class="session-papers" aria-label="${session.code} ${heading}"><h4>${heading}</h4><div class="paper-items">${papers}</div></section>`;
}
function alternativeDetails(session) {
  if (!session.alternative_codes.length) return '';
  const alternatives = session.alternative_codes.map(code => {
    const item = data.alternatives.find(s => s.code === code);
    return `<div class="static-alternative"><p><strong>${escape(item.code)}</strong> ${escape(item.title)}<br><small>${escape(item.room)}</small></p>${abstractDetails(item)}${paperList(item, true)}</div>`;
  }).join('');
  return `<details class="session-alternatives"><summary>同時段備選（${session.alternative_codes.length}）</summary>${alternatives}</details>`;
}
const fallback = data.days.map(day => {
  const events = [...data.sessions, ...data.special_talks].filter(s => s.date === day.date).sort((a, b) => a.start.localeCompare(b.start));
  const rows = events.map(s => {
    const special = !!s.key;
    const technicalClashes = special ? [...data.sessions, ...data.alternatives].filter(t => overlaps(s, t)).map(t => t.code) : [];
    const mutual = special ? data.special_talks.filter(t => t.key !== s.key && overlaps(s, t)) : [];
    const note = special ? `${escape(s.kind)}；${technicalClashes.length ? '與技術場次 ' + escape(technicalClashes.join('、')) + ' 撞場' : '與表列技術場次無重疊'}${mutual.length ? '；同時段另有' + mutual.length + '場演講，需擇一' : ''}` : escape(s.priority);
    return `<tr${special ? ' class="special-table-row"' : ''}><td data-label="時間"><div class="cell-content">${escape(s.start)}–${escape(s.end)}</div></td><td data-label="場次"><div class="cell-content"><strong>${escape(s.code || s.speaker)}</strong><br>${escape(s.title)}</div></td><td data-label="教室"><div class="cell-content">${escape(s.room || '教室待官方確認')}</div></td><td data-label="安排"><div class="cell-content">${note}${abstractDetails(s)}${special ? '' : paperList(s) + alternativeDetails(s)}</div></td></tr>`;
  }).join('\n');
  return `<section class="static-day"><h3>${escape(day.label)}</h3><div class="table-wrap"><table class="schedule-table"><caption>${escape(day.label)}建議場次 · 舊金山當地時間</caption><thead><tr><th scope="col">時間</th><th scope="col">場次</th><th scope="col">教室</th><th scope="col">安排</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}).join('\n');
const readingNav = `<nav class="reading-entry-links" aria-label="每日閱讀入口">${reading.guides.map(guide => `<a class="reading-entry" href="#${escape(guide.id)}"><span>${escape(guide.date.slice(5).replace('-', '/'))}</span> ${escape(guide.title)} →</a>`).join('')}</nav>`;
const output = template.replace('{{STATIC_SCHEDULE}}', fallback).replace('{{READING_GUIDES}}', renderReadingGuides(reading, data)).replace('{{READING_NAV}}', readingNav).replace('{{SESSION_DATA}}', JSON.stringify(data).replace(/</g, '\\u003c'));
assert(!/\{\{(?:STATIC_SCHEDULE|READING_GUIDES|READING_NAV|SESSION_DATA)\}\}/.test(output));
assert(!/[CD]:[\\/]|file:\/\/\//.test(output));
await writeFile(path.join(root, 'informs-2026.html'), output, 'utf8');
console.log('Generated informs-2026.html: 16 technical slots, 15 alternatives, 13 special talks, 4 days.');
