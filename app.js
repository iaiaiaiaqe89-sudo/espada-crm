'use strict';
/* Эспада CRM — приложение для менеджеров. Без сборки и зависимостей. */

/* ============================== Утилиты ============================== */

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const p2 = (n) => String(n).padStart(2, '0');
const dStr = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
const dtStr = (d) => `${dStr(d)}T${p2(d.getHours())}:${p2(d.getMinutes())}`;
const parseD = (s) => {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  const [hh, mm] = s.length > 10 ? s.slice(11, 16).split(':').map(Number) : [0, 0];
  return new Date(y, m - 1, d, hh, mm);
};
const todayS = () => dStr(new Date());
const nowS = () => dtStr(new Date());
const addDays = (s, n) => { const d = parseD(s); d.setDate(d.getDate() + n); return dStr(d); };
const MON = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const MONF = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
const WDF = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

function dayLabel(s) {
  if (!s) return '';
  const t = todayS();
  if (s === t) return 'сегодня';
  if (s === addDays(t, 1)) return 'завтра';
  if (s === addDays(t, -1)) return 'вчера';
  const d = parseD(s);
  return `${WD[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]}`;
}
function dueLabel(due) {
  if (!due) return 'без срока';
  const day = due.slice(0, 10), time = due.slice(11, 16);
  return day === todayS() ? time : `${dayLabel(day)}, ${time}`;
}
function ago(dt) {
  if (!dt) return '';
  const m = Math.round((Date.now() - parseD(dt).getTime()) / 60000);
  if (m < 2) return 'только что';
  if (m < 60) return `${m} мин`;
  if (m < 60 * 24) return `${Math.round(m / 60)} ч`;
  return `${Math.round(m / 1440)} дн`;
}
/** «25.11.2026» → «25 ноября» */
function ruDate(s) {
  const m = String(s || '').match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  return m ? `${Number(m[1])} ${MONF[Number(m[2]) - 1]}` : s || '';
}
function normPhone(p) {
  let d = String(p || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2); // 00996… → 996…
  if (d.length === 13 && d.startsWith('0996')) d = d.slice(1); // 0996… → 996…
  if (d.length === 10 && d[0] === '0') d = '996' + d.slice(1);
  else if (d.length === 9) d = '996' + d;
  return d;
}
function prettyPhone(p) {
  const d = normPhone(p);
  if (d.length === 12 && d.startsWith('996')) {
    const l = '0' + d.slice(3);
    return `${l.slice(0, 4)} ${l.slice(4, 7)} ${l.slice(7)}`;
  }
  return String(p || '').replace(/[\u200e\u200f\u202a-\u202e]/g, '').trim();
}
const waUrl = (p, text) => {
  const d = normPhone(p);
  return d.length >= 11 ? `https://wa.me/${d}${text ? '?text=' + encodeURIComponent(text) : ''}` : '';
};
const telUrl = (p) => { const d = normPhone(p); return d.length >= 11 ? 'tel:+' + d : ''; };
const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* приватный режим */ } };

/* ============================== Иконки ============================== */

const ICONS = {
  today: '<rect x="3.5" y="4.5" width="17" height="16" rx="3"/><path d="M8 2.8v3.4M16 2.8v3.4M3.5 9.5h17M8.6 14.6l2.2 2.2 4.6-4.6"/>',
  board: '<rect x="3.5" y="4" width="5" height="16" rx="1.6"/><rect x="9.5" y="4" width="5" height="11" rx="1.6"/><rect x="15.5" y="4" width="5" height="7" rx="1.6"/>',
  tasks: '<path d="M10 6h10M10 12h10M10 18h10"/><path d="M3.6 6.2l1.4 1.4L7.6 5M3.6 12.2l1.4 1.4 2.6-2.6M3.6 18.2l1.4 1.4 2.6-2.6"/>',
  more: '<circle cx="5.5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="18.5" cy="12" r="1.6"/>',
  refresh: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.6 4.2v4.6H15"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
  wa: '<path d="M4.2 19.8l1.2-3.6A8.2 8.2 0 1 1 8.2 19z"/><path d="M9.4 8.6c-.3 2.9 3 6.3 6 6l.7-1.6-1.8-.9-.9.8c-1-.4-1.9-1.3-2.3-2.3l.8-.9-.9-1.8z"/>',
  phone: '<path d="M5.2 4h3.2l1.6 4-2 1.3a10.5 10.5 0 0 0 6.7 6.7l1.3-2 4 1.6v3.2a1.6 1.6 0 0 1-1.7 1.6A16.2 16.2 0 0 1 3.6 5.7 1.6 1.6 0 0 1 5.2 4z"/>',
  task: '<rect x="5" y="4" width="14" height="17" rx="2.5"/><path d="M9 4.5V3h6v1.5M8.5 11h7M8.5 15h4"/>',
  trial: '<rect x="3.5" y="4.5" width="17" height="16" rx="3"/><path d="M8 2.8v3.4M16 2.8v3.4M3.5 9.5h17M12 12.5v5M9.5 15h5"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  check: '<path d="M5 12.5l4.2 4.2L19 7"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  send: '<path d="M21 3.5L3 10.8l6.8 2.5L12.3 20z"/><path d="M9.8 13.3L21 3.5"/>',
  table: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M3.5 9.5h17M3.5 14.5h17M9.5 9.5v10"/>',
  user: '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5"/>',
};
const ic = (n, sw = 1.9) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;

/* ============================== Константы ============================== */

const STAGES = ['Новый', 'В диалоге', 'Пробный', 'После пробного', 'Записался', 'Отказ'];
const ACTIVE = STAGES.slice(0, 4);
const STAGE_CLS = { 'Новый': 's-new', 'В диалоге': 's-talk', 'Пробный': 's-trial', 'После пробного': 's-after', 'Записался': 's-won', 'Отказ': 's-lost' };
const RESULTS = ['Записался', 'Думает', 'Перенос', 'Не пришёл', 'Отказ'];
const GRADES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];
const TASK_IDEAS = ['Позвонить', 'Написать в WhatsApp', 'Напомнить об оплате', 'Отправить расписание', 'Назначить пробный'];

/* ============================== Доступ ============================== */

const CFG = (() => {
  const h = new URLSearchParams(location.hash.slice(1));
  let api = h.get('api'), key = h.get('k');
  if (h.has('demo')) lsSet('espada-demo', '1');
  if (api && key) {
    lsSet('espada-auth', JSON.stringify({ api, key }));
    lsSet('espada-demo', null);
  } else {
    try { ({ api, key } = JSON.parse(lsGet('espada-auth') || '{}')); } catch { /* пусто */ }
  }
  return { api, key, demo: lsGet('espada-demo') === '1' };
})();

async function call(action, payload = {}) {
  if (CFG.demo) return Demo.call(action, payload);
  let res;
  try {
    res = await fetch(CFG.api, { method: 'POST', body: JSON.stringify({ ...payload, action, token: CFG.key }) });
  } catch {
    throw new Error('Нет связи с сервером. Проверьте интернет.');
  }
  if (!res.ok) throw new Error(`Сервер ответил ошибкой (${res.status})`);
  const j = await res.json();
  if (!j.ok) {
    if (j.error === 'AUTH') { lsSet('espada-auth', null); throw new Error('Ссылка недействительна. Откройте свою персональную ссылку ещё раз.'); }
    throw new Error(j.error);
  }
  return j.data;
}

/* ============================== Состояние ============================== */

const S = {
  d: null,
  view: lsGet('espada-view') || 'today',
  stage: 'Новый',
  mine: false,
  allTasks: false,
  q: '',
  busy: 0,
  loadedAt: 0,
  slots: {},
};
const cacheKey = () => 'espada-cache-' + (CFG.demo ? 'demo' : (CFG.key || '').slice(0, 6));

function upsert(list, item, k) {
  const i = list.findIndex((x) => x[k] === item[k]);
  if (i >= 0) list[i] = { ...list[i], ...item }; else list.push(item);
}
function merge(r) {
  if (!r || !S.d) return;
  (r.leads || []).forEach((l) => upsert(S.d.leads, l, 'id'));
  (r.tasks || []).forEach((t) => upsert(S.d.tasks, t, 'id'));
  (r.trials || []).forEach((t) => upsert(S.d.trials, t, 'row'));
  S.d.tasks = S.d.tasks.filter((t) => !String(t.id).startsWith('tmp-'));
  lsSet(cacheKey(), JSON.stringify(S.d));
  render();
  rerenderSheets();
}

async function load(silent) {
  S.busy++; updBusy();
  try {
    const d = await call('bootstrap');
    S.d = d;
    S.loadedAt = Date.now();
    lsSet(cacheKey(), JSON.stringify(d));
    render();
    rerenderSheets();
  } catch (e) {
    if (!S.d) renderFatal(e.message);
    else if (!silent) toast(e.message, { err: true });
  } finally {
    S.busy--; updBusy();
  }
}

/** Изменение на сервере с мгновенным откликом в интерфейсе. */
async function run(action, payload, optimistic) {
  const snap = optimistic ? JSON.stringify(S.d) : null;
  if (optimistic) { optimistic(); render(); rerenderSheets(); }
  S.busy++; updBusy();
  try {
    const r = await call(action, payload);
    merge(r);
    return r;
  } catch (e) {
    if (snap) { S.d = JSON.parse(snap); render(); rerenderSheets(); }
    toast(e.message, { err: true });
    throw e;
  } finally {
    S.busy--; updBusy();
  }
}

/* ============================== Выборки ============================== */

const me = () => S.d.me;
const isMain = () => S.d.me === S.d.main;
const leadById = (id) => S.d.leads.find((l) => l.id === id);
const leadByPhone = (p) => {
  const n = normPhone(p);
  return n.length >= 11 ? S.d.leads.filter((l) => normPhone(l.phone) === n).sort((a, b) => (a.updated < b.updated ? 1 : -1))[0] : null;
};
const byDue = (a, b) => ((a.due || '9') < (b.due || '9') ? -1 : 1);
const openTasks = () => S.d.tasks.filter((t) => !t.done && !t.key);
const myTask = (t) => t.owner === me() || (!t.owner && isMain());
const leadTasks = (id) => openTasks().filter((t) => t.leadId === id).sort(byDue);
const nextTask = (id) => leadTasks(id)[0];
const trialKey = (t) => `trial|${t.date}|${t.time}|${normPhone(t.phone) || t.name}`;
const trialOfLead = (l) => S.d.trials.filter((t) => t.date === l.trialDate && (!l.trialTime || t.time === l.trialTime)
  && normPhone(t.phone) === normPhone(l.phone)).pop();

/** Ключи «напомнили»: ключ → время. */
function dismissed() {
  const m = {};
  S.d.tasks.forEach((t) => { if (t.key && t.done && (!m[t.key] || m[t.key] < t.doneAt)) m[t.key] = t.doneAt || nowS(); });
  return m;
}
function paymentsDue() {
  const m = dismissed();
  const days = Number(S.d.settings['Снова напомнить об оплате через (дней)']) || 3;
  const limit = dtStr(new Date(Date.now() - days * 86400000));
  return S.d.payments.filter((p) => !(m[p.key] && m[p.key] > limit));
}
function trialsToday() {
  const t = todayS(), m = dismissed();
  return S.d.trials.filter((x) => x.date === t && x.result !== 'Перенос' && x.result !== 'Отказ')
    .sort((a, b) => (a.time < b.time ? -1 : 1))
    .map((x) => ({ ...x, reminded: !!m[trialKey(x)] }));
}
function trialsTomorrow() {
  const tm = addDays(todayS(), 1), m = dismissed();
  return S.d.trials.filter((x) => x.date === tm && x.result !== 'Перенос' && x.result !== 'Отказ')
    .sort((a, b) => (a.time < b.time ? -1 : 1))
    .map((x) => ({ ...x, reminded: !!m['eve|' + trialKey(x)] }));
}
function trialsNoResult() {
  const t = todayS(), from = addDays(t, -14);
  return S.d.trials.filter((x) => x.date < t && x.date >= from && !x.result)
    .sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1));
}
function tpl(name, v) {
  const s = S.d.settings['Шаблон: ' + name] || '';
  return s.replace(/\{(имя|дата|время|преподаватель|формат|долг)\}/g, (_, k) => v[k] ?? '');
}
function trialVars(x) {
  const d = parseD(x.date);
  const dl = dayLabel(x.date);
  return {
    'имя': x.name || '', 'время': x.time || '', 'преподаватель': x.teacher || '',
    'формат': (x.format || '').toLowerCase(),
    'дата': dl === 'сегодня' || dl === 'завтра' ? dl : `${d.getDate()} ${MONF[d.getMonth()]} (${WD[d.getDay()]})`,
  };
}

/* ============================== Каркас ============================== */

function render() {
  if (!S.d) return;
  const app = $('#app');
  const views = { today: viewToday, board: viewBoard, tasks: viewTasks, more: viewMore };
  const view = views[S.view] ? S.view : 'today';
  const titles = { today: 'Сегодня', board: 'Лиды', tasks: 'Задачи', more: 'Ещё' };
  const t = todayS(), d = parseD(t);
  const overdue = openTasks().filter((x) => myTask(x) && x.due && x.due < nowS()).length;
  const todayCount = overdue + S.d.leads.filter((l) => l.stage === 'Новый' && (isMain() || l.owner === me())).length;
  const scroll = window.scrollY;
  app.innerHTML = `
    ${CFG.demo ? '<div class="demo-bar">Демо-режим: данные ненастоящие и хранятся только на этом устройстве</div>' : ''}
    <header class="topbar">
      <div style="flex:1;min-width:0">
        <h1>${titles[view]}</h1>
        <div class="sub">${view === 'today' ? `${WDF[d.getDay()]}, ${d.getDate()} ${MONF[d.getMonth()]}` : esc(me())}</div>
      </div>
      <button class="icon-btn ${S.busy ? 'spin' : ''}" id="busy" data-act="refresh" aria-label="Обновить">${ic('refresh')}</button>
    </header>
    <main id="view">${views[view]()}</main>
    ${view === 'more' ? '' : `<button class="fab" data-act="newLead" aria-label="Новый лид">${ic('plus', 2.4)}</button>`}
    <nav class="tabbar">
      ${tabBtn('today', 'Сегодня', todayCount)}${tabBtn('board', 'Лиды')}${tabBtn('tasks', 'Задачи', overdue)}${tabBtn('more', 'Ещё')}
    </nav>`;
  if (S.view === view) window.scrollTo(0, scroll);
  bindBoard();
}
function tabBtn(v, label, badge) {
  const icon = { today: 'today', board: 'board', tasks: 'tasks', more: 'more' }[v];
  return `<button class="tab ${S.view === v ? 'on' : ''}" data-act="tab" data-v="${v}">${ic(icon)}<span>${label}</span>${badge ? `<span class="badge">${badge}</span>` : ''}</button>`;
}
function updBusy() {
  const b = $('#busy');
  if (b) b.classList.toggle('spin', S.busy > 0);
}
function renderFatal(msg) {
  $('#app').innerHTML = `<div class="login"><div class="logo">Э</div><h1>Не удалось загрузить</h1><p>${esc(msg)}</p>
    <button class="btn primary lg" data-act="reload">Попробовать снова</button>
    <p style="margin-top:18px"><button class="btn ghost" data-act="logout">Ввести другую ссылку</button></p></div>`;
}
function renderLogin() {
  $('#app').innerHTML = `<div class="login">
    <div class="logo">Э</div>
    <h1>Эспада CRM</h1>
    <p>Откройте свою персональную ссылку — её присылает администратор. Или вставьте её сюда:</p>
    <input class="input" id="loginLink" placeholder="https://…#api=…&k=…" autocomplete="off" autocapitalize="off">
    <button class="btn primary lg" data-act="login">Войти</button>
    <p style="margin-top:26px"><button class="btn" data-act="demo">Посмотреть демо</button></p>
  </div>`;
}

/* ============================== Экран «Сегодня» ============================== */

function viewToday() {
  const t = todayS(), now = nowS();
  const mine = openTasks().filter(myTask);
  const overdue = mine.filter((x) => x.due && x.due < now).sort(byDue);
  const todays = mine.filter((x) => x.due && x.due >= now && x.due.slice(0, 10) === t).sort(byDue);
  const fresh = S.d.leads.filter((l) => l.stage === 'Новый' && (isMain() || l.owner === me()))
    .sort((a, b) => (a.created < b.created ? -1 : 1));
  const trials = trialsToday();
  const tomorrow = trialsTomorrow();
  const noRes = trialsNoResult();
  const pays = paymentsDue();
  const tLeft = trials.filter((x) => !x.reminded);

  const stats = `<div class="hello">
    <div class="stat ${overdue.length ? 'warn' : ''}"><b>${overdue.length}</b><span>просрочено</span></div>
    <div class="stat"><b>${todays.length}</b><span>задач</span></div>
    <div class="stat"><b>${tLeft.length}</b><span>пробных</span></div>
    <div class="stat"><b>${pays.length}</b><span>оплат</span></div>
  </div>`;

  const sec = (title, count, body, extra = '') =>
    `<section class="section"><div class="section-h"><h2>${title}</h2>${extra}${count != null ? `<span class="count">${count}</span>` : ''}</div>${body}</section>`;

  let left = '', right = '';
  if (fresh.length) left += sec('Новые — ответить', fresh.length, `<div class="list">${fresh.map(freshRow).join('')}</div>`);
  if (overdue.length) left += sec('Просрочено', overdue.length, `<div class="list">${overdue.map(taskRow).join('')}</div>`);
  left += sec('Задачи на сегодня', todays.length || null,
    todays.length ? `<div class="list">${todays.map(taskRow).join('')}</div>`
      : `<div class="list"><div class="empty">${overdue.length ? 'Остальное на сегодня сделано' : 'На сегодня задач нет 🎉'}</div></div>`);
  right += sec('Пробные сегодня', trials.length ? `${trials.length - tLeft.length}/${trials.length} напомнили` : null,
    trials.length ? `<div class="list">${trials.map(trialRow).join('')}</div>` : '<div class="list"><div class="empty">Сегодня пробных нет</div></div>');
  if (tomorrow.length) {
    const left2 = tomorrow.filter((x) => !x.reminded).length;
    right += sec('Пробные завтра — напомнить накануне', `${tomorrow.length - left2}/${tomorrow.length} напомнили`,
      `<div class="list">${tomorrow.map((x) => trialRow(x, 'eve|')).join('')}</div>`);
  }
  if (noRes.length) right += sec('Заполните итог пробного', noRes.length, `<div class="list">${noRes.map(noResRow).join('')}</div>`);
  if (isMain() || pays.length) {
    right += sec('Напомнить об оплате', pays.length || null,
      pays.length ? `<div class="list">${pays.map(payRow).join('')}</div>` : '<div class="list"><div class="empty">Всем напомнили 👍</div></div>');
  }
  return stats + `<div class="today-grid"><div>${left}</div><div>${right}</div></div>`;
}

function freshRow(l) {
  return `<div class="row">
    <div class="main">
      <div class="title tap" data-act="lead" data-id="${esc(l.id)}">${esc(l.name || prettyPhone(l.phone) || 'Без имени')}
        ${l.grade ? `<span class="pill">${esc(l.grade)} кл</span>` : ''}</div>
      <div class="meta">${[l.source, l.name ? prettyPhone(l.phone) : '', 'написал(а) ' + ago(l.created) + ' назад'].filter(Boolean).map(esc).join(' · ')}</div>
      <div class="actions">
        ${waBtn(l.phone, tpl('приветствие', {}), 'Ответить')}
        <button class="btn" data-act="toStage" data-id="${esc(l.id)}" data-v="В диалоге">В диалоге</button>
        <button class="btn" data-act="lead" data-id="${esc(l.id)}">Открыть</button>
      </div>
    </div></div>`;
}
function taskRow(t) {
  const lead = t.leadId ? leadById(t.leadId) : null;
  const late = t.due && t.due < nowS();
  const meta = [];
  if (lead || t.leadName) meta.push(`<a data-act="lead" data-id="${esc(t.leadId)}">${esc(lead ? leadLabel(lead) : t.leadName)}</a>`);
  meta.push(`<span class="pill ${late ? 'red' : ''}">${ic('clock', 2)}${esc(dueLabel(t.due))}</span>`);
  if (t.owner && t.owner !== me()) meta.push(esc(t.owner));
  return `<div class="row ${t.done ? 'done' : ''}">
    <button class="check ${t.done ? 'on' : ''}" data-act="taskDone" data-id="${esc(t.id)}" aria-label="Готово">${ic('check', 3)}</button>
    <div class="main">
      <div class="title tap" data-act="task" data-id="${esc(t.id)}">${esc(t.title)}</div>
      <div class="meta">${meta.join(' · ')}</div>
      ${!t.done && /Базу учеников/.test(t.title) && !(lead && lead.inBase)
        ? `<div class="actions"><button class="btn primary" data-act="enroll" data-lead="${esc(t.leadId)}">Добавить в Базу</button></div>`
        : lead && lead.phone && !t.done ? `<div class="actions">${waBtn(lead.phone)}${telBtn(lead.phone)}</div>` : ''}
    </div></div>`;
}
function trialRow(x, prefix = '') {
  const lead = leadByPhone(x.phone);
  const key = prefix + trialKey(x);
  return `<div class="row ${x.reminded ? 'done' : ''}">
    <div class="time-col">${esc(x.time)}</div>
    <div class="main">
      <div class="title">${lead ? `<a data-act="lead" data-id="${esc(lead.id)}">${esc(x.name || 'без имени')}</a>` : esc(x.name || 'без имени')}
        ${x.grade ? `<span class="pill">${esc(x.grade)} кл</span>` : ''}</div>
      <div class="meta">${[x.teacher, x.format, prettyPhone(x.phone)].filter(Boolean).map(esc).join(' · ')}</div>
      <div class="actions">
        ${x.reminded
          ? `<span class="pill green">${ic('check', 3)} напомнили</span><button class="btn ghost" data-act="undismiss" data-key="${esc(key)}">Отменить</button>`
          : `${waBtn(x.phone, tpl('напоминание о пробном', trialVars(x)), 'Напомнить')}${telBtn(x.phone)}
             <button class="btn ok" data-act="dismiss" data-key="${esc(key)}" data-title="${esc((prefix ? 'Напомнили накануне о пробном: ' : 'Напомнили о пробном: ') + (x.name || prettyPhone(x.phone)))}" data-lead="${esc(lead ? lead.id : '')}">${ic('check', 2.6)}Напомнили</button>`}
      </div>
    </div></div>`;
}
function noResRow(x) {
  return `<div class="row">
    <div class="main">
      <div class="title">${esc(x.name || 'без имени')} ${x.grade ? `<span class="pill">${esc(x.grade)} кл</span>` : ''}</div>
      <div class="meta">${esc(dayLabel(x.date))}, ${esc(x.time)} · ${esc(x.teacher)}${x.phone ? ' · ' + esc(prettyPhone(x.phone)) : ''}</div>
      ${waUrl(x.phone) ? `<div class="actions">${waBtn(x.phone, '', 'Написать')}${telBtn(x.phone)}</div>` : ''}
      <div class="actions">${resultBtns(x)}</div>
    </div></div>`;
}
function resultBtns(x, leadId = '') {
  return RESULTS.map((r) => `<button class="btn ${r === 'Записался' ? 'ok' : r === 'Отказ' ? 'danger' : ''}" data-act="trialRes"
    data-row="${x.row}" data-phone="${esc(x.phone)}" data-lead="${esc(leadId)}" data-v="${esc(r)}">${esc(r)}</button>`).join('');
}
function payRow(p) {
  const debt = p.status === 'Долг';
  const text = debt ? tpl('долг', { 'имя': p.name, 'долг': p.debt }) : tpl('продление', { 'имя': p.name, 'дата': ruDate(p.nextDate) });
  return `<div class="row">
    <div class="main">
      <div class="title">${esc(p.name)} <span class="pill ${debt ? 'red' : 'amber'}">${esc(p.status)}${debt && p.debt ? ' ' + esc(p.debt) : ''}</span></div>
      <div class="meta">${[p.teacher, p.nextDate ? 'оплата ' + ruDate(p.nextDate) : '', prettyPhone(p.phone)].filter(Boolean).map(esc).join(' · ')}</div>
      <div class="actions">
        ${p.phone ? waBtn(p.phone, text, 'Напомнить') + telBtn(p.phone) : '<span class="pill">нет телефона в базе</span>'}
      </div>
      <div class="actions">
        <button class="btn ok" data-act="dismiss" data-key="${esc(p.key)}" data-title="${esc('Напомнили об оплате: ' + p.name + ' (' + p.teacher + ')')}">${ic('check', 2.6)}Напомнили</button>
        <button class="btn primary" data-act="pay" data-key="${esc(p.key)}">Оплатил</button>
      </div>
    </div></div>`;
}
function waBtn(phone, text, label = 'WhatsApp') {
  const u = waUrl(phone, text);
  return u ? `<a class="btn wa" href="${esc(u)}" target="_blank" rel="noopener">${ic('wa', 2)}${esc(label)}</a>` : '';
}
function telBtn(phone) {
  const u = telUrl(phone);
  return u ? `<a class="btn" href="${esc(u)}" aria-label="Позвонить">${ic('phone', 2)}</a>` : '';
}
const leadLabel = (l) => (l.name || prettyPhone(l.phone) || 'Без имени') + (l.grade ? `, ${l.grade} кл` : '');

/* ============================== Канбан ============================== */

function filteredLeads() {
  const q = S.q.trim().toLowerCase();
  const qd = q.replace(/\D/g, '');
  return S.d.leads.filter((l) => {
    if (S.mine && l.owner !== me()) return false;
    if (!q) return true;
    if (qd.length >= 3 && normPhone(l.phone).includes(qd.replace(/^0/, ''))) return true;
    return [l.name, l.contact, l.source, l.comment, l.teacher].join(' ').toLowerCase().includes(q);
  });
}
function stageList(st, leads) {
  const list = leads.filter((l) => l.stage === st);
  if (st === 'Новый') return list.sort((a, b) => (a.created < b.created ? 1 : -1));
  if (st === 'Записался' || st === 'Отказ') return list.sort((a, b) => (a.updated < b.updated ? 1 : -1));
  return list.sort((a, b) => {
    const ta = nextTask(a.id), tb = nextTask(b.id);
    const ka = st === 'Пробный' ? a.trialDate + a.trialTime : (ta && ta.due) || '9';
    const kb = st === 'Пробный' ? b.trialDate + b.trialTime : (tb && tb.due) || '9';
    return ka < kb ? -1 : 1;
  });
}
function viewBoard() {
  return `<div class="toolbar">
      <label class="search">${ic('search')}<input id="q" type="search" placeholder="Имя, телефон, источник" value="${esc(S.q)}" autocomplete="off"></label>
      <button class="toggle ${S.mine ? 'on' : ''}" data-act="mine">Мои</button>
    </div>
    <div id="boardWrap">${boardInner()}</div>
    <p class="hint">Записался и Отказ хранятся здесь 45 дней, дальше — только в таблице «CRM Лиды».</p>`;
}
function boardInner() {
  const leads = filteredLeads();
  const wide = matchMedia('(min-width: 1000px)').matches;
  return `<div class="stage-tabs">${STAGES.map((st) => `<button class="stage-tab ${STAGE_CLS[st]} ${S.stage === st ? 'on' : ''}" data-act="stage" data-v="${esc(st)}">
      <span class="dot"></span>${esc(st)}<span class="n">${leads.filter((l) => l.stage === st).length}</span></button>`).join('')}</div>
    <div class="board">${STAGES.map((st) => {
      const list = stageList(st, leads);
      return `<div class="col ${STAGE_CLS[st]} ${S.stage === st ? 'on' : ''}" data-stage="${esc(st)}">
        <div class="col-h"><span class="dot"></span>${esc(st)}<span class="n">${list.length}</span></div>
        <div class="cards">${list.map((l) => leadCard(l, wide)).join('') || '<div class="empty">Пусто</div>'}</div></div>`;
    }).join('')}</div>`;
}
function leadCard(l, draggable) {
  const nt = nextTask(l.id);
  const active = ACTIVE.includes(l.stage);
  let next = '';
  if (l.stage === 'Пробный' && l.trialDate) {
    const late = l.trialDate < todayS();
    next = `<div class="next ${late ? 'late' : ''}">${ic('trial', 2)}${esc(dayLabel(l.trialDate))}, ${esc(l.trialTime)} · ${esc(l.teacher)}${late ? ' · нужен итог' : ''}</div>`;
  } else if (nt) {
    const late = nt.due && nt.due < nowS();
    next = `<div class="next ${late ? 'late' : ''}">${ic('clock', 2)}${esc(nt.title)} · ${esc(dueLabel(nt.due))}</div>`;
  } else if (l.stage === 'Отказ' && l.lostReason) {
    next = `<div class="next">${esc(l.lostReason)}</div>`;
  } else if (active && l.stage !== 'Новый') {
    next = '<div class="next"><span class="pill amber">нет следующего шага</span></div>';
  }
  return `<div class="card ${STAGE_CLS[l.stage]}" data-act="lead" data-id="${esc(l.id)}" ${draggable ? 'draggable="true"' : ''}>
    <div class="top"><div class="name">${esc(l.name || prettyPhone(l.phone) || 'Без имени')}</div><div class="ago">${esc(ago(l.updated))}</div></div>
    <div class="line">${[l.grade ? l.grade + ' кл' : '', l.format, l.source].filter(Boolean).map((x) => `<span>${esc(x)}</span>`).join('<span>·</span>')}
      ${l.owner && l.owner !== me() ? `<span class="pill">${esc(l.owner)}</span>` : ''}</div>
    ${next}
  </div>`;
}
function bindBoard() {
  const q = $('#q');
  if (q) {
    q.oninput = () => { S.q = q.value; $('#boardWrap').innerHTML = boardInner(); };
  }
}
/* Перетаскивание карточек на компьютере */
document.addEventListener('dragstart', (e) => {
  const c = e.target.closest && e.target.closest('.card[data-id]');
  if (!c) return;
  e.dataTransfer.setData('text/plain', c.dataset.id);
  c.classList.add('dragging');
});
document.addEventListener('dragend', () => $$('.dragging, .col.drop').forEach((x) => x.classList.remove('dragging', 'drop')));
document.addEventListener('dragover', (e) => {
  const col = e.target.closest && e.target.closest('.col[data-stage]');
  if (!col) return;
  e.preventDefault();
  $$('.col.drop').forEach((x) => x !== col && x.classList.remove('drop'));
  col.classList.add('drop');
});
document.addEventListener('drop', (e) => {
  const col = e.target.closest && e.target.closest('.col[data-stage]');
  if (!col) return;
  e.preventDefault();
  col.classList.remove('drop');
  const l = leadById(e.dataTransfer.getData('text/plain'));
  if (l) changeStage(l, col.dataset.stage);
});

function changeStage(l, stage) {
  if (!l || stage === l.stage) return;
  if (stage === 'Пробный') return openBooking(l.id);
  if (stage === 'Отказ') return openLost(l.id);
  run('moveLead', { id: l.id, stage }, () => { l.stage = stage; }).then(() => toast(`${l.name || 'Лид'} → ${stage}`)).catch(() => {});
}

/* ============================== Задачи ============================== */

function viewTasks() {
  const t = todayS(), tm = addDays(t, 1), now = nowS();
  const list = openTasks().filter((x) => S.allTasks || myTask(x));
  const groups = [
    ['Просрочено', list.filter((x) => x.due && x.due < now)],
    ['Сегодня', list.filter((x) => x.due && x.due >= now && x.due.slice(0, 10) === t)],
    ['Завтра', list.filter((x) => x.due && x.due.slice(0, 10) === tm)],
    ['Позже', list.filter((x) => x.due && x.due.slice(0, 10) > tm)],
    ['Без срока', list.filter((x) => !x.due)],
  ];
  const done = S.d.tasks.filter((x) => x.done && !x.key && (S.allTasks || myTask(x)))
    .sort((a, b) => (a.doneAt < b.doneAt ? 1 : -1)).slice(0, 15);
  return `<div class="toolbar">
      <div class="seg" style="flex:1">
        <button class="chip" data-act="allTasks" data-v="0"><span style="${!S.allTasks ? 'background:var(--card);box-shadow:var(--shadow)' : ''}">Мои</span></button>
        <button class="chip" data-act="allTasks" data-v="1"><span style="${S.allTasks ? 'background:var(--card);box-shadow:var(--shadow)' : ''}">Все</span></button>
      </div>
      <button class="toggle" data-act="addTask">+ Задача</button>
    </div>
    ${groups.filter((g) => g[1].length).map(([title, items]) => `<section class="section">
      <div class="section-h"><h2>${title}</h2><span class="count">${items.length}</span></div>
      <div class="list">${items.sort(byDue).map(taskRow).join('')}</div></section>`).join('')
      || '<section class="section"><div class="list"><div class="empty">Открытых задач нет 🎉</div></div></section>'}
    ${done.length ? `<section class="section"><div class="section-h"><h2>Недавно выполнены</h2></div>
      <div class="list">${done.map(taskRow).join('')}</div></section>` : ''}`;
}

/* ============================== Ещё ============================== */

function viewMore() {
  const d = S.d;
  const tg = d.telegram || {};
  const since = dtStr(new Date(Date.now() - 30 * 86400000));
  const recent = d.leads.filter((l) => l.created >= since);
  const withTrial = recent.filter((l) => l.trialDate || ['Пробный', 'После пробного', 'Записался'].includes(l.stage));
  const won = recent.filter((l) => l.stage === 'Записался');
  const lost = recent.filter((l) => l.stage === 'Отказ');
  const bySrc = {};
  recent.forEach((l) => {
    const k = l.source || 'Не указан';
    bySrc[k] = bySrc[k] || { n: 0, t: 0, w: 0 };
    bySrc[k].n++;
    if (withTrial.includes(l)) bySrc[k].t++;
    if (l.stage === 'Записался') bySrc[k].w++;
  });
  const reasons = {};
  lost.forEach((l) => { const k = l.lostReason || 'Не указана'; reasons[k] = (reasons[k] || 0) + 1; });
  const pct = (a, b) => (b ? Math.round((a / b) * 100) + '%' : '—');

  return `
  <section class="section"><div class="list">
    <div class="row"><div class="check on" style="background:var(--accent);border-color:var(--accent)">${ic('user', 2)}</div>
      <div class="main"><div class="title">${esc(d.me)}</div><div class="meta">${isMain() ? 'Главный менеджер: общие напоминания приходят вам' : 'Менеджер'}</div></div></div>
  </div></section>

  <section class="section"><div class="section-h"><h2>Telegram-напоминания</h2></div><div class="list"><div class="row"><div class="main">
    ${tg.linked
      ? `<div class="title">${ic('check', 2.6).replace('<svg', '<svg style="display:inline;width:16px;height:16px;color:var(--green);vertical-align:-2px"')} Подключено</div>
         <div class="meta">Бот присылает задачи в момент срока и план на день в ${esc(d.settings['Утренний план в (час)'] || '9')}:00. Команда /today — план прямо сейчас.</div>`
      : tg.link
        ? `<div class="title">Не подключено</div><div class="meta">Нажмите кнопку, в Telegram нажмите «Старт». Бот ответит в течение 5 минут.</div>
           <div class="actions"><a class="btn primary" href="${esc(tg.link)}" target="_blank" rel="noopener">${ic('send', 2)}Подключить Telegram</a></div>`
        : '<div class="title">Бот ещё не настроен</div><div class="meta">Администратору: добавьте TG_TOKEN и запустите setup() — см. README.</div>'}
  </div></div></div></section>

  <section class="section"><div class="section-h"><h2>Последние 30 дней</h2></div><div class="list">
    <div class="funnel">
      <div><b>${recent.length}</b><span>новых лидов</span></div>
      <div><b>${withTrial.length}</b><span>на пробный · ${pct(withTrial.length, recent.length)}</span></div>
      <div><b>${won.length}</b><span>записались · ${pct(won.length, recent.length)}</span></div>
      <div><b>${lost.length}</b><span>отказ</span></div>
    </div>
    ${Object.keys(bySrc).length ? `<table class="table"><thead><tr><th>Источник</th><th>Лиды</th><th>Пробный</th><th>Записались</th></tr></thead><tbody>
      ${Object.entries(bySrc).sort((a, b) => b[1].n - a[1].n).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${v.n}</td><td>${v.t}</td><td>${v.w} <span style="color:var(--muted)">${pct(v.w, v.n)}</span></td></tr>`).join('')}
    </tbody></table>` : ''}
    ${Object.keys(reasons).length ? `<table class="table"><thead><tr><th>Причины отказа</th><th></th></tr></thead><tbody>
      ${Object.entries(reasons).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${v}</td></tr>`).join('')}</tbody></table>` : ''}
  </div></section>

  <section class="section"><div class="section-h"><h2>Таблицы</h2></div><div class="menu">
    <button data-act="open" data-url="${esc(d.links ? d.links.base : '')}">${ic('table')}<span>База учеников</span></button>
    <button data-act="open" data-url="${esc(d.links ? d.links.sched : '')}">${ic('table')}<span>Расписание, пробные и CRM-листы</span></button>
  </div>
  <p class="hint">Шаблоны сообщений WhatsApp, источники и причины отказа меняются на листе «CRM Настройки» в таблице «Расписание».</p></section>

  <section class="section"><div class="menu">
    <button data-act="refresh">${ic('refresh')}<span>Обновить данные</span><small>${S.loadedAt ? 'обновлено ' + ago(dtStr(new Date(S.loadedAt))) + (ago(dtStr(new Date(S.loadedAt))) === 'только что' ? '' : ' назад') : ''}</small></button>
    ${CFG.demo ? `<button data-act="demoReset">${ic('refresh')}<span>Сбросить демо-данные</span></button>` : ''}
    <button data-act="logout" style="color:var(--red)">${ic('x')}<span>${CFG.demo ? 'Выйти из демо' : 'Выйти'}</span></button>
  </div></section>`;
}

/* ============================== Листы (модальные окна) ============================== */

const stack = [];
function openSheet(build, opts = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap';
  wrap.innerHTML = '<div class="sheet-backdrop"></div><div class="sheet" role="dialog" aria-modal="true"></div>';
  const panel = $('.sheet', wrap);
  const sh = {
    wrap, panel, live: !!opts.live, data: opts.data || {},
    close: () => closeSheet(sh),
    render() { panel.innerHTML = '<div class="grabber"></div>' + build(sh); if (opts.after) opts.after(sh); },
    onClose: opts.onClose,
  };
  $('.sheet-backdrop', wrap).onclick = sh.close;
  $('#sheets').appendChild(wrap);
  stack.push(sh);
  sh.render();
  document.body.style.overflow = 'hidden';
  return sh;
}
function closeSheet(sh) {
  const i = stack.indexOf(sh);
  if (i < 0) return;
  stack.splice(i, 1);
  sh.wrap.classList.add('closing');
  sh.panel.classList.add('closing');
  setTimeout(() => sh.wrap.remove(), 200);
  if (!stack.length) document.body.style.overflow = '';
  if (sh.onClose) sh.onClose();
}
function rerenderSheets() {
  stack.forEach((sh) => {
    if (!sh.live) return;
    const st = sh.panel.scrollTop;
    const kept = $$('textarea[id], input[id]', sh.panel).map((x) => [x.id, x.value]);
    sh.render();
    kept.forEach(([id, v]) => { const x = sh.panel.querySelector('#' + id); if (x) x.value = v; });
    sh.panel.scrollTop = st;
  });
}
const sheetOf = (el) => stack.find((s) => s.wrap.contains(el));
const sheetHead = (title) => `<div class="sheet-h"><h3>${title}</h3><button class="x" data-act="close" aria-label="Закрыть">${ic('x', 2.4)}</button></div>`;

/** Меню выбора. onPick вызывается прямо в обработчике нажатия (важно для открытия WhatsApp на iPhone). */
function pick(title, items) {
  openSheet(() => sheetHead(title) + `<div class="menu">${items.map((it, i) => `<button data-i="${i}" class="${it.cls || ''} ${it.cur ? 'cur' : ''}">
      ${it.dot ? '<span class="dot"></span>' : ''}<span>${esc(it.label)}</span>${it.note ? `<small>${esc(it.note)}</small>` : ''}</button>`).join('')}</div>`, {
    after: (sh) => $$('.menu button', sh.panel).forEach((b) => {
      b.onclick = () => { sh.close(); items[b.dataset.i].onPick(); };
    }),
  });
}

/* ---------- Карточка лида ---------- */

function openLead(id) {
  openSheet(() => leadSheet(id), { live: true });
}
function leadSheet(id) {
  const l = leadById(id);
  if (!l) return sheetHead('Лид') + '<div class="list"><div class="empty">Лид не найден — возможно, он старше 45 дней</div></div>';
  const tasks = leadTasks(id);
  const tr = l.trialDate ? trialOfLead(l) : null;
  const t = todayS();
  let trial = '';
  if (l.trialDate) {
    const vars = trialVars({ ...l, date: l.trialDate, time: l.trialTime });
    trial = `<section class="section"><div class="section-h"><h2>Пробное занятие</h2></div><div class="list"><div class="row">
      <div class="main"><div class="title">${esc(dayLabel(l.trialDate))}, ${esc(l.trialTime)} · ${esc(l.teacher)}</div>
      <div class="meta">${esc(l.format || '')}${l.trialResult ? ` · итог: <b>${esc(l.trialResult)}</b>` : ''}</div>
      <div class="actions">
        ${!l.trialResult && l.trialDate >= t ? waBtn(l.phone, tpl('напоминание о пробном', vars), 'Напомнить') : ''}
        ${!l.trialResult && l.trialDate <= t && tr ? resultBtns(tr, l.id) : ''}
        ${l.trialResult === 'Думает' || l.trialResult === 'Не пришёл' ? waBtn(l.phone, tpl('после пробного', vars), 'Написать') : ''}
        ${ACTIVE.includes(l.stage) ? `<button class="btn" data-act="book" data-id="${esc(l.id)}">${l.trialResult ? 'Новый пробный' : 'Перенести'}</button>` : ''}
      </div></div></div></div></section>`;
  }
  const log = (l.log || '').split('\n').filter(Boolean).reverse()
    .map((x) => esc(x).replace(/^(\d\d\.\d\d \d\d:\d\d)( [^:]{1,30}:)?/, '<b>$1$2</b>')).join('\n');
  return sheetHead('') + `
    <div class="lead-head">
      <div class="nm">${esc(l.name || 'Без имени')}</div>
      <div class="info">
        <button class="pill stage-pill ${STAGE_CLS[l.stage]}" data-act="leadStage" data-id="${esc(l.id)}"><span class="dot"></span>${esc(l.stage)} ▾</button>
        ${[l.grade ? l.grade + ' класс' : '', l.format, l.source].filter(Boolean).map(esc).join(' · ')}
      </div>
    </div>
    <div class="quick">
      <button class="wa" data-act="waLead" data-id="${esc(l.id)}">${ic('wa', 1.8)}WhatsApp</button>
      <button data-act="call" data-phone="${esc(l.phone)}">${ic('phone', 1.8)}Позвонить</button>
      <button data-act="addTask" data-lead="${esc(l.id)}">${ic('task', 1.8)}Задача</button>
      <button data-act="book" data-id="${esc(l.id)}">${ic('trial', 1.8)}Пробный</button>
    </div>
    ${l.stage === 'Записался' && !l.inBase ? `<section class="section"><div class="list"><div class="row"><div class="main">
      <div class="title">Ученик записался 🎉</div><div class="meta">Добавьте его в «Базу учеников» — он появится и в расписании преподавателя.</div>
      <div class="actions"><button class="btn primary" data-act="enroll" data-lead="${esc(l.id)}">Добавить в Базу</button></div></div></div></div></section>` : ''}
    ${trial}
    <section class="section"><div class="section-h"><h2>Задачи</h2><button class="link" data-act="addTask" data-lead="${esc(l.id)}">+ Добавить</button></div>
      <div class="list">${tasks.length ? tasks.map(taskRow).join('') : `<div class="empty">${ACTIVE.includes(l.stage) ? 'Нет следующего шага — добавьте задачу' : 'Задач нет'}</div>`}</div></section>
    <section class="section"><div class="section-h"><h2>Данные</h2><button class="link" data-act="editLead" data-id="${esc(l.id)}">Изменить</button></div>
      <div class="list kv">
        <div class="k">Телефон</div><div>${l.phone ? `<a href="${esc(telUrl(l.phone))}">${esc(prettyPhone(l.phone))}</a>` : '—'}</div>
        <div class="k">Кто пишет</div><div>${esc(l.contact || '—')}</div>
        <div class="k">Ответственный</div><div>${esc(l.owner || '—')}</div>
        ${l.inBase ? `<div class="k">В Базе</div><div>${esc(l.inBase)}</div>` : ''}
        <div class="k">Создан</div><div>${esc(l.created ? dayLabel(l.created.slice(0, 10)) + ', ' + l.created.slice(11) : '—')}</div>
        ${l.lostReason ? `<div class="k">Причина отказа</div><div>${esc(l.lostReason)}</div>` : ''}
        ${l.comment ? `<div class="k">Комментарий</div><div style="white-space:pre-wrap">${esc(l.comment)}</div>` : ''}
      </div></section>
    <section class="section"><div class="section-h"><h2>Заметка</h2></div>
      <textarea class="input" id="note" rows="2" placeholder="Например: мама просит группу после 17:00"></textarea>
      <div style="margin-top:8px"><button class="btn primary" data-act="addNote" data-id="${esc(l.id)}">Добавить заметку</button></div></section>
    <section class="section"><div class="section-h"><h2>История</h2></div><div class="list"><div class="log">${log || 'Пока пусто'}</div></div></section>`;
}

/* ---------- Новый лид / изменение ---------- */

function radios(name, values, cur, cls = '') {
  return values.map((v) => {
    const [val, label] = Array.isArray(v) ? v : [v, v];
    return `<label class="chip ${cls}"><input type="radio" name="${name}" value="${esc(val)}" ${String(cur) === String(val) ? 'checked' : ''}><span>${esc(label)}</span></label>`;
  }).join('');
}
const listSetting = (k) => String(S.d.settings[k] || '').split(',').map((x) => x.trim()).filter(Boolean);

function openLeadForm(id) {
  const l = id ? leadById(id) : null;
  openSheet(() => sheetHead(l ? 'Изменить лид' : 'Новый лид') + `
    <form id="leadForm" autocomplete="off">
      <div class="field"><div class="lbl-row"><label for="f-phone">Телефон / WhatsApp</label>
        <button type="button" class="link-btn" id="pastePhone">${ic('task', 2)}Вставить из буфера</button></div>
        <input class="input" id="f-phone" name="phone" type="tel" inputmode="tel" placeholder="0555 123 456" value="${esc(l ? prettyPhone(l.phone) : '')}">
        <div id="dup"></div></div>
      <div class="field"><label for="f-name">Имя ребёнка</label>
        <input class="input" id="f-name" name="name" placeholder="Например, Айбек" value="${esc(l ? l.name : '')}" autocapitalize="words"></div>
      <div class="field"><span class="lbl">Класс</span><div class="chips">${radios('grade', GRADES, l ? l.grade : '', 'sq')}</div></div>
      <div class="field"><span class="lbl">Кто пишет</span>
        <div class="chips" style="margin-bottom:8px">${['Мама', 'Папа', 'Ученик'].map((x) => `<button type="button" class="chip-btn" data-fill="contact" data-v="${x}">${x}</button>`).join('')}</div>
        <input class="input" name="contact" placeholder="Например, мама Айгуль" value="${esc(l ? l.contact : '')}"></div>
      <div class="field"><span class="lbl">Формат</span><div class="seg">${radios('format', ['Офлайн', 'Онлайн'], l ? l.format : '')}</div></div>
      <div class="field"><span class="lbl">Источник</span><div class="chips">${radios('source', listSetting('Источники'), l ? l.source : '')}</div></div>
      <div class="field"><span class="lbl">Ответственный</span><div class="seg">${radios('owner', S.d.users, l ? l.owner || me() : me())}</div></div>
      ${l ? '' : `<div class="field"><span class="lbl">Этап</span><div class="seg">${radios('stage', ['Новый', 'В диалоге'], 'Новый')}</div></div>
      <div class="field"><span class="lbl">Напомнить связаться</span><div class="chips">${radios('first', [['', 'Не надо'], ['1h', 'Через час'], ['eve', 'Сегодня в 18:00'], ['tm', 'Завтра в 10:00']], '')}</div></div>`}
      <div class="field"><label for="f-comment">Комментарий</label>
        <textarea class="input" id="f-comment" name="comment" rows="2" placeholder="Что спрашивали, пожелания по времени">${esc(l ? l.comment : '')}</textarea></div>
      <div class="sheet-foot"><button class="btn primary lg" type="submit">${l ? 'Сохранить' : 'Добавить лид'}</button></div>
    </form>`, {
    after: (sh) => {
      const f = $('#leadForm', sh.panel);
      const phone = $('#f-phone', sh.panel);
      let timer;
      const check = () => {
        clearTimeout(timer);
        const n = normPhone(phone.value);
        if (n.length < 12) { $('#dup', sh.panel).innerHTML = ''; return; }
        timer = setTimeout(async () => {
          try {
            const r = await call('checkPhone', { phone: phone.value, exceptId: l ? l.id : '' });
            if (normPhone(phone.value) !== n) return;
            const parts = [];
            r.leads.forEach((x) => parts.push(`Уже есть лид: <a data-act="lead" data-id="${esc(x.id)}">${esc(leadLabel(x))}</a> (${esc(x.stage)})`));
            r.students.forEach((x) => parts.push(`Уже в Базе: ${esc(x.name)}${x.grade ? ', ' + esc(x.grade) + ' кл' : ''} — преподаватель ${esc(x.teacher)} (${esc(x.status || 'учится')})`));
            r.trials.forEach((x) => parts.push(`Был пробный ${esc(x.date.split('-').reverse().slice(0, 2).join('.'))}, преподаватель ${esc(x.teacher)}${x.result ? ' — ' + esc(x.result) : ''}`));
            $('#dup', sh.panel).innerHTML = parts.length ? `<div class="warnbox">${parts.join('<br>')}</div>` : '';
          } catch { /* проверка необязательная */ }
        }, 450);
      };
      phone.addEventListener('input', check);
      $('#pastePhone', sh.panel).onclick = async () => {
        try {
          const text = await navigator.clipboard.readText();
          const m = String(text || '').match(/\+?\d[\d\s()\-]{7,}\d/);
          if (!m) return toast('В буфере обмена нет номера телефона', { err: true });
          phone.value = prettyPhone(m[0]);
          check();
          $('#f-name', sh.panel).focus();
        } catch {
          toast('Не удалось прочитать буфер. Нажмите в поле и выберите «Вставить»', { err: true });
        }
      };
      if (l) check();
      $$('[data-fill]', sh.panel).forEach((b) => { b.onclick = () => { f.elements[b.dataset.fill].value = b.dataset.v + ' '; f.elements[b.dataset.fill].focus(); }; });
      if (!l) setTimeout(() => phone.focus(), 300);
      f.onsubmit = async (e) => {
        e.preventDefault();
        const v = Object.fromEntries(new FormData(f).entries());
        if (!v.phone.trim() && !v.name.trim()) return toast('Укажите телефон или имя', { err: true });
        const btn = $('button[type=submit]', f);
        btn.disabled = true; btn.textContent = 'Сохраняю…';
        const lead = { phone: v.phone.trim(), name: v.name.trim(), grade: v.grade || '', contact: v.contact.trim(), format: v.format || '',
          source: v.source || '', owner: v.owner || me(), comment: v.comment.trim() };
        const payload = { lead };
        if (l) lead.id = l.id; else lead.stage = v.stage || 'Новый';
        if (!l && v.first) {
          const d = new Date();
          const due = v.first === '1h' ? dtStr(new Date(Date.now() + 3600000)) : v.first === 'eve' ? todayS() + 'T18:00' : addDays(todayS(), 1) + 'T10:00';
          payload.firstTask = { title: 'Связаться: ответить на вопросы, предложить пробный', due: d && due };
        }
        try {
          const r = await run('saveLead', payload);
          sh.close();
          if (!l) {
            const nl = r.leads[0];
            toast('Лид добавлен', { action: 'Открыть', onAction: () => openLead(nl.id) });
          }
        } catch { btn.disabled = false; btn.textContent = l ? 'Сохранить' : 'Добавить лид'; }
      };
    },
  });
}

/* ---------- Запись на пробный ---------- */

function openBooking(id) {
  const l = leadById(id);
  if (!l) return;
  if (!l.phone) { toast('Сначала укажите телефон лида', { err: true }); return openLeadForm(id); }
  const t = todayS();
  const days = [];
  for (let i = 0; days.length < 8; i++) { const d = addDays(t, i); if (parseD(d).getDay() !== 0) days.push(d); }
  const st = { teacher: l.teacher || '', date: days[0], time: '', format: l.format || 'Офлайн' };
  openSheet(() => sheetHead('Запись на пробный') + `
    <p class="hint" style="margin-top:0">${esc(leadLabel(l))} · ${esc(prettyPhone(l.phone))}</p>
    <div class="field"><span class="lbl">Преподаватель</span><div class="chips">${radios('teacher', S.d.teachers, st.teacher)}</div></div>
    <div class="field"><span class="lbl">День</span><div class="chips nowrap">${radios('date', days.map((d) => [d, dayLabel(d)]), st.date)}
      <label class="chip"><input type="date" id="f-date" min="${t}" style="position:absolute;inset:0;opacity:0;width:100%"><span>Другой…</span></label></div></div>
    <div class="field"><span class="lbl">Время${l.grade ? ` <span style="font-weight:500">· ★ — в группе уже есть ${esc(l.grade)} класс</span>` : ''}</span><div id="slots"></div></div>
    <div class="field"><span class="lbl">Формат</span><div class="seg">${radios('format', ['Офлайн', 'Онлайн'], st.format)}</div></div>
    <div class="field"><label for="f-tc">Комментарий для таблицы</label><input class="input" id="f-tc" placeholder="Необязательно"></div>
    <div class="sheet-foot"><button class="btn primary lg" id="bookBtn" disabled>Выберите время</button></div>`, {
    after: (sh) => {
      const p = sh.panel;
      const upd = () => {
        const b = $('#bookBtn', p);
        const ok = st.teacher && st.date && st.time;
        b.disabled = !ok;
        b.textContent = ok ? `Записать: ${dayLabel(st.date)}, ${st.time} · ${st.teacher}` : !st.teacher ? 'Выберите преподавателя' : 'Выберите время';
      };
      const drawSlots = async () => {
        const box = $('#slots', p);
        st.time = '';
        upd();
        if (!st.teacher) { box.innerHTML = '<div class="hint" style="margin:0 4px">Сначала выберите преподавателя</div>'; return; }
        const k = st.teacher + '|' + st.date;
        if (!S.slots[k] || Date.now() - S.slots[k].at > 120000) {
          box.innerHTML = '<div class="hint" style="margin:0 4px">Загружаю расписание…</div>';
          try { S.slots[k] = { at: Date.now(), r: await call('slots', { teacher: st.teacher, date: st.date }) }; } catch (e) { box.innerHTML = `<div class="warnbox errbox">${esc(e.message)}</div>`; return; }
          if (k !== st.teacher + '|' + st.date) return;
        }
        const r = S.slots[k].r;
        if (r.dayOff || !r.slots.some((s) => s.status !== 'off')) { box.innerHTML = '<div class="warnbox">В этот день преподаватель не работает</div>'; return; }
        const label = { free: 'свободно', group: 'группа', busy: 'занято', off: 'не работает' };
        const g = String(l.grade || '').trim();
        const hasGrade = (s) => !!g && [...String(s.who || '').matchAll(/(\d+) кл/g)].some((m) => m[1] === g);
        box.innerHTML = `<div class="slots">${r.slots.filter((s) => s.status !== 'off' || (s.time >= '14:00')).map((s) => `
          <button type="button" class="slot ${s.status} ${s.status === 'group' && hasGrade(s) ? 'match' : ''}" data-time="${s.time}" ${s.status === 'off' ? 'disabled' : ''}>
            <b>${s.time}</b><small>${s.status === 'group' || s.status === 'busy' ? esc(s.type || label[s.status]) + (s.who ? ': ' + esc(s.who.replace(/^(\d+) чел\.:.*/, '$1 чел.')) : '') : label[s.status]}</small>
            ${s.status === 'group' && hasGrade(s) ? `<small class="mt">★ есть ${esc(g)} кл</small>` : ''}
            ${s.trials.length ? `<small class="tr">пробный: ${esc(s.trials.join(', '))}</small>` : ''}
          </button>`).join('')}</div>`;
        $$('.slot', box).forEach((b) => { b.onclick = () => { $$('.slot.sel', box).forEach((x) => x.classList.remove('sel')); b.classList.add('sel'); st.time = b.dataset.time; upd(); }; });
      };
      p.addEventListener('change', (e) => {
        const n = e.target.name;
        if (n === 'teacher') { st.teacher = e.target.value; drawSlots(); }
        if (n === 'date') { st.date = e.target.value; drawSlots(); }
        if (n === 'format') st.format = e.target.value;
        if (e.target.id === 'f-date' && e.target.value) {
          if (parseD(e.target.value).getDay() === 0) { toast('Воскресенье — выходной', { err: true }); return; }
          st.date = e.target.value;
          $$('input[name=date]', p).forEach((x) => { x.checked = false; });
          e.target.nextElementSibling.textContent = dayLabel(st.date);
          drawSlots();
        }
      });
      $('#bookBtn', p).onclick = async () => {
        const b = $('#bookBtn', p);
        b.disabled = true; b.textContent = 'Записываю в таблицу…';
        try {
          await run('bookTrial', { id: l.id, date: st.date, time: st.time, teacher: st.teacher, format: st.format, comment: $('#f-tc', p).value });
          delete S.slots[st.teacher + '|' + st.date];
          sh.close();
          const fresh = leadById(l.id);
          const text = tpl('напоминание о пробном', trialVars({ ...fresh, date: st.date, time: st.time }));
          toast('Записан на пробный и добавлен в «Пробные»', { action: 'Отправить в WhatsApp', onAction: () => window.open(waUrl(l.phone, text), '_blank') });
        } catch { upd(); }
      };
      drawSlots();
    },
  });
}

/* ---------- Добавить ученика в Базу ---------- */

const HOURS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];

function openEnroll(src) {
  const l = src.leadId ? leadById(src.leadId) : null;
  const tr = src.trial || (l && l.trialDate ? trialOfLead(l) : null);
  const init = {
    teacher: (l && l.teacher) || (tr && tr.teacher) || '',
    name: (l && l.name) || (tr && tr.name) || '',
    phone: (l && l.phone) || (tr && tr.phone) || '',
    grade: (l && l.grade) || (tr && tr.grade) || '',
    onl: (l && l.format) || (tr && tr.format) || 'Офлайн',
    time: (l && l.trialTime) || (tr && tr.time) || '',
  };
  const sh = openSheet((sh) => {
    const m = sh.data.meta;
    if (!m) return sheetHead('Добавить в Базу') + `<div class="list"><div class="empty">${esc(sh.data.err || 'Загружаю справочники из Базы…')}</div></div>`;
    const teachers = m.teachers.length ? m.teachers : S.d.teachers;
    return sheetHead('Добавить в Базу') + `
    <form id="enrollForm" autocomplete="off">
      <div class="field"><span class="lbl">Преподаватель</span><div class="chips">${radios('teacher', teachers, teachers.includes(init.teacher) ? init.teacher : '')}</div></div>
      <div class="field"><label for="e-name">Имя</label><input class="input" id="e-name" name="name" value="${esc(init.name)}"></div>
      <div class="field"><label for="e-phone">Телефон</label><input class="input" id="e-phone" name="phone" type="tel" value="${esc(prettyPhone(init.phone))}"></div>
      <div class="field"><label for="e-grade">Класс</label><input class="input" id="e-grade" name="grade" inputmode="numeric" value="${esc(init.grade)}" placeholder="Например, 9 или 1 курс"></div>
      <div class="field"><span class="lbl">Формат</span><div class="seg">${radios('format', m.formats, 'Группа')}</div></div>
      <div class="field"><span class="lbl">Онл / Офф</span><div class="seg">${radios('onl', ['Офлайн', 'Онлайн'], init.onl)}</div></div>
      <div class="field"><span class="lbl">Дни занятий</span><div class="chips">${radios('days', m.days, '')}</div></div>
      <div class="field"><span class="lbl">Время</span><div class="chips nowrap">${radios('time', HOURS, HOURS.includes(init.time) ? init.time : '')}</div></div>
      <div class="field"><label for="e-price">Цена абонемента, сом</label><input class="input" id="e-price" name="price" type="number" inputmode="numeric" value="${esc(m.prices['Группа'] || '')}"></div>
      <div class="field"><span class="lbl">Оплатил сейчас?</span><div class="seg">${radios('paidNow', [['1', 'Да'], ['0', 'Пока нет']], '1')}</div></div>
      <div id="paidBox">
        <div class="field"><label for="e-paid">Сумма оплаты, сом</label><input class="input" id="e-paid" name="paid" type="number" inputmode="numeric" value="${esc(m.prices['Группа'] || '')}"></div>
        <div class="field"><label for="e-date">Дата оплаты</label><input class="input" id="e-date" name="payDate" type="date" value="${todayS()}"></div>
      </div>
      <div class="field"><label for="e-comment">Комментарий</label><input class="input" id="e-comment" name="comment" placeholder="Необязательно"></div>
      <p class="hint">Строка появится на листе преподавателя в «Базе учеников», а ученик — в его расписании в течение минуты. Если это новый час у преподавателя, поставьте «Тип» в расписании.</p>
      <div class="sheet-foot"><button class="btn primary lg" type="submit">Добавить в Базу</button></div>
    </form>`;
  }, {
    data: { meta: S.baseMeta || null },
    after: (sh) => {
      const f = $('#enrollForm', sh.panel);
      if (!f) return;
      const price = f.elements.price, paid = f.elements.paid;
      let priceTouched = false, paidTouched = false;
      price.addEventListener('input', () => { priceTouched = true; if (!paidTouched) paid.value = price.value; });
      paid.addEventListener('input', () => { paidTouched = true; });
      f.addEventListener('change', (e) => {
        if (e.target.name === 'format' && !priceTouched) {
          price.value = sh.data.meta.prices[e.target.value] || '';
          if (!paidTouched) paid.value = price.value;
        }
        if (e.target.name === 'paidNow') $('#paidBox', sh.panel).classList.toggle('hidden', e.target.value === '0');
      });
      const send = async (force) => {
        const v = Object.fromEntries(new FormData(f).entries());
        if (!v.teacher) return toast('Выберите преподавателя', { err: true });
        if (!v.name.trim()) return toast('Укажите имя', { err: true });
        if (!v.days || !v.time) return toast('Выберите дни и время — без них ученик не попадёт в расписание', { err: true });
        const student = {
          teacher: v.teacher, name: v.name.trim(), phone: v.phone, grade: v.grade.trim(), format: v.format, onl: v.onl,
          days: v.days, time: v.time, price: v.price, comment: v.comment.trim(),
          paid: v.paidNow === '1' ? v.paid : '', payDate: v.paidNow === '1' ? v.payDate : '',
        };
        const b = $('button[type=submit]', f);
        b.disabled = true; b.textContent = 'Записываю в Базу…';
        try {
          const r = await run('enroll', { leadId: l ? l.id : '', student, force: !!force });
          if (r.duplicate) {
            b.disabled = false; b.textContent = 'Добавить в Базу';
            if (confirm(`У преподавателя ${r.duplicate.teacher} уже есть «${r.duplicate.name}» (строка ${r.duplicate.row}). Это другой ученик? Добавить всё равно?`)) send(true);
            return;
          }
          sh.close();
          toast(`Добавлен в Базу: ${r.enrolled.teacher}, строка ${r.enrolled.row}`);
        } catch { b.disabled = false; b.textContent = 'Добавить в Базу'; }
      };
      f.onsubmit = (e) => { e.preventDefault(); send(false); };
    },
  });
  if (!S.baseMeta) {
    call('baseMeta').then((m) => { S.baseMeta = m; sh.data.meta = m; sh.render(); })
      .catch((e) => { sh.data.err = e.message; sh.render(); });
  }
}

/* ---------- Оплатил ---------- */

const money = (n) => (Number(n) || 0).toLocaleString('ru-RU').replace(/ /g, ' ');

function openPayment(p) {
  const sh = openSheet((sh) => {
    const i = sh.data.info;
    const head = sheetHead('Оплата') + `<p class="hint" style="margin-top:0">${esc(p.name)} · ${esc(p.teacher)}</p>`;
    if (sh.data.err) return head + `<div class="warnbox errbox">${esc(sh.data.err)}</div>`;
    if (!i) return head + '<div class="list"><div class="empty">Ищу ученика в «Базе учеников»…</div></div>';
    const mode = i.debt > 0 && p.status === 'Долг' ? 'add' : 'renew';
    return head + `
      <div class="list kv">
        <div class="k">Абонемент</div><div>${esc([i.format, i.days, i.time].filter(Boolean).join(' · ') || '—')}</div>
        <div class="k">Цена</div><div>${money(i.price)} сом</div>
        <div class="k">Оплачено</div><div>${money(i.paid)} сом${i.debt > 0 ? ` · <span style="color:var(--red)">долг ${money(i.debt)}</span>` : ''}</div>
        <div class="k">Дата оплаты</div><div>${esc(i.payDate ? i.payDate.split('-').reverse().join('.') : '—')}</div>
        <div class="k">След. оплата</div><div>${esc(i.next || '—')}${i.payStatus ? ` · ${esc(i.payStatus)}` : ''}</div>
      </div>
      <div class="field"><span class="lbl">Что оплатили</span><div class="seg">${radios('mode', [['renew', 'Новый абонемент'], ['add', 'Доплата долга']], mode)}</div></div>
      <div class="field"><label for="p-amount">Сумма, сом</label>
        <input class="input" id="p-amount" type="number" inputmode="numeric" value="${mode === 'add' ? i.debt : i.price}"></div>
      <div class="field" id="p-dateBox"><label for="p-date">Дата оплаты</label><input class="input" id="p-date" type="date" value="${todayS()}"></div>
      <p class="hint" id="p-hint"></p>
      <div class="sheet-foot"><button class="btn primary lg" id="payBtn">Записать оплату в Базу</button></div>`;
  }, {
    data: { info: null, err: '' },
    after: (sh) => {
      const i = sh.data.info;
      if (!i) return;
      const pnl = sh.panel;
      const amount = $('#p-amount', pnl);
      const hint = () => {
        const m = $('input[name=mode]:checked', pnl).value;
        const a = Number(amount.value) || 0;
        $('#p-dateBox', pnl).classList.toggle('hidden', m === 'add' && !!i.payDate);
        $('#p-hint', pnl).textContent = m === 'renew'
          ? `В Базе: Дата оплаты → ${$('#p-date', pnl).value.split('-').reverse().join('.')}, Оплачено → ${money(a)}, заморозки обнулятся. Дата следующей оплаты пересчитается сама.`
          : `В Базе: Оплачено ${money(i.paid)} → ${money(i.paid + a)}.${i.payDate ? ' Дата оплаты не меняется.' : ''}`;
      };
      pnl.addEventListener('change', (e) => {
        if (e.target.name === 'mode') amount.value = e.target.value === 'add' ? i.debt : i.price;
        hint();
      });
      amount.addEventListener('input', hint);
      hint();
      $('#payBtn', pnl).onclick = async () => {
        const b = $('#payBtn', pnl);
        const mode = $('input[name=mode]:checked', pnl).value;
        b.disabled = true; b.textContent = 'Записываю…';
        try {
          const r = await run('recordPayment', { teacher: p.teacher, name: p.name, phone: p.phone, status: p.status, nextDate: p.nextDate,
            row: i.row, mode, amount: amount.value, date: $('#p-date', pnl).value, key: p.key });
          sh.close();
          toast(`Оплата ${money(amount.value)} сом записана в Базу`, {
            action: 'Отменить',
            onAction: () => run('undoPayment', { id: r.payment.id, key: p.key })
              .then(() => { toast('Оплата отменена'); setTimeout(() => load(true), 3000); }).catch(() => {}),
          });
          setTimeout(() => load(true), 4000);
        } catch { b.disabled = false; b.textContent = 'Записать оплату в Базу'; }
      };
    },
  });
  call('studentInfo', { teacher: p.teacher, name: p.name, phone: p.phone, status: p.status, nextDate: p.nextDate })
    .then((info) => { sh.data.info = info; sh.render(); })
    .catch((e) => { sh.data.err = e.message; sh.render(); });
}

/* ---------- Отказ ---------- */

function openLost(id) {
  const l = leadById(id);
  openSheet(() => sheetHead('Причина отказа') + `
    <div class="chips">${radios('reason', listSetting('Причины отказа'), '')}</div>
    <div class="field"><input class="input" id="f-reason" placeholder="Или напишите своими словами"></div>
    <div class="sheet-foot"><button class="btn primary lg" id="lostBtn">Перенести в «Отказ»</button></div>`, {
    after: (sh) => {
      $('#lostBtn', sh.panel).onclick = () => {
        const r = ($('#f-reason', sh.panel).value.trim()) || ($('input[name=reason]:checked', sh.panel) || {}).value || '';
        sh.close();
        run('moveLead', { id, stage: 'Отказ', lostReason: r }, () => { l.stage = 'Отказ'; l.lostReason = r; }).catch(() => {});
      };
    },
  });
}

/* ---------- Задача ---------- */

function openTask(taskId, leadId) {
  const t = taskId ? S.d.tasks.find((x) => x.id === taskId) : null;
  const lead = leadById(leadId || (t && t.leadId));
  const now = new Date();
  const presets = [
    ['Через час', dtStr(new Date(now.getTime() + 3600000))],
    ['Сегодня 18:00', todayS() + 'T18:00'],
    ['Завтра 10:00', addDays(todayS(), 1) + 'T10:00'],
    ['Через 2 дня', addDays(todayS(), 2) + 'T11:00'],
    ['Через неделю', addDays(todayS(), 7) + 'T11:00'],
  ];
  const defDue = t ? t.due : presets[2][1];
  openSheet(() => sheetHead(t ? 'Задача' : 'Новая задача') + `
    ${lead ? `<p class="hint" style="margin-top:0">${esc(leadLabel(lead))}</p>` : ''}
    <div class="field"><label for="f-title">Что сделать</label>
      <input class="input" id="f-title" value="${esc(t ? t.title : '')}" placeholder="Например, позвонить маме">
      ${t ? '' : `<div class="chips" style="margin-top:8px">${TASK_IDEAS.map((x) => `<button type="button" class="chip-btn" data-idea="${esc(x)}">${esc(x)}</button>`).join('')}</div>`}</div>
    <div class="field"><span class="lbl">Когда</span>
      <div class="chips" style="margin-bottom:8px">${presets.map(([lb, v]) => `<button type="button" class="chip-btn" data-due="${v}">${lb}</button>`).join('')}</div>
      <input class="input" id="f-due" type="datetime-local" value="${esc(defDue)}"></div>
    <div class="field"><span class="lbl">Кто делает</span><div class="seg">${radios('owner', S.d.users, t ? t.owner || me() : (lead && lead.owner) || me())}</div></div>
    <div class="sheet-foot btn-row">
      ${t && !t.done ? '<button class="btn lg ok" id="doneBtn" style="flex:0 0 auto;width:auto;padding:0 18px">Выполнено</button>' : ''}
      <button class="btn primary lg" id="saveTask">${t ? 'Сохранить' : 'Создать задачу'}</button>
    </div>`, {
    after: (sh) => {
      const p = sh.panel;
      $$('[data-idea]', p).forEach((b) => { b.onclick = () => { $('#f-title', p).value = b.dataset.idea; }; });
      $$('[data-due]', p).forEach((b) => { b.onclick = () => { $('#f-due', p).value = b.dataset.due; }; });
      if (!t) setTimeout(() => $('#f-title', p).focus(), 300);
      if ($('#doneBtn', p)) $('#doneBtn', p).onclick = () => { sh.close(); setDone(t.id, true); };
      $('#saveTask', p).onclick = async () => {
        const title = $('#f-title', p).value.trim();
        if (!title) return toast('Напишите, что сделать', { err: true });
        const task = { title, due: $('#f-due', p).value.slice(0, 16), owner: ($('input[name=owner]:checked', p) || {}).value || me() };
        if (t) task.id = t.id; else if (lead) { task.leadId = lead.id; task.leadName = leadLabel(lead); }
        const b = $('#saveTask', p);
        b.disabled = true;
        try { await run('saveTask', { task }); sh.close(); toast(t ? 'Сохранено' : 'Задача создана'); } catch { b.disabled = false; }
      };
    },
  });
}
function setDone(id, done) {
  const t = S.d.tasks.find((x) => x.id === id);
  if (!t) return;
  run('setTaskDone', { id, done }, () => { t.done = done; t.doneAt = done ? nowS() : ''; })
    .then(() => { if (done) toast('Готово', { action: 'Отменить', onAction: () => setDone(id, false) }); })
    .catch(() => {});
}

/* ============================== Действия ============================== */

const ACT = {
  tab(el) { S.view = el.dataset.v; lsSet('espada-view', S.view); render(); window.scrollTo(0, 0); },
  refresh() { load(); },
  reload() { location.reload(); },
  close(el) { const sh = sheetOf(el); if (sh) sh.close(); },
  newLead() { openLeadForm(); },
  lead(el) { openLead(el.dataset.id); },
  editLead(el) { openLeadForm(el.dataset.id); },
  stage(el) { S.stage = el.dataset.v; $('#boardWrap').innerHTML = boardInner(); },
  mine() { S.mine = !S.mine; render(); },
  allTasks(el) { S.allTasks = el.dataset.v === '1'; render(); },
  task(el) { openTask(el.dataset.id); },
  addTask(el) { openTask(null, el.dataset.lead); },
  taskDone(el) { const t = S.d.tasks.find((x) => x.id === el.dataset.id); if (t) setDone(t.id, !t.done); },
  toStage(el) { changeStage(leadById(el.dataset.id), el.dataset.v); },
  book(el) { openBooking(el.dataset.id); },
  enroll(el) { openEnroll({ leadId: el.dataset.lead }); },
  pay(el) { const p = S.d.payments.find((x) => x.key === el.dataset.key); if (p) openPayment(p); },
  call(el) { const u = telUrl(el.dataset.phone); if (u) location.href = u; else toast('Нет телефона', { err: true }); },
  open(el) { if (el.dataset.url) window.open(el.dataset.url, '_blank'); },
  leadStage(el) {
    const l = leadById(el.dataset.id);
    pick('Этап', STAGES.map((s) => ({ label: s, dot: true, cls: STAGE_CLS[s], cur: s === l.stage, onPick: () => changeStage(l, s) })));
  },
  waLead(el) {
    const l = leadById(el.dataset.id);
    if (!waUrl(l.phone)) return toast('Нет телефона', { err: true });
    const open = (text) => window.open(waUrl(l.phone, text), '_blank');
    const items = [{ label: 'Просто открыть чат', onPick: () => open('') }, { label: 'Приветствие', onPick: () => open(tpl('приветствие', {})) }];
    if (l.trialDate) {
      const v = trialVars({ ...l, date: l.trialDate, time: l.trialTime });
      items.push({ label: 'Напоминание о пробном', note: dayLabel(l.trialDate) + ', ' + l.trialTime, onPick: () => open(tpl('напоминание о пробном', v)) });
      items.push({ label: 'После пробного', onPick: () => open(tpl('после пробного', v)) });
    }
    pick('WhatsApp', items);
  },
  addNote(el) {
    const sh = sheetOf(el);
    const ta = $('#note', sh.panel);
    const text = ta.value.trim();
    if (!text) return;
    ta.value = '';
    run('addNote', { id: el.dataset.id, text }).then(() => toast('Заметка добавлена')).catch(() => { ta.value = text; });
  },
  trialRes(el) {
    const row = Number(el.dataset.row), v = el.dataset.v;
    const tr = S.d.trials.find((x) => x.row === row);
    run('setTrialResult', { row, result: v, phone: el.dataset.phone, leadId: el.dataset.lead }, () => { if (tr) tr.result = v; })
      .then((r) => {
        const nl = r.leads && r.leads[0];
        if (v === 'Записался') openEnroll({ leadId: nl ? nl.id : '', trial: tr });
        else if (nl) toast(`Итог сохранён · ${nl.stage}`);
        else toast('Итог записан в «Пробные»');
      }).catch(() => {});
  },
  dismiss(el) {
    const { key, title, lead } = el.dataset;
    run('dismiss', { key, title, leadId: lead || '' }, () => {
      S.d.tasks.push({ id: 'tmp-' + Date.now(), key, title, done: true, doneAt: nowS() });
    }).catch(() => {});
  },
  undismiss(el) {
    const key = el.dataset.key;
    run('dismiss', { key, undo: true }, () => { S.d.tasks.forEach((t) => { if (t.key === key) t.key = ''; }); }).catch(() => {});
  },
  login() {
    const v = $('#loginLink').value.trim();
    const i = v.indexOf('#');
    const h = new URLSearchParams(i >= 0 ? v.slice(i + 1) : v);
    if (!h.get('api') || !h.get('k')) return toast('Это не похоже на ссылку доступа', { err: true });
    location.hash = '#' + h.toString();
    location.reload();
  },
  demo() { lsSet('espada-demo', '1'); location.hash = ''; location.reload(); },
  demoReset() { Demo.reset(); load(); toast('Демо-данные сброшены'); },
  logout() {
    if (!confirm(CFG.demo ? 'Выйти из демо-режима?' : 'Выйти? Понадобится снова открыть персональную ссылку.')) return;
    lsSet('espada-auth', null); lsSet('espada-demo', null); lsSet(cacheKey(), null);
    location.hash = ''; location.reload();
  },
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const fn = ACT[el.dataset.act];
  if (!fn) return;
  e.preventDefault();
  e.stopPropagation();
  fn(el, e);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && stack.length) stack[stack.length - 1].close();
});

/* ============================== Уведомления ============================== */

function toast(msg, o = {}) {
  const el = document.createElement('div');
  el.className = 'toast' + (o.err ? ' err' : '');
  el.innerHTML = `<span>${esc(msg)}</span>${o.action ? `<button>${esc(o.action)}</button>` : ''}`;
  if (o.action) $('button', el).onclick = () => { el.remove(); o.onAction(); };
  $('#toast').appendChild(el);
  setTimeout(() => el.remove(), o.action ? 7000 : o.err ? 5000 : 2600);
}

/* ============================== Запуск ============================== */

function boot() {
  if (!CFG.demo && !(CFG.api && CFG.key)) return renderLogin();
  try { const c = JSON.parse(lsGet(cacheKey()) || 'null'); if (c && c.leads) { S.d = c; render(); } } catch { /* кеш повреждён */ }
  if (!S.d) $('#app').innerHTML = '<div class="login"><div class="logo">Э</div><p>Загружаю…</p></div>';
  load();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && Date.now() - S.loadedAt > 60000) load(true);
  });
  setInterval(() => { if (document.visibilityState === 'visible') load(true); }, 5 * 60000);
  let wasWide = matchMedia('(min-width: 1000px)').matches;
  addEventListener('resize', () => {
    const w = matchMedia('(min-width: 1000px)').matches;
    if (w !== wasWide) { wasWide = w; if (S.view === 'board') render(); }
  });
}
boot();
