import assert from 'node:assert/strict';

const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const paragraphs = values => values.map(value => `<p>${escape(value)}</p>`).join('');
const externalLink = (label, url) => {
  assert(url?.startsWith('https://'), `Invalid reading source: ${url}`);
  return `<a href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(label)} ↗</a>`;
};

export function renderReadingGuides(reading, program) {
  assert.equal(reading.schema_version, 1);
  assert(reading.guides.length > 0);
  const ids = new Set(['daily-reading']);
  const uniqueId = id => {
    assert(/^[a-z][a-z0-9-]*$/.test(id) && !ids.has(id), `Invalid or duplicate reading id: ${id}`);
    ids.add(id);
    return id;
  };
  const byCode = new Map([...program.sessions, ...program.alternatives].map(session => [session.code, session]));
  const dates = new Set();
  const guides = reading.guides.map(guide => {
    assert(program.days.some(day => day.date === guide.date) && !dates.has(guide.date));
    dates.add(guide.date);
    uniqueId(guide.id);
    const sessions = guide.session_codes.map(code => {
      const session = byCode.get(code);
      assert(session?.date === guide.date, `Invalid reading session: ${code}`);
      return `<li><strong>${escape(code)}</strong><span>${escape(session.start)}–${escape(session.end)}</span><span lang="en">${escape(session.title)}</span></li>`;
    }).join('');
    const steps = guide.steps.map((step, index) => {
      uniqueId(step.id);
      const session = byCode.get(step.paper.session_code);
      const paper = session?.papers.find(paper => paper.number === step.paper.number);
      assert(paper && guide.session_codes.includes(session.code), `Invalid reading paper: ${step.id}`);
      assert(step.paragraphs.length && step.question && step.answer && step.listen_for && step.takeaway);
      let exampleTable = '';
      if (step.table) {
        const { headers, rows } = step.table;
        assert(headers.length >= 2 && rows.every(row => row.length === headers.length));
        exampleTable = `<div class="reading-table-wrap" role="region" aria-label="${escape(step.title)}的自擬例子" tabindex="0"><table class="reading-table"><caption>自擬投資例子，非作者實驗</caption><thead><tr>${headers.map(header => `<th scope="col">${escape(header)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map((value, col) => `<${col === 0 ? 'th scope="row"' : `td data-label="${escape(headers[col])}"`}>${escape(value)}</${col === 0 ? 'th' : 'td'}>`).join('')}</tr>`).join('')}</tbody></table></div>`;
      }
      return `<details class="reading-step" id="${step.id}"${index === 0 ? ' open' : ''}>
        <summary><span class="reading-step-number" aria-hidden="true">${index + 1}</span><span><span class="reading-step-title">${escape(step.title)}</span><span class="reading-step-summary">${escape(step.summary)}</span></span></summary>
        <div class="reading-step-body">${paragraphs(step.paragraphs)}${exampleTable}${step.after_example ? `<p>${escape(step.after_example)}</p>` : ''}
          <div class="reading-question"><p><strong>先自己想：</strong>${escape(step.question)}</p><details class="reading-answer"><summary>展開答案與說明</summary><p>${escape(step.answer)}</p></details></div>
          <div class="reading-paper"><p class="reading-paper-label">對應報告：${escape(session.code)} 第 ${paper.number} 篇</p><h4 lang="en">${escape(paper.title)}</h4><p class="reading-paper-authors">作者：<span lang="en">${escape(paper.authors.join('; '))}</span></p><p>${escape(step.paper_explanation)}</p><p class="reading-listen"><strong>現場先聽這一件事：</strong>${escape(step.listen_for)}</p><p class="reading-source">${escape(paper.source_note)} · ${externalLink('查看議程來源', paper.source_url)}</p></div>
          <p class="reading-takeaway"><strong>這段要帶走的是：</strong>${escape(step.takeaway)}</p>
        </div>
      </details>`;
    }).join('');
    return `<article class="daily-reading-guide" id="${guide.id}" aria-labelledby="${guide.id}-title">
      <header class="reading-header"><p class="reading-date"><time datetime="${guide.date}">${escape(guide.date)}</time> · 舊金山當地時間</p><h3 id="${guide.id}-title">${escape(guide.title)}</h3><p class="reading-theme">${escape(guide.theme)}</p></header>
      <p>${escape(guide.intro)}</p><p class="reading-instruction">${escape(guide.reading_note)}</p><ul class="reading-sessions" aria-label="本日閱讀對應場次">${sessions}</ul><p class="reading-version">${escape(guide.version_note)}</p>
      <nav class="reading-step-nav" aria-label="${escape(guide.title)}段落">${guide.steps.map((step, index) => `<a href="#${step.id}">第 ${index + 1} 段</a>`).join('')}</nav>
      ${steps}
      <section class="reading-review" aria-labelledby="${guide.id}-review"><h4 id="${guide.id}-review">讀完，試著用自己的話說</h4><p>${escape(guide.review_question)}</p><details class="reading-answer"><summary>核對三篇報告的差別</summary><p>${escape(guide.review_answer)}</p></details><p>${escape(guide.onsite_note)}</p></section>
      <details class="reading-sources"><summary>來源與查閱範圍</summary><p>報告內容主要依議程摘要；數字例子為教學自擬。作者的結果與保證仍需核對全文的條件。</p><ul>${guide.sources.map(source => `<li>${externalLink(source.label, source.url)}</li>`).join('')}</ul></details>
    </article>`;
  }).join('');
  return `<section class="reading-section" id="daily-reading" aria-labelledby="daily-reading-title"><div class="reading-section-heading"><h2 id="daily-reading-title">每日閱讀重點</h2><nav aria-label="已整理的閱讀日期">${reading.guides.map(guide => `<a href="#${guide.id}">${escape(guide.title)}</a>`).join('')}</nav></div>${guides}</section>`;
}
