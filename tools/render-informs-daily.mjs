import assert from 'node:assert/strict';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clean = value => String(value ?? '').replace(/老師指定(?:現場聽的|要聽)?[：；，]?/g, '').replace(/老師提供的/g, '').replace(/^必去[：；]/, '');
const para = values => (values || []).map(p => `<p>${esc(clean(p))}</p>`).join('');
const link = (label, url) => { assert(url?.startsWith('https:')); return `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`; };

function table(t) {
  if (!t) return '';
  assert(t.headers.length > 1 && t.rows.every(r => r.length === t.headers.length));
  return `<div class="reading-table-wrap" tabindex="0" role="region" aria-label="自擬教學例子"><table class="reading-table"><caption>自擬教學例子，非作者實驗</caption><thead><tr>${t.headers.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${t.rows.map(row=>`<tr>${row.map((v,i)=>`<${i?'td':'th scope="row"'}>${esc(v)}</${i?'td':'th'}>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

export function renderDailyProgram(program, reading, articleSources) {
  const byCode = new Map([...program.sessions,...program.alternatives].map(s=>[s.code,s]));
  const originals = new Map(articleSources.articles.map(a=>[`${a.session}-${a.paper_number}`,a]));
  const renderedSteps = new Set(), renderedIssues = new Set();
  function paperSource(session,paper,explanation='') {
    const original=originals.get(`${session.code}-${paper.number}`);
    if(original){ assert.equal(original.title.replace(/\s/g,''),paper.title.replace(/\s/g,'')); assert.deepEqual(original.authors,paper.authors); }
    return `<details class="lesson-sources"><summary>原文、作者與來源</summary>${explanation?`<p><strong>內容與分析範圍：</strong>${esc(clean(explanation))}</p>`:''}<p><strong>議程摘要的中文整理：</strong>${esc(clean(paper.summary_zh))}</p>${original?`<h5>Original Abstract</h5><p lang="en">${esc(original.abstract)}</p><p>${esc(clean(original.takeaway))}</p>`:''}<p>${esc(clean(paper.source_note))} · ${link('議程來源',paper.source_url)}</p>${paper.authors_source_url?`<p>${link('作者資料',paper.authors_source_url)}</p>`:''}</details>`;
  }
  function lesson(step,item) {
    assert(!renderedSteps.has(step.id)); renderedSteps.add(step.id);
    const paper=step.paper?item.papers.find(p=>p.number===step.paper.number):null;
    assert(paper||step.special_key===item.key);
    const extras=(step.extra_examples||[]).map(ex=>`<div class="lesson-extra-example"><h4>${esc(ex.title)}</h4>${para(ex.paragraphs)}${table(ex.table)}${ex.after_example?`<p>${esc(clean(ex.after_example))}</p>`:''}${ex.question?`<details class="lesson-answer"><summary>${esc(ex.question)}</summary><p>${esc(clean(ex.answer))}</p></details>`:''}</div>`).join('');
    return `<section class="issue-lesson" id="${esc(step.id)}" data-lesson-id="${esc(step.id)}"><p class="lesson-reference">${paper?`${esc(item.code)} · 第${paper.number}篇 · ${esc(paper.authors.join('; '))}`:`${esc(item.type)} · ${esc(item.speaker)}`}</p><h3 lang="en">${esc((paper||item).title)}</h3><h4 class="lesson-title">${esc(clean(step.title))}</h4>${para(step.paragraphs)}${table(step.table)}${step.after_example?`<p>${esc(clean(step.after_example))}</p>`:''}<p class="lesson-takeaway"><strong>Take away：</strong>${esc(clean(step.takeaway))}</p><p class="lesson-listen"><strong>這篇先聽：</strong>${esc(clean(step.listen_for))}</p><details class="lesson-answer"><summary>${esc(step.question)}</summary><p>${esc(clean(step.answer))}</p></details>${extras?`<details class="lesson-extra"><summary>再看其他例子（${step.extra_examples.length}）</summary>${extras}</details>`:''}${paper?paperSource(item,paper,step.paper_explanation):`<details class="lesson-sources"><summary>原文、講者與來源</summary>${step.paper_explanation?`<p>${esc(clean(step.paper_explanation))}</p>`:''}<p>${esc(item.abstract.summary_zh)}</p><p>${link('官方演講說明',item.abstract.source_url||item.source_url)}</p></details>`}</section>`;
  }
  const otherPaper=(session,paper)=>`<article class="issue-paper" data-paper-key="${esc(paper.key)}"><p class="lesson-reference">第${paper.number}篇 · ${esc(paper.authors.join('; '))}</p><h4 lang="en">${esc(paper.title)}</h4><p>${esc(clean(paper.summary_zh))}</p>${paperSource(session,paper)}</article>`;
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
      const question=clean(item.question||ref.focus||ref.steps[0]?.title||item.title);
      const preview=clean(ref.steps[0]?.takeaway||item.abstract?.summary_zh?.split(/[。\n]/)[0]||'展開查看研究問題、文章與來源。');
      const nav=ref.steps.length>1?`<nav class="issue-paper-nav" aria-label="本場閱讀文章">${ref.steps.map(s=>`<a href="#${esc(s.id)}">${esc(item.papers.find(p=>p.number===s.paper?.number)?.title||item.title)}</a>`).join('')}</nav>`:'';
      const readNumbers=new Set(ref.steps.filter(s=>s.paper).map(s=>s.paper.number));
      const others=(item.papers||[]).filter(p=>!readNumbers.has(p.number));
      const aliases=ref.aliases.slice(1).map(a=>`<span class="legacy-anchor" id="${esc(a)}"></span><span class="legacy-anchor" id="${esc(a)}-title"></span>`).join('');
      const state=item.priority==='必去'?'必去':readingOnly?'備讀':main?'本日重點':item.code?'自由探索':item.type;
      return `<details class="daily-issue${item.key?' special-issue':''}" id="${esc(id)}" ${item.code?`data-choice-code="${esc(item.code)}"`:`data-talk-key="${esc(item.key)}"`} data-start="${item.start}" data-end="${item.end}" data-room="${esc(item.room_short||'待確認')}" data-floor="${esc(item.floor||'')}"><summary class="issue-summary"><span class="issue-time">${item.start}–${item.end}</span><span class="issue-summary-main"><span class="issue-meta"><b>${esc(item.code||item.speaker)}</b><span class="issue-badge${item.priority==='必去'?' is-required':''}">${esc(state)}</span><span>${esc(item.room_short||'教室待確認')} · ${esc(item.floor||'')}</span></span><span class="issue-session-title" lang="en">${esc(item.title)}</span><span class="issue-title" id="${esc(id)}-title">${esc(question)}</span><span class="issue-preview">${esc(preview)}</span></span><span class="issue-toggle" aria-hidden="true">+</span></summary><div class="issue-body">${aliases}${readingOnly?`<p class="daily-status">這是備讀；展開文章不會改變出席選擇。${key==='WB34'?'使用者提供第4篇10:15–10:30，單篇時間待核；與WB35整場同時。':''}</p>`:''}${nav}${ref.steps.length?ref.steps.map(s=>lesson(s,item)).join(''):`<p>${esc(clean(item.abstract?.summary_zh||''))}</p><p class="daily-status">目前先整理議程摘要；尚未新增自擬帶讀例子。</p>`}${others.length?`<section class="issue-other-papers"><h3>${ref.steps.length?'本場其他文章與摘要':'本場文章與摘要'}（${others.length}）</h3>${others.map(p=>otherPaper(item,p)).join('')}</section>`:''}${!item.code&&!ref.steps.length?`<p>${link('演講來源',item.abstract.source_url)}</p>`:''}<p class="daily-status">${item.source_pages?.length?'書冊第 '+item.source_pages.join('、')+'頁 · ':''}教室與篇序以現場議程為準。</p></div></details>`;
    }
    const events=[];
    for(const slot of program.sessions.filter(s=>s.date===guide.date)){
      const choices=[slot,...slot.alternative_codes.map(c=>byCode.get(c))];assert(choices.every(Boolean));
      const controls=slot.alternative_codes.length?`<fieldset class="slot-choice-controls"><legend>${slot.start}–${slot.end}，整場擇一</legend>${choices.map(s=>`<label><input type="radio" name="choice-${slot.code}" data-slot="${slot.code}" value="${s.code}"${s.code===slot.code?' checked':''}> <strong>${s.code}</strong> ${esc(s.title)}</label>`).join('')}</fieldset>`:'';
      const main=slot.priority!=='可加聽';
      const html=`<section class="daily-slot" data-slot="${slot.code}" data-priority="${main?'main':'optional'}" data-date="${slot.date}" data-start="${slot.start}" data-end="${slot.end}"><div class="slot-current">${issue(slot,{main})}</div>${slot.alternative_codes.length?`<details class="slot-alternatives"><summary>同時段其他研究問題（${slot.alternative_codes.length}）</summary>${controls}<div class="slot-other-issues">${choices.slice(1).map(s=>issue(s,{main})).join('')}</div></details>`:''}</section>`;
      events.push({start:slot.start,end:slot.end,html});
    }
    const groups=new Map();
    for(const talk of program.special_talks.filter(t=>t.date===guide.date)){
      const id=`${talk.date}_${talk.start.replace(':','')}_${talk.end.replace(':','')}`;
      if(!groups.has(id))groups.set(id,[]);groups.get(id).push(talk);
    }
    for(const [id,talks] of groups){
      const chosen=talks.find(t=>program.default_special_keys.includes(t.key));
      const html=`<section class="daily-slot special-slot" data-special-slot="${id}" data-priority="main" data-date="${guide.date}" data-start="${talks[0].start}" data-end="${talks[0].end}"><div class="slot-current"><p class="slot-empty"${chosen?' hidden':''}>${talks[0].start}–${talks[0].end}尚未加入行程；可展開其他演講問題。</p>${chosen?issue(chosen):''}</div><details class="slot-alternatives"><summary>${talks.length===1?'演講參加選項':'同時段其他演講與參加選項'}</summary><fieldset class="slot-choice-controls"><legend>${talks[0].start}–${talks[0].end}，擇一或略過</legend><label><input type="radio" name="special-${id}" data-special-group="${id}" value=""${chosen?'':' checked'}> 不加入此時段演講</label>${talks.map(t=>`<label><input type="radio" name="special-${id}" data-special-group="${id}" value="${t.key}"${t===chosen?' checked':''}> <strong>${esc(t.speaker)}</strong> ${esc(t.title)}</label>`).join('')}</fieldset><div class="slot-other-issues">${talks.filter(t=>t!==chosen).map(t=>issue(t)).join('')}</div></details></section>`;
      events.push({start:talks[0].start,end:talks[0].end,html});
    }
    const remaining=[...byCode.values()].filter(s=>s.date===guide.date&&!placed.has(s.code)).sort((a,b)=>a.start.localeCompare(b.start));
    const more=remaining.map(s=>issue(s,{readingOnly:true})).join('');
    assert(guide.steps.every(s=>renderedSteps.has(s.id)),`Missing lesson on ${guide.date}`);
    const terms=guide.terms.map(([term,definition])=>`<dt lang="en">${esc(term)}</dt><dd>${esc(definition)}</dd>`).join('');
    return `<article class="daily-day" id="${guide.id}" data-conference-day="${guide.date}"><header class="daily-day-heading"><p class="daily-date">DAY ${index+1} · ${esc(program.days[index].label)}</p><h2 id="${guide.id}-title">${esc(guide.theme)}</h2><p>${esc(clean(guide.intro))}</p><details class="daily-route-disclosure"><summary>查看今天的教室順序</summary><ol class="daily-route" data-day-route aria-label="當日選場與教室順序"></ol></details></header><div class="daily-timeline">${events.sort((a,b)=>a.start.localeCompare(b.start)||a.end.localeCompare(b.end)).map(e=>e.html).join('')}</div>${more?`<details class="daily-more" id="${guide.id}-modelling-more"><summary>更多研究問題與備讀（${remaining.length}場）</summary><p>這裡保留額外閱讀與例子；展開閱讀不會改變行程。同時段如需完整聽會，仍須擇一。</p><div class="daily-more-issues">${more}</div></details>`:`<span class="legacy-anchor" id="${guide.id}-modelling-more"></span>`}<details class="daily-review"><summary id="${guide.id}-review">今天讀完，試著回答</summary><p>${esc(guide.review_question)}</p><p>${esc(guide.review_answer)}</p><p>${esc(guide.onsite_note)}</p><h3>先認得這幾個英文</h3><dl>${terms}</dl><h3>來源與查閱範圍</h3><p>數字例子為自擬教學，報告與相關文獻的條件分別註明；原始題名與摘要來源保留。</p><ul>${guide.sources.map(s=>`<li>${link(clean(s.label),s.url)}</li>`).join('')}</ul></details></article>`;
  }).join('');
  assert.equal(renderedSteps.size,reading.guides.reduce((n,g)=>n+g.steps.length,0));
  assert.equal(renderedIssues.size,program.sessions.length+program.alternatives.length+program.special_talks.length);
  return `<div id="daily-reading">${days}</div>`;
}
