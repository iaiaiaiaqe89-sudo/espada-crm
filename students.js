'use strict';
/*
 * Эспада CRM — ученики и архив пробных.
 *  - Карточка ученика: одна и та же у менеджера и в кабинете преподавателя. Строка из «Базы» показывается сразу,
 *    а история (оплаты, заморозки, пробный, заявка) догружается с сервера.
 *  - Вкладка «Ученики» у менеджера: все ученики всех преподавателей, поиск и фильтры.
 *  - Вкладка «Пробные» у менеджера: все пробные за всё время, итоги и конверсия по преподавателям.
 * Подключается после teacher.js и перед app.js.
 */

/* ============================== Состояние ============================== */

/** Ученики всех преподавателей (у менеджера). */
const SM = { list: null, meta: null, at: 0, loading: false, err: '', q: '', teacher: '', filter: 'live' };
/** Подробности карточек: «преподаватель|имя» → { data, err, loading, stale }. */
const SC = {};
/** Архив пробных (у менеджера). */
const AR = { list: null, at: 0, loading: false, err: '', q: '', teacher: '', result: '', period: 'month', shown: 60 };

const ST_FILTERS = [['live', 'Учатся'], ['due', 'Оплата'], ['frozen', 'Заморозка'], ['gone', 'Выбыли']];
const AR_PERIODS = [['month', 'Этот месяц'], ['prev', 'Прошлый'], ['90', '3 мес.'], ['all', 'Всё']];
const AR_RESULTS = ['Записался', 'Думает', 'Отказ', 'Не пришёл', 'Перенос'];
const RES_CLS = { 'Записался': 'green', 'Думает': 'amber', 'Перенос': '', 'Отказ': 'red', 'Не пришёл': 'red' };

const stDue = (s) => s.status !== 'Выбыл' && (['Закончился', 'Продлить', 'Долг'].includes(s.payStatus) || s.debt > 0);
const stKey = (teacher, name) => `${teacher}|${name}`;
const ddmm = (x) => (x ? x.split('-').reverse().join('.') : '—');
const monthTitle = (ym) => { const [y, m] = ym.split('-').map(Number); return `${['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'][m - 1]} ${y}`; };

/* ============================== Загрузка ============================== */

const smCache = () => cacheKey() + '-students';
function smRestore() {
  if (SM.list) return;
  try { const c = JSON.parse(lsGet(smCache()) || 'null'); if (c && c.list) { SM.list = c.list; SM.meta = c.meta; } } catch { /* кеш повреждён */ }
}
async function smLoad(force) {
  if (SM.loading || isTeacher()) return;
  if (!force && SM.at && Date.now() - SM.at < 120000) return;
  SM.loading = true; SM.err = '';
  S.busy++; updBusy();
  try {
    const r = await call('students');
    SM.list = r.students; SM.meta = r.meta; SM.at = Date.now();
    lsSet(smCache(), JSON.stringify({ list: SM.list, meta: SM.meta }));
  } catch (e) {
    SM.err = e.message;
    if (SM.list) toast(e.message, { err: true });
  } finally {
    SM.loading = false;
    S.busy--; updBusy();
  }
  if (!isTeacher()) {
    if (S.view === 'students') { const typing = document.activeElement && document.activeElement.id === 'sq'; if (typing) redrawStudents(); else render(); }
    rerenderSheets();
  }
}
async function arLoad(force) {
  if (AR.loading || isTeacher()) return;
  if (!force && AR.at && Date.now() - AR.at < 120000) return;
  AR.loading = true; AR.err = '';
  S.busy++; updBusy();
  try {
    const r = await call('trialArchive');
    AR.list = r.trials; AR.at = Date.now();
  } catch (e) {
    AR.err = e.message;
    if (AR.list) toast(e.message, { err: true });
  } finally {
    AR.loading = false;
    S.busy--; updBusy();
  }
  if (!isTeacher()) {
    if (S.view === 'trials') render();
    rerenderSheets();
  }
}
/** В «Базе» что-то поменялось (запись, оплата, итог пробного) — при следующем показе списки обновятся. */
function stDirty() {
  SM.at = 0; AR.at = 0;
  Object.values(SC).forEach((c) => { c.stale = true; });
  if (isTeacher()) return;
  if (S.view === 'students') smLoad(true);
  if (S.view === 'trials') arLoad(true);
}
/** Подробности карточки устарели — перезагрузятся, пока на экране старые. */
function stForget() { Object.values(SC).forEach((c) => { c.stale = true; }); }

async function stLoadCard(teacher, name, row) {
  const k = stKey(teacher, name);
  const c = SC[k] || (SC[k] = {});
  if (c.loading) return;
  c.loading = true; c.err = '';
  try {
    c.data = await call('tCard', { name, row: row || '', as: teacher });
    c.stale = false;
  } catch (e) {
    c.err = e.message;
    c.stale = false; // не повторять запрос по кругу — обновится при следующем открытии
  } finally {
    c.loading = false;
  }
  rerenderSheets();
}

/* ============================== С кем работаем ============================== */

/** Карточка работает и в кабинете преподавателя, и у менеджера: откуда брать список, справочники и как записывать. */
function stCtx(teacher) {
  if (isTeacher()) return { mgr: false, teacher: S.d.me, meta: S.d.meta, list: S.d.students || [], run: tRun };
  return {
    mgr: true, teacher, meta: SM.meta || {}, list: (SM.list || []).filter((s) => s.teacher === teacher),
    run: (action, payload, opt) => mRun(teacher, action, payload, opt),
  };
}
function stFindIn(ctx, name, row) {
  const c = SC[stKey(ctx.teacher, name)];
  return ctx.list.find((x) => x.name === name && (!row || x.row === row)) || ctx.list.find((x) => x.name === name && x.status !== 'Выбыл')
    || ctx.list.find((x) => x.name === name) || (c && c.data && c.data.student) || null;
}
function stFind(el) {
  const ctx = stCtx(el.dataset.teacher);
  return stFindIn(ctx, el.dataset.name, Number(el.dataset.row) || 0);
}
/** Замороженные дни ученика: в кабинете — из данных кабинета, у менеджера — из карточки. */
function stFreezes(ctx, name) {
  const c = SC[stKey(ctx.teacher, name)];
  if (c && c.data && !c.stale) return c.data.freezes.map((f) => ({ d: f.d, k: f.k, who: f.who }));
  if (!ctx.mgr) return (S.d.freezes || []).filter((f) => f.n === name).map((f) => ({ d: f.d, k: f.k }));
  return c && c.data ? c.data.freezes : [];
}

/** Изменение у менеджера: записать через действие кабинета (as = преподаватель) и обновить его учеников в списке. */
async function mRun(teacher, action, payload, optimistic) {
  const snap = SM.list ? JSON.stringify(SM.list) : null;
  if (optimistic && SM.list) { optimistic(); render(); rerenderSheets(); }
  S.busy++; updBusy();
  try {
    const r = await call(action, { ...payload, as: teacher });
    if (r.students && SM.list) {
      SM.list = SM.list.filter((s) => s.teacher !== teacher).concat(r.students.map((s) => ({ ...s, teacher })));
      lsSet(smCache(), JSON.stringify({ list: SM.list, meta: SM.meta }));
    } else if (r.students) smLoad(true);
    stForget();
    setTimeout(() => load(true), 2500); // «Сегодня → Напомнить об оплате» берёт данные из «Сводки»
    render(); rerenderSheets();
    return r;
  } catch (e) {
    if (snap) SM.list = JSON.parse(snap);
    render(); rerenderSheets();
    toast(e.message, { err: true });
    throw e;
  } finally {
    S.busy--; updBusy();
  }
}

/* ============================== Карточка ученика ============================== */

function stOpen(teacher, name, row) {
  const ctx = stCtx(teacher);
  if (ctx.mgr && !SM.list) { smRestore(); smLoad(); }
  const k = stKey(ctx.teacher, name);
  if (SC[k]) SC[k].stale = true; // при каждом открытии — свежая история
  openSheet(() => stSheet(ctx.teacher, name, row), { live: true });
}

function stSheet(teacher, name, row) {
  const ctx = stCtx(teacher);
  const k = stKey(ctx.teacher, name);
  const c = SC[k];
  if (!c || (c.stale && !c.loading)) setTimeout(() => stLoadCard(ctx.teacher, name, row), 0);
  const s = stFindIn(ctx, name, row);
  if (!s) return sheetHead('Ученик') + `<div class="list">${c && c.err ? emptyState(c.err, 'alert') : loadingState('Открываю карточку…')}</div>`;
  const d = c && c.data;
  const key = `data-teacher="${esc(ctx.teacher)}" data-name="${esc(s.name)}" data-row="${s.row}"`;
  const phone = waUrl(s.phone) ? s.phone : '';
  const grade = /^\d+$/.test(s.grade) ? s.grade + ' класс' : s.grade;

  const quick = ctx.mgr
    ? `<div class="quick">
        <button class="wa" data-act="stWa" ${key} ${phone ? '' : 'disabled'}>${ic('wa', 1.8)}WhatsApp</button>
        <button data-act="call" data-phone="${esc(s.phone)}" ${phone ? '' : 'disabled'}>${ic('phone', 1.8)}Позвонить</button>
        <button data-act="tPay" ${key}>${ic('wallet', 1.8)}Оплата</button>
        <button data-act="tEdit" ${key}>${ic('edit', 1.8)}Изменить</button>
      </div>`
    : `<div class="quick t3">
        <button data-act="tPay" ${key}>${ic('wallet', 1.8)}Оплата</button>
        <button data-act="tFreezeDay" ${key}>${ic('snow', 1.8)}Заморозка</button>
        <button data-act="tEdit" ${key}>${ic('edit', 1.8)}Изменить</button>
      </div>`;

  // напоминание об оплате — менеджеру, если пора
  let remind = '';
  if (ctx.mgr && phone && stDue(s) && S.d.settings) {
    const debt = s.payStatus === 'Долг' || (s.debt > 0 && s.payStatus !== 'Закончился' && s.payStatus !== 'Продлить');
    const text = debt ? tpl('долг', { 'имя': s.name, 'долг': money(s.debt) })
      : tpl('продление', { 'имя': s.name, 'дата': s.next ? tLong(s.next) : '' });
    remind = `<div class="st-foot">${waBtn(s.phone, text, debt ? 'Напомнить о долге' : 'Напомнить о продлении')}</div>`;
  }

  const fz = stFreezes(ctx, s.name).slice().sort((a, b) => (a.d < b.d ? 1 : -1));
  const fzChips = fz.length ? `<div class="att-hist">${fz.slice(0, 12).map((f) => `<span class="ah fz">${ic('snow', 2.2)}${esc(dayLabel(f.d))}${f.k > 1 ? ' ×' + f.k : ''}
      ${tCanFreeze(f.d) ? `<button data-act="tFreeze" data-teacher="${esc(ctx.teacher)}" data-date="${esc(f.d)}" data-name="${esc(s.name)}" data-on="0" aria-label="Снять заморозку">${ic('x', 2.6)}</button>` : ''}</span>`).join('')}</div>` : '';

  // контакты
  const contacts = `<div class="list kv">
      <div class="k">Телефон</div><div>${phone ? `<a href="${esc(telUrl(s.phone))}">${esc(prettyPhone(s.phone))}</a>` : 'не указан'}</div>
    </div>
    ${phone && !ctx.mgr ? `<div class="st-foot">${waBtn(s.phone, '', 'Написать')}${telBtn(s.phone)}</div>` : ''}`;

  // пробные
  const trials = d ? d.trials.slice().sort((a, b) => (a.date + a.time < b.date + b.time ? 1 : -1)) : [];
  const trialHtml = trials.length ? `<div class="list">${trials.slice(0, 3).map((t) => `<div class="row${ctx.mgr ? ` tap" data-act="arOpen" data-row="${t.row}` : ''}">
      <div class="tl-ic">${ic('trial', 2)}</div>
      <div class="main"><div class="title">${esc(tLong(t.date))}, ${esc(t.time)} ${t.result ? `<span class="pill ${RES_CLS[t.result] || ''}">${esc(t.result)}</span>` : ''}</div>
        <div class="meta">${esc([t.teacher, (t.format || '').toLowerCase()].filter(Boolean).join(' · '))}</div>
        ${t.comment ? `<div class="t-note">${esc(t.comment)}</div>` : ''}</div></div>`).join('')}</div>` : '';

  return sheetHead('') + `
    <div class="lead-head s-won">
      <div class="ava" aria-hidden="true">${esc(s.name.trim()[0] || '?')}</div>
      <div class="lh"><div class="nm">${esc(s.name)}</div>
        <div class="info">${ctx.mgr ? `<span class="pill accent">${esc(ctx.teacher)}</span>` : ''}
          ${[grade, s.format, (s.onl || '').toLowerCase()].filter(Boolean).map(esc).join(' · ')}</div></div>
    </div>
    ${quick}
    <section class="section"><div class="section-h"><h2>Статус</h2></div>
      <div class="seg t-status">${(ctx.meta.statuses || ST_STATUSES).map((v) => `<button type="button" class="chip-btn ${s.status === v ? 'on' : ''}" data-act="tStatus" ${key} data-v="${esc(v)}">${esc(v)}</button>`).join('')}</div></section>
    <section class="section"><div class="section-h"><h2>Оплата</h2>${tPayPill(s)}</div><div class="list kv">
      <div class="k">Цена абонемента</div><div>${s.price ? money(s.price) + ' сом' : '—'}</div>
      <div class="k">Оплачено</div><div>${money(s.paid)} сом${s.debt > 0 ? ` · <span style="color:var(--red)">долг ${money(s.debt)}</span>` : ''}</div>
      <div class="k">Дата оплаты</div><div>${esc(ddmm(s.payDate))}</div>
      <div class="k">Следующая оплата</div><div>${esc(s.next ? ddmm(s.next) : s.nextText || '—')}</div>
      <div class="k">Занятий в абонементе</div><div>${esc(s.lessons || '12')}</div>
      <div class="k">Заморозки</div><div class="fz-count">
        <button class="btn" data-act="tFrCount" ${key} data-v="-1" aria-label="Меньше" ${s.freezes ? '' : 'disabled'}>−</button>
        <b>${s.freezes || 0}</b> ${plural(s.freezes || 0, ['занятие', 'занятия', 'занятий'])}
        <button class="btn" data-act="tFrCount" ${key} data-v="1" aria-label="Больше">+</button></div>
    </div>${remind}</section>
    ${fz.length || ctx.mgr ? tSec('Замороженные дни', fz.length || null, `${fzChips ? `<div class="list">${fzChips}</div>` : ''}
      ${ctx.mgr ? `<div class="st-foot"><button class="btn" data-act="tFreezeDay" ${key}>${ic('snow', 2)}Заморозить день</button></div>` : ''}`) : ''}
    <section class="section"><div class="section-h"><h2>Занятия</h2></div><div class="list kv">
      ${ctx.mgr ? `<div class="k">Преподаватель</div><div>${esc(ctx.teacher)}</div>` : ''}
      <div class="k">Дни и время</div><div>${esc([s.days, s.time].filter(Boolean).join(' в ') || '—')}</div>
      <div class="k">Формат</div><div>${esc([s.format, (s.onl || '').toLowerCase()].filter(Boolean).join(', ') || '—')}</div>
      ${!ctx.mgr ? `<div class="k">ЗП за неделю</div><div>${s.zp ? `${money(s.zp)} сом${s.zpLessons ? ` · ${s.zpLessons} ${plural(s.zpLessons, ['урок', 'урока', 'уроков'])}` : ''}` : '—'}</div>` : ''}
      ${s.comment ? `<div class="k">Комментарий</div><div style="white-space:pre-wrap">${esc(s.comment)}</div>` : ''}
    </div></section>
    ${tSec('Контакты', null, contacts)}
    ${trialHtml ? tSec(trials.length > 1 ? 'Пробные занятия' : 'Пробное занятие', trials.length > 1 ? trials.length : null, trialHtml) : ''}
    ${tSec('История', null, stHistory(c, s))}
    ${!ctx.mgr ? `<div class="sheet-foot"><button class="btn lg" data-act="tMsg" data-student="${esc(s.name)}">${ic('send', 2)}Сообщить менеджеру</button></div>` : ''}`;
}

/** Лента событий: оплаты, заморозки, пробные — от новых к старым. */
function stHistory(c, s) {
  if (!c || (!c.data && !c.err)) return `<div class="list">${loadingState('Загружаю историю…')}</div>`;
  if (!c.data) return `<div class="list">${emptyState(c.err, 'alert')}</div>`;
  const d = c.data, ev = [];
  d.payments.forEach((p) => ev.push({ at: p.at, ic: 'wallet', cls: p.undone ? 'undone' : '',
    title: `${p.type} · ${money(p.sum)} сом${p.undone ? ' (отменена)' : ''}`, meta: p.who }));
  d.freezes.forEach((f) => ev.push({ at: f.d, ic: 'snow', title: `Заморозка${f.k > 1 ? ' ×' + f.k : ''}`, meta: f.who ? 'отметил(а) ' + f.who : '' }));
  d.trials.forEach((t) => ev.push({ at: t.date + 'T' + (t.time || '00:00'), ic: 'trial', title: `Пробный${t.result ? ' — ' + t.result.toLowerCase() : ''}`, meta: t.teacher }));
  if (s.payDate && !d.payments.some((p) => !p.undone && p.at.slice(0, 10) === s.payDate)) {
    ev.push({ at: s.payDate + 'T00:00', ic: 'wallet', title: `Оплата абонемента${s.paid ? ' · ' + money(s.paid) + ' сом' : ''}`, meta: 'дата оплаты в «Базе»' });
  }
  if (!ev.length) return `<div class="list">${emptyState('Пока ничего не записано', 'clock')}</div>`;
  ev.sort((a, b) => (a.at < b.at ? 1 : -1));
  const yr = String(new Date().getFullYear());
  const when = (at) => {
    const day = at.slice(0, 10), t = at.slice(11, 16);
    const dl = dayLabel(day);
    return `${dl}${day.slice(0, 4) !== yr ? ' ' + day.slice(0, 4) : ''}${t && t !== '00:00' ? ', ' + t : ''}`;
  };
  return `<div class="list st-tl">${ev.slice(0, 30).map((e) => `<div class="row ${e.cls || ''}">
      <div class="tl-ic">${ic(e.ic, 2)}</div>
      <div class="main"><div class="title">${esc(e.title)}</div><div class="meta">${esc([when(e.at), e.meta].filter(Boolean).join(' · '))}</div></div>
    </div>`).join('')}</div>`;
}

/* ============================== Вкладка «Ученики» (менеджер) ============================== */

function stRow(s, o = {}) {
  const rest = [s.next && s.payStatus !== '—' ? 'до ' + tLong(s.next) : s.nextText, s.freezes ? `заморозок: ${s.freezes}` : '']
    .filter(Boolean).map(esc).join(' · ');
  const pill = tPayPill(s);
  return `<div class="row tap" data-act="stOpen" data-teacher="${esc(s.teacher)}" data-name="${esc(s.name)}" data-row="${s.row}">
    <div class="ava-s" aria-hidden="true">${esc(s.name.trim()[0] || '?')}</div>
    <div class="main">
      <div class="title">${esc(s.name)} ${s.grade ? `<span class="pill">${esc(gr(s.grade))}</span>` : ''}</div>
      <div class="meta">${[o.teacher ? s.teacher : '', s.format, (s.onl || '').toLowerCase(), [s.days, s.time].filter(Boolean).join(' '), o.phone && s.phone ? prettyPhone(s.phone) : '']
        .filter(Boolean).map(esc).join(' · ')}</div>
      ${pill || rest ? `<div class="meta t-pay">${pill}${pill && rest ? ' ' : ''}${rest}</div>` : ''}
    </div>
  </div>`;
}

function stFiltered() {
  const q = SM.q.trim().toLowerCase(), qd = q.replace(/\D/g, '');
  return (SM.list || []).filter((s) => {
    if (SM.teacher && s.teacher !== SM.teacher) return false;
    if (q) {
      const hit = s.name.toLowerCase().includes(q) || (qd.length >= 3 && normPhone(s.phone).includes(qd.replace(/^0/, '')));
      if (!hit) return false;
    } else if (SM.filter === 'live' && s.status !== 'Учится') return false;
    if (!q && SM.filter === 'due' && !stDue(s)) return false;
    if (!q && SM.filter === 'frozen' && s.status !== 'Заморозка') return false;
    if (!q && SM.filter === 'gone' && s.status !== 'Выбыл') return false;
    return true;
  });
}

function stListInner() {
  if (!SM.list) {
    return `<section class="section"><div class="list">${SM.err ? emptyState(SM.err, 'alert') : loadingState('Загружаю учеников из «Базы учеников»…')}</div></section>`;
  }
  const items = stFiltered();
  const q = SM.q.trim();
  const empty = q ? `Никого не нашлось по «${q}»` : { live: 'Здесь пока никого', due: 'Все оплатили — напоминать некому', frozen: 'В заморозке никого', gone: 'Выбывших нет' }[SM.filter];
  if (!items.length) return `<section class="section"><div class="list">${emptyState(empty, q ? 'search' : 'users')}</div></section>`;
  const byName = (a, b) => a.name.localeCompare(b.name, 'ru');
  const byNext = (a, b) => ((a.next || '9') < (b.next || '9') ? -1 : (a.next || '9') > (b.next || '9') ? 1 : byName(a, b));
  const sort = SM.filter === 'due' && !q ? byNext : byName;
  if (q || SM.teacher) {
    return `<section class="section"><div class="list">${items.sort(sort).map((s) => stRow(s, { teacher: !SM.teacher, phone: !!q })).join('')}</div></section>`;
  }
  const order = (SM.meta && SM.meta.teachers) || [...new Set(items.map((s) => s.teacher))];
  return `<div class="st-groups">${order.map((t) => {
    const list = items.filter((s) => s.teacher === t).sort(sort);
    return list.length ? tSec(esc(t), list.length, `<div class="list">${list.map((s) => stRow(s)).join('')}</div>`) : '';
  }).join('')}</div>`;
}
function redrawStudents() {
  const w = $('#stWrap');
  if (!w) return render();
  w.innerHTML = stListInner();
}

function viewStudents() {
  smRestore();
  smLoad();
  const all = SM.list || [];
  const live = all.filter((s) => s.status !== 'Выбыл');
  const due = live.filter(stDue);
  const frozen = all.filter((s) => s.status === 'Заморозка');
  const debt = live.reduce((n, s) => n + (s.debt > 0 ? s.debt : 0), 0);
  const stat = (n, forms, f, warn, cls = '') => `<button type="button" class="stat ${warn ? 'warn' : ''} ${cls}" data-act="stFilter" data-v="${f}">
    <b>${n}</b><span>${typeof forms === 'string' ? forms : plural(n, forms)}</span></button>`;
  const teachers = (SM.meta && SM.meta.teachers) || [...new Set(all.map((s) => s.teacher))];
  const counts = (t) => all.filter((s) => s.teacher === t && s.status !== 'Выбыл').length;
  return `<div class="hello">
      ${stat(all.filter((s) => s.status === 'Учится').length, ['учится', 'учатся', 'учатся'], 'live')}
      ${stat(due.length, ['оплата', 'оплаты', 'оплат'], 'due', due.length)}
      ${stat(money(debt), 'долг, сом', 'due', debt, 'sm')}
      ${stat(frozen.length, 'заморозка', 'frozen')}
    </div>
    <div class="toolbar">
      <label class="search">${ic('search')}<input id="sq" type="search" placeholder="Имя или телефон" value="${esc(SM.q)}" autocomplete="off"></label>
      <button class="toggle" data-act="stNew">+ Ученик</button>
    </div>
    <div class="st-filters">
      <div class="seg t-status">${ST_FILTERS.map(([v, l]) => `<button type="button" class="chip-btn ${SM.filter === v ? 'on' : ''}" data-act="stFilter" data-v="${v}">${l}</button>`).join('')}</div>
      ${teachers.length > 1 ? `<div class="chips nowrap st-teachers">
        <button type="button" class="chip-btn ${!SM.teacher ? 'on' : ''}" data-act="stTeacher" data-v="">Все</button>
        ${teachers.map((t) => `<button type="button" class="chip-btn ${SM.teacher === t ? 'on' : ''}" data-act="stTeacher" data-v="${esc(t)}">${esc(t)} <small>${counts(t)}</small></button>`).join('')}
      </div>` : ''}
    </div>
    <div id="stWrap">${stListInner()}</div>
    <p class="hint">Нажмите на ученика — откроется карточка: оплата, заморозки, контакты, пробный и история. Всё, что меняете, сразу записывается в «Базу учеников».</p>`;
}

/* ============================== Вкладка «Пробные» (менеджер) ============================== */

function arRange() {
  const t = todayS();
  const m0 = t.slice(0, 8) + '01';
  if (AR.period === 'month') return [m0, '9999'];
  if (AR.period === 'prev') { const p = addDays(m0, -1); return [p.slice(0, 8) + '01', p]; }
  if (AR.period === '90') return [addDays(t, -90), '9999'];
  return ['0000', '9999'];
}
function arInPeriod() {
  const [a, b] = arRange();
  return (AR.list || []).filter((x) => x.date >= a && x.date <= b);
}
function arFiltered() {
  const t = todayS(), q = AR.q.trim().toLowerCase(), qd = q.replace(/\D/g, '');
  const src = AR.result === '+' || q ? AR.list || [] : arInPeriod();
  return src.filter((x) => {
    if (AR.teacher && x.teacher !== AR.teacher) return false;
    if (AR.result === '+' && (x.date < t || x.result)) return false;
    else if (AR.result === '—' && (x.result || x.date >= t)) return false;
    else if (AR.result && AR.result !== '+' && AR.result !== '—' && x.result !== AR.result) return false;
    if (!q) return true;
    return (x.name || '').toLowerCase().includes(q) || (qd.length >= 3 && normPhone(x.phone).includes(qd.replace(/^0/, '')));
  }).sort((a, b) => ((a.date + a.time < b.date + b.time ? -1 : 1) * (AR.result === '+' ? 1 : -1)));
}
/** Итоги: только прошедшие пробные, «Перенос» не считаем. */
function arCount(list) {
  const t = todayS();
  const past = list.filter((x) => x.date <= t && x.result !== 'Перенос');
  const won = past.filter((x) => x.result === 'Записался').length;
  const judged = past.filter((x) => x.result).length;
  return { n: past.length, won, judged, pct: judged ? Math.round((won / judged) * 100) : null,
    noShow: past.filter((x) => x.result === 'Не пришёл').length, open: past.filter((x) => !x.result && x.date < t).length };
}
const pctTxt = (c) => (c.pct == null ? '—' : c.pct + '%');

function arRow(x) {
  const t = todayS(), tm = addDays(t, 1);
  const pill = x.result ? `<span class="pill ${RES_CLS[x.result] || ''}">${esc(x.result)}</span>`
    : x.date < t ? '<span class="pill red">нет итога</span>' : x.date === t ? '<span class="pill amber">сегодня</span>'
      : x.date === tm ? '<span class="pill">завтра</span>' : '<span class="pill">впереди</span>';
  return `<div class="row tap" data-act="arOpen" data-row="${x.row}">
    <div class="time-col ar-date"><b>${parseD(x.date).getDate()}</b><span>${MON[parseD(x.date).getMonth()]}</span></div>
    <div class="main">
      <div class="title">${x.name ? esc(x.name) : NONAME} ${x.grade ? `<span class="pill">${esc(gr(x.grade))}</span>` : ''} ${pill}
        ${x.base ? `<span class="pill accent">в Базе</span>` : ''}</div>
      <div class="meta">${esc([`${WD[parseD(x.date).getDay()]} ${x.time}`, x.teacher, (x.format || '').toLowerCase(), prettyPhone(x.phone)].filter(Boolean).join(' · '))}</div>
    </div>
  </div>`;
}
function arListInner() {
  if (!AR.list) return `<div class="list">${AR.err ? emptyState(AR.err, 'alert') : loadingState('Загружаю все пробные…')}</div>`;
  const t = todayS(), q = AR.q.trim();
  const items = arFiltered();
  if (AR.result === '+') {
    if (!items.length) return `<div class="list">${emptyState(q ? `Ничего не нашлось по «${q}»` : 'Предстоящих пробных нет', 'trial')}</div>`;
    const shown = items.slice(0, AR.shown);
    return tSec('Предстоящие', items.length, `<div class="list">${shown.map(arRow).join('')}</div>`)
      + (items.length > shown.length ? `<button type="button" class="more-btn ar-more" data-act="arMore">Показать ещё · ${items.length - shown.length}${ic('chev', 2.4)}</button>` : '');
  }
  const splitUpcoming = !q && AR.result === '' && AR.period !== 'prev';
  const upcoming = splitUpcoming
    ? (AR.list || []).filter((x) => x.date >= t && !x.result && (!AR.teacher || x.teacher === AR.teacher))
      .sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1))
    : [];
  const rest = splitUpcoming ? items.filter((x) => !(x.date >= t && !x.result)) : items;
  if (!upcoming.length && !rest.length) {
    return `<div class="list">${emptyState(q ? `Ничего не нашлось по «${q}»` : 'За этот период пробных нет', 'trial')}</div>`;
  }
  const shown = rest.slice(0, AR.shown);
  const groups = [];
  shown.forEach((x) => {
    const ym = x.date.slice(0, 7);
    let g = groups[groups.length - 1];
    if (!g || g.ym !== ym) groups.push(g = { ym, list: [] });
    g.list.push(x);
  });
  const total = (ym) => rest.filter((x) => x.date.slice(0, 7) === ym).length;
  const upAll = S.expanded.arUpcoming || upcoming.length <= 6;
  const upHtml = upcoming.length
    ? tSec('Предстоящие', upcoming.length, `<div class="list" data-list="arUpcoming">${(upAll ? upcoming : upcoming.slice(0, 5)).map(arRow).join('')}${upAll ? ''
      : `<button type="button" class="more-btn" data-act="expand" data-k="arUpcoming">Показать все · ${upcoming.length}${ic('chev', 2.4)}</button>`}</div>`)
    : '';
  return upHtml
    + groups.map((g) => tSec(esc(monthTitle(g.ym)), total(g.ym), `<div class="list">${g.list.map(arRow).join('')}</div>`)).join('')
    + (rest.length > shown.length ? `<button type="button" class="more-btn ar-more" data-act="arMore">Показать ещё · ${rest.length - shown.length}${ic('chev', 2.4)}</button>` : '');
}
function redrawArchive() {
  const w = $('#arWrap');
  if (!w) return render();
  w.innerHTML = arListInner();
}

function viewTrials() {
  arLoad();
  const t = todayS();
  const list = arInPeriod();
  const c = arCount(AR.teacher ? list.filter((x) => x.teacher === AR.teacher) : list);
  const upcomingCount = (AR.list || []).filter((x) => x.date >= t && !x.result && (!AR.teacher || x.teacher === AR.teacher)).length;
  const teachers = [...new Set([...(S.d.teachers || []), ...(AR.list || []).map((x) => x.teacher).filter(Boolean)])];
  const stat = (n, label, res, warn, cls = '') => `<button type="button" class="stat ${warn ? 'warn' : ''} ${cls}" data-act="arResult" data-v="${res}">
    <b>${n}</b><span>${label}</span></button>`;
  const byT = teachers.map((tc) => [tc, arCount(list.filter((x) => x.teacher === tc))]).filter(([, v]) => v.n);
  const months = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
    const ym = `${d.getFullYear()}-${p2(d.getMonth() + 1)}`;
    const v = arCount((AR.list || []).filter((x) => x.date.slice(0, 7) === ym && (!AR.teacher || x.teacher === AR.teacher)));
    if (v.n || i === 0) months.push([ym, v]);
  }
  const table = (head, rows) => `<div class="list"><table class="table"><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`;
  const tTable = byT.length ? tSec('По преподавателям', null, table(['Преподаватель', 'Пробных', 'Записались', '%'],
    byT.sort((a, b) => b[1].n - a[1].n).map(([tc, v]) => `<tr class="tap ${AR.teacher === tc ? 'on' : ''}" data-act="arTeacher" data-v="${esc(tc)}"><td>${esc(tc)}</td><td>${v.n}</td><td>${v.won}</td><td>${pctTxt(v)}</td></tr>`).join(''))) : '';
  const mTable = AR.list ? tSec('По месяцам', null, table(['Месяц', 'Пробных', 'Записались', '%'],
    months.map(([ym, v]) => `<tr><td>${esc(monthTitle(ym))}</td><td>${v.n}</td><td>${v.won}</td><td>${pctTxt(v)}</td></tr>`).join(''))) : '';
  return `<div class="hello">
      ${stat(upcomingCount, 'впереди', '+')}
      ${stat(c.open, 'без итога', '—', c.open)}
      ${stat(pctTxt(c), 'записались', 'Записался')}
      ${stat(c.n, plural(c.n, ['пробный', 'пробных', 'пробных']), '')}
    </div>
    <div class="toolbar">
      <label class="search">${ic('search')}<input id="aq" type="search" placeholder="Имя или телефон — по всем пробным" value="${esc(AR.q)}" autocomplete="off"></label>
      <button class="toggle" data-act="newTrial">+ Пробный</button>
    </div>
    <div class="st-filters">
      <div class="seg t-status">${AR_PERIODS.map(([v, l]) => `<button type="button" class="chip-btn ${AR.period === v ? 'on' : ''}" data-act="arPeriod" data-v="${v}">${l}</button>`).join('')}</div>
      <div class="chips nowrap st-teachers">
        <button type="button" class="chip-btn ${!AR.teacher ? 'on' : ''}" data-act="arTeacher" data-v="">Все</button>
        ${teachers.map((tc) => `<button type="button" class="chip-btn ${AR.teacher === tc ? 'on' : ''}" data-act="arTeacher" data-v="${esc(tc)}">${esc(tc)}</button>`).join('')}
      </div>
      <div class="chips nowrap st-teachers">
        <button type="button" class="chip-btn ${!AR.result ? 'on' : ''}" data-act="arResult" data-v="">Все итоги</button>
        <button type="button" class="chip-btn ${AR.result === '+' ? 'on' : ''}" data-act="arResult" data-v="+">Впереди</button>
        ${[...AR_RESULTS, '—'].map((r) => `<button type="button" class="chip-btn ${AR.result === r ? 'on' : ''}" data-act="arResult" data-v="${esc(r)}">${r === '—' ? 'Без итога' : esc(r)}</button>`).join('')}
      </div>
    </div>
    <div class="t-cols t-flip">
      <div>${tTable}<div class="desk-only">${mTable}</div></div>
      <div id="arWrap">${arListInner()}</div>
    </div>
    <p class="hint">Здесь все пробные из листа «Пробные». «В Базе» — ребёнок уже есть в «Базе учеников». Процент записавшихся считается по прошедшим пробным с итогом, без переносов.</p>`;
}

function arSheet(row) {
  const x = trialByRow(row);
  if (!x) {
    if (!AR.list && !AR.err) {
      setTimeout(() => arLoad(), 0);
      return sheetHead('Пробный') + `<div class="list">${loadingState('Загружаю пробный…')}</div>`;
    }
    return sheetHead('Пробный') + `<div class="list">${emptyState(AR.err || 'Пробный не найден — обновите страницу', 'alert')}</div>`;
  }
  const t = todayS();
  const phone = waUrl(x.phone) ? x.phone : '';
  const base = x.base || (SM.list && (
    (normPhone(x.phone).length >= 11 && SM.list.find((s) => normPhone(s.phone) === normPhone(x.phone)))
    || SM.list.find((s) => s.teacher === x.teacher && s.name.toLowerCase() === (x.name || '').toLowerCase())
  )) || null;
  const tasks = trialTasks(x.row);
  const head = `<div class="lead-head s-trial">
      <div class="ava" aria-hidden="true">${x.name ? esc(x.name.trim()[0]) : ic('trial', 2)}</div>
      <div class="lh"><div class="nm">${x.name ? esc(x.name) : 'Без имени'}</div>
        <div class="info">${x.result ? `<span class="pill ${RES_CLS[x.result] || ''}">${esc(x.result)}</span>` : ''}
          ${[/^\d+$/.test(x.grade) ? x.grade + ' класс' : x.grade, (x.format || '').toLowerCase()].filter(Boolean).map(esc).join(' · ')}</div></div>
    </div>`;
  const quick = `<div class="quick">
      <button class="wa" data-act="trialWa" data-row="${x.row}" ${phone ? '' : 'disabled'}>${ic('wa', 1.8)}WhatsApp</button>
      <button data-act="call" data-phone="${esc(x.phone)}" ${phone ? '' : 'disabled'}>${ic('phone', 1.8)}Позвонить</button>
      <button data-act="addTask" data-trial="${x.row}">${ic('task', 1.8)}Задача</button>
      ${base ? `<button data-act="stOpen" data-teacher="${esc(base.teacher)}" data-name="${esc(base.name)}">${ic('users', 1.8)}Ученик</button>`
        : `<button data-act="arEnroll" data-row="${x.row}">${ic('plus', 1.8)}В Базу</button>`}
    </div>`;
  let res = '';
  if (x.date <= t) {
    res = tSec('Итог', null, `<div class="chips">${RESULTS.map((r) => `<button type="button" class="chip-btn ${x.result === r ? 'on' : ''}" data-act="arRes" data-row="${x.row}" data-v="${esc(r)}">${esc(r)}</button>`).join('')}</div>`);
  }
  const enroll = x.result === 'Записался' && !base
    ? `<section class="section"><div class="list"><div class="row"><div class="main"><div class="title">Записался, но в «Базе» его нет</div>
        <div class="meta">Добавьте ученика — он появится у преподавателя в расписании и в списке учеников.</div>
        <div class="actions"><button class="btn primary" data-act="arEnroll" data-row="${x.row}">Добавить в Базу</button></div></div></div></div></section>` : '';
  const actFoot = !x.result
    ? `<div class="st-foot"><button class="btn" data-act="rescheduleTrial" data-row="${x.row}">Перенести</button></div>`
    : ['Перенос', 'Не пришёл', 'Думает'].includes(x.result)
      ? `<div class="st-foot"><button class="btn" data-act="rebookTrial" data-row="${x.row}">Записать ещё раз</button></div>` : '';
  return sheetHead('') + head + quick + enroll + res + `
    <section class="section"><div class="section-h"><h2>Занятие</h2><button class="link" data-act="editTrial" data-row="${x.row}">Изменить</button></div><div class="list kv">
      <div class="k">Когда</div><div>${esc(tDayTitle(x.date))}, ${esc(x.time)}</div>
      <div class="k">Преподаватель</div><div>${esc(x.teacher || '—')}</div>
      <div class="k">Формат</div><div>${esc(x.format || '—')}</div>
      <div class="k">Телефон</div><div>${phone ? `<a href="${esc(telUrl(x.phone))}">${esc(prettyPhone(x.phone))}</a>` : '—'}</div>
      ${x.who ? `<div class="k">Записал(а)</div><div>${esc(x.who)}</div>` : ''}
      ${base ? `<div class="k">В Базе</div><div><a data-act="stOpen" data-teacher="${esc(base.teacher)}" data-name="${esc(base.name)}">${esc(base.teacher)}${base.status && base.status !== 'Учится' ? ' · ' + esc(base.status.toLowerCase()) : ''}</a></div>` : ''}
    </div>${actFoot}</section>
    ${tasks.length ? `<section class="section"><div class="section-h"><h2>Задачи</h2><button class="link" data-act="addTask" data-trial="${x.row}">+ Добавить</button></div>
      <div class="list">${tasks.map((tk) => taskRow(tk, { inTrial: true })).join('')}</div></section>` : ''}
    ${x.comment ? tSec('Комментарий и отзыв преподавателя', null, `<div class="list"><div class="log">${esc(x.comment)}</div></div>`) : ''}
    <section class="section del-zone"><button class="btn danger del-btn" data-act="trialDel" data-row="${x.row}">${ic('trash', 2)}Удалить пробный</button></section>`;
}

/* ============================== Действия ============================== */

const ST_ACT = {
  stOpen(el) {
    const sh = sheetOf(el);
    if (sh && el.closest('.quick')) sh.close();
    stOpen(el.dataset.teacher, el.dataset.name, Number(el.dataset.row) || 0);
  },
  stFilter(el) {
    const v = el.dataset.v;
    if (SM.filter === v && !SM.q) return;
    SM.filter = v; SM.q = '';
    render({ anim: 'soft' });
  },
  stTeacher(el) {
    const v = el.dataset.v;
    if (SM.teacher === v) return;
    SM.teacher = v;
    render({ anim: 'soft' });
  },
  stNew() { openEnroll({ teacher: SM.teacher }); },
  stWa(el) {
    const s = stFind(el);
    if (!s || !waUrl(s.phone)) return toast('Нет телефона', { err: true });
    const open = (text) => window.open(waUrl(s.phone, text), '_blank');
    const items = [{ label: 'Просто открыть чат', onPick: () => open('') }];
    if (s.next) items.push({ label: 'Напомнить о продлении', note: 'оплата ' + tLong(s.next), onPick: () => open(tpl('продление', { 'имя': s.name, 'дата': tLong(s.next) })) });
    if (s.debt > 0) items.push({ label: 'Напомнить о долге', note: money(s.debt) + ' сом', onPick: () => open(tpl('долг', { 'имя': s.name, 'долг': money(s.debt) })) });
    pick('WhatsApp', items);
  },
  waTo(el) { const u = waUrl(el.dataset.phone); if (u) window.open(u, '_blank'); else toast('Нет телефона', { err: true }); },
  arOpen(el) { const row = Number(el.dataset.row); openSheet(() => arSheet(row), { live: true }); },
  arPeriod(el) { if (AR.period === el.dataset.v) return; AR.period = el.dataset.v; AR.shown = 60; render({ anim: 'soft' }); },
  arTeacher(el) { const v = AR.teacher === el.dataset.v ? '' : el.dataset.v; AR.teacher = v; AR.shown = 60; render({ anim: 'soft' }); },
  arResult(el) { const v = AR.result === el.dataset.v ? '' : el.dataset.v; AR.result = v; AR.shown = 60; render({ anim: 'soft' }); },
  arMore() { AR.shown += 100; redrawArchive(); },
  arRes(el) {
    const row = Number(el.dataset.row), v = el.dataset.v;
    const x = trialByRow(row);
    if (!x || x.result === v) return;
    const before = x.result;
    const touch = (val) => {
      if (AR.list) { const a = AR.list.find((t) => t.row === row); if (a) a.result = val; }
      if (S.d && S.d.trials) { const s = S.d.trials.find((t) => t.row === row); if (s) s.result = val; }
    };
    touch(v);
    buzz(8);
    render(); rerenderSheets();
    run('setTrialResult', { row, result: v, phone: x.phone })
      .then(() => {
        if (v === 'Записался' && !x.base) {
          const sh = sheetOf(el); if (sh) sh.close();
          openEnroll({ trial: x });
        } else toast('Итог записан в «Пробные»');
      })
      .catch(() => { touch(before); render(); rerenderSheets(); });
  },
  arEnroll(el) {
    const x = trialByRow(Number(el.dataset.row));
    if (!x) return;
    const sh = sheetOf(el); if (sh) sh.close();
    openEnroll({ trial: x });
  },
};
