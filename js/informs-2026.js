(() => {
  'use strict';

  const storageKey = 'informs2026-session-route-v1';
  const status = document.getElementById('load-status');
  const tabs = document.getElementById('day-tabs');
  const priorityControl = document.getElementById('priority-only');
  const resetControl = document.getElementById('reset-route');
  const printControl = document.getElementById('print-day');
  const days = [...document.querySelectorAll('article.daily-day[data-conference-day]')];
  let storageProblem = '';

  // The static document remains readable when the interactive data or DOM is incomplete.
  try {
    const data = JSON.parse(document.getElementById('informs-data').textContent);
    if (!days.length || !tabs || !priorityControl || !resetControl || !printControl || !status) {
      throw new Error('Missing daily controls');
    }
    const sessions = data.sessions || [];
    const alternatives = data.alternatives || [];
    const talks = data.special_talks || [];
    const byCode = new Map([...sessions, ...alternatives].map(item => [item.code, item]));
    const byTalk = new Map(talks.map(item => [item.key, item]));
    const sessionSlots = new Map(sessions.map(slot => [slot.code, slot]));
    const specialGroupId = talk => `${talk.date}_${talk.start.replace(':', '')}_${talk.end.replace(':', '')}`;
    const specialGroups = new Map();
    for (const talk of talks) {
      const group = specialGroupId(talk);
      if (!specialGroups.has(group)) specialGroups.set(group, []);
      specialGroups.get(group).push(talk);
    }
    const defaultSpecials = () => Object.fromEntries(
      talks.filter(talk => (data.default_special_keys || []).includes(talk.key))
        .map(talk => [specialGroupId(talk), talk.key])
    );
    const defaultState = () => ({
      day: days[0].dataset.conferenceDay,
      priorityOnly: true,
      selections: {},
      specialSelections: defaultSpecials(),
      specialDefaultsVersion: data.special_defaults_version || 0
    });
    let state = defaultState();
    let saved = null;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw !== null) {
        saved = JSON.parse(raw);
        if (!saved || typeof saved !== 'object' || Array.isArray(saved)) throw new Error('Invalid saved state');
      }
    } catch {
      storageProblem = '此瀏覽器的既有選擇無法讀取或儲存；本頁仍可使用，變更不會保存。';
    }
    if (saved && !storageProblem) {
      if (days.some(day => day.dataset.conferenceDay === saved.day)) state.day = saved.day;
      if (typeof saved.priorityOnly === 'boolean') state.priorityOnly = saved.priorityOnly;
      for (const slot of sessions) {
        const valid = [slot.code, ...(slot.alternative_codes || [])];
        const selected = [slot.code, ...(slot.previous_codes || [])]
          .map(code => saved.selections?.[code]).find(code => valid.includes(code));
        if (selected) state.selections[slot.code] = selected;
      }
      // Explicit skips and manual choices always win over updated defaults.
      for (const [group, groupTalks] of specialGroups) {
        const choice = saved.specialSelections?.[group];
        if (choice === '' || groupTalks.some(talk => talk.key === choice)) {
          state.specialSelections[group] = choice;
        }
      }
      state.specialDefaultsVersion = data.special_defaults_version || 0;
    }

    const issuesIn = slot => [...slot.querySelectorAll('details.daily-issue')];
    const currentContainer = slot => slot.querySelector(':scope > .slot-current');
    const otherContainer = slot => slot.querySelector(':scope > details.slot-alternatives .slot-other-issues');
    const inputsIn = (slot, attribute) => [...slot.querySelectorAll(`input[type="radio"][${attribute}]`)];

    function save() {
      if (storageProblem) return false;
      try {
        localStorage.setItem(storageKey, JSON.stringify(state));
        return true;
      } catch {
        storageProblem = '此瀏覽器無法儲存選擇；本頁仍可使用，變更不會保存。';
        return false;
      }
    }

    function selectTechnical(slot) {
      const slotCode = slot.dataset.slot;
      const source = sessionSlots.get(slotCode);
      if (!source) return null;
      const choices = [source.code, ...(source.alternative_codes || [])];
      const issues = issuesIn(slot).filter(issue => issue.dataset.choiceCode);
      let code = state.selections[slotCode] || source.code;
      if (!choices.includes(code) || !issues.some(issue => issue.dataset.choiceCode === code)) code = source.code;
      if (!issues.some(issue => issue.dataset.choiceCode === code)) return null;
      state.selections[slotCode] = code;
      const current = currentContainer(slot);
      const others = otherContainer(slot);
      if (!current) throw new Error(`Missing current container: ${slotCode}`);
      for (const issue of issues) {
        const destination = issue.dataset.choiceCode === code ? current : others;
        if (destination && issue.parentElement !== destination) destination.append(issue);
      }
      for (const input of inputsIn(slot, 'data-slot')) {
        if (input.dataset.slot === slotCode) input.checked = input.value === code;
      }
      return byCode.get(code) || null;
    }

    function selectSpecial(slot) {
      const group = slot.dataset.specialSlot;
      const available = specialGroups.get(group) || [];
      const issues = issuesIn(slot).filter(issue => issue.dataset.talkKey);
      let key = state.specialSelections[group];
      if (key === undefined || (key !== '' && !available.some(talk => talk.key === key))) {
        key = defaultSpecials()[group] || '';
      }
      if (key && !issues.some(issue => issue.dataset.talkKey === key)) key = '';
      state.specialSelections[group] = key;
      const current = currentContainer(slot);
      const others = otherContainer(slot);
      if (!current) throw new Error(`Missing special current container: ${group}`);
      for (const issue of issues) {
        const destination = issue.dataset.talkKey === key ? current : others;
        if (destination && issue.parentElement !== destination) destination.append(issue);
      }
      for (const input of inputsIn(slot, 'data-special-group')) {
        if (input.dataset.specialGroup === group) input.checked = input.value === key;
      }
      for (const empty of slot.querySelectorAll('.slot-empty')) empty.hidden = Boolean(key);
      return key ? byTalk.get(key) || null : null;
    }

    function appendRoute(day, entries) {
      const route = day.querySelector('.daily-route[data-day-route]');
      if (!route) return;
      route.replaceChildren();
      const list = route.tagName === 'OL' || route.tagName === 'UL';
      entries.sort((a, b) => (a.start || '').localeCompare(b.start || '') || (a.end || '').localeCompare(b.end || ''));
      for (const item of entries) {
        const node = document.createElement(list ? 'li' : 'span');
        const label = item.code || item.speaker || item.title || '';
        const location = [item.room_short || item.room, item.floor].filter(Boolean).join(' · ');
        node.textContent = [item.start, label, location].filter(Boolean).join(' · ');
        route.append(node);
      }
      if (!entries.length) {
        const node = document.createElement(list ? 'li' : 'span');
        node.textContent = '目前沒有顯示的場次。';
        route.append(node);
      }
    }

    function render() {
      priorityControl.checked = state.priorityOnly;
      for (const tab of tabs.querySelectorAll('[data-day]')) {
        const active = tab.dataset.day === state.day;
        if (active) tab.setAttribute('aria-current', 'date');
        else tab.removeAttribute('aria-current');
      }
      for (const day of days) {
        day.hidden = day.dataset.conferenceDay !== state.day;
        const entries = [];
        for (const slot of day.querySelectorAll('.daily-slot[data-slot]')) {
          if (slot.hasAttribute('data-special-slot')) continue;
          const selected = selectTechnical(slot);
          slot.hidden = state.priorityOnly && slot.dataset.priority === 'optional';
          if (!slot.hidden && selected) entries.push(selected);
        }
        for (const slot of day.querySelectorAll('.daily-slot[data-special-slot]')) {
          const selected = selectSpecial(slot);
          slot.hidden = state.priorityOnly && slot.dataset.priority === 'optional';
          if (!slot.hidden && selected) entries.push(selected);
        }
        appendRoute(day, entries);
      }
      const day = days.find(item => item.dataset.conferenceDay === state.day);
      const visible = day ? [...day.querySelectorAll('.daily-slot')].filter(slot => !slot.hidden) : [];
      const technical = visible.filter(slot => slot.hasAttribute('data-slot') && !slot.hasAttribute('data-special-slot')).length;
      const special = visible.filter(slot => slot.hasAttribute('data-special-slot') && Boolean(state.specialSelections[slot.dataset.specialSlot])).length;
      status.textContent = `${state.day} · ${technical} 場技術場次、${special} 場演講 · 舊金山當地時間。${storageProblem ? ' ' + storageProblem : ''}`;
    }

    function revealHash() {
      if (!window.location.hash) return;
      let id;
      try { id = decodeURIComponent(window.location.hash.slice(1)); } catch { return; }
      const target = document.getElementById(id);
      if (!target) return;
      const day = target.closest('article.daily-day[data-conference-day]');
      const slot = target.closest('.daily-slot');
      if (day) state.day = day.dataset.conferenceDay;
      if (slot?.dataset.priority === 'optional' && state.priorityOnly) state.priorityOnly = false;
      render();
      let element = target;
      while (element) {
        if (element.tagName === 'DETAILS') element.open = true;
        element = element.parentElement;
      }
      target.scrollIntoView?.({ block: 'start' });
    }

    tabs.addEventListener('click', event => {
      const tab = event.target.closest('[data-day]');
      if (!tab || !tabs.contains(tab) || !days.some(day => day.dataset.conferenceDay === tab.dataset.day)) return;
      event.preventDefault();
      state.day = tab.dataset.day;
      if (tab.hash) history.pushState(null, '', tab.hash);
      render();
      if (!save()) render();
      days.find(day => day.dataset.conferenceDay === state.day)?.scrollIntoView({ block: 'start' });
      tab.focus({ preventScroll: true });
    });
    priorityControl.addEventListener('change', () => {
      state.priorityOnly = priorityControl.checked;
      render();
      if (!save()) render();
    });
    document.addEventListener('change', event => {
      const input = event.target;
      if (!input.matches?.('input[type="radio"]')) return;
      if (input.hasAttribute('data-special-group')) {
        const group = input.dataset.specialGroup;
        const slot = input.closest('.daily-slot[data-special-slot]');
        if (!slot || slot.dataset.specialSlot !== group) return;
        if (input.value !== '' && !(specialGroups.get(group) || []).some(talk => talk.key === input.value)) return;
        state.specialSelections[group] = input.value;
      } else if (input.hasAttribute('data-slot')) {
        const code = input.dataset.slot;
        const slot = input.closest('.daily-slot[data-slot]');
        const source = sessionSlots.get(code);
        if (!slot || slot.dataset.slot !== code || !source || ![source.code, ...(source.alternative_codes || [])].includes(input.value)) return;
        state.selections[code] = input.value;
      } else return;
      render();
      if (!save()) render();
    });
    resetControl.addEventListener('click', () => {
      const day = state.day;
      state = defaultState();
      state.day = day;
      render();
      if (!save()) render();
    });
    printControl.addEventListener('click', () => window.print());
    window.addEventListener('hashchange', () => { revealHash(); if (!save()) render(); });

    let printOpenStates = null;
    window.addEventListener('beforeprint', () => {
      if (printOpenStates) return;
      printOpenStates = new Map();
      const day = days.find(item => item.dataset.conferenceDay === state.day);
      if (!day) return;
      for (const slot of day.querySelectorAll('.daily-slot')) {
        if (slot.hidden) continue;
        const current = currentContainer(slot);
        if (!current) continue;
        const details = [...current.querySelectorAll('details')];
        for (let parent = current.parentElement; parent && parent !== day; parent = parent.parentElement) {
          if (parent.tagName === 'DETAILS') details.push(parent);
        }
        for (const detail of details) {
          if (!printOpenStates.has(detail)) printOpenStates.set(detail, detail.open);
          detail.open = true;
        }
      }
    });
    window.addEventListener('afterprint', () => {
      if (!printOpenStates) return;
      for (const [detail, wasOpen] of printOpenStates) detail.open = wasOpen;
      printOpenStates = null;
    });

    render();
    document.body.classList.add('has-daily-js');
    if (window.location.hash) revealHash();
  } catch {
    document.body.classList.remove('has-daily-js');
    for (const day of days) day.hidden = false;
    if (status) status.textContent = '互動功能暫時無法載入，仍可閱讀下方完整內容。';
  }
})();
