import assert from 'node:assert/strict';

// 閱讀順序（每場）：
//   summary：時間／教室 → 標示＋代碼 → 研究問題 → 英文場次原題 → Takeaway 預覽
//   展開：Takeaway → 跟著例子理解（3–4步）→ 現場先聽懂／適用範圍
//        → 本場全部文章（原題、作者、中文摘要、來源一次可見）→ 各篇「深入帶讀」（收合，保留原 lesson id）
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clean = value => String(value ?? '').replace(/老師指定(?:現場聽的|要聽)?[：；，]?/g, '').replace(/老師提供的/g, '').replace(/^必去[：；]/, '');
const squash = value => clean(value).replace(/\s+/g, '');
// 只合併「完全相同」的句子（忽略空白），避免同一句在同一處重複出現。
const same = (a, b) => Boolean(squash(a)) && squash(a) === squash(b);
const para = (values, shown = []) => (values || []).filter(p => !shown.some(s => same(p, s))).map(p => `<p>${esc(clean(p))}</p>`).join('');
const link = (label, url) => { assert(url?.startsWith('https:'), `Missing https source for ${label}`); return `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`; };
const sourceLabel = (url, fallback) => /ProgramBook/i.test(url) ? '議程來源' : /arxiv\.org/i.test(url) ? '教程原稿' : fallback;
const BADGE = {'必去':'is-required','備讀':'is-reading','本日重點':'is-main','自由探索':'is-explore'};
const place = item => `${esc(item.room_short || '教室待確認')}${item.floor ? ` · ${esc(item.floor)}` : ''}`;

function table(t) {
  if (!t) return '';
  assert(t.headers.length > 1 && t.rows.every(r => r.length === t.headers.length));
  return `<div class="reading-table-wrap" tabindex="0" role="region" aria-label="自擬教學例子"><table class="reading-table"><caption>自擬教學例子，非作者實驗</caption><thead><tr>${t.headers.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${t.rows.map(row=>`<tr>${row.map((v,i)=>`<${i?'td':'th scope="row"'}>${esc(v)}</${i?'td':'th'}>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

export function renderDailyProgram(program, reading, articleSources, primers, fulltext = {items: [], supplemental: []}) {
  assert(Array.isArray(primers?.items), 'renderDailyProgram(program, reading, articleSources, primers) requires primers.items');
  assert(Array.isArray(fulltext?.items) && Array.isArray(fulltext?.supplemental), 'Full-text data requires items and supplemental arrays');
  const byCode = new Map([...program.sessions,...program.alternatives].map(s=>[s.code,s]));
  const originals = new Map(articleSources.articles.map(a=>[`${a.session}-${a.paper_number}`,a]));
  const fulltextById = new Map(fulltext.items.map(item=>[item.id, item]));
  assert.equal(fulltextById.size, fulltext.items.length, 'Full-text ids must be unique');
  const supplementalBySession = new Map();
  for (const paper of fulltext.supplemental) {
    assert(byCode.has(paper.session), `Unknown supplemental session ${paper.session}`);
    if (!supplementalBySession.has(paper.session)) supplementalBySession.set(paper.session, []);
    supplementalBySession.get(paper.session).push(paper);
  }
  const primerByKey = new Map();
  for (const p of primers.items) {
    assert(p && typeof p.key === 'string' && p.key, 'Every primer needs a key');
    assert(!primerByKey.has(p.key), `Duplicate primer ${p.key}`);
    primerByKey.set(p.key, p);
  }
  const renderedSteps = new Set(), renderedIssues = new Set(), usedPrimers = new Set(), usedOriginals = new Set();

  function primerFor(item) {
    const key = item.code || item.key;
    const primer = primerByKey.get(key);
    assert(primer, `Missing primer for ${key}`);
    assert(!usedPrimers.has(key), `Primer ${key} rendered twice`);
    usedPrimers.add(key);
    assert.equal(primer.date, item.date, `Primer ${key} date differs from the programme`);
    const text = (value, field) => { assert(typeof value === 'string' && value.trim(), `Primer ${key}.${field} must be non-empty text`); return clean(value); };
    const example = primer.example;
    assert(example && typeof example === 'object', `Primer ${key}.example is missing`);
    assert(Array.isArray(example.steps) && example.steps.length >= 3 && example.steps.length <= 4, `Primer ${key}.example.steps needs 3–4 steps`);
    assert(Array.isArray(primer.paper_numbers), `Primer ${key}.paper_numbers must be an array`);
    assert.equal(new Set(primer.paper_numbers).size, primer.paper_numbers.length, `Primer ${key} repeats a paper number`);
    const papers = primer.paper_numbers.map(number => {
      const paper = (item.papers || []).find(p => p.number === number);
      assert(paper, `Primer ${key} cites paper ${number}, which is not listed for this session`);
      return paper;
    });
    if (item.code) assert(papers.length > 0, `Technical primer ${key} must name its paper number`);
    else assert.equal(papers.length, 0, `Talk primer ${key} must use paper_numbers []`);
    return {
      takeaway: text(primer.takeaway, 'takeaway'),
      listen: text(primer.listen_for, 'listen_for'),
      scope: text(primer.scope_note, 'scope_note'),
      title: text(example.title, 'example.title'),
      setup: text(example.setup, 'example.setup'),
      steps: example.steps.map((s, i) => text(s, `example.steps[${i}]`)),
      result: text(example.result, 'example.result'),
      caution: text(example.caution, 'example.caution'),
      papers
    };
  }

  function primerBlock(p) {
    const basis = p.papers.length
      ? p.papers.map(paper => `第${paper.number}篇：<cite lang="en">${esc(paper.title)}</cite>`).join('；')
      : '本場演講';
    return `<section class="issue-primer" aria-label="Takeaway與上手例子">`
      + `<p class="primer-takeaway"><strong class="primer-label">Takeaway</strong> <span class="primer-takeaway-text">${esc(p.takeaway)}</span></p>`
      + `<div class="primer-example"><h3 class="primer-example-title"><span class="primer-label">跟著例子理解</span> <span class="primer-example-name">${esc(p.title)}</span></h3>`
      + `<p class="primer-basis"><span class="primer-tag">自擬教學例子，非作者實驗</span> <span class="primer-cites">對應${basis}</span></p>`
      + `<p class="primer-setup"><strong class="primer-key">設定：</strong>${esc(p.setup)}</p>`
      + `<ol class="primer-steps" aria-label="跟著做">${p.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>`
      + `<p class="primer-result"><strong class="primer-key">結果：</strong>${esc(p.result)}</p>`
      + `<p class="primer-caution"><strong class="primer-key">注意：</strong>${esc(p.caution)}</p></div>`
      + `<dl class="primer-notes"><div><dt>現場先聽懂</dt><dd>${esc(p.listen)}</dd></div><div><dt>適用範圍</dt><dd>${esc(p.scope)}</dd></div></dl>`
      + `</section>`;
  }

  // 簡短狀態接在原題後；下方較完整的說明與來源維持原樣。
  function fulltextTitleStatus(id) {
    const status = fulltextById.get(id)?.status || 'not_searched';
    const labels = {
      full: '（已有全文）',
      related: '（找到相關稿）',
      unavailable: '（本次未能下載）',
      not_found: id.startsWith('talk-') ? '（尚未找到同題全文）' : '（尚未找到公開全文）',
      not_searched: '（全文尚未查找）'
    };
    assert(Object.hasOwn(labels, status), `Invalid full-text status for ${id}`);
    return `<span class="title-fulltext-status is-${esc(status)}" lang="zh-Hant" data-title-fulltext-id="${esc(id)}" data-title-fulltext-status="${esc(status)}">${esc(labels[status])}</span>`;
  }

  function fulltextStatus(id, talk = false) {
    const item = fulltextById.get(id) || {status: 'not_searched'};
    const labels = {
      full: '已有全文', related: '找到相關文章，是否同篇待確認',
      unavailable: '已找到來源，本次未能下載',
      not_found: talk ? '尚未找到同題全文' : '尚未找到公開全文',
      not_searched: '尚未查找'
    };
    assert(Object.hasOwn(labels, item.status), `Invalid full-text status for ${id}`);
    if (item.status === 'full') assert(item.url, `Missing full-text URL for ${id}`);
    let source = '';
    if (item.url) {
      const url = new URL(item.url);
      assert(url.protocol === 'https:' && !url.username && !url.password, `Invalid full-text URL for ${id}`);
      const text = item.status === 'full' ? '閱讀全文' : item.status === 'related' ? '查看相關文章' : '查看來源';
      source = ` ${link(text, item.url)}`;
    }
    const note = item.note ? `<span class="fulltext-note">${esc(item.note)}</span>` : '';
    const additional = (item.additional_sources || []).map(s => ` ${link(s.label, s.url)}`).join('');
    return `<p class="fulltext-status is-${esc(item.status)}" data-fulltext-id="${esc(id)}" data-fulltext-status="${esc(item.status)}"><strong>全文：</strong><span>${esc(labels[item.status])}</span>${source}${note}${additional}</p>`;
  }

  function supplementalPapers(item) {
    const papers = supplementalBySession.get(item.code) || [];
    if (!papers.length) return '';
    return `<details class="issue-supplemental"><summary>本場其他文章與全文狀態（${papers.length}）</summary>`
      + `<div class="supplemental-list">${papers.map(paper => `<article class="supplemental-paper"><p class="supplemental-number">第${esc(paper.number)}篇</p><h4 class="supplemental-title" lang="en">${esc(paper.title)}</h4> ${fulltextTitleStatus(`${item.code}-${paper.number}`)}<p class="supplemental-authors">${esc(paper.authors_text)}</p>${fulltextStatus(`${item.code}-${paper.number}`)}</article>`).join('')}</div></details>`;
  }

  // 原58段教材：每段一個可收合的「深入帶讀」，id 不變，舊連結由 JS 自動展開祖先 details。
  function lesson(step, item, paper, shown) {
    assert(!renderedSteps.has(step.id), `Duplicate lesson ${step.id}`); renderedSteps.add(step.id);
    const visible = [...shown, ...(step.paragraphs || [])];
    const takeaway = step.takeaway ? `<p class="lesson-takeaway"><strong>Take away：</strong>${esc(clean(step.takeaway))}</p>` : '';
    const answerIsTakeaway = same(step.answer, step.takeaway);
    const prompt = step.question && !same(step.question, step.listen_for) ? `<p class="lesson-question"><strong>想一想：</strong>${esc(clean(step.question))}</p>` : '';
    const qa = answerIsTakeaway || !step.answer
      ? `${prompt}${takeaway}`
      : `${takeaway}<details class="lesson-answer"><summary>${esc(clean(step.question || '看解答'))}</summary><p>${esc(clean(step.answer))}</p></details>`;
    const listen = step.listen_for ? `<p class="lesson-listen"><strong>${paper ? '這篇先聽' : '這場先聽'}：</strong>${esc(clean(step.listen_for))}</p>` : '';
    const scope = step.paper_explanation && !visible.some(v => same(v, step.paper_explanation)) ? `<p class="lesson-scope"><strong>內容與分析範圍：</strong>${esc(clean(step.paper_explanation))}</p>` : '';
    const extras = (step.extra_examples || []).map(ex => `<div class="lesson-extra-example"><h5>${esc(clean(ex.title))}</h5>${para(ex.paragraphs)}${table(ex.table)}${ex.after_example ? `<p>${esc(clean(ex.after_example))}</p>` : ''}${ex.question ? `<details class="lesson-answer"><summary>${esc(clean(ex.question))}</summary><p>${esc(clean(ex.answer))}</p></details>` : ''}</div>`).join('');
    return `<details class="issue-lesson" id="${esc(step.id)}" data-lesson-id="${esc(step.id)}"><summary class="lesson-summary"><span class="lesson-summary-text"><span class="lesson-kicker">${paper ? `第${paper.number}篇・深入帶讀` : '深入帶讀'}</span><span class="lesson-title">${esc(clean(step.title))}</span></span></summary><div class="lesson-body">${para(step.paragraphs, shown)}${table(step.table)}${step.after_example ? `<p>${esc(clean(step.after_example))}</p>` : ''}${qa}${listen}${extras ? `<section class="lesson-extras"><p class="lesson-extras-title">再看其他例子（${step.extra_examples.length}）</p>${extras}</section>` : ''}${scope}</div></details>`;
  }

  // 每篇文章：篇號、英文原題、作者、中文摘要與來源一次可見；只有長內容（帶讀、原文摘要）收合。
  function paperEntry(item, paper, lessons, primerPapers) {
    const originalKey = `${item.code}-${paper.number}`, original = originals.get(originalKey);
    if (original) {
      assert.equal(original.title.replace(/\s/g,''), paper.title.replace(/\s/g,''));
      assert.deepEqual(original.authors, paper.authors);
      usedOriginals.add(originalKey);
    }
    const flag = primerPapers.includes(paper) ? '<span class="issue-paper-flag">上手例子</span>' : '';
    const abstract = original ? `<details class="lesson-sources"><summary>Original Abstract（英文原文摘要）</summary><p lang="en">${esc(original.abstract)}</p><p>${esc(clean(original.takeaway))}</p></details>` : '';
    const authorLink = paper.authors_source_url ? ` · ${link('作者資料', paper.authors_source_url)}` : '';
    return `<article class="issue-paper" data-paper-key="${esc(paper.key)}"><p class="issue-paper-no">第${paper.number}篇${flag}</p><div class="issue-paper-body"><h4 class="issue-paper-title" lang="en">${esc(paper.title)}</h4> ${fulltextTitleStatus(originalKey)}<p class="issue-paper-authors">${esc(paper.authors.join('; '))}</p>${fulltextStatus(originalKey)}${paper.summary_zh ? `<p class="issue-paper-summary">${esc(clean(paper.summary_zh))}</p>` : ''}${lessons.map(step => lesson(step, item, paper, [paper.summary_zh])).join('')}${abstract}<p class="issue-paper-source">${esc(clean(paper.source_note))} · ${link(sourceLabel(paper.source_url, '來源'), paper.source_url)}${authorLink}</p></div></article>`;
  }

  function sessionContent(item, ref, primer) {
    const papers = item.papers || [];
    const byPaper = new Map();
    for (const step of ref.steps) {
      const paper = step.paper ? papers.find(p => p.number === step.paper.number) : null;
      assert(paper, `Lesson ${step.id} must match a listed paper in ${item.code}`);
      if (!byPaper.has(paper.number)) byPaper.set(paper.number, []);
      byPaper.get(paper.number).push(step);
    }
    const total = item.total_paper_count;
    const count = Number.isInteger(total) && total > papers.length ? `議程冊本場共${total}篇，這裡列出已整理的${papers.length}篇。` : '';
    const deep = byPaper.size ? `標「深入帶讀」的篇目可再展開。` : '';
    const overview = (!ref.steps.length || !papers.length) && item.abstract?.summary_zh && !papers.some(p => same(p.summary_zh, item.abstract.summary_zh)) ? `<p class="issue-overview">${esc(clean(item.abstract.summary_zh))}</p>` : '';
    return `<section class="issue-papers" aria-label="本場文章"><h3 class="issue-section-title">本場文章 <span class="issue-section-count">${papers.length}篇</span></h3>${overview}<p class="issue-section-note">${count}題名保留英文原題。${deep}</p><div class="issue-paper-list">${papers.map(p => paperEntry(item, p, byPaper.get(p.number) || [], primer.papers)).join('')}</div>${supplementalPapers(item)}</section>`;
  }

  function talkContent(item, ref) {
    for (const step of ref.steps) assert.equal(step.special_key, item.key, `Lesson ${step.id} belongs to another talk`);
    const summary = item.abstract?.summary_zh || '';
    const abstractUrl = item.abstract?.source_url || item.source_url;
    const links = [link(sourceLabel(abstractUrl, '官方演講說明'), abstractUrl)];
    if (item.source_url && item.source_url !== abstractUrl) links.push(link('官方演講頁', item.source_url));
    const note = clean(item.abstract?.abstract_version_note || '');
    return `<section class="issue-talk" aria-label="演講內容"><h3 class="issue-section-title">演講內容</h3><p class="issue-talk-ref">${esc([item.kind, item.speaker].filter(Boolean).join(' · '))}</p>${fulltextStatus(`talk-${item.key}`, true)}${summary ? `<p class="issue-talk-summary">${esc(clean(summary))}</p>` : ''}${ref.steps.map(step => lesson(step, item, null, [summary])).join('')}<p class="issue-paper-source">${note ? `${esc(note)} · ` : ''}${links.join(' · ')}</p></section>`;
  }

  const days=reading.guides.map((guide,index)=>{
    const stepById=new Map(guide.steps.map(s=>[s.id,s])),refs=new Map(),placed=new Set();
    for(const event of [...guide.events,...(guide.retained_events||[])]){
      const key=event.session_code||event.special_key;
      if(!refs.has(key))refs.set(key,{steps:[],aliases:[],focus:event.focus});
      const ref=refs.get(key);ref.aliases.push(event.id);
      for(const id of event.step_ids){ assert(stepById.has(id));ref.steps.push(stepById.get(id)); }
    }
    function issue(item,{main=false,readingOnly=false}={}) {
      const key=item.code||item.key;
      assert(!placed.has(key),`Duplicate issue ${key}`);placed.add(key);renderedIssues.add(key);
      const ref=refs.get(key)||{steps:[],aliases:[],focus:''};
      const id=ref.aliases[0]||`day${index+1}-${item.code?'session-'+item.code.toLowerCase():'event-'+item.key}`;
      let question=clean(item.question||ref.focus||ref.steps[0]?.title||item.title);
      if(!item.code&&item.speaker&&question.startsWith(`${item.speaker}：`))question=question.slice(item.speaker.length+1);
      const primer=primerFor(item);
      const state=item.priority==='必去'?'必去':readingOnly?'備讀':main?'本日重點':item.code?'自由探索':item.type;
      const aliases=ref.aliases.slice(1).map(a=>`<span class="legacy-anchor" id="${esc(a)}"></span><span class="legacy-anchor" id="${esc(a)}-title"></span>`).join('');
      const notice=readingOnly?`<p class="issue-notice">這是備讀；展開文章不會改變出席選擇。${key==='WB34'?'使用者提供第4篇10:15–10:30，單篇時間待核；與WB35整場同時。':''}</p>`:'';
      const pages=item.abstract?.source_type==='author_tutorial_preprint'||!item.source_pages?.length?'':`書冊第 ${item.source_pages.join('、')} 頁 · `;
      const footnote=item.code?'教室與篇序以現場議程為準。':`${item.room_status?`${esc(clean(item.room_status))}；`:''}教室以現場公告為準。`;
      return `<details class="daily-issue${item.key?' special-issue':''}" id="${esc(id)}" ${item.code?`data-choice-code="${esc(item.code)}"`:`data-talk-key="${esc(item.key)}"`} data-start="${item.start}" data-end="${item.end}" data-room="${esc(item.room_short||'待確認')}" data-floor="${esc(item.floor||'')}">`
        +`<summary class="issue-summary"><span class="issue-when"><span class="issue-time">${item.start}–${item.end}</span><span class="issue-place">${esc(item.room_short||'教室待確認')}</span>${item.floor?`<span class="issue-floor">${esc(item.floor)}</span>`:''}</span>`
        +`<span class="issue-summary-main"><span class="issue-meta"><span class="issue-badge ${BADGE[state]||'is-talk'}">${esc(state)}</span><b>${esc(item.code||item.speaker)}</b></span>`
        +`<span class="issue-title" id="${esc(id)}-title">${esc(question)}</span>`
        +`<span class="issue-session-title"><span lang="en">${esc(item.title)}</span>${!item.code && item.key ? ` ${fulltextTitleStatus(`talk-${item.key}`)}` : ''}</span>`
        +`<span class="issue-preview"><span class="issue-preview-label">Takeaway</span> ${esc(primer.takeaway)}</span></span>`
        +`<span class="issue-toggle" aria-hidden="true">+</span></summary>`
        +`<div class="issue-body">${aliases}${notice}${primerBlock(primer)}${item.code?sessionContent(item,ref,primer):talkContent(item,ref)}<p class="issue-footnote">${pages}${footnote}</p></div></details>`;
    }
    const events=[];
    for(const slot of program.sessions.filter(s=>s.date===guide.date)){
      const choices=[slot,...slot.alternative_codes.map(c=>byCode.get(c))];assert(choices.every(Boolean));
      const controls=slot.alternative_codes.length?`<fieldset class="slot-choice-controls"><legend>${slot.start}–${slot.end}，整場擇一</legend>${choices.map(s=>`<label><input type="radio" name="choice-${slot.code}" data-slot="${slot.code}" value="${s.code}"${s.code===slot.code?' checked':''}> <strong>${s.code}</strong> <span lang="en">${esc(s.title)}</span><small class="choice-meta">${place(s)}${s.code===slot.code?' · 本版建議':''}</small></label>`).join('')}</fieldset>`:'';
      const main=slot.priority!=='可加聽';
      const html=`<section class="daily-slot${slot.priority==='必去'?' is-required':''}" data-slot="${slot.code}" data-priority="${main?'main':'optional'}" data-date="${slot.date}" data-start="${slot.start}" data-end="${slot.end}"><div class="slot-current">${issue(slot,{main})}</div>${slot.alternative_codes.length?`<details class="slot-alternatives"><summary>同時段其他研究問題（${slot.alternative_codes.length}）</summary>${controls}<div class="slot-other-issues">${choices.slice(1).map(s=>issue(s,{main})).join('')}</div></details>`:''}</section>`;
      events.push({start:slot.start,end:slot.end,html});
    }
    const groups=new Map();
    for(const talk of program.special_talks.filter(t=>t.date===guide.date)){
      const id=`${talk.date}_${talk.start.replace(':','')}_${talk.end.replace(':','')}`;
      if(!groups.has(id))groups.set(id,[]);groups.get(id).push(talk);
    }
    for(const [id,talks] of groups){
      const chosen=talks.find(t=>program.default_special_keys.includes(t.key));
      const html=`<section class="daily-slot special-slot" data-special-slot="${id}" data-priority="main" data-date="${guide.date}" data-start="${talks[0].start}" data-end="${talks[0].end}"><div class="slot-current"><p class="slot-empty"${chosen?' hidden':''}>${talks[0].start}–${talks[0].end}尚未加入行程；可展開其他演講問題。</p>${chosen?issue(chosen):''}</div><details class="slot-alternatives"><summary>${talks.length===1?'演講參加選項':'同時段其他演講與參加選項'}</summary><fieldset class="slot-choice-controls"><legend>${talks[0].start}–${talks[0].end}，擇一或略過</legend><label><input type="radio" name="special-${id}" data-special-group="${id}" value=""${chosen?'':' checked'}> 不加入此時段演講${chosen?'':'<small class="choice-meta">本版建議</small>'}</label>${talks.map(t=>`<label><input type="radio" name="special-${id}" data-special-group="${id}" value="${t.key}"${t===chosen?' checked':''}> <strong>${esc(t.speaker)}</strong> <span lang="en">${esc(t.title)}</span><small class="choice-meta">${esc(t.type)} · ${place(t)}${t===chosen?' · 本版建議':''}</small></label>`).join('')}</fieldset><div class="slot-other-issues">${talks.filter(t=>t!==chosen).map(t=>issue(t)).join('')}</div></details></section>`;
      events.push({start:talks[0].start,end:talks[0].end,html});
    }
    const remaining=[...byCode.values()].filter(s=>s.date===guide.date&&!placed.has(s.code)).sort((a,b)=>a.start.localeCompare(b.start));
    const more=remaining.map(s=>issue(s,{readingOnly:true})).join('');
    assert(guide.steps.every(s=>renderedSteps.has(s.id)),`Missing lesson on ${guide.date}`);
    // 無 JS 時也能看到本版建議的教室順序；JS 載入後依使用者選擇重寫（格式與 js/informs-2026.js 相同）。
    const routeItems=[...program.sessions.filter(s=>s.date===guide.date&&s.priority!=='可加聽'),...program.special_talks.filter(t=>t.date===guide.date&&program.default_special_keys.includes(t.key))].sort((a,b)=>a.start.localeCompare(b.start)||a.end.localeCompare(b.end));
    const route=routeItems.map(it=>`<li>${esc([it.start,it.code||it.speaker||it.title,[it.room_short||it.room,it.floor].filter(Boolean).join(' · ')].filter(Boolean).join(' · '))}</li>`).join('')||'<li>目前沒有顯示的場次。</li>';
    const terms=guide.terms.map(([term,definition])=>`<dt lang="en">${esc(term)}</dt><dd>${esc(definition)}</dd>`).join('');
    return `<article class="daily-day" id="${guide.id}" data-conference-day="${guide.date}"><header class="daily-day-heading"><p class="daily-date">DAY ${index+1} · ${esc(program.days[index].label)}</p><h2 id="${guide.id}-title">${esc(guide.theme)}</h2><p>${esc(clean(guide.intro))}</p><details class="daily-route-disclosure" open><summary>今天的教室順序</summary><ol class="daily-route" data-day-route aria-label="當日選場與教室順序">${route}</ol></details></header><div class="daily-timeline">${events.sort((a,b)=>a.start.localeCompare(b.start)||a.end.localeCompare(b.end)).map(e=>e.html).join('')}</div>${more?`<details class="daily-more" id="${guide.id}-modelling-more"><summary>更多研究問題與備讀（${remaining.length}場）</summary><p>這裡保留額外閱讀與例子；展開閱讀不會改變行程。同時段如需完整聽會，仍須擇一。</p><div class="daily-more-issues">${more}</div></details>`:`<span class="legacy-anchor" id="${guide.id}-modelling-more"></span>`}<details class="daily-review"><summary id="${guide.id}-review">今天讀完，試著回答</summary><p>${esc(guide.review_question)}</p><p>${esc(guide.review_answer)}</p><p>${esc(guide.onsite_note)}</p><h3>先認得這幾個英文</h3><dl>${terms}</dl><h3>來源與查閱範圍</h3><p>數字例子為自擬教學，報告與相關文獻的條件分別註明；原始題名與摘要來源保留。</p><ul>${guide.sources.map(s=>`<li>${link(clean(s.label),s.url)}</li>`).join('')}</ul></details></article>`;
  }).join('');
  assert.equal(renderedSteps.size,reading.guides.reduce((n,g)=>n+g.steps.length,0));
  assert.equal(renderedIssues.size,program.sessions.length+program.alternatives.length+program.special_talks.length);
  const unused=[...primerByKey.keys()].filter(k=>!usedPrimers.has(k));
  assert.equal(unused.length,0,`Primers without a matching session or talk: ${unused.join(', ')}`);
  assert.equal(usedPrimers.size,renderedIssues.size);
  assert.equal(usedOriginals.size,originals.size,'Every original English abstract must stay in its paper source fold');
  return `<div id="daily-reading">${days}</div>`;
}
