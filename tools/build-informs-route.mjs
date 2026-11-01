import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import { renderDailyProgram } from './render-informs-daily.mjs';
import { renderModelOverview } from './render-informs-extra.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const json=async name=>JSON.parse(await readFile(path.join(root,`assets/data/informs2026-${name}.json`),'utf8'));
const [data,reading,modelling,articles,primers,template]=await Promise.all([json('sessions'),json('reading'),json('modelling'),json('teacher'),json('primers'),readFile(path.join(root,'tools/informs-2026.template.html'),'utf8')]);
assert.equal(data.sessions.length,17);
assert.equal(data.special_talks.length,13);
assert.equal(new Set([...data.sessions,...data.alternatives].map(s=>s.code)).size,data.sessions.length+data.alternatives.length);
const records=new Map([...data.sessions,...data.alternatives,...data.special_talks].map(item=>[item.code||item.key,item]));
assert.equal(primers.items.length,records.size,'Every session and talk needs a takeaway and example');
assert.equal(new Set(primers.items.map(item=>item.key)).size,records.size,'Primer keys must be unique');
for (const primer of primers.items) {
  const record=records.get(primer.key);
  assert(record&&record.date===primer.date,`Unknown or incorrectly dated primer ${primer.key}`);
  assert(Array.isArray(primer.paper_numbers)&&new Set(primer.paper_numbers).size===primer.paper_numbers.length);
  assert(primer.paper_numbers.every(number=>record.papers?.some(paper=>paper.number===number)));
  assert(record.code?primer.paper_numbers.length>0:primer.paper_numbers.length===0);
  for(const value of [primer.takeaway,primer.listen_for,primer.scope_note,primer.example?.title,primer.example?.setup,primer.example?.result,primer.example?.caution]) assert(typeof value==='string'&&value.trim(),`Incomplete primer ${primer.key}`);
  assert(Array.isArray(primer.example.steps)&&primer.example.steps.length>=3&&primer.example.steps.length<=4);
  assert(primer.example.steps.every(step=>typeof step==='string'&&step.trim()));
}
const talks=data.default_special_keys.map(k=>data.special_talks.find(t=>t.key===k));
assert(talks.every(Boolean));
assert.equal(new Set(talks.map(t=>`${t.date}_${t.start}_${t.end}`)).size,talks.length);
assert(data.special_talks.filter(t=>t.type==='Plenary').every(t=>data.default_special_keys.includes(t.key)));
for(const slot of data.sessions){
  assert(slot.start<slot.end);
  if(slot.priority==='必去') assert.equal(slot.alternative_codes.length,0,'Required slot cannot offer attendance alternatives');
  for(const code of slot.alternative_codes){
    const other=data.alternatives.find(s=>s.code===code);
    assert(other&&other.date===slot.date&&other.start===slot.start&&other.end===slot.end);
  }
}
const tabs=`<nav class="daily-tabs" id="day-tabs" aria-label="選擇日期">${data.days.map((d,i)=>`<a class="daily-tab" href="#day${i+1}-reading" data-day="${d.date}" title="${d.theme}"><span>${d.label}</span><small>${d.theme}</small></a>`).join('')}</nav>`;
const output=template.replace('{{DAY_TABS}}',tabs).replace('{{DAILY_PROGRAM}}',renderDailyProgram(data,reading,articles,primers)).replace('{{MODELLING_OVERVIEW}}',renderModelOverview(modelling)).replace('{{SESSION_DATA}}',JSON.stringify(data).replace(/</g,'\\u003c')).replace(/[\t ]+$/gm,'');
assert(!/\{\{[A-Z_]+\}\}/.test(output));
assert(!/[CD]:[\\/]|file:\/\/\//.test(output));
await writeFile(path.join(root,'informs-2026.html'),output,'utf8');
// Saved links continue to work after removing the separate article page.
const redirect='<!doctype html>\n<html lang="zh-Hant"><head><meta charset="utf-8"><meta name="robots" content="noindex"><noscript><meta http-equiv="refresh" content="0;url=informs-2026.html#daily-reading"></noscript><title>每日重點與行程</title></head><body><p><a href="informs-2026.html#daily-reading">內容已整合至每日重點與行程</a></p><script>const targets={"#teacher-001":"#day2-session-mc41","#teacher-001-title":"#day2-session-mc41","#teacher-002":"#day3-session-tb29","#teacher-002-title":"#day3-session-tb29","#teacher-003":"#day4-session-wa33","#teacher-003-title":"#day4-session-wa33"};location.replace("informs-2026.html"+(targets[location.hash]||"#daily-reading"));</script></body></html>\n';
await writeFile(path.join(root,'informs-2026-teacher.html'),redirect,'utf8');
console.log(`Generated integrated daily program: ${data.sessions.length} slots, ${data.alternatives.length} other sessions, ${data.special_talks.length} talks, ${reading.guides.reduce((n,g)=>n+g.steps.length,0)} lessons.`);
