import assert from 'node:assert/strict';

const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const paragraphs = values => values.map(value => `<p>${escape(value)}</p>`).join('');
const externalLink = (label, url) => {
  assert(url?.startsWith('https://'), `Invalid reading source: ${url}`);
  return `<a href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(label)} ↗</a>`;
};

function exampleTable(table, label) {
  if (!table) return '';
  const { headers, rows } = table;
  assert(headers.length >= 2 && rows.every(row => row.length === headers.length));
  return `<div class="reading-table-wrap" role="region" aria-label="${escape(label)}的自擬例子" tabindex="0"><table class="reading-table"><caption>自擬教學例子，非作者實驗</caption><thead><tr>${headers.map(header => `<th scope="col">${escape(header)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map((value, col) => `<${col === 0 ? 'th scope="row"' : `td data-label="${escape(headers[col])}"`}>${escape(value)}</${col === 0 ? 'th' : 'td'}>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

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
  const byTalk = new Map(program.special_talks.map(talk => [talk.key, talk]));
  const dates = new Set();
  const guides = reading.guides.map(guide => {
    assert(program.days.some(day => day.date === guide.date) && !dates.has(guide.date));
    dates.add(guide.date);
    uniqueId(guide.id);
    assert(/^\d{4}-\d{2}-\d{2}$/.test(guide.special_verified_on), 'Missing special-talk verification date');
    assert(guide.goals?.length === 3 && guide.completion_note, 'Missing daily learning checks');
    assert(guide.terms?.length && guide.terms.every(term => term.length === 2 && term.every(Boolean)), 'Missing reading vocabulary');
    guide.session_codes.forEach(code => {
      const session = byCode.get(code);
      assert(session?.date === guide.date, `Invalid reading session: ${code}`);
    });
    (guide.special_keys || []).forEach(key => assert(byTalk.get(key)?.date === guide.date));
    const stepById = new Map(guide.steps.map(step => [step.id, step]));
    assert.equal(stepById.size, guide.steps.length);
    const stepIdsUsed = new Set();
    let lessonNumber = 0;
    const renderStep = (step, event, first) => {
      uniqueId(step.id);
      const session = step.paper ? byCode.get(step.paper.session_code) : null;
      const paper = session?.papers.find(paper => paper.number === step.paper.number);
      const talk = step.special_key ? byTalk.get(step.special_key) : null;
      assert((paper && !talk && event.session_code === session.code) || (talk && !paper && event.special_key === talk.key), `Invalid reading reference: ${step.id}`);
      assert(step.paragraphs.length && step.question && step.answer && step.listen_for && step.takeaway);
      lessonNumber += 1;
      const reference = paper || talk;
      const referenceLabel = paper ? `對應報告：${session.code} 第 ${paper.number} 篇` : `對應演講：${talk.type}`;
      const people = paper ? paper.authors.join('; ') : talk.speaker;
      const sourceNote = paper ? paper.source_note : `依主辦單位演講說明整理；題名與時段於 ${guide.special_verified_on} 核對。`;
      const extras = (step.extra_examples || []).map(example => {
        assert(example.title && example.paragraphs?.length);
        return `<div class="reading-extra-example"><h5>${escape(example.title)}</h5>${paragraphs(example.paragraphs)}${exampleTable(example.table, example.title)}</div>`;
      }).join('');
      return `<details class="reading-step" id="${step.id}"${first ? ' open' : ''}>
        <summary><span class="reading-step-number" aria-hidden="true">${lessonNumber}</span><span><span class="reading-step-title">${escape(step.title)}</span><span class="reading-step-summary">${escape(step.summary)}</span></span></summary>
        <div class="reading-step-body">${paragraphs(step.paragraphs)}${exampleTable(step.table, step.title)}${step.after_example ? `<p>${escape(step.after_example)}</p>` : ''}
          <div class="reading-question"><p><strong>先自己想：</strong>${escape(step.question)}</p><details class="reading-answer"><summary>展開答案與說明</summary><p>${escape(step.answer)}</p></details></div>
          ${extras ? `<details class="reading-more-examples"><summary>再看一個例子</summary>${extras}</details>` : ''}
          <div class="reading-paper"><p class="reading-paper-label">${escape(referenceLabel)}</p><h5 lang="en">${escape(reference.title)}</h5><p class="reading-paper-authors">${paper ? '作者' : '講者'}：<span lang="en">${escape(people)}</span></p><p>${escape(step.paper_explanation)}</p><p class="reading-listen"><strong>現場先聽這一件事：</strong>${escape(step.listen_for)}</p><p class="reading-source">${escape(sourceNote)} · ${externalLink('查看來源', reference.source_url)}</p></div>
          <p class="reading-takeaway"><strong>這段要帶走的是：</strong>${escape(step.takeaway)}</p>
        </div>
      </details>`;
    };
    assert(guide.events?.length);
    let lastStart = '';
    const events = guide.events.map((event, index) => {
      uniqueId(event.id);
      assert(Boolean(event.session_code) !== Boolean(event.special_key));
      const item = event.session_code ? byCode.get(event.session_code) : byTalk.get(event.special_key);
      assert(item?.date === guide.date && item.start >= lastStart, `Unordered event: ${event.id}`);
      lastStart = item.start;
      const clashes = event.special_key ? program.special_talks.filter(other => other.key !== item.key && other.date === item.date && other.start < item.end && other.end > item.start) : [];
      const label = item.code || item.speaker;
      const arrangement = item.code ? item.priority : item.type;
      const content = event.step_ids.map(id => {
        const step = stepById.get(id);
        assert(step && !stepIdsUsed.has(id), `Invalid or reused lesson: ${id}`);
        stepIdsUsed.add(id);
        return renderStep(step, event, index === 0 && event.step_ids[0] === id);
      }).join('');
      return { event, item, label, html: `<section class="reading-event" id="${event.id}" aria-labelledby="${event.id}-title"><header class="reading-event-heading"><p class="reading-event-time">${escape(item.start)}–${escape(item.end)} <span>${escape(arrangement)}</span></p><h4 id="${event.id}-title">${escape(label)}</h4><p class="reading-event-title" lang="en">${escape(item.title)}</p><p>${escape(event.focus)}</p>${clashes.length ? '<p class="reading-concurrent">晚間三場 keynote 同時進行，現場完整聽會需擇一。</p>' : ''}</header>${content}</section>` };
    });
    assert.equal(stepIdsUsed.size, guide.steps.length, 'Unused reading lessons');
    assert.deepEqual(new Set(events.filter(e => e.item.code).map(e => e.item.code)), new Set(guide.session_codes));
    assert.deepEqual(new Set(events.filter(e => !e.item.code).map(e => e.item.key)), new Set(guide.special_keys || []));
    const requiredSessions = program.sessions.filter(session => session.date === guide.date && session.priority !== '可加聽');
    requiredSessions.forEach(session => assert(guide.session_codes.includes(session.code), `Missing priority reading: ${session.code}`));
    assert.deepEqual(new Set(guide.special_keys), new Set(program.special_talks.filter(talk => talk.date === guide.date).map(talk => talk.key)), 'Missing special talks');
    return `<article class="daily-reading-guide" id="${guide.id}" aria-labelledby="${guide.id}-title">
      <header class="reading-header"><p class="reading-date"><time datetime="${guide.date}">${escape(guide.date)}</time> · 舊金山當地時間</p><h3 id="${guide.id}-title">${escape(guide.title)}</h3><p class="reading-theme">${escape(guide.theme)}</p></header>
      <p>${escape(guide.intro)}</p><p class="reading-instruction">${escape(guide.reading_note)}</p><section class="reading-goals" aria-labelledby="${guide.id}-goals"><h4 id="${guide.id}-goals">今天讀完，先檢查三件事</h4><ul>${guide.goals.map(goal => `<li>${escape(goal)}</li>`).join('')}</ul></section><nav class="reading-agenda" aria-label="本日閱讀時間目錄"><ol>${events.map(({event,item,label}) => `<li><a href="#${event.id}"><span class="reading-agenda-time">${escape(item.start)}</span><strong>${escape(label)}</strong><span>${escape(event.focus)}</span></a></li>`).join('')}</ol></nav>${guide.conflict_note ? `<p class="reading-concurrent">${escape(guide.conflict_note)}</p>` : ''}<p class="reading-version">${escape(guide.version_note)}</p>
      <details class="reading-terms"><summary>先認得這幾個英文</summary><dl>${guide.terms.map(([term,description]) => `<div><dt>${escape(term)}</dt><dd>${escape(description)}</dd></div>`).join('')}</dl></details>
      ${events.map(event => event.html).join('')}
      <section class="reading-review" aria-labelledby="${guide.id}-review"><h4 id="${guide.id}-review">讀完，試著用自己的話說</h4><p>${escape(guide.review_question)}</p><details class="reading-answer"><summary>展開回顧提示</summary><p>${escape(guide.review_answer)}</p></details><p>${escape(guide.onsite_note)}</p><p class="reading-completion">${escape(guide.completion_note)}</p></section>
      <details class="reading-sources"><summary>來源與查閱範圍</summary><p>報告內容主要依議程摘要；數字例子為教學自擬。作者的結果與保證仍需核對全文的條件。</p><ul>${guide.sources.map(source => `<li>${externalLink(source.label, source.url)}</li>`).join('')}</ul></details>
    </article>`;
  }).join('');
  assert.deepEqual(dates, new Set(program.days.map(day => day.date)), 'Missing daily reading guides');
  return `<section class="reading-section" id="daily-reading" aria-labelledby="daily-reading-title"><div class="reading-section-heading"><h2 id="daily-reading-title">每日閱讀重點</h2><nav aria-label="已整理的閱讀日期">${reading.guides.map(guide => `<a href="#${guide.id}">${escape(guide.date.slice(5).replace('-', '/'))} ${escape(guide.title)}</a>`).join('')}</nav></div>${guides}</section>`;
}
