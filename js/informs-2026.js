(() => {
  'use strict';
  const status = document.getElementById('load-status');
  const storageKey = 'informs2026-session-route-v1';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

  try {
    const data = JSON.parse(document.getElementById('informs-data').textContent);
    const byCode = new Map([...data.sessions, ...data.alternatives].map(s => [s.code, s]));
    const talks = data.special_talks || [];
    const groupId = talk => `${talk.date}_${talk.start.replace(':', '')}_${talk.end.replace(':', '')}`;
    const groups = [...new Map(talks.map(t => [groupId(t), { id: groupId(t), date: t.date, start: t.start, end: t.end }])).values()]
      .map(g => ({ ...g, talks: talks.filter(t => groupId(t) === g.id) }));
    const overlaps = (a, b) => a.date === b.date && a.start < b.end && a.end > b.start;
    const initial = () => ({ day: data.days[0].date, priorityOnly: true, view: 'route', selections: {}, specialSelections: {} });
    let state = initial();
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
      if (saved && typeof saved === 'object') {
        if (data.days.some(day => day.date === saved.day)) state.day = saved.day;
        if (typeof saved.priorityOnly === 'boolean') state.priorityOnly = saved.priorityOnly;
        if (['route', 'table'].includes(saved.view)) state.view = saved.view;
        for (const slot of data.sessions) {
          const selected = saved.selections?.[slot.code];
          if ([slot.code, ...slot.alternative_codes].includes(selected)) state.selections[slot.code] = selected;
        }
        for (const group of groups) {
          const key = saved.specialSelections?.[group.id];
          if (group.talks.some(t => t.key === key)) state.specialSelections[group.id] = key;
        }
      }
    } catch { /* A blocked or invalid store must not prevent the itinerary from opening. */ }

    const isPriority = slot => slot.priority !== '可加聽';
    const selected = slot => byCode.get(state.selections[slot.code] || slot.code);
    const sourcePages = s => s.source_pages.length > 1 ? `${s.source_pages[0]}–${s.source_pages.at(-1)}` : s.source_pages[0];
    const badgeClass = slot => ({ 優先安排: 'badge-priority', 保留: 'badge-reserved', 可加聽: 'badge-optional' }[slot.priority]);
    const chosenTalks = () => groups.flatMap(g => g.talks.filter(t => state.specialSelections[g.id] === t.key));
    const techConflicts = talk => [...data.sessions, ...data.alternatives].filter(s => overlaps(talk, s));
    const label = event => event.special ? event.speaker : selected(event.slot).code;
    let displayedEvents = [];
    const openAbstracts = new Set();
    const openPapers = new Set();

    function abstractDetails(item, context) {
      if (!item.abstract?.summary_zh) return '';
      const abstract = item.abstract;
      const instance = `${context}-${item.key || item.code}`;
      const paragraphs = abstract.summary_zh.split(/\n+/).filter(Boolean).map(text => `<p>${escape(text)}</p>`).join('');
      const url = abstract.source_url;
      const source = typeof url === 'string' && url.startsWith('https://') ? `<a href="${escape(url)}" target="_blank" rel="noopener noreferrer">查看來源 ↗</a>` : '';
      return `<details class="event-abstract" data-abstract-instance="${instance}"${openAbstracts.has(instance) ? ' open' : ''}><summary aria-label="查看 ${escape(item.speaker || item.code)} 的摘要">摘要</summary><div class="abstract-body" lang="zh-Hant"><p class="abstract-meta">${escape(abstract.summary_label || '中文重點整理')}</p>${paragraphs}<p class="abstract-source">${escape(abstract.abstract_version_note || '')}${source ? ' · ' + source : ''}</p></div></details>`;
    }

    function paperList(session, context, collapsed = false) {
      if (!session.papers?.length) return '';
      const heading = `論文題目與作者（${session.papers.length}）`;
      const papers = session.papers.map(paper => {
        const instance = `${context}-${session.code}-${paper.key}`;
        const paragraphs = paper.summary_zh.split(/\n+/).filter(Boolean).map(text => `<p>${escape(text)}</p>`).join('');
        const source = paper.source_url?.startsWith('https://') ? `<a href="${escape(paper.source_url)}" target="_blank" rel="noopener noreferrer">查看來源 ↗</a>` : '';
        const authorSource = paper.authors_source_url?.startsWith('https://') ? ` · <a href="${escape(paper.authors_source_url)}" target="_blank" rel="noopener noreferrer">作者資料 ↗</a>` : '';
        return `<details class="paper-item" data-paper-instance="${instance}" data-paper-key="${paper.key}" data-session-code="${session.code}"${openPapers.has(instance) ? ' open' : ''}><summary class="paper-summary"><span class="paper-heading"><span class="paper-number">${paper.number}.</span> <span class="paper-title" lang="en">${escape(paper.title)}</span></span><span class="paper-authors"><span>作者：</span><span lang="en">${escape(paper.authors.join('; '))}</span></span></summary><div class="abstract-body paper-abstract" lang="zh-Hant"><p class="abstract-meta">${escape(paper.summary_label)}</p>${paragraphs}<p class="abstract-source">${escape(paper.source_note)}${source ? ' · ' + source : ''}${authorSource}</p></div></details>`;
      }).join('');
      return collapsed ? `<details class="paper-list-disclosure"><summary>${heading}</summary><div class="paper-items">${papers}</div></details>` : `<section class="session-papers" aria-label="${session.code} ${heading}"><h4>${heading}</h4><div class="paper-items">${papers}</div></section>`;
    }

    function eventConflicts(event) {
      return displayedEvents.filter(other => other !== event && overlaps(event, other));
    }

    function specialOptions(day) {
      return groups.filter(g => g.date === day.date).sort((a, b) => a.start.localeCompare(b.start)).map(group => {
        const chosen = state.specialSelections[group.id] || '';
        const mutual = group.talks.length > 1;
        const options = group.talks.map(t => {
          const conflicts = techConflicts(t);
          return `<div class="special-option-card"><label class="special-option"><input type="radio" name="special-${group.id}" data-special-group="${group.id}" value="${t.key}"${chosen === t.key ? ' checked' : ''}><span><strong class="talk-speaker">${escape(t.speaker)}</strong><span class="talk-title" lang="en">${escape(t.title)}</span><span class="talk-location">${escape(t.kind)} · ${escape(t.room_short || '教室待官方確認')}${t.floor ? ' · ' + escape(t.floor) : ''}</span><span class="talk-status">${conflicts.length ? '與技術場次 ' + escape(conflicts.map(s => s.code).join('、')) + ' 撞場' : '與表列技術場次無時間重疊'} · ${t.room ? '教室待複核' : '尚無可核教室'}</span></span></label>${abstractDetails(t, 'option')}</div>`;
        }).join('');
        return `<div class="special-slot" data-group="${group.id}"><div class="special-slot-heading"><h4>${escape(group.start)}–${escape(group.end)}</h4><span class="${mutual ? 'conflict-badge' : 'no-conflict'}">${mutual ? group.talks.length + ' 場同時段互撞，需擇一' : '本時段 1 場演講'}</span></div><div class="special-options"><fieldset><legend class="sr-only">${escape(group.start)}演講，擇一加入路線</legend><label class="special-option special-skip"><input type="radio" name="special-${group.id}" data-special-group="${group.id}" value=""${chosen ? '' : ' checked'}><span>不加入此時段演講</span></label>${options}</fieldset></div></div>`;
      }).join('');
    }

    function specialCard(event) {
      const clashes = eventConflicts(event);
      return `<article class="session-card special-card" id="special-card-${event.key}" data-special-key="${event.key}"><div class="session-time"><time datetime="${event.date}T${event.start}:00-08:00">${escape(event.start)}</time><span>— ${escape(event.end)}</span></div><div class="session-content"><div class="session-topline"><span class="badge badge-special">${escape(event.type)}</span>${clashes.length ? '<span class="conflict-badge">與 ' + escape(clashes.map(label).join('、')) + ' 撞場</span>' : '<span class="no-conflict">與已選行程無時間重疊</span>'}</div><h3 class="session-title" lang="en">${escape(event.title)}</h3><p><strong>${escape(event.speaker)}</strong> · ${escape(event.kind)}</p><p class="session-location">${escape(event.room_short || '教室待官方確認')}${event.floor ? ' · ' + escape(event.floor) : ''}</p>${abstractDetails(event, 'card')}<p class="source-pages">${event.source_pages.length ? '書冊第 ' + escape(sourcePages(event)) + ' 頁 · 教室待複核' : '教室尚無可核資料'} · 題名與時間依10/27官方演講頁</p></div></article>`;
    }

    function save() {
      try {
        localStorage.setItem(storageKey, JSON.stringify(state));
        return true;
      } catch {
        return false;
      }
    }

    function choiceList(slot, context) {
      if (!slot.alternative_codes.length) return '';
      const choices = [slot.code, ...slot.alternative_codes].map(code => {
        const option = byCode.get(code);
        const checked = selected(slot).code === code ? ' checked' : '';
        return `<div class="session-choice-item"><label class="session-choice"><input type="radio" name="${context}-${slot.code}" value="${escape(code)}" data-slot="${slot.code}"${checked}><span><strong>${escape(code)}${code === slot.code ? ' · 原建議' : ''}</strong> ${escape(option.title)}<small>${escape(option.room_short)} · ${escape(option.floor)}</small></span></label>${abstractDetails(option, `${context}-alternative-${slot.code}`)}${paperList(option, `${context}-alternative-${slot.code}`, true)}</div>`;
      }).join('');
      return `<details class="session-alternatives"><summary>同時段備選（${slot.alternative_codes.length}）</summary><div class="choice-list"><fieldset><legend class="sr-only">${escape(slot.start)}至${escape(slot.end)}，只選一場</legend>${choices}</fieldset><p>${escape(slot.selection_note)}</p></div></details>`;
    }

    function badges(slot, session) {
      const clashes = chosenTalks().filter(t => overlaps(t, session));
      return `<span class="badge ${badgeClass(slot)}">${escape(slot.priority)}</span>${session.key_session ? '<span class="badge badge-core">優先留意</span>' : ''}${session.code !== slot.code ? '<span class="badge">已改選備選</span>' : ''}${clashes.length ? '<span class="conflict-badge">與 ' + escape(clashes.map(t => t.speaker).join('、')) + ' 撞場</span>' : ''}`;
    }

    function question(slot, session) {
      if (session.question) return session.question;
      if (session.code !== slot.code) return slot.selection_note;
      if (slot.priority === '保留') return '保留整場；不由論文順序推算個別報告時間。';
      return '';
    }

    function card(slot) {
      const s = selected(slot);
      const prompt = question(slot, s);
      return `<article class="session-card" id="session-card-${slot.code}" data-code="${escape(s.code)}">
        <div class="session-time"><time datetime="${s.date}T${s.start}:00-08:00">${escape(s.start)}</time><span>— ${escape(s.end)}</span></div>
        <div class="session-content"><div class="session-topline"><strong class="session-code">${escape(s.code)}</strong>${badges(slot, s)}</div>
        <h3 class="session-title" lang="en">${escape(s.title)}</h3>
        <p class="session-location">${escape(s.room_short)} <span>· ${escape(s.floor)}</span></p>
        ${prompt ? `<p class="session-question">${escape(prompt)}</p>` : ''}
        ${abstractDetails(s, 'card')}
        ${paperList(s, 'card')}
        ${choiceList(slot, 'card')}
        <p class="source-pages">書冊第 ${escape(sourcePages(s))} 頁 · 教室待官方複核</p></div>
      </article>`;
    }

    function table(events, day) {
      const rows = events.map(event => {
        if (event.special) {
          const clashes = eventConflicts(event);
          return `<tr class="special-table-row" data-special-key="${event.key}"><td data-label="時間"><div class="cell-content table-time">${escape(event.start)}–${escape(event.end)}</div></td><td data-label="場次"><div class="cell-content"><span class="badge badge-special">${escape(event.type)}</span><strong>${escape(event.speaker)}</strong><p class="session-title" lang="en">${escape(event.title)}</p></div></td><td data-label="教室"><div class="cell-content"><strong>${escape(event.room_short || '教室待官方確認')}</strong>${event.floor ? '<br>' + escape(event.floor) : ''}<br><small>教室待複核</small></div></td><td data-label="重點與備選"><div class="cell-content">${escape(event.kind)}<p class="${clashes.length ? 'conflict-badge' : 'no-conflict'}">${clashes.length ? '與 ' + escape(clashes.map(label).join('、')) + ' 撞場' : '與已選行程無時間重疊'}</p>${abstractDetails(event, 'table')}</div></td></tr>`;
        }
        const slot = event.slot;
        const s = selected(slot);
        const prompt = question(slot, s);
        return `<tr id="table-row-${slot.code}" data-code="${escape(s.code)}"><td data-label="時間"><div class="cell-content table-time">${escape(s.start)}–${escape(s.end)}</div></td><td data-label="場次"><div class="cell-content"><div class="session-topline"><strong class="session-code">${escape(s.code)}</strong>${badges(slot, s)}</div><p class="session-title" lang="en">${escape(s.title)}</p></div></td><td data-label="教室"><div class="cell-content"><strong>${escape(s.room_short)}</strong><br>${escape(s.floor)}<br><small>教室待複核</small></div></td><td data-label="重點與備選"><div class="cell-content">${prompt ? `<p>${escape(prompt)}</p>` : ''}${abstractDetails(s, 'table')}${paperList(s, 'table')}${choiceList(slot, 'table')}<p class="source-pages">書冊第 ${escape(sourcePages(s))} 頁</p></div></td></tr>`;
      }).join('');
      return `<div class="table-wrap"><table class="schedule-table"><caption>${escape(day.label)}的目前安排 · 舊金山當地時間</caption><thead><tr><th scope="col">時間</th><th scope="col">場次</th><th scope="col">教室</th><th scope="col">重點與備選</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    }

    function render() {
      const day = data.days.find(d => d.date === state.day);
      const daySlots = data.sessions.filter(s => s.date === state.day);
      const slots = daySlots.filter(s => !state.priorityOnly || isPriority(s));
      const specials = chosenTalks().filter(t => t.date === state.day);
      displayedEvents = [...slots.map(slot => ({ date: slot.date, start: slot.start, end: slot.end, slot })), ...specials.map(t => ({ ...t, special: true }))].sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end));
      document.getElementById('day-tabs').innerHTML = data.days.map(d => `<button type="button" class="day-tab" data-day="${d.date}" aria-pressed="${d.date === state.day}" aria-label="${escape(d.label)}">${escape(d.label.replace(/（(.)）/, ' $1'))}</button>`).join('');
      document.getElementById('priority-only').checked = state.priorityOnly;
      for (const button of document.querySelectorAll('[data-view]')) button.setAttribute('aria-pressed', String(button.dataset.view === state.view));
      document.getElementById('day-title').textContent = day.label;
      document.getElementById('day-theme').textContent = day.theme;
      document.getElementById('day-count').textContent = `${slots.length} 場技術場次 · ${specials.length} 場演講已加入`;
      document.getElementById('route-stops').innerHTML = displayedEvents.map(event => {
        if (event.special) return `<li class="route-stop special-stop" data-special-key="${event.key}"><span class="stop-code">${escape(event.type)}</span><strong class="stop-room">${escape(event.room_short || '教室待官方確認')}</strong><span class="stop-floor">${escape(event.floor || '尚無可核教室')}</span><span class="stop-speaker">${escape(event.speaker)}</span></li>`;
        const slot = event.slot;
        const s = selected(slot);
        return `<li class="route-stop" data-code="${escape(s.code)}"><span class="stop-code">${escape(s.code)}</span><strong class="stop-room">${escape(s.room_short)}</strong><span class="stop-floor">${escape(s.floor)}</span></li>`;
      }).join('');
      document.getElementById('timeline').innerHTML = displayedEvents.map(e => e.special ? specialCard(e) : card(e.slot)).join('');
      document.getElementById('table-view').innerHTML = table(displayedEvents, day);
      const specialRoot = document.getElementById('special-options');
      if (specialRoot) specialRoot.innerHTML = specialOptions(day);
      const specialCount = document.getElementById('special-count');
      if (specialCount) specialCount.textContent = `${talks.filter(t => t.date === state.day).length} 場可選 · ${specials.length} 場已加入路線`;
      const conflicts = [];
      for (let i = 0; i < displayedEvents.length; i++) for (let j = i + 1; j < displayedEvents.length; j++) if (overlaps(displayedEvents[i], displayedEvents[j])) conflicts.push([displayedEvents[i], displayedEvents[j]]);
      const summary = document.getElementById('conflict-summary');
      if (summary) {
        summary.className = `conflict-summary ${conflicts.length ? 'has-conflict' : 'no-conflict'}`;
        const hasConcurrentOptions = groups.some(g => g.date === state.day && g.talks.length > 1);
        summary.innerHTML = conflicts.length ? `<strong>已選行程有 ${conflicts.length} 組時間重疊</strong><ul class="conflict-list">${conflicts.map(pair => '<li>' + escape(pair.map(label).join(' ↔ ')) + '</li>').join('')}</ul>` : '<strong>目前已選行程沒有時間重疊。</strong><span>' + (hasConcurrentOptions ? ' 晚間同時段 keynote 仍須擇一；下方會列出同時段選項。' : ' 依已選場次的實際起迄時間比較。') + '</span>';
      }
      document.getElementById('timeline').hidden = state.view !== 'route';
      document.getElementById('table-view').hidden = state.view !== 'table';
      status.textContent = `${day.label} · ${slots.length} 場技術場次＋${specials.length} 場演講 · 舊金山當地時間。`;
    }

    document.getElementById('day-tabs').addEventListener('click', event => {
      const button = event.target.closest('[data-day]');
      if (!button) return;
      state.day = button.dataset.day;
      render();
      save();
      document.querySelector(`[data-day="${state.day}"]`).focus({ preventScroll: true });
    });

    for (const button of document.querySelectorAll('[data-view]')) button.addEventListener('click', () => {
      state.view = button.dataset.view;
      render();
      save();
    });

    document.getElementById('priority-only').addEventListener('change', event => {
      state.priorityOnly = event.target.checked;
      render();
      save();
    });

    document.getElementById('interactive-route').addEventListener('toggle', event => {
      const details = event.target;
      if (details.matches?.('details.paper-item')) {
        const instance = details.dataset.paperInstance;
        if (details.open) openPapers.add(instance);
        else openPapers.delete(instance);
        return;
      }
      if (!details.matches?.('details.event-abstract')) return;
      const instance = details.dataset.abstractInstance;
      if (details.open) openAbstracts.add(instance);
      else openAbstracts.delete(instance);
    }, true);

    document.getElementById('interactive-route').addEventListener('change', event => {
      const specialInput = event.target.closest('input[data-special-group]');
      if (specialInput) {
        const group = groups.find(g => g.id === specialInput.dataset.specialGroup);
        if (!group || (specialInput.value && !group.talks.some(t => t.key === specialInput.value))) return;
        const value = specialInput.value;
        state.specialSelections[group.id] = value;
        render();
        save();
        document.querySelector(`input[data-special-group="${group.id}"][value="${value}"]`)?.focus({ preventScroll: true });
        return;
      }
      const input = event.target.closest('input[data-slot]');
      if (!input) return;
      const slot = data.sessions.find(s => s.code === input.dataset.slot);
      if (!slot || ![slot.code, ...slot.alternative_codes].includes(input.value)) return;
      state.selections[slot.code] = input.value;
      render();
      if (!save()) status.textContent += ' 此瀏覽器無法儲存，選擇僅保留在本頁。';
      // Keep the changed choice visible after replacing the rendered controls.
      const container = state.view === 'route' ? document.getElementById('timeline') : document.getElementById('table-view');
      const next = container.querySelector(`input[data-slot="${slot.code}"][value="${state.selections[slot.code]}"]`);
      if (next) {
        next.closest('details').open = true;
        next.focus({ preventScroll: true });
      }
    });

    document.getElementById('reset-route').addEventListener('click', () => {
      state = { ...initial(), day: state.day, view: state.view };
      render();
      save();
      status.textContent += ' 已恢復原建議。';
    });
    document.getElementById('print-day').addEventListener('click', () => window.print());
    render();
    document.getElementById('interactive-route').hidden = false;
    document.getElementById('static-schedule').hidden = true;
  } catch {
    status.textContent = '互動行程無法載入，請使用下方完整表格。';
    document.getElementById('interactive-route').hidden = true;
    document.getElementById('static-schedule').hidden = false;
  }
})();
