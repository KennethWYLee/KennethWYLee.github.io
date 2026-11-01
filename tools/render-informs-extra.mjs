import assert from 'node:assert/strict';

const escape = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

function requiredText(value, field) {
  assert(typeof value === 'string' && value.trim(), `Missing or invalid ${field}`);
  return value;
}

function date(value, field) {
  requiredText(value, field);
  assert(/^\d{4}-\d{2}-\d{2}$/.test(value), `Invalid ${field}`);
  const parsed = new Date(`${value}T00:00:00Z`);
  assert(!Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value, `Invalid ${field}`);
  return value;
}

function externalUrl(value, field) {
  requiredText(value, field);
  let parsed;
  try { parsed = new URL(value); } catch { assert.fail(`Invalid ${field}`); }
  assert(parsed.protocol === 'https:' && parsed.hostname && !parsed.username && !parsed.password, `Invalid ${field}`);
  return value;
}

function list(value, field, min = 1) {
  assert(Array.isArray(value) && value.length >= min, `Missing or invalid ${field}`);
  return value;
}

function link(label, url) {
  return `<a href="${escape(externalUrl(url, 'source URL'))}" target="_blank" rel="noopener noreferrer">${escape(requiredText(label, 'source label'))} ↗</a>`;
}

function checkId(value, field, used, pattern = /^[a-z][a-z0-9-]*$/) {
  assert(typeof value === 'string' && pattern.test(value) && !used.has(value), `Invalid or duplicate ${field}: ${value}`);
  used.add(value);
  return value;
}

/** Render the two overview sections for inclusion inside the existing main page. */
export function renderModelOverview(content) {
  assert(content && typeof content === 'object' && !Array.isArray(content), 'Missing model overview');
  date(content.prepared_on, 'prepared_on');
  requiredText(content.intro, 'intro');
  const cases = list(content.cases, 'cases');
  const paths = list(content.paths, 'paths', 5);
  assert(paths.length <= 6, 'Expected five or six questions');
  requiredText(content.question_conclusion, 'question_conclusion');
  const sources = list(content.sources, 'sources');
  const ids = new Set();
  const caseHtml = cases.map((item, index) => {
    assert(item && typeof item === 'object' && !Array.isArray(item), `Invalid case ${index + 1}`);
    checkId(item.id, 'case id', ids);
    for (const field of ['title', 'question', 'decision', 'objective', 'constraints', 'example', 'takeaway', 'boundary']) {
      requiredText(item[field], `cases[${index}].${field}`);
    }
    const nearest = list(item.nearest, `cases[${index}].nearest`).map((paper, paperIndex) => {
      assert(paper && typeof paper === 'object' && !Array.isArray(paper), `Invalid reference ${paperIndex + 1}`);
      for (const field of ['title', 'authors', 'year', 'url', 'relation', 'difference']) {
        requiredText(paper[field], `nearest.${field}`);
      }
      if (paper.scope !== undefined) requiredText(paper.scope, 'nearest.scope');
      return `<li class="model-reference"><p class="model-reference-title" lang="en">${link(paper.title, paper.url)}</p>
        <p class="model-reference-meta"><span lang="en">${escape(paper.authors)}</span> · ${escape(paper.year)}</p>
        <p><strong>已經處理：</strong>${escape(paper.relation)}</p><p><strong>與這裡的問題有何不同：</strong>${escape(paper.difference)}</p>${paper.scope ? `<p><strong>閱讀範圍：</strong>${escape(paper.scope)}</p>` : ''}</li>`;
    }).join('');
    return `<details class="model-case" id="model-${escape(item.id)}">
      <summary><span class="model-case-title">${escape(item.title)}</span><span class="model-case-summary">${escape(item.takeaway)}</span></summary>
      <div class="model-case-body"><dl class="model-explanation">
        <div><dt>想回答什麼？</dt><dd>${escape(item.question)}</dd></div>
        <div><dt>要決定什麼？</dt><dd>${escape(item.decision)}</dd></div>
        <div><dt>希望達到什麼？</dt><dd>${escape(item.objective)}</dd></div>
        <div><dt>有什麼限制？</dt><dd>${escape(item.constraints)}</dd></div>
      </dl><div class="model-example"><h4>用一個自擬例子想想</h4><p>${escape(item.example)}</p></div>
      <p class="model-boundary"><strong>要留意：</strong>${escape(item.boundary)}</p>
      <details class="model-literature"><summary>相關文獻和適用範圍</summary><ul>${nearest}</ul></details></div>
    </details>`;
  }).join('');
  const pathHtml = paths.map((item, index) => {
    assert(item && typeof item === 'object' && !Array.isArray(item), `Invalid question ${index + 1}`);
    for (const field of ['question', 'example', 'takeaway']) requiredText(item[field], `paths[${index}].${field}`);
    return `<article class="model-question-card"><h3>${escape(item.question)}</h3><p>${escape(item.example)}</p><p class="model-question-takeaway">${escape(item.takeaway)}</p></article>`;
  }).join('');
  const sourceHtml = sources.map(source => {
    assert(source && typeof source === 'object' && !Array.isArray(source), 'Invalid source');
    return `<li>${link(source.label, source.url)}</li>`;
  }).join('');
  return `<section class="modelling-section" id="from-questions-to-models" aria-labelledby="from-questions-to-models-title">
    <header class="modelling-heading"><p class="modelling-kicker">從問題開始</p><h2 id="from-questions-to-models-title">從問題到投資模型</h2><p>${escape(content.intro)}</p><p class="modelling-date">整理日期：<time datetime="${escape(content.prepared_on)}">${escape(content.prepared_on)}</time></p></header>
    <div class="model-cases">${caseHtml}</div>
    <details class="model-sources"><summary>查看來源</summary><ul>${sourceHtml}</ul></details>
  </section>
  <section class="modelling-section" id="where-questions-come-from" aria-labelledby="where-questions-come-from-title">
    <header class="modelling-heading"><h2 id="where-questions-come-from-title">研究問題可以從哪裡來？</h2><p>先問清楚情境和需求，再看文獻已經回答了什麼。不同的問題本身不代表研究缺口已經成立。</p></header>
    <div class="model-question-grid">${pathHtml}</div>
    <p class="model-boundary">${escape(content.question_conclusion)}</p>
  </section>`;
}

/** Render a self-contained page for the three articles supplied by the teacher. */
export function renderTeacherPage(teacher) {
  assert(teacher && typeof teacher === 'object' && !Array.isArray(teacher), 'Missing teacher data');
  date(teacher.prepared_on, 'teacher.prepared_on');
  requiredText(teacher.title, 'teacher.title');
  requiredText(teacher.note, 'teacher.note');
  const articles = list(teacher.articles, 'teacher.articles');
  assert.equal(articles.length, 3, 'Expected exactly three teacher articles');
  const ids = new Set();
  const html = articles.map((article, index) => {
    assert(article && typeof article === 'object' && !Array.isArray(article), `Invalid teacher article ${index + 1}`);
    checkId(article.id, 'teacher article id', ids, /^[a-z0-9][a-z0-9-]*$/);
    for (const field of ['title', 'abstract', 'takeaway', 'session', 'date_time', 'source_url', 'source_note']) {
      requiredText(article[field], `teacher.articles[${index}].${field}`);
    }
    const authors = list(article.authors, 'article authors').map(name => requiredText(name, 'article author'));
    if (article.attendance_required) {
      requiredText(article.room, 'teacher article room');
      assert(Number.isInteger(article.paper_number) && article.paper_number > 0);
      assert(/^day[1-4]-session-[a-z0-9]+$/.test(article.reading_anchor));
    }
    return `<article class="teacher-article" id="teacher-${escape(article.id)}" aria-labelledby="teacher-${escape(article.id)}-title">
      <header><p class="teacher-session">${escape(article.session)} · ${escape(article.date_time)}</p><h2 id="teacher-${escape(article.id)}-title" lang="en">${escape(article.title)}</h2><p class="teacher-authors">作者：<span lang="en">${authors.map(escape).join('、')}</span></p>${article.attendance_required ? `<p class="teacher-session"><strong>老師指定現場聽${article.attendance_priority === '必去' ? ' · 必去' : ''}</strong> · 第${article.paper_number}篇 · ${escape(article.room)} · <a href="informs-2026.html#${escape(article.reading_anchor)}">已排入主行程</a></p>` : ''}</header>
      <div class="teacher-abstract"><h3>英文摘要</h3><p lang="en">${escape(article.abstract)}</p></div>
      <div class="teacher-takeaway"><h3>這篇先帶走什麼</h3><p>${escape(article.takeaway)}</p></div>
      <p class="teacher-source">${escape(article.source_note)} ${link('查看議程來源', article.source_url)}</p>
    </article>`;
  }).join('');
  return `<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><meta name="theme-color" content="#f6f8fa"><title>${escape(teacher.title)} | INFORMS 2026</title>
<link rel="stylesheet" href="css/site.css"><link rel="stylesheet" href="css/informs-reading.css"><link rel="stylesheet" href="css/informs-modelling.css"></head>
<body class="conference-page teacher-page"><a class="skip-link" href="#main">跳至文章</a><div class="teacher-shell"><header class="teacher-page-header"><a href="informs-2026.html">← 回到聽會行程</a></header>
<main id="main" tabindex="-1"><div class="teacher-intro"><p class="modelling-kicker">2026 INFORMS Annual Meeting</p><h1>${escape(teacher.title)}</h1><p>${escape(teacher.note)}</p><p class="modelling-date">整理日期：<time datetime="${escape(teacher.prepared_on)}">${escape(teacher.prepared_on)}</time></p></div>${html}</main>
<footer class="teacher-footer"><a href="informs-2026.html">← 回到聽會行程</a></footer></div></body></html>`;
}
