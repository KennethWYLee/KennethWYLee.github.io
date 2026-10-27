(() => {
  'use strict';
  const status = document.getElementById('load-status');
  const storageKey = 'informs2026-session-route-v1';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

  try {
    const data = JSON.parse(document.getElementById('informs-data').textContent);
    const byCode = new Map([...data.sessions, ...data.alternatives].map(s => [s.code, s]));
    const initial = () => ({ day: data.days[0].date, priorityOnly: true, view: 'route', selections: {} });
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
      }
    } catch { /* A blocked or invalid store must not prevent the itinerary from opening. */ }

    const isPriority = slot => slot.priority !== '可加聽';
    const selected = slot => byCode.get(state.selections[slot.code] || slot.code);
    const sourcePages = s => s.source_pages.length > 1 ? `${s.source_pages[0]}–${s.source_pages.at(-1)}` : s.source_pages[0];
    const badgeClass = slot => ({ 優先安排: 'badge-priority', 保留: 'badge-reserved', 可加聽: 'badge-optional' }[slot.priority]);

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
        return `<label class="session-choice"><input type="radio" name="${context}-${slot.code}" value="${escape(code)}" data-slot="${slot.code}"${checked}><span><strong>${escape(code)}${code === slot.code ? ' · 原建議' : ''}</strong> ${escape(option.title)}<small>${escape(option.room_short)} · ${escape(option.floor)}</small></span></label>`;
      }).join('');
      return `<details class="session-alternatives"><summary>同時段備選（${slot.alternative_codes.length}）</summary><div class="choice-list"><fieldset><legend class="sr-only">${escape(slot.start)}至${escape(slot.end)}，只選一場</legend>${choices}</fieldset><p>${escape(slot.selection_note)}</p></div></details>`;
    }

    function badges(slot, session) {
      return `<span class="badge ${badgeClass(slot)}">${escape(slot.priority)}</span>${session.key_session ? '<span class="badge badge-core">優先留意</span>' : ''}${session.code !== slot.code ? '<span class="badge">已改選備選</span>' : ''}`;
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
        ${choiceList(slot, 'card')}
        <p class="source-pages">書冊第 ${escape(sourcePages(s))} 頁 · 教室待官方複核</p></div>
      </article>`;
    }

    function table(slots, day) {
      const rows = slots.map(slot => {
        const s = selected(slot);
        const prompt = question(slot, s);
        return `<tr id="table-row-${slot.code}" data-code="${escape(s.code)}"><td data-label="時間"><div class="cell-content table-time">${escape(s.start)}–${escape(s.end)}</div></td><td data-label="場次"><div class="cell-content"><div class="session-topline"><strong class="session-code">${escape(s.code)}</strong>${badges(slot, s)}</div><p class="session-title" lang="en">${escape(s.title)}</p></div></td><td data-label="教室"><div class="cell-content"><strong>${escape(s.room_short)}</strong><br>${escape(s.floor)}<br><small>教室待複核</small></div></td><td data-label="重點與備選"><div class="cell-content">${prompt ? `<p>${escape(prompt)}</p>` : ''}${choiceList(slot, 'table')}<p class="source-pages">書冊第 ${escape(sourcePages(s))} 頁</p></div></td></tr>`;
      }).join('');
      return `<div class="table-wrap"><table class="schedule-table"><caption>${escape(day.label)}的目前安排 · 舊金山當地時間</caption><thead><tr><th scope="col">時間</th><th scope="col">場次</th><th scope="col">教室</th><th scope="col">重點與備選</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    }

    function render() {
      const day = data.days.find(d => d.date === state.day);
      const daySlots = data.sessions.filter(s => s.date === state.day);
      const slots = daySlots.filter(s => !state.priorityOnly || isPriority(s));
      document.getElementById('day-tabs').innerHTML = data.days.map(d => `<button type="button" class="day-tab" data-day="${d.date}" aria-pressed="${d.date === state.day}" aria-label="${escape(d.label)}">${escape(d.label.replace(/（(.)）/, ' $1'))}</button>`).join('');
      document.getElementById('priority-only').checked = state.priorityOnly;
      for (const button of document.querySelectorAll('[data-view]')) button.setAttribute('aria-pressed', String(button.dataset.view === state.view));
      document.getElementById('day-title').textContent = day.label;
      document.getElementById('day-theme').textContent = day.theme;
      document.getElementById('day-count').textContent = `${slots.length} 場已顯示 · 當天共 ${daySlots.length} 個建議時段`;
      document.getElementById('route-stops').innerHTML = slots.map(slot => {
        const s = selected(slot);
        return `<li class="route-stop" data-code="${escape(s.code)}"><span class="stop-code">${escape(s.code)}</span><strong class="stop-room">${escape(s.room_short)}</strong><span class="stop-floor">${escape(s.floor)}</span></li>`;
      }).join('');
      document.getElementById('timeline').innerHTML = slots.map(card).join('');
      document.getElementById('table-view').innerHTML = table(slots, day);
      document.getElementById('timeline').hidden = state.view !== 'route';
      document.getElementById('table-view').hidden = state.view !== 'table';
      status.textContent = `${day.label} · ${slots.length} 場 · 時間均為舊金山當地時間。`;
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

    document.getElementById('interactive-route').addEventListener('change', event => {
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
