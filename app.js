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
/** Класс для показа: «9» → «9 кл», «7кл» и «1 курс» — как есть. */
const gr = (g) => { g = String(g || '').trim(); return !g ? '' : /^\d+$/.test(g) ? g + ' кл' : g; };
const waUrl = (p, text) => {
  const d = normPhone(p);
  return d.length >= 11 ? `https://wa.me/${d}${text ? '?text=' + encodeURIComponent(text) : ''}` : '';
};
const telUrl = (p) => { const d = normPhone(p); return d.length >= 11 ? 'tel:+' + d : ''; };
const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* приватный режим */ } };
/** Номер версии берётся из ссылки на этот файл (app.js?v=19). */
const APP_VERSION = ((document.currentScript && document.currentScript.src.match(/[?&]v=(\d+)/)) || [])[1] || '';
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const isWide = () => matchMedia('(min-width: 1000px)').matches;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const buzz = (ms = 8) => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch { /* без вибрации */ } };
/** Склонение: plural(5, ['задача', 'задачи', 'задач']) → «задач». */
function plural(n, forms) {
  const a = Math.abs(Number(n)) % 100, b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b === 1) return forms[0];
  if (b > 1 && b < 5) return forms[1];
  return forms[2];
}
const NONAME = '<span class="noname">без имени</span>';

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
  chev: '<path d="M7 10l5 5 5-5"/>',
  trash: '<path d="M4.5 7h15M9.5 7V4.8h5V7M6.5 7l.9 12.2a1.6 1.6 0 0 0 1.6 1.5h6a1.6 1.6 0 0 0 1.6-1.5L17.5 7M10.2 11v6M13.8 11v6"/>',
  alert: '<path d="M12 8.5v4.5"/><path d="M12 16.6v.1"/><path d="M10.3 3.9L2.6 17.5a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
  wallet: '<rect x="3.5" y="6.5" width="17" height="13" rx="2.6"/><path d="M14.5 13h6"/><path d="M6.5 6.5l8.8-2.7a1.6 1.6 0 0 1 2 1.5v1.2"/>',
  snow: '<path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9"/><path d="M9.6 4.6L12 7l2.4-2.4M9.6 19.4L12 17l2.4 2.4"/>',
  users: '<circle cx="9" cy="8.5" r="3.4"/><path d="M2.8 19.5c1-3.2 3.4-5 6.2-5s5.2 1.8 6.2 5"/><path d="M15.2 5.4a3.4 3.4 0 0 1 0 6.3M17.6 14.8c1.7.7 2.9 2.3 3.6 4.7"/>',
};
/** Знак «Эспада»: шлем из синусоиды и оси Y (по брендбуку). Цвета задаются темой. */
const LOGO = `<svg viewBox="0 0 100 128" aria-hidden="true">
  <path class="lg-o" d="M0 50A50 50 0 0 1 100 50V108.6L50 128L0 108.6Z"/>
  <path class="lg-f" d="M6 50A44 44 0 0 1 94 50V104.4L50 121.5L6 104.4Z"/>
  <g><path class="lg-s" transform="translate(0 6)" d="M6 44.5C11 41 15 40 20 40C27 40 31 44.5 35 48.5C38 51.5 41 53.5 44 54L44 68C41 67.5 38 65.5 35 62.5C31 58.5 27 54 20 54C15 54 11 55 6 58.5Z"/><path class="lg-o" d="M6 44.5C11 41 15 40 20 40C27 40 31 44.5 35 48.5C38 51.5 41 53.5 44 54L44 68C41 67.5 38 65.5 35 62.5C31 58.5 27 54 20 54C15 54 11 55 6 58.5Z"/></g>
  <g transform="translate(100 0) scale(-1 1)"><path class="lg-s" transform="translate(0 6)" d="M6 44.5C11 41 15 40 20 40C27 40 31 44.5 35 48.5C38 51.5 41 53.5 44 54L44 68C41 67.5 38 65.5 35 62.5C31 58.5 27 54 20 54C15 54 11 55 6 58.5Z"/><path class="lg-o" d="M6 44.5C11 41 15 40 20 40C27 40 31 44.5 35 48.5C38 51.5 41 53.5 44 54L44 68C41 67.5 38 65.5 35 62.5C31 58.5 27 54 20 54C15 54 11 55 6 58.5Z"/></g>
  <rect class="lg-o" x="43.7" y="4" width="12.6" height="124"/>
</svg>`;
const mark = (letter = 'Э') => `<span class="mk-letter">${letter}</span><span class="mk-logo">${LOGO}</span>`;

const SKINS = { brand: 'Фирменное «Эспада»', plain: 'Обычное' };
function applySkin(skin) {
  const s = skin === 'plain' ? 'plain' : 'brand'; // фирменное — по умолчанию
  if (s === 'brand') document.documentElement.dataset.skin = 'brand'; else delete document.documentElement.dataset.skin;
  const dark = matchMedia('(prefers-color-scheme: dark)').matches;
  const color = s === 'brand' ? (dark ? '#001509' : '#F5F7F5') : (dark ? '#0e1014' : '#f4f5f9');
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', color));
  return s;
}

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
  if (h.get('skin')) lsSet('espada-skin', h.get('skin') === 'brand' ? 'brand' : 'plain');
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
    if (/^Неизвестное действие/.test(j.error)) throw new Error('Сервер ещё старой версии: в Apps Script обновите код и выпустите новую версию развёртывания');
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
  nums: {},
  expanded: {},
  as: null, // менеджер смотрит кабинет этого преподавателя
  mgr: null, // данные CRM, пока открыт кабинет
};
const cacheKey = () => 'espada-cache-' + (CFG.demo ? 'demo' : (CFG.key || '').slice(0, 6));

function upsert(list, item, k) {
  const i = list.findIndex((x) => x[k] === item[k]);
  if (i >= 0) list[i] = { ...list[i], ...item }; else list.push(item);
}
function merge(r) {
  if (!r || !S.d) return;
  if (r.removed) {
    const rm = r.removed;
    if (rm.leads) S.d.leads = S.d.leads.filter((l) => !rm.leads.includes(l.id));
    if (rm.tasks) S.d.tasks = S.d.tasks.filter((t) => !rm.tasks.includes(t.id));
    if (rm.trials) S.d.trials = S.d.trials.filter((t) => !rm.trials.includes(t.row));
  }
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
  const as = S.as;
  try {
    const d = as ? await call('tBootstrap', { as }) : await call('bootstrap');
    if (S.as !== as) return; // пока грузилось, менеджер открыл или закрыл кабинет преподавателя
    const first = !S.d;
    S.d = d;
    S.loadedAt = Date.now();
    if (!as) lsSet(cacheKey(), JSON.stringify(d));
    render(first ? { anim: 'fade' } : {});
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
/** Служебные записи — отменённые отметки «Напомнили» — в списках задач не показываем. */
const isJunk = (t) => String(t.key || '').startsWith('x|') || /^\(отменено\) /.test(t.title || '');
const openTasks = () => S.d.tasks.filter((t) => !t.done && !t.key && !isJunk(t));
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

const TAB_ORDER = ['today', 'board', 'tasks', 'more'];
const TITLES = { today: 'Сегодня', board: 'Лиды', tasks: 'Задачи', more: 'Ещё' };
const VIEWS = {
  today: () => viewToday(), board: () => viewBoard(), tasks: () => viewTasks(), more: () => viewMore(),
  // кабинет преподавателя (teacher.js)
  tday: () => tViewDay(), ttrial: () => tViewTrials(), tstud: () => tViewStudents(), tzp: () => tViewZp(), tmore: () => tViewMore(),
};
/** Вкладки и заголовки зависят от того, кто открыл приложение: менеджер или преподаватель. */
const tabList = () => (isTeacher() ? T_TABS : TAB_ORDER);
const tabTitle = (v) => (isTeacher() ? T_TITLES : TITLES)[v];
const tabIcon = (v) => T_TAB_IC[v] || v;

/**
 * Каркас — меню слева, шапка, нижняя панель и «+» — рисуется один раз и дальше только обновляется.
 * Раньше он пересоздавался при каждой перерисовке, и на Android нижняя панель мигала и «дёргалась».
 */
function shell() {
  const teacher = isTeacher();
  return `
    <aside class="sidebar">
      <div class="brand"><span class="mark">${mark()}</span><span>${teacher ? 'Эспада' : 'Эспада CRM'}</span></div>
      ${teacher ? '' : `<button class="btn primary side-new" data-act="newLead">${ic('plus', 2.4)}Новый лид<kbd>N</kbd></button>`}
      <nav class="side-nav">${tabList().map((v) => `
        <button class="nav-item" data-act="tab" data-v="${v}">${ic(tabIcon(v))}<span>${tabTitle(v)}</span><span class="badge hidden"></span></button>`).join('')}</nav>
      <div class="side-foot">${ic('user', 2)}<span class="me-name"></span><span class="pill accent hidden me-main">главный</span></div>
    </aside>
    <div class="app-body">
      ${S.as ? `<div class="demo-bar preview-bar"><span>Кабинет преподавателя: ${esc(S.as)}</span><button data-act="exitCab">${ic('x', 2.6)}Вернуться в CRM</button></div>`
        : CFG.demo ? '<div class="demo-bar">Демо-режим: данные ненастоящие и хранятся только на этом устройстве</div>' : ''}
      <header class="topbar">
        <div class="tb-logo">${LOGO}</div>
        <div class="tb-text" style="flex:1;min-width:0"><h1 id="tbTitle"></h1><div class="sub" id="tbSub"></div></div>
        <button class="icon-btn" id="busy" data-act="refresh" aria-label="Обновить" title="Обновить">${ic('refresh')}</button>
      </header>
      <main id="view"></main>
    </div>
    ${teacher ? '' : `<button class="fab" data-act="newLead" aria-label="Новый лид">${ic('plus', 2.4)}</button>`}
    <nav class="tabbar">${tabList().map((v) => `
      <button class="tab" data-act="tab" data-v="${v}">${ic(tabIcon(v))}<span>${tabTitle(v)}</span><span class="badge hidden"></span></button>`).join('')}</nav>`;
}

/**
 * opts.anim: 'left' | 'right' — переход между вкладками, 'fade' — первый показ,
 * 'soft' — только мягкое появление списков (смена фильтра). Без anim — тихая перерисовка данных.
 */
function render(opts = {}) {
  if (!S.d) return;
  const anim = opts.anim && !reduced() ? opts.anim : '';
  const teacher = isTeacher();
  const mode = (teacher ? 't:' : 'm:') + (S.as || '');
  if (!$('#app .tabbar') || !$('#view') || $('#app').dataset.mode !== mode) {
    $('#app').innerHTML = shell();
    $('#app').dataset.mode = mode;
  }
  const tabs = tabList();
  if (!tabs.includes(S.view)) S.view = (teacher && !S.as && tabs.includes(lsGet('espada-tview')) && lsGet('espada-tview')) || tabs[0];
  const view = S.view;
  const d = parseD(todayS());
  let badges;
  if (teacher) badges = tBadges();
  else {
    const overdue = openTasks().filter((x) => myTask(x) && x.due && x.due < nowS()).length;
    const fresh = S.d.leads.filter((l) => l.stage === 'Новый' && (isMain() || l.owner === me())).length;
    badges = { today: overdue + fresh, tasks: overdue };
  }

  // каркас: только активный пункт, счётчики и подписи
  $$('#app .nav-item, #app .tab').forEach((b) => {
    const v = b.dataset.v;
    b.classList.toggle('on', v === view);
    const badge = $('.badge', b);
    badge.textContent = badges[v] || '';
    badge.classList.toggle('hidden', !badges[v]);
  });
  $('#tbTitle').textContent = tabTitle(view);
  $('#tbSub').textContent = view === 'today' || view === 'tday' ? `${WDF[d.getDay()]}, ${d.getDate()} ${MONF[d.getMonth()]}` : me();
  $('.me-name').textContent = me();
  $('.me-main').classList.toggle('hidden', teacher || !isMain());
  const fab = $('.fab');
  if (fab) fab.classList.toggle('fab-off', view === 'more');
  $('.app-body').className = 'app-body view-' + view;
  $('#busy').classList.toggle('spin', S.busy > 0);

  // содержимое экрана
  const main = $('#view');
  const st0 = $('.stage-tabs', main);
  const stageScroll = st0 ? st0.scrollLeft : 0;
  const scroll = window.scrollY;
  const cls = ['left', 'right', 'fade'].includes(anim) ? 'enter-' + anim : '';
  main.className = '';
  if (cls) { void main.offsetWidth; main.className = cls; }
  main.innerHTML = VIEWS[view]();
  window.scrollTo(0, scroll);
  const st1 = $('.stage-tabs', main);
  if (st1) st1.scrollLeft = stageScroll;
  if (cls) flash($('.tb-text'), 'title-in');
  bindBoard();
  afterRender(anim);
}
let busyTimer = 0;
function updBusy() {
  const b = $('#busy');
  if (b) b.classList.toggle('spin', S.busy > 0);
  clearTimeout(busyTimer);
  // тонкая полоса сверху — только если ждать дольше четверти секунды
  if (S.busy > 0) busyTimer = setTimeout(() => document.body.classList.add('loading'), 250);
  else document.body.classList.remove('loading');
}
function renderFatal(msg) {
  $('#app').innerHTML = `<div class="login"><div class="logo">${mark()}</div><h1>Не удалось загрузить</h1><p>${esc(msg)}</p>
    <button class="btn primary lg" data-act="reload">Попробовать снова</button>
    <p style="margin-top:18px"><button class="btn ghost" data-act="logout">Ввести другую ссылку</button></p></div>`;
}
function renderLogin() {
  $('#app').innerHTML = `<div class="login">
    <div class="logo">${mark()}</div>
    <h1>Эспада CRM</h1>
    <p>Откройте свою персональную ссылку — её присылает администратор. Или вставьте её сюда:</p>
    <input class="input" id="loginLink" placeholder="https://…#api=…&k=…" autocomplete="off" autocapitalize="off">
    <button class="btn primary lg" data-act="login">Войти</button>
    <p style="margin-top:26px"><button class="btn" data-act="demo">Посмотреть демо</button></p>
  </div>`;
}

/* ============================== Движение ============================== */

/** Разовая анимация: класс снимается, когда она закончится. */
function flash(el, cls = 'bump') {
  if (!el || reduced()) return;
  el.classList.remove(cls);
  void el.getBoundingClientRect();
  el.classList.add(cls);
  const done = (e) => { if (e.target !== el) return; el.classList.remove(cls); el.removeEventListener('animationend', done); };
  el.addEventListener('animationend', done);
}

/** Появление «лесенкой»: каждый следующий элемент чуть позже. */
function staggerIn(root, sel, max = 14) {
  if (!root || reduced()) return;
  $$(sel, root).slice(0, max).forEach((el, i) => {
    el.style.setProperty('--i', i);
    el.classList.add('rise');
    const done = (e) => { if (e.target !== el) return; el.classList.remove('rise'); el.removeEventListener('animationend', done); };
    el.addEventListener('animationend', done);
  });
}

/** Строка плавно схлопывается, прежде чем исчезнуть из списка. */
function collapseOut(el, ms = 300) {
  if (!el || reduced()) return Promise.resolve();
  el.style.height = el.getBoundingClientRect().height + 'px';
  el.style.overflow = 'hidden';
  void el.getBoundingClientRect();
  el.classList.add('leaving');
  el.style.height = '0px';
  return wait(ms);
}

/** Ползунок под активным пунктом. Переезжает с прошлого места, даже если меню нарисовано заново. */
const IND = {};
function placeIndicator(key, box, active, color) {
  if (!box || !active) return;
  const br = box.getBoundingClientRect(), ar = active.getBoundingClientRect();
  if (!ar.width || !br.width) return;
  let ind = box.querySelector(':scope > .ind');
  const created = !ind;
  if (!ind) {
    ind = document.createElement('span');
    ind.className = 'ind';
    ind.setAttribute('aria-hidden', 'true');
    box.prepend(ind);
  }
  const now = {
    x: ar.left - br.left - box.clientLeft + box.scrollLeft,
    y: ar.top - br.top - box.clientTop + box.scrollTop,
    w: ar.width, h: ar.height, c: color || '',
  };
  const put = (b) => {
    ind.style.transform = `translate(${b.x}px, ${b.y}px)`;
    ind.style.width = b.w + 'px';
    ind.style.height = b.h + 'px';
    if (b.c) ind.style.backgroundColor = b.c;
  };
  const prev = IND[key];
  // Постоянный ползунок сам плавно едет из текущего места; заново нарисованный ставим на прошлое место и ведём оттуда
  if (prev && created && !reduced()) {
    ind.style.transition = 'none';
    put(prev);
    void ind.getBoundingClientRect();
    ind.style.transition = '';
  }
  put(now);
  IND[key] = now;
  return !!(prev && (Math.abs(prev.x - now.x) > 1 || Math.abs(prev.y - now.y) > 1));
}
/** Пока ползунок едет, подпись нового пункта плавно меняет цвет (иначе она на миг сливается с фоном). */
function moving(box, moved) {
  if (!box || !moved || reduced()) return;
  box.classList.add('moving');
  clearTimeout(box._mv);
  box._mv = setTimeout(() => box.classList.remove('moving'), 460);
}
function stageIndicator(smooth) {
  const box = $('.stage-tabs'), on = box && $('.stage-tab.on', box);
  if (!on) return;
  moving(box, placeIndicator('stage', box, on, getComputedStyle(on).getPropertyValue('--c').trim()));
  const l = on.offsetLeft, r = l + on.offsetWidth;
  if (l < box.scrollLeft + 12 || r > box.scrollLeft + box.clientWidth - 12) {
    box.scrollTo({ left: Math.max(0, l - (box.clientWidth - on.offsetWidth) / 2), behavior: smooth && !reduced() ? 'smooth' : 'auto' });
  }
}

/** Поставить ползунки на место без анимации (шрифт догрузился, сменился размер экрана). */
function relayoutIndicators() {
  if (!S.d) return;
  Object.keys(IND).forEach((k) => delete IND[k]);
  const inds = $$('.ind');
  inds.forEach((i) => { i.style.transition = 'none'; });
  placeIndicator('tabbar', $('.tabbar'), $('.tab.on'));
  placeIndicator('side', $('.side-nav'), $('.nav-item.on'));
  placeIndicator('tasks-seg', $('.seg-btns'), $('.seg-btns .chip.on'));
  const box = $('.stage-tabs'), on = box && $('.stage-tab.on', box);
  if (on) placeIndicator('stage', box, on, getComputedStyle(on).getPropertyValue('--c').trim());
  requestAnimationFrame(() => requestAnimationFrame(() => $$('.ind').forEach((i) => { i.style.transition = ''; })));
}

/** После каждой перерисовки: ползунки, появление, подпрыгивание изменившихся чисел, непрерывные волны. */
function afterRender(anim) {
  placeIndicator('tabbar', $('.tabbar'), $('.tab.on'));
  moving($('.side-nav'), placeIndicator('side', $('.side-nav'), $('.nav-item.on')));
  placeIndicator('tasks-seg', $('.seg-btns'), $('.seg-btns .chip.on'));
  stageIndicator(false);
  const view = $('#view');
  if (anim === 'soft') staggerIn(view, isWide() ? '.section, .card' : '.section, .col.on .card', 16);
  else if (anim) staggerIn(view, isWide() ? '.hello, .toolbar, .section, .card' : '.hello, .toolbar, .stage-tabs, .section, .col.on .card', 16);
  const nums = [];
  $$('.stat', view).forEach((el, i) => nums.push(['s' + i, $('b', el).textContent, el]));
  tabList().forEach((v) => {
    [['t', '.tab'], ['n', '.nav-item']].forEach(([p, sel]) => {
      const b = $(`${sel}[data-v="${v}"] .badge`);
      nums.push([p + v, b ? b.textContent : '', b]);
    });
  });
  nums.forEach(([k, val, el]) => {
    if (!anim && k in S.nums && S.nums[k] !== val && el) flash(el);
    S.nums[k] = val;
  });
  // волны продолжают движение с того же места, а не начинают заново после перерисовки
  const t = performance.now() / 1000;
  const hero = $('.hello');
  if (hero) hero.style.setProperty('--wave-t', `-${(t % 18).toFixed(2)}s`);
  const side = $('.sidebar');
  if (side) side.style.setProperty('--wave-t', `-${(t % 36).toFixed(2)}s`);
}

/** Пока данные грузятся в первый раз — силуэт интерфейса вместо пустого экрана. */
function renderSkeleton() {
  $('#app').innerHTML = `
    <aside class="sidebar"><div class="brand"><span class="mark">${mark()}</span><span>Эспада CRM</span></div>
      <div class="sk sk-nav"></div><div class="sk sk-nav"></div><div class="sk sk-nav"></div></aside>
    <div class="app-body" aria-busy="true">
      <header class="topbar"><div class="tb-logo">${LOGO}</div>
        <div style="flex:1;min-width:0"><div class="sk sk-h1"></div><div class="sk sk-sub"></div></div></header>
      <main><div class="sk sk-hero"></div>
        <div class="sk sk-sec"></div><div class="sk sk-list"></div>
        <div class="sk sk-sec"></div><div class="sk sk-list"></div></main>
    </div>`;
}

/** Вышла новая версия на сайте — предложить обновиться (телефон мог держать старую в памяти). */
let updateOffered = false, updateCheckedAt = 0;
async function checkUpdate() {
  if (updateOffered || !APP_VERSION || Date.now() - updateCheckedAt < 5 * 60000) return;
  updateCheckedAt = Date.now();
  try {
    const html = await (await fetch('index.html', { cache: 'no-store' })).text();
    const v = (html.match(/app\.js\?v=(\d+)/) || [])[1];
    if (v && v !== APP_VERSION) {
      updateOffered = true;
      toast('Вышла новая версия приложения', { action: 'Обновить', onAction: () => location.reload() });
    }
  } catch { /* нет сети — проверим позже */ }
}

/** Полоса загрузки сверху и кружок «потяните, чтобы обновить». */
function addChrome() {
  if (!$('#progress')) document.body.insertAdjacentHTML('beforeend', '<div id="progress" aria-hidden="true"></div>');
  if (!$('#ptr')) document.body.insertAdjacentHTML('beforeend', `<div id="ptr" aria-hidden="true"><span>${ic('refresh', 2.2)}</span></div>`);
}

/** Жесты на телефоне: тень у шапки, смахивание этапов, «потяните, чтобы обновить». */
function initGestures() {
  let ticking = false;
  addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { document.body.classList.toggle('scrolled', window.scrollY > 4); ticking = false; });
  }, { passive: true });

  // Смахивание влево-вправо на доске — соседний этап
  let sw = null;
  document.addEventListener('touchstart', (e) => {
    sw = null;
    const t = e.target;
    if (!t.closest || isWide() || stack.length || e.touches.length > 1 || !t.closest('#boardWrap') || t.closest('.stage-tabs')) return;
    sw = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
  }, { passive: true });
  document.addEventListener('touchend', (e) => {
    if (!sw) return;
    const p = e.changedTouches[0], dx = p.clientX - sw.x, dy = p.clientY - sw.y, dt = Date.now() - sw.t;
    sw = null;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.6 || dt > 700) return;
    const i = STAGES.indexOf(S.stage) + (dx < 0 ? 1 : -1);
    if (i < 0 || i >= STAGES.length) return;
    S.stage = STAGES[i];
    redrawBoard(dx < 0 ? 'left' : 'right', true);
  }, { passive: true });

  // Потянуть вниз вверху страницы — обновить данные
  const ptr = $('#ptr');
  const icon = ptr.firstElementChild;
  let pl = null;
  const show = (d) => {
    ptr.style.transform = `translateY(${d - 50}px)`;
    ptr.style.opacity = String(Math.min(1, d / 34));
    icon.style.transform = `rotate(${d * 3.2}deg)`;
    const ready = d >= 64;
    ptr.classList.toggle('ready', ready);
  };
  const hide = () => {
    ptr.classList.remove('drag', 'ready', 'spin');
    ptr.style.transform = '';
    ptr.style.opacity = '';
    icon.style.transform = '';
  };
  document.addEventListener('touchstart', (e) => {
    pl = null;
    if (!S.d || stack.length || isWide() || window.scrollY > 0 || e.touches.length > 1 || ptr.classList.contains('spin')) return;
    if (e.target.closest && e.target.closest('.stage-tabs, .chips.nowrap, input, textarea, select')) return;
    pl = { x: e.touches[0].clientX, y: e.touches[0].clientY, d: 0, on: false };
  }, { passive: true });
  document.addEventListener('touchmove', (e) => {
    if (!pl) return;
    const y = e.touches[0].clientY, dy = y - pl.y, dx = e.touches[0].clientX - pl.x;
    if (!pl.on) {
      if (dy > 10 && dy > Math.abs(dx) * 1.4 && window.scrollY <= 0) { pl.on = true; pl.y += 10; ptr.classList.add('drag'); }
      else if (dy < -4 || Math.abs(dx) > 16) { pl = null; return; } else return;
    }
    pl.d = Math.min(120, Math.max(0, (y - pl.y) * 0.55));
    show(pl.d);
  }, { passive: true });
  const end = () => {
    if (!pl || !pl.on) { pl = null; return; }
    const go = pl.d >= 64;
    pl = null;
    ptr.classList.remove('drag');
    if (!go) { hide(); return; }
    ptr.classList.remove('ready');
    ptr.classList.add('spin');
    ptr.style.transform = 'translateY(16px)';
    ptr.style.opacity = '1';
    icon.style.transform = '';
    Promise.resolve(load()).finally(() => setTimeout(hide, 260));
  };
  document.addEventListener('touchend', end, { passive: true });
  document.addEventListener('touchcancel', end, { passive: true });
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

  const stat = (n, forms, to, warn) => `<button type="button" class="stat ${warn ? 'warn' : ''}" data-act="jump" data-to="${to}">
      <b>${n}</b><span>${plural(n, forms)}</span></button>`;
  const stats = `<div class="hello">
    ${stat(overdue.length, ['просрочено', 'просрочено', 'просрочено'], overdue.length ? 'sec-overdue' : 'sec-tasks', overdue.length)}
    ${stat(todays.length, ['задача', 'задачи', 'задач'], 'sec-tasks')}
    ${stat(tLeft.length, ['пробный', 'пробных', 'пробных'], 'sec-trials')}
    ${stat(pays.length, ['оплата', 'оплаты', 'оплат'], 'sec-pays')}
  </div>`;

  const sec = (id, title, count, body) =>
    `<section class="section" id="${id}"><div class="section-h"><h2>${title}</h2>${count != null ? `<span class="count">${count}</span>` : ''}</div>${body}</section>`;
  // Длинные списки показываем по 5 строк, остальное — по кнопке «Показать все»
  const LIMIT = 5;
  const list = (k, items, row) => {
    const all = S.expanded[k] || items.length <= LIMIT + 1;
    return `<div class="list" data-list="${k}">${(all ? items : items.slice(0, LIMIT)).map(row).join('')}${all ? ''
      : `<button type="button" class="more-btn" data-act="expand" data-k="${k}">Показать все · ${items.length}${ic('chev', 2.4)}</button>`}</div>`;
  };

  let left = '', right = '', pay = '';
  if (fresh.length) left += sec('sec-fresh', 'Новые — ответить', fresh.length, list('fresh', fresh, freshRow));
  if (overdue.length) left += sec('sec-overdue', 'Просрочено', overdue.length, list('overdue', overdue, taskRow));
  left += sec('sec-tasks', 'Задачи на сегодня', todays.length || null,
    todays.length ? list('todays', todays, taskRow)
      : `<div class="list">${emptyState(overdue.length ? 'Остальное на сегодня сделано' : 'На сегодня задач нет')}</div>`);
  right += sec('sec-trials', 'Пробные сегодня', trials.length ? `${trials.length - tLeft.length}/${trials.length} напомнили` : null,
    trials.length ? list('trials', trials, (x) => trialRow(x)) : `<div class="list">${emptyState('Сегодня пробных нет', 'trial')}</div>`);
  if (tomorrow.length) {
    const left2 = tomorrow.filter((x) => !x.reminded).length;
    right += sec('sec-tomorrow', 'Пробные завтра', `${tomorrow.length - left2}/${tomorrow.length} напомнили`,
      list('tomorrow', tomorrow, (x) => trialRow(x, 'eve|')));
  }
  if (noRes.length) right += sec('sec-nores', 'Заполните итог пробного', noRes.length, list('nores', noRes, noResRow));
  if (isMain() || pays.length) {
    pay += sec('sec-pays', 'Напомнить об оплате', pays.length || null,
      pays.length ? list('pays', pays, payRow) : `<div class="list">${emptyState('Всем напомнили')}</div>`);
  }
  return stats + `<div class="today-grid"><div class="g1">${left}</div><div class="g2">${right}</div><div class="g3">${pay}</div></div>`;
}

function freshRow(l) {
  return `<div class="row">
    <div class="main">
      <div class="title tap" data-act="lead" data-id="${esc(l.id)}">${esc(l.name || prettyPhone(l.phone) || 'Без имени')}
        ${l.grade ? `<span class="pill">${esc(gr(l.grade))}</span>` : ''}</div>
      <div class="meta">${[l.source, l.name ? prettyPhone(l.phone) : '', 'написал(а) ' + ago(l.created) + ' назад'].filter(Boolean).map(esc).join(' · ')}</div>
      <div class="actions">
        ${waBtn(l.phone, tpl('приветствие', {}), 'Ответить')}
        <button class="btn" data-act="toStage" data-id="${esc(l.id)}" data-v="В диалоге">В диалоге</button>
        <button class="btn" data-act="lead" data-id="${esc(l.id)}">Открыть</button>
      </div>
    </div></div>`;
}
function taskRow(t, o = {}) {
  const lead = t.leadId ? leadById(t.leadId) : null;
  const late = t.due && t.due < nowS();
  const meta = [];
  if ((lead || t.leadName) && !o.inLead) meta.push(`<a data-act="lead" data-id="${esc(t.leadId)}">${esc(lead ? leadLabel(lead) : t.leadName)}</a>`);
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
  if (typeof prefix !== 'string') prefix = ''; // защита от map(trialRow): там второй аргумент — номер строки
  const lead = leadByPhone(x.phone);
  const key = prefix + trialKey(x);
  return `<div class="row has-menu ${x.reminded ? 'done' : ''}">
    <button class="row-menu" data-act="trialMenu" data-row="${x.row}" aria-label="Ещё">${ic('more', 2.4)}</button>
    <div class="time-col">${esc(x.time)}</div>
    <div class="main">
      <div class="title"><span class="t-inline">${esc(x.time)}</span>${lead ? `<a data-act="lead" data-id="${esc(lead.id)}">${x.name ? esc(x.name) : NONAME}</a>` : x.name ? esc(x.name) : NONAME}
        ${x.grade ? `<span class="pill">${esc(gr(x.grade))}</span>` : ''}</div>
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
  return `<div class="row stack has-menu">
    <button class="row-menu" data-act="trialMenu" data-row="${x.row}" aria-label="Ещё">${ic('more', 2.4)}</button>
    <div class="main">
      <div class="title">${x.name ? esc(x.name) : NONAME} ${x.grade ? `<span class="pill">${esc(gr(x.grade))}</span>` : ''}</div>
      <div class="meta">${esc(dayLabel(x.date))}, ${esc(x.time)} · ${esc(x.teacher)}${x.phone ? ' · ' + esc(prettyPhone(x.phone)) : ''}</div>
      <div class="acts">
        ${waUrl(x.phone) ? `<div class="actions">${waBtn(x.phone, '', 'Написать')}${telBtn(x.phone)}</div>` : ''}
        <div class="actions">${resultBtns(x)}</div>
      </div>
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
      <div class="acts"><div class="actions">
        ${p.phone ? waBtn(p.phone, text, 'Напомнить') + telBtn(p.phone) : '<span class="pill">нет телефона в базе</span>'}
      </div>
      <div class="actions">
        <button class="btn ok" data-act="dismiss" data-key="${esc(p.key)}" data-title="${esc('Напомнили об оплате: ' + p.name + ' (' + p.teacher + ')')}">${ic('check', 2.6)}Напомнили</button>
        <button class="btn primary" data-act="pay" data-key="${esc(p.key)}">Оплатил</button>
      </div></div>
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
const leadLabel = (l) => (l.name || prettyPhone(l.phone) || 'Без имени') + (l.grade ? `, ${gr(l.grade)}` : '');
const emptyState = (text, icon = 'check') => `<div class="empty"><span class="empty-ic">${ic(icon, 2.2)}</span><span>${esc(text)}</span></div>`;
const loadingState = (text) => `<div class="empty"><span class="spinner" aria-hidden="true"></span><span>${esc(text)}</span></div>`;

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
        <div class="cards">${list.map((l) => leadCard(l, wide)).join('') || `<div class="empty col-empty">${wide ? 'Перетащите карточку сюда' : 'В этом этапе пока никого'}</div>`}</div></div>`;
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
    <div class="line">${[gr(l.grade), l.format, l.source].filter(Boolean).map((x) => `<span>${esc(x)}</span>`).join('<span>·</span>')}
      ${l.owner && l.owner !== me() ? `<span class="pill">${esc(l.owner)}</span>` : ''}</div>
    ${next}
  </div>`;
}
function bindBoard() {
  const q = $('#q');
  if (q) {
    q.oninput = () => { S.q = q.value; redrawBoard(); };
  }
}
/** Перерисовать только доску (поиск, смена этапа) — с ползунком и сдвигом колонки в нужную сторону. */
function redrawBoard(dir, smooth) {
  const wrap = $('#boardWrap');
  if (!wrap) return;
  const tabs = $('.stage-tabs', wrap);
  const sl = tabs ? tabs.scrollLeft : 0;
  wrap.innerHTML = boardInner();
  const nt = $('.stage-tabs', wrap);
  if (nt) nt.scrollLeft = sl;
  stageIndicator(smooth);
  if (dir && !reduced()) {
    const col = $('.col.on', wrap);
    if (col) { col.classList.add('enter-' + dir); staggerIn(col, '.card', 10); }
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
  const card = document.querySelector(`.card[data-id="${CSS.escape(l.id)}"]`);
  if (card) flash(card, 'landed');
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
  const done = S.d.tasks.filter((x) => x.done && !x.key && !isJunk(x) && (S.allTasks || myTask(x)))
    .sort((a, b) => (a.doneAt < b.doneAt ? 1 : -1)).slice(0, 15);
  return `<div class="toolbar">
      <div class="seg seg-btns" style="flex:1">
        <button type="button" class="chip ${!S.allTasks ? 'on' : ''}" data-act="allTasks" data-v="0"><span>Мои</span></button>
        <button type="button" class="chip ${S.allTasks ? 'on' : ''}" data-act="allTasks" data-v="1"><span>Все</span></button>
      </div>
      <button class="toggle" data-act="addTask">+ Задача</button>
    </div>
    ${groups.filter((g) => g[1].length).map(([title, items]) => `<section class="section">
      <div class="section-h"><h2>${title}</h2><span class="count">${items.length}</span></div>
      <div class="list">${items.sort(byDue).map(taskRow).join('')}</div></section>`).join('')
      || `<section class="section"><div class="list">${emptyState('Открытых задач нет')}</div></section>`}
    ${done.length ? `<section class="section"><div class="section-h"><h2>Недавно выполнены</h2></div>
      <div class="list">${done.map(taskRow).join('')}</div></section>` : ''}`;
}

/* ============================== Ещё ============================== */

/** Преподаватели: личный кабинет и бот в Telegram. Можно открыть кабинет любого или отправить приглашение. */
function teacherBotSection(d) {
  const list = d.teacherBot || [];
  if (!list.length) return '';
  const seen = list.filter((t) => t.seen).length;
  return `<section class="section"><div class="section-h"><h2>Преподаватели</h2><span class="count">в кабинете ${seen} из ${list.length}</span></div>
    <div class="list">${list.map((t) => `<div class="row tb-row">
      <div class="tb-name"><div class="title">${esc(t.name)}</div>
        <div class="meta">${t.seen ? `вход: ${esc(dayLabel(t.seen))}` : 'входа ещё не было'}${t.linked ? ' · <span class="pill green">Telegram</span>' : ''}</div></div>
      <button class="btn" data-act="openCab" data-name="${esc(t.name)}">Открыть</button>
      <button class="btn" data-act="teacherLink" data-name="${esc(t.name)}" aria-label="Пригласить ${esc(t.name)}">${ic('send', 2)}<span class="tb-inv">Пригласить</span></button>
    </div>`).join('')}</div>
    <p class="hint">«Открыть» — кабинет глазами преподавателя: там он ведёт своих учеников в «Базе» (оплаты, статусы, заморозки), меняет статусы часов в расписании, ставит итоги пробных и видит свою зарплату. «Пригласить» — отправить личную ссылку на кабинет и бота. О новых учениках, сменах статуса и оплатах вам приходит сообщение в Telegram.</p></section>`;
}

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

  return `<div class="more-grid"><div>
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
  ${teacherBotSection(d)}

  </div><div>
  <section class="section"><div class="section-h"><h2>Последние 30 дней</h2></div><div class="list">
    <div class="funnel">
      <div><b>${recent.length}</b><span>${plural(recent.length, ['новый лид', 'новых лида', 'новых лидов'])}</span></div>
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

  <section class="section"><div class="section-h"><h2>Оформление</h2></div>
    <div class="seg">${Object.entries(SKINS).map(([k, label]) => `<label class="chip"><input type="radio" name="skin" value="${k}"
      ${(lsGet('espada-skin') || 'brand') === k ? 'checked' : ''} data-skin-pick><span>${label}</span></label>`).join('')}</div>
    <p class="hint">Выбор сохраняется на этом устройстве.</p>
    ${APP_VERSION ? `<p class="hint">Версия приложения: ${esc(APP_VERSION)}</p>` : ''}
    <p class="hint skin-credit">Шрифт Gros Ventre — Dimitri Antonov, Blue Curve Designstudio (CC BY 4.0).</p></section>

  <section class="section"><div class="section-h"><h2>Таблицы</h2></div><div class="menu">
    <button data-act="open" data-url="${esc(d.links ? d.links.base : '')}">${ic('table')}<span>База учеников</span></button>
    <button data-act="open" data-url="${esc(d.links ? d.links.sched : '')}">${ic('table')}<span>Расписание, пробные и CRM-листы</span></button>
  </div>
  <p class="hint">Шаблоны сообщений WhatsApp, источники и причины отказа меняются на листе «CRM Настройки» в таблице «Расписание».</p></section>

  <section class="section"><div class="menu">
    <button data-act="refresh">${ic('refresh')}<span>Обновить данные</span><small>${S.loadedAt ? 'обновлено ' + ago(dtStr(new Date(S.loadedAt))) + (ago(dtStr(new Date(S.loadedAt))) === 'только что' ? '' : ' назад') : ''}</small></button>
    ${CFG.demo ? `<button data-act="demoReset">${ic('refresh')}<span>Сбросить демо-данные</span></button>` : ''}
    <button data-act="logout" style="color:var(--red)">${ic('x')}<span>${CFG.demo ? 'Выйти из демо' : 'Выйти'}</span></button>
  </div></section></div></div>`;
}

/* ============================== Листы (модальные окна) ============================== */

const stack = [];
function openSheet(build, opts = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap' + (opts.small ? ' small' : '');
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
  panel.addEventListener('scroll', () => panel.classList.toggle('scrolled', panel.scrollTop > 4), { passive: true });
  dragToClose(sh);
  document.body.style.overflow = 'hidden';
  return sh;
}
function closeSheet(sh) {
  const i = stack.indexOf(sh);
  if (i < 0) return;
  stack.splice(i, 1);
  sh.panel.style.animation = '';
  sh.wrap.classList.add('closing');
  sh.panel.classList.add('closing');
  setTimeout(() => sh.wrap.remove(), reduced() ? 0 : 270);
  if (!stack.length) document.body.style.overflow = '';
  if (sh.onClose) sh.onClose();
}
/** Нижнее окно можно смахнуть вниз пальцем, как в iOS. */
function dragToClose(sh) {
  const p = sh.panel, bd = $('.sheet-backdrop', sh.wrap);
  let d = null;
  p.addEventListener('touchstart', (e) => {
    d = null;
    if (isWide() || e.touches.length > 1 || p.scrollTop > 0) return;
    if (e.target.closest('input, textarea, select, .chips.nowrap, .slots')) return;
    d = { x: e.touches[0].clientX, y: e.touches[0].clientY, dy: 0, on: false, t: Date.now() };
  }, { passive: true });
  p.addEventListener('touchmove', (e) => {
    if (!d) return;
    const y = e.touches[0].clientY, dy = y - d.y, dx = e.touches[0].clientX - d.x;
    if (!d.on) {
      if (dy > 8 && dy > Math.abs(dx) * 1.2 && p.scrollTop <= 0) {
        d.on = true;
        d.y += 8;
        p.style.animation = 'none';
        p.style.transition = 'none';
        bd.style.transition = 'none';
      } else if (dy < -4 || Math.abs(dx) > 12) { d = null; return; } else return;
    }
    e.preventDefault();
    d.dy = Math.max(0, y - d.y);
    p.style.transform = `translateY(${d.dy}px)`;
    bd.style.opacity = String(Math.max(0, 1 - d.dy / (p.offsetHeight || 1)));
  }, { passive: false });
  const end = () => {
    if (!d || !d.on) { d = null; return; }
    const v = d.dy / Math.max(1, Date.now() - d.t);
    const shut = d.dy > Math.min(140, p.offsetHeight * 0.3) || (v > 0.5 && d.dy > 30);
    p.style.transition = '';
    bd.style.transition = '';
    if (shut) {
      bd.style.opacity = '';
      sh.close();
    } else {
      p.classList.add('snap');
      p.style.transform = '';
      bd.style.opacity = '';
      setTimeout(() => p.classList.remove('snap'), 360);
    }
    d = null;
  };
  p.addEventListener('touchend', end, { passive: true });
  p.addEventListener('touchcancel', end, { passive: true });
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
      ${it.dot ? '<span class="dot"></span>' : ''}<span>${esc(it.label)}</span>${it.note ? `<small>${esc(it.note)}</small>` : ''}${it.cur ? `<span class="cur-mark">${ic('check', 2.6)}</span>` : ''}</button>`).join('')}</div>`, {
    small: true,
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
        ${tr ? `<button class="btn ghost danger" data-act="trialDel" data-row="${tr.row}">${ic('trash', 2)}Удалить</button>` : ''}
      </div></div></div></div></section>`;
  }
  const log = (l.log || '').split('\n').filter(Boolean).reverse()
    .map((x) => esc(x).replace(/^(\d\d\.\d\d \d\d:\d\d)( [^:]{1,30}:)?/, '<b>$1$2</b>')).join('\n');
  return sheetHead('') + `
    <div class="lead-head ${STAGE_CLS[l.stage]}">
      <div class="ava" aria-hidden="true">${l.name && l.name.trim() ? esc(l.name.trim()[0].toUpperCase()) : ic('phone', 2)}</div>
      <div class="lh">
        <div class="nm">${l.name ? esc(l.name) : esc(prettyPhone(l.phone) || 'Без имени')}</div>
        <div class="info">
          <button class="pill stage-pill ${STAGE_CLS[l.stage]}" data-act="leadStage" data-id="${esc(l.id)}"><span class="dot"></span>${esc(l.stage)}${ic('chev', 2.6)}</button>
          ${[/^\d+$/.test(String(l.grade).trim()) ? l.grade + ' класс' : gr(l.grade), l.format, l.source].filter(Boolean).map(esc).join(' · ')}
        </div>
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
      <div class="list">${tasks.length ? tasks.map((x) => taskRow(x, { inLead: true })).join('') : emptyState(ACTIVE.includes(l.stage) ? 'Нет следующего шага — добавьте задачу' : 'Задач нет', 'task')}</div></section>
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
    <section class="section"><div class="section-h"><h2>История</h2></div><div class="list"><div class="log">${log || 'Пока пусто'}</div></div></section>
    <section class="section del-zone"><button class="btn danger del-btn" data-act="deleteLead" data-id="${esc(l.id)}">${ic('trash', 2)}Удалить лида</button></section>`;
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
            r.students.forEach((x) => parts.push(`Уже в Базе: ${esc(x.name)}${x.grade ? ', ' + esc(gr(x.grade)) : ''} — преподаватель ${esc(x.teacher)} (${esc(x.status || 'учится')})`));
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
    <div class="field"><span class="lbl">Время${l.grade ? ` <span style="font-weight:500">· ★ — в группе уже есть ${esc(gr(l.grade))}</span>` : ''}</span><div id="slots"></div></div>
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
          box.innerHTML = '<div class="hint loading-hint"><span class="spinner" aria-hidden="true"></span>Загружаю расписание…</div>';
          try { S.slots[k] = { at: Date.now(), r: await call('slots', { teacher: st.teacher, date: st.date }) }; } catch (e) { box.innerHTML = `<div class="warnbox errbox">${esc(e.message)}</div>`; return; }
          if (k !== st.teacher + '|' + st.date) return;
        }
        const r = S.slots[k].r;
        if (r.dayOff || !r.slots.some((s) => s.status !== 'off')) { box.innerHTML = '<div class="warnbox">В этот день преподаватель не работает</div>'; return; }
        const label = { free: 'свободно', group: 'группа', busy: 'занято', off: 'не работает' };
        const g = (String(l.grade || '').match(/^\s*(\d+)\s*(кл)?\s*$/) || [])[1] || '';
        const hasGrade = (s) => !!g && [...String(s.who || '').matchAll(/(\d+) кл/g)].some((m) => m[1] === g);
        box.innerHTML = `<div class="slots">${r.slots.filter((s) => s.status !== 'off' || (s.time >= '14:00')).map((s) => `
          <button type="button" class="slot ${s.status} ${s.status === 'group' && hasGrade(s) ? 'match' : ''}" data-time="${s.time}" ${s.status === 'off' ? 'disabled' : ''}>
            <b>${s.time}</b><small>${s.status === 'group' || s.status === 'busy' ? esc(s.type || label[s.status]) + (s.who ? ': ' + esc(s.who.replace(/^(\d+) чел\.:.*/, '$1 чел.')) : '') : label[s.status]}</small>
            ${s.status === 'group' && hasGrade(s) ? `<small class="mt">★ есть ${esc(gr(g))}</small>` : ''}
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
    if (!m) return sheetHead('Добавить в Базу') + `<div class="list">${sh.data.err ? `<div class="empty">${esc(sh.data.err)}</div>` : loadingState('Загружаю справочники из Базы…')}</div>`;
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
    if (!i) return head + `<div class="list">${loadingState('Ищу ученика в «Базе учеников»…')}</div>`;
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

/* ---------- Подтверждение и удаление ---------- */

/** Окно «Точно удалить?». checkbox: { label, checked } — дополнительная галочка, её значение придёт в onOk. */
function confirmSheet({ title, text, ok, onOk, checkbox }) {
  openSheet(() => sheetHead(esc(title)) + `
    <p class="confirm-text">${text}</p>
    ${checkbox ? `<label class="check-row"><input type="checkbox" id="cf-cb" ${checkbox.checked ? 'checked' : ''}><span>${checkbox.label}</span></label>` : ''}
    <div class="sheet-foot btn-row">
      <button class="btn lg" data-act="close">Отмена</button>
      <button class="btn lg danger-solid" id="cf-ok">${esc(ok)}</button>
    </div>`, {
    small: true,
    after: (sh) => {
      $('#cf-ok', sh.panel).onclick = () => {
        const v = checkbox ? $('#cf-cb', sh.panel).checked : false;
        sh.close();
        onOk(v);
      };
    },
  });
}

function askDeleteTrial(tr) {
  if (!tr) return;
  const when = `${dayLabel(tr.date)}, ${tr.time}`;
  let text = `${esc(when)} · ${tr.name ? esc(tr.name) : 'без имени'} · ${esc(tr.teacher)}.<br>Строка в таблице «Пробные» очистится, пробный пропадёт из расписания преподавателя.`;
  if (tr.result) text += `<br>Итог «${esc(tr.result)}» удалится вместе с ним${tr.result === 'Записался' ? ' — и 200 сом за запись в «Зарплатах»' : ''}.`;
  confirmSheet({
    title: 'Удалить пробный?', text, ok: 'Удалить пробный',
    onOk: () => run('deleteTrial', { row: tr.row, phone: tr.phone, date: tr.date }, () => {
      S.d.trials = S.d.trials.filter((x) => x.row !== tr.row);
    }).then(() => toast('Пробный удалён')).catch(() => {}),
  });
}

function askDeleteLead(l) {
  if (!l) return;
  const tasks = S.d.tasks.filter((t) => t.leadId === l.id && !t.done && !isJunk(t)).length;
  const since = addDays((l.created || nowS()).slice(0, 10), -14);
  const p = normPhone(l.phone);
  const trials = p.length >= 11 ? S.d.trials.filter((t) => normPhone(t.phone) === p && t.date >= since) : [];
  const text = `${esc(leadLabel(l))}${l.phone ? ' · ' + esc(prettyPhone(l.phone)) : ''}.<br>Удалятся карточка${tasks ? `, история и ${tasks} ${plural(tasks, ['задача', 'задачи', 'задач'])}` : ' и история'}. Вернуть будет нельзя.`;
  confirmSheet({
    title: 'Удалить лида?', text, ok: 'Удалить лида',
    checkbox: trials.length ? {
      label: `Удалить и ${plural(trials.length, ['его пробный', 'его пробные', 'его пробные'])} из таблицы «Пробные»: ${trials.map((t) => `${esc(dayLabel(t.date))} ${esc(t.time)}`).join(', ')}`,
      checked: false,
    } : null,
    onOk: (withTrials) => {
      stack.slice().forEach((sh) => sh.close());
      run('deleteLead', { id: l.id, withTrials }, () => {
        S.d.leads = S.d.leads.filter((x) => x.id !== l.id);
        S.d.tasks = S.d.tasks.filter((t) => t.leadId !== l.id);
        if (withTrials) S.d.trials = S.d.trials.filter((t) => !trials.includes(t));
      }).then(() => toast('Лид удалён')).catch(() => {});
    },
  });
}

/* ---------- Отказ ---------- */

function openLost(id) {
  const l = leadById(id);
  openSheet(() => sheetHead('Причина отказа') + `
    <div class="chips">${radios('reason', listSetting('Причины отказа'), '')}</div>
    <div class="field"><input class="input" id="f-reason" placeholder="Или напишите своими словами"></div>
    <div class="sheet-foot"><button class="btn primary lg" id="lostBtn">Перенести в «Отказ»</button></div>`, {
    small: true,
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
    ${t ? `<div class="field"><button type="button" class="link-btn danger" id="delTask">${ic('trash', 2)}Удалить задачу</button></div>` : ''}
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
      if ($('#delTask', p)) $('#delTask', p).onclick = () => confirmSheet({
        title: 'Удалить задачу?', text: esc(t.title), ok: 'Удалить',
        onOk: () => {
          sh.close();
          run('deleteTask', { id: t.id }, () => { S.d.tasks = S.d.tasks.filter((x) => x.id !== t.id); })
            .then(() => toast('Задача удалена')).catch(() => {});
        },
      });
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
  tab(el) {
    const v = el.dataset.v;
    if (v === S.view) { window.scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'smooth' }); return; }
    const tabs = tabList();
    const dir = tabs.indexOf(v) > tabs.indexOf(S.view) ? 'left' : 'right';
    S.view = v;
    if (!S.as) lsSet(isTeacher() ? 'espada-tview' : 'espada-view', v);
    window.scrollTo(0, 0);
    render({ anim: dir });
    flash($('.tab.on svg'), 'pop');
  },
  refresh() { load(); },
  reload() { location.reload(); },
  close(el) { const sh = sheetOf(el); if (sh) sh.close(); },
  newLead() { openLeadForm(); },
  lead(el) { openLead(el.dataset.id); },
  editLead(el) { openLeadForm(el.dataset.id); },
  stage(el) {
    const v = el.dataset.v;
    if (v === S.stage) return;
    const dir = STAGES.indexOf(v) > STAGES.indexOf(S.stage) ? 'left' : 'right';
    S.stage = v;
    redrawBoard(dir, true);
  },
  mine() { S.mine = !S.mine; render({ anim: 'soft' }); },
  allTasks(el) {
    const v = el.dataset.v === '1';
    if (v === S.allTasks) return;
    S.allTasks = v;
    render({ anim: 'soft' });
  },
  task(el) { openTask(el.dataset.id); },
  addTask(el) { openTask(null, el.dataset.lead); },
  taskDone(el) {
    const t = S.d.tasks.find((x) => x.id === el.dataset.id);
    if (!t) return;
    if (t.done) { setDone(t.id, false); return; }
    const row = el.closest('.row');
    if (!row || row.classList.contains('completing')) return;
    // галочка «прорисовывается», строка зачёркивается и схлопывается — потом задача уходит на сервер
    row.classList.add('completing');
    el.classList.add('on');
    flash(el, 'pop');
    buzz(12);
    wait(reduced() ? 0 : 340).then(() => collapseOut(row)).then(() => setDone(t.id, true));
  },
  toStage(el) {
    const l = leadById(el.dataset.id), v = el.dataset.v;
    const row = el.closest('#view .row');
    if (row && v !== 'Пробный' && v !== 'Отказ') {
      row.classList.add('completing');
      collapseOut(row).then(() => changeStage(l, v));
      return;
    }
    changeStage(l, v);
  },
  book(el) { openBooking(el.dataset.id); },
  enroll(el) { openEnroll({ leadId: el.dataset.lead }); },
  trialMenu(el) {
    const tr = S.d.trials.find((x) => x.row === Number(el.dataset.row));
    if (!tr) return;
    const lead = leadByPhone(tr.phone);
    const items = [];
    if (lead) items.push({ label: 'Открыть карточку лида', onPick: () => openLead(lead.id) });
    items.push({ label: 'Удалить пробный', cls: 'danger', onPick: () => askDeleteTrial(tr) });
    pick(esc(`Пробный ${dayLabel(tr.date)}, ${tr.time} · ${tr.name || 'без имени'}`), items);
  },
  trialDel(el) { askDeleteTrial(S.d.trials.find((x) => x.row === Number(el.dataset.row))); },
  deleteLead(el) { askDeleteLead(leadById(el.dataset.id)); },
  pay(el) { const p = S.d.payments.find((x) => x.key === el.dataset.key); if (p) openPayment(p); },
  call(el) { const u = telUrl(el.dataset.phone); if (u) location.href = u; else toast('Нет телефона', { err: true }); },
  open(el) { if (el.dataset.url) window.open(el.dataset.url, '_blank'); },
  async teacherLink(el) {
    const t = (S.d.teacherBot || []).find((x) => x.name === el.dataset.name);
    if (!t) return;
    let text = `Здравствуйте, ${t.name}! Это ваш личный кабинет в «Эспаде»: расписание, ученики и их оплаты, заморозки, итоги пробных и ваша зарплата. `
      + `Откройте ссылку в Safari или Chrome и добавьте страницу на экран «Домой». Ссылка личная, не пересылайте её: ${t.cab}`;
    if (t.link && !t.linked) text += `\n\nИ подключите бота в Telegram: утром он пришлёт пробные на день, а после занятия спросит, как прошло. Откройте и нажмите «Старт»: ${t.link}`;
    if (navigator.share) {
      try { await navigator.share({ text }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
    }
    try {
      await navigator.clipboard.writeText(text);
      toast(`Приглашение для ${t.name} скопировано — отправьте его в WhatsApp или Telegram`);
    } catch {
      window.prompt('Скопируйте приглашение:', text);
    }
  },
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
    const go = () => run('setTrialResult', { row, result: v, phone: el.dataset.phone, leadId: el.dataset.lead }, () => { if (tr) tr.result = v; })
      .then((r) => {
        const nl = r.leads && r.leads[0];
        if (v === 'Записался') openEnroll({ leadId: nl ? nl.id : '', trial: tr });
        else if (nl) toast(`Итог сохранён · ${nl.stage}`);
        else toast('Итог записан в «Пробные»');
      }).catch(() => {});
    const rowEl = el.closest('#view .row');
    if (rowEl) {
      rowEl.classList.add('completing');
      buzz(8);
      collapseOut(rowEl).then(go);
    } else go();
  },
  dismiss(el) {
    const { key, title, lead } = el.dataset;
    const go = () => run('dismiss', { key, title, leadId: lead || '' }, () => {
      S.d.tasks.push({ id: 'tmp-' + Date.now(), key, title, done: true, doneAt: nowS() });
    }).catch(() => {});
    buzz(8);
    const rowEl = el.closest('.row');
    if (key.startsWith('pay|') && rowEl) {
      rowEl.classList.add('completing');
      collapseOut(rowEl).then(go);
      return;
    }
    go();
    const u = document.querySelector(`[data-act="undismiss"][data-key="${CSS.escape(key)}"]`);
    if (u && u.previousElementSibling) flash(u.previousElementSibling, 'bump');
  },
  jump(el) {
    const sec = document.getElementById(el.dataset.to);
    if (!sec) return;
    sec.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
    setTimeout(() => flash($('.section-h', sec), 'glow'), reduced() ? 0 : 380);
  },
  expand(el) {
    const k = el.dataset.k;
    const before = $$(`.list[data-list="${k}"] .row`).length;
    S.expanded[k] = true;
    render();
    staggerIn($(`.list[data-list="${k}"]`), `.row:nth-child(n+${before + 1})`, 40);
  },
  undismiss(el) {
    const key = el.dataset.key;
    run('dismiss', { key, undo: true }, () => { S.d.tasks.forEach((t) => { if (t.key === key) t.key = 'x|' + key; }); }).catch(() => {});
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

Object.assign(ACT, T_ACT); // действия кабинета преподавателя (teacher.js)

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const fn = ACT[el.dataset.act];
  if (!fn) return;
  e.preventDefault();
  e.stopPropagation();
  fn(el, e);
});
document.addEventListener('change', (e) => {
  if (!e.target.matches || !e.target.matches('[data-skin-pick]')) return;
  lsSet('espada-skin', applySkin(e.target.value));
});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applySkin(lsGet('espada-skin')));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && stack.length) return stack[stack.length - 1].close();
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '') || (e.target && e.target.isContentEditable);
  if (typing || e.metaKey || e.ctrlKey || e.altKey || !S.d || stack.length || isTeacher()) return;
  const k = e.key.toLowerCase();
  if (k === 'n' || k === 'т') { e.preventDefault(); openLeadForm(); }
  if (e.key === '/') {
    e.preventDefault();
    if (S.view !== 'board') { S.view = 'board'; lsSet('espada-view', 'board'); render(); }
    const q = $('#q'); if (q) q.focus();
  }
});

/* ============================== Уведомления ============================== */

function toast(msg, o = {}) {
  const box = $('#toast');
  while (box.children.length >= 3) box.firstElementChild.remove();
  const el = document.createElement('div');
  el.className = 'toast' + (o.err ? ' err' : '');
  el.setAttribute('role', o.err ? 'alert' : 'status');
  el.innerHTML = `<i class="t-ic">${ic(o.err ? 'alert' : 'check', 2.4)}</i><span>${esc(msg)}</span>${o.action ? `<button type="button">${esc(o.action)}</button>` : ''}`;
  let gone = false;
  const hide = () => {
    if (gone) return;
    gone = true;
    el.classList.add('out');
    setTimeout(() => el.remove(), reduced() ? 0 : 240);
  };
  if (o.action) $('button', el).onclick = (e) => { e.stopPropagation(); hide(); o.onAction(); };
  el.addEventListener('click', hide);
  box.appendChild(el);
  setTimeout(hide, o.action ? 7000 : o.err ? 5000 : 2600);
}

/* ============================== Запуск ============================== */

function boot() {
  applySkin(lsGet('espada-skin'));
  if (!CFG.demo && !(CFG.api && CFG.key)) return renderLogin();
  addChrome();
  try { const c = JSON.parse(lsGet(cacheKey()) || 'null'); if (c && (c.leads || c.role === 'teacher')) { S.d = c; render({ anim: 'fade' }); } } catch { /* кеш повреждён */ }
  if (!S.d) renderSkeleton();
  load();
  initGestures();
  setTimeout(checkUpdate, 4000);
  if (document.fonts) {
    document.fonts.ready.then(relayoutIndicators);
    if (document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', relayoutIndicators);
  }
  let rz = 0;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(relayoutIndicators, 150); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && Date.now() - S.loadedAt > 60000) load(true);
    if (document.visibilityState === 'visible') checkUpdate();
  });
  setInterval(() => { if (document.visibilityState === 'visible') load(true); }, 5 * 60000);
  let wasWide = matchMedia('(min-width: 1000px)').matches;
  addEventListener('resize', () => {
    const w = matchMedia('(min-width: 1000px)').matches;
    if (w !== wasWide) { wasWide = w; if (S.view === 'board') render(); }
  });
}
boot();
