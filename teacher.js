'use strict';
/*
 * Эспада CRM — кабинет преподавателя: расписание, пробные, ученики, оплаты, заморозки и зарплата.
 * Это тот же сайт, что у менеджеров: режим включается, когда сервер отвечает role: 'teacher'
 * (личная ссылка преподавателя) или когда менеджер открывает кабинет из «Ещё → Преподаватели».
 * Файл подключается перед app.js и пользуется его функциями только во время работы, не при загрузке.
 */

const T_TABS = ['tday', 'ttrial', 'tstud', 'tzp', 'tmore'];
const T_TITLES = { tday: 'Расписание', ttrial: 'Пробные', tstud: 'Ученики', tzp: 'Зарплата', tmore: 'Ещё' };
const T_TAB_IC = { tday: 'today', ttrial: 'trial', tstud: 'users', tzp: 'wallet', tmore: 'more' };
const T_PAY = { 'Оплачено': 'green', 'Продлить': 'amber', 'Закончился': 'red', 'Долг': 'red', 'Заморозка': 'accent' };
const T_HOURS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];
const TS = { day: '', gone: false, q: '' };

const isTeacher = () => !!(S.d && S.d.role === 'teacher');

/* ============================== Выборки ============================== */

const tNowHM = () => { const d = new Date(); return `${p2(d.getHours())}:${p2(d.getMinutes())}`; };
/** Занятие уже началось (можно ставить итог пробного). */
const tStarted = (date, time) => date < todayS() || (date === todayS() && (time || '00:00') <= tNowHM());
const tWeekStart = (s) => addDays(s, -((parseD(s).getDay() + 6) % 7));
const tByTime = (a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0);
const tByDT = (a, b) => (a.date + a.time < b.date + b.time ? -1 : 1);
const tLong = (s) => { const d = parseD(s); return `${d.getDate()} ${MONF[d.getMonth()]}`; };
const tDayTitle = (s) => { const d = parseD(s); return `${WDF[d.getDay()]}, ${d.getDate()} ${MONF[d.getMonth()]}`; };
const tTypeLabel = (type, n) => (/^Гр/.test(type) ? 'Группа' : type === 'Пара' || type === 'Инд' ? type : n > 2 ? 'Группа' : n === 2 ? 'Пара' : 'Занятие');
const tStudent = (name) => (S.d.students || []).find((s) => s.name === name && s.status !== 'Выбыл') || (S.d.students || []).find((s) => s.name === name);
const tFrozen = (date, name) => (S.d.freezes || []).some((f) => f.d === date && f.n === name);
/** На какие дни можно ставить заморозку: месяц назад — три месяца вперёд. */
const tCanFreeze = (date) => date >= addDays(todayS(), -31) && date <= addDays(todayS(), 92);
const tPayPill = (s) => (s.payStatus && s.payStatus !== '—'
  ? `<span class="pill ${T_PAY[s.payStatus] || ''}">${esc(s.payStatus)}${s.payStatus === 'Долг' && s.debt ? ' ' + money(s.debt) : ''}</span>` : '');

/** «5 чел.: Айдай 11 кл, Адина 7 кл онл» → [{ name, grade, onl, st }]. */
function tParseWho(who) {
  const s = String(who || '').replace(/^\s*\d+\s*чел\.?\s*:?\s*/, '').trim();
  if (!s || s === '…') return [];
  return s.split(/\s*,\s*/).filter(Boolean).map((x) => {
    const onl = /\sонл\.?$/.test(x);
    x = x.replace(/\sонл\.?$/, '');
    const m = x.match(/^(.*?)\s+(\d+)\s*кл\.?$/);
    const name = (m ? m[1] : x).trim();
    return { name, grade: m ? m[2] : '', onl, st: tStudent(name) };
  });
}

/** Занятия в этот день по постоянной сетке (без пустых часов). */
function tLessons(date) {
  const dow = parseD(date).getDay();
  if (!dow || !S.d.grid) return [];
  return (S.d.grid.slots || []).filter((s) => s.dow === dow && s.type !== 'Не работает')
    .map((s) => ({ time: s.time, type: s.type, kids: tParseWho(s.who) }))
    .filter((l) => l.kids.length)
    .sort(tByTime);
}
const tTrialsOn = (date) => S.d.trials.filter((t) => t.date === date && t.result !== 'Перенос').sort(tByTime);
/** Пробные, у которых пора поставить итог (за две недели). */
const tNeedResult = () => S.d.trials.filter((t) => !t.result && tStarted(t.date, t.time) && t.date >= addDays(todayS(), -14)).sort(tByDT);
const tActive = () => (S.d.students || []).filter((s) => s.status !== 'Выбыл');
function tBadges() {
  return { ttrial: tNeedResult().length, tstud: tActive().filter((s) => s.payStatus === 'Закончился' || s.payStatus === 'Долг').length };
}

/* ============================== Экраны ============================== */

const tSec = (title, count, body, extra = '') =>
  `<section class="section"><div class="section-h"><h2>${title}</h2>${count != null ? `<span class="count">${count}</span>` : ''}${extra}</div>${body}</section>`;
const tStat = (n, forms, warn, cls = '') => `<div class="stat ${warn ? 'warn' : ''} ${cls}"><b>${n}</b><span>${typeof forms === 'string' ? forms : plural(n, forms)}</span></div>`;

function tViewDay() {
  const t = todayS();
  if (!TS.day) TS.day = t;
  const day = TS.day;
  const ws = tWeekStart(day);
  const week = [...Array(7)].map((_, i) => addDays(ws, i));
  const strip = `<div class="wk">
    <button class="wk-nav prev" data-act="tWeek" data-v="-7" aria-label="Предыдущая неделя">${ic('chev', 2.4)}</button>
    <div class="wk-days">${week.map((d) => {
      const dd = parseD(d);
      const nl = tLessons(d).length, nt = tTrialsOn(d).length;
      const n = nl + nt;
      const warn = S.d.trials.some((x) => x.date === d && !x.result && tStarted(x.date, x.time));
      const sub = [nl ? `${nl} ${plural(nl, ['урок', 'урока', 'уроков'])}` : '', nt ? `${nt} пр.` : ''].filter(Boolean).join(' · ') || '—';
      return `<button class="wk-day ${d === day ? 'on' : ''} ${d === t ? 'today' : ''} ${dd.getDay() === 0 ? 'off' : ''}" data-act="tDay" data-v="${d}"
        aria-label="${esc(tDayTitle(d))}"><span>${WD[dd.getDay()]}</span><b>${dd.getDate()}</b><i class="${warn ? 'warn' : n ? 'has' : ''}"></i><small>${sub}</small></button>`;
    }).join('')}</div>
    <button class="wk-nav next" data-act="tWeek" data-v="7" aria-label="Следующая неделя">${ic('chev', 2.4)}</button>
  </div>
  ${tWeekStart(t) !== ws ? `<div class="wk-back"><button class="link-btn" data-act="tDay" data-v="${t}">Вернуться к сегодняшнему дню</button></div>` : ''}`;

  const lessons = tLessons(day);
  const trials = tTrialsOn(day);
  const kids = lessons.reduce((n, l) => n + l.kids.length, 0);
  const frozen = lessons.reduce((n, l) => n + l.kids.filter((k) => tFrozen(day, k.name)).length, 0);
  const stats = `<div class="hello">
    ${tStat(lessons.length, ['занятие', 'занятия', 'занятий'])}
    ${tStat(kids, ['ученик', 'ученика', 'учеников'])}
    ${tStat(trials.length, ['пробный', 'пробных', 'пробных'])}
    ${tStat(frozen, 'заморожено')}
  </div>`;

  const dow = parseD(day).getDay();
  const h = S.d.grid && (S.d.grid.hours || []).find((x) => x.dow === dow);
  const hours = !dow ? 'выходной' : h && h.off ? 'выходной' : h && (h.from || h.to) ? `${h.from || '9:00'}–${h.to || '21:00'}` : 'весь день';
  const edit = dow && S.d.grid && !S.d.grid.missing
    ? `<button class="link" data-act="tGrid" data-v="${dow}">${ic('clock', 2)}${esc(hours)}</button>` : `<span class="count">${esc(hours)}</span>`;
  const items = [...lessons.map((l) => ({ time: l.time, html: tLessonCard(day, l) })), ...trials.map((x) => ({ time: x.time, html: tTrialCard(x) }))]
    .sort(tByTime);
  let body;
  if (S.d.grid && S.d.grid.missing) body = `<div class="list">${emptyState(`В «Расписании» нет листа «${S.d.me}» — попросите менеджера его добавить`, 'alert')}</div>`;
  else if (items.length) body = items.map((x) => x.html).join('');
  else body = `<div class="list">${emptyState(!dow ? 'Воскресенье — выходной' : 'В этот день занятий нет', 'today')}</div>`;
  const hint = items.length && tCanFreeze(day)
    ? '<p class="hint">❄ — заморозка ученика на этот день: дата оплаты сдвинется на урок, а урок не пойдёт в ЗП «за уроки». Время и статусы часов — кнопка с часами вверху.</p>' : '';
  const side = dow && S.d.grid && !S.d.grid.missing
    ? `<aside class="t-side desk-only">${tSec('Статус по часам', null, `<div class="list">${tHourRows(dow)}</div>`)}
      <p class="hint">Нажмите на час, чтобы поменять статус. Он меняет постоянное расписание на все недели.</p></aside>` : '';
  return strip + stats + `<div class="t-cols ${side ? '' : 'one'}"><div class="t-day">${tSec(esc(tDayTitle(day)), null, body, edit)}${hint}</div>${side}</div>`;
}

function tLessonCard(day, l) {
  const can = tCanFreeze(day);
  const kids = l.kids.map((k) => {
    const fz = tFrozen(day, k.name);
    const data = `data-date="${esc(day)}" data-name="${esc(k.name)}"`;
    return `<div class="row kid ${fz ? 'frozen' : ''} ${k.st ? 'tap' : ''}" ${k.st ? `data-act="tStud" data-name="${esc(k.name)}" data-row="${k.st.row}"` : ''}>
      <div class="main"><div class="title">${esc(k.name)}
        ${k.grade ? `<span class="pill">${esc(gr(k.grade))}</span>` : ''}${k.onl ? '<span class="pill">онлайн</span>' : ''}
        ${fz ? `<span class="pill accent">${ic('snow', 2.2)}заморозка</span>` : ''}</div></div>
      ${can && k.st ? (fz
        ? `<button class="btn ghost fz-b" data-act="tFreeze" ${data} data-on="0">Снять</button>`
        : `<button class="btn fz-b" data-act="tFreeze" ${data} data-on="1" aria-label="Заморозить ${esc(k.name)} на этот день">${ic('snow', 2.2)}<span>Заморозить</span></button>`) : ''}
    </div>`;
  }).join('');
  const n = l.kids.length;
  return `<div class="list lesson">
    <div class="row lesson-h has-menu">
      <button class="row-menu" data-act="tLessonMenu" data-date="${esc(day)}" data-time="${esc(l.time)}" aria-label="Ещё">${ic('more', 2.4)}</button>
      <div class="time-col">${esc(l.time)}</div>
      <div class="main"><div class="title">${esc(tTypeLabel(l.type, n))} <span class="pill">${n} ${plural(n, ['ученик', 'ученика', 'учеников'])}</span></div></div>
    </div>${kids}</div>`;
}

function tTrialCard(x, o = {}) {
  const started = tStarted(x.date, x.time);
  let acts = '';
  if (x.result) {
    const btns = (x.mine ? `<button class="btn" data-act="tResMenu" data-row="${x.row}">Изменить итог</button>` : '')
      + (x.result !== 'Перенос' && x.result !== 'Не пришёл' ? `<button class="btn" data-act="tNote" data-row="${x.row}">${ic('edit', 2)}Отзыв</button>` : '');
    if (btns) acts = `<div class="actions">${btns}</div>`;
  } else if (started) {
    acts = `<div class="actions t-res">${RESULTS.map((r) => `<button class="btn ${r === 'Записался' ? 'ok' : r === 'Отказ' ? 'danger' : ''}" data-act="tRes" data-row="${x.row}" data-v="${esc(r)}">${esc(r)}</button>`).join('')}</div>`;
  }
  const when = o.date ? `${dayLabel(x.date)}, ${x.time}` : '';
  const need = !x.result && started;
  return `<div class="list lesson t-trial ${need ? 'need' : ''}">
    <div class="row">
      <div class="time-col">${o.date ? '' : esc(x.time)}</div>
      <div class="main">
        <div class="title">${x.result ? `<span class="pill ${x.result === 'Записался' ? 'green' : x.result === 'Отказ' || x.result === 'Не пришёл' ? 'red' : 'amber'}">${esc(x.result)}</span>`
          : `<span class="pill ${need ? 'red' : 'amber'}">${need ? 'Пробный: итог?' : 'Пробный'}</span>`} ${x.name ? esc(x.name) : NONAME} ${x.grade ? `<span class="pill">${esc(gr(x.grade))}</span>` : ''}</div>
        <div class="meta">${[when, (x.format || '').toLowerCase()].filter(Boolean).map(esc).join(' · ')}</div>
        ${x.comment ? `<div class="t-note">${esc(x.comment)}</div>` : ''}
        ${acts}
      </div>
    </div></div>`;
}

function tViewTrials() {
  const t = todayS();
  const need = tNeedResult();
  const next = S.d.trials.filter((x) => !x.result && !tStarted(x.date, x.time)).sort(tByDT);
  const done = S.d.trials.filter((x) => x.result && x.date <= t).sort((a, b) => -tByDT(a, b));
  const from = addDays(t, -30);
  const month = S.d.trials.filter((x) => x.date >= from && x.date <= t && x.result !== 'Перенос' && tStarted(x.date, x.time));
  const won = month.filter((x) => x.result === 'Записался').length;
  const judged = month.filter((x) => x.result).length; // процент — только по пробным с итогом
  const pct = judged ? Math.round((won / judged) * 100) + '%' : '—';
  const stats = `<div class="hello">
    ${tStat(need.length, ['ждёт итога', 'ждут итога', 'ждут итога'], need.length)}
    ${tStat(next.length, 'впереди')}
    ${tStat(month.length, 'за месяц')}
    ${tStat(pct, 'записались')}
  </div>`;
  const card = (x) => tTrialCard(x, { date: true });
  return stats + `<div class="t-cols ${done.length ? '' : 'one'}"><div>`
    + (need.length ? tSec('Поставьте итог', need.length, need.map(card).join('')) : '')
    + tSec('Предстоящие', next.length || null, next.length ? next.map(card).join('') : `<div class="list">${emptyState('Новых пробных пока нет', 'trial')}</div>`)
    + '</div>' + (done.length ? `<div>${tSec('Прошедшие', done.length, done.slice(0, 20).map(card).join(''))}</div>` : '') + '</div>'
    + '<p class="hint">Записывает на пробные менеджер. Утром бот в Telegram пришлёт пробные на день, а после занятия спросит итог.</p>';
}

function tStudentRow(s) {
  const fz = (S.d.freezes || []).filter((f) => f.n === s.name && f.d >= todayS()).length;
  const rest = [s.next && s.payStatus !== '—' ? 'до ' + tLong(s.next) : s.nextText, s.freezes ? `заморозок: ${s.freezes}` : '',
    fz ? `❄ впереди ${fz}` : ''].filter(Boolean).map(esc).join(' · ');
  return `<div class="row tap" data-act="tStud" data-name="${esc(s.name)}" data-row="${s.row}">
    <div class="ava-s" aria-hidden="true">${esc(s.name.trim()[0] || '?')}</div>
    <div class="main">
      <div class="title">${esc(s.name)} ${s.grade ? `<span class="pill">${esc(gr(s.grade))}</span>` : ''}</div>
      <div class="meta">${[s.format, (s.onl || '').toLowerCase(), [s.days, s.time].filter(Boolean).join(' ')].filter(Boolean).map(esc).join(' · ')}</div>
      ${tPayPill(s) || rest ? `<div class="meta t-pay">${tPayPill(s)}${tPayPill(s) && rest ? ' ' : ''}${rest}</div>` : ''}
    </div>
  </div>`;
}

function tViewStudents() {
  return tStudStats() + `<div class="toolbar">
      <label class="search">${ic('search')}<input id="tsq" type="search" placeholder="Имя или телефон" value="${esc(TS.q)}" autocomplete="off"></label>
      <button class="toggle" data-act="tNewStudent">+ Ученик</button>
    </div><div id="tsWrap">${tStudList()}</div>`
    + '<p class="hint">Всё, что вы меняете здесь, сразу записывается в ваш лист «Базы учеников». Дата следующей оплаты, долг и статус оплаты считаются там сами. О новых учениках, сменах статуса и оплатах менеджер получает сообщение.</p>';
}
function tStudStats() {
  const live = (S.d.students || []).filter((s) => s.status !== 'Выбыл');
  const paid = live.filter((s) => s.payStatus === 'Оплачено').length;
  const renew = live.filter((s) => s.payStatus === 'Продлить' || s.payStatus === 'Закончился').length;
  const debt = live.reduce((n, s) => n + (s.debt > 0 ? s.debt : 0), 0);
  return `<div class="hello">
    ${tStat(live.length, ['учится', 'учатся', 'учатся'])}
    ${tStat(paid, ['оплатил', 'оплатили', 'оплатили'])}
    ${tStat(renew, 'продлить', renew)}
    ${tStat(money(debt), 'долг, сом', debt, 'sm')}
  </div>`;
}
function tStudList() {
  const q = TS.q.trim().toLowerCase(), qd = q.replace(/\D/g, '');
  const list = (items, empty) => `<div class="list">${items.length ? items.map(tStudentRow).join('') : emptyState(empty, 'user')}</div>`;
  if (q) {
    const found = (S.d.students || []).filter((s) => s.name.toLowerCase().includes(q) || (qd.length >= 3 && normPhone(s.phone).includes(qd.replace(/^0/, ''))))
      .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    return tSec('Найдено', found.length || null, found.length ? list(found, '') : `<div class="list">${emptyState(`Никого не нашлось по «${TS.q.trim()}»`, 'search')}</div>`);
  }
  const all = (S.d.students || []).slice().sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  const act = all.filter((s) => s.status === 'Учится');
  const frozen = all.filter((s) => s.status === 'Заморозка');
  const gone = all.filter((s) => s.status === 'Выбыл');
  const live = act.concat(frozen);
  const due = live.filter((s) => ['Закончился', 'Продлить', 'Долг'].includes(s.payStatus) || s.debt > 0);
  return `<div class="t-cols t-stud"><div>${tSec('Учатся', act.length, list(act, 'Пока никого — добавьте первого ученика'))}</div><div>`
    + `<div class="desk-only">${tSec('Продлить и долги', due.length || null, list(due, 'Все оплатили'))}</div>`
    + (frozen.length ? tSec('Заморозка', frozen.length, list(frozen, '')) : '')
    + (gone.length ? `<section class="section"><button class="more-btn t-gone" data-act="tGone">${TS.gone ? 'Скрыть выбывших' : `Выбывшие · ${gone.length}`}${ic('chev', 2.4)}</button>
      ${TS.gone ? `<div style="margin-top:8px">${list(gone, '')}</div>` : ''}</section>` : '')
    + '</div></div>';
}

function tViewZp() {
  const z = S.d.zp;
  if (!z) return `<section class="section"><div class="list">${emptyState('Не нашёл лист «Зарплаты» в «Базе учеников»', 'alert')}</div></section>`;
  const from = z.from;
  const weekText = from ? `${tLong(from)} — ${tLong(addDays(from, 6))}` : '';
  let body = '';
  if (z.missing) {
    body = `<section class="section"><div class="list">${emptyState('Вас пока нет на листе «Зарплаты» — попросите менеджера добавить', 'wallet')}</div></section>`;
  } else {
    const perLesson = z.scheme !== '% от оплат';
    body += `<div class="hello zp-hello">
      ${tStat(money(z.total), 'к выплате, сом', false, 'zp-total')}
      ${perLesson ? tStat(z.lessons, ['урок', 'урока', 'уроков']) : tStat(money(z.payments), 'оплат, сом', false, 'sm')}
      ${tStat(money(z.accrued), 'начислено', false, 'sm')}
    </div>`;
    const rates = (z.rates || []).filter(([k]) => (perLesson ? ['Группа', 'Пара', 'Инд'].includes(k) : k === '% от оплат') || /пробн/i.test(k));
    body += '<div class="t-cols t-flip"><div>' + tSec('Как считается', null, `<div class="list kv">
      <div class="k">Схема</div><div>${esc(z.scheme || '—')}</div>
      ${rates.map(([k, v]) => `<div class="k">${esc(k)}</div><div>${esc(v)}${/%/.test(v) ? '' : ' сом'}</div>`).join('')}
      <div class="k">Начислено за пробные</div><div>${money(z.trials)} сом</div>
    </div>`);
    body += tSec('Корректировка', null, `<div class="list"><button class="row t-hour" data-act="tCorr">
      <div class="main"><div class="title">${z.correction ? `${z.correction > 0 ? '+' : '−'}${money(Math.abs(z.correction))} сом` : '<span class="noname">нет</span>'}</div>
        <div class="meta t-corr-note">${z.comment ? esc(z.comment) : 'Замены, уроки заранее, оплата с опозданием — впишите сюда'}</div></div>
      ${ic('chev', 2.4)}</button></div>`) + '<!--pays--></div><div>';
    const per = (S.d.students || []).filter((s) => s.zp > 0 || s.zpLessons > 0).sort((a, b) => b.zp - a.zp);
    body += tSec('По ученикам', per.length || null, `<div class="list">${per.length ? per.map((s) => `<div class="row">
      <div class="main"><div class="title">${esc(s.name)} ${s.grade ? `<span class="pill">${esc(gr(s.grade))}</span>` : ''}</div>
        <div class="meta">${perLesson ? `${s.zpLessons} ${plural(s.zpLessons, ['урок', 'урока', 'уроков'])} · ${esc(s.format)}` : 'оплата на этой неделе'}</div></div>
      <div class="zp-sum">${money(s.zp)} сом</div></div>`).join('') : emptyState(perLesson ? 'На этой неделе уроков ещё не было' : 'На этой неделе оплат ещё не было', 'wallet')}</div>`);
  }
  const j = z.journal || [];
  const pays = tSec('Выплаты', j.length || null, `<div class="list">${j.length ? j.map((x) => `<div class="row">
    <div class="main"><div class="title">${x.date ? esc(tLong(x.date)) : '—'}</div>
      <div class="meta">${[x.week ? 'за неделю с ' + tLong(x.week) : '', x.comment].filter(Boolean).map(esc).join(' · ')}</div></div>
    <div class="zp-sum">${money(x.sum)} сом</div></div>`).join('') : emptyState('Выплат пока не записано', 'wallet')}</div>`);
  // на компьютере выплаты стоят справа под корректировкой, на телефоне — в конце, как раньше
  if (z.missing) body += pays;
  else body = body.replace('<!--pays-->', () => `<div class="desk-only">${pays}</div>`) + `<div class="mob-only">${pays}</div></div></div>`;
  return `<div class="t-week">${esc(z.week || 'Эта неделя')}${weekText ? ': ' + esc(weekText) : ''}</div>` + body
    + '<p class="hint">Считается само в «Базе учеников»: прошедшие уроки недели по дням занятий, без праздников и замороженных дней. Выплата — по воскресеньям. Корректировку можно поправить самим, менеджер получит сообщение.</p>';
}

function tViewMore() {
  const d = S.d;
  const tg = d.telegram || {};
  return `<div class="more-grid"><div>
  <section class="section"><div class="list">
    <div class="row"><div class="check on" style="background:var(--accent);border-color:var(--accent)">${ic('user', 2)}</div>
      <div class="main"><div class="title">${esc(d.me)}</div><div class="meta">${d.preview ? 'Кабинет преподавателя — вы смотрите как менеджер' : 'Преподаватель'}</div></div></div>
  </div></section>

  <section class="section"><div class="section-h"><h2>Telegram</h2></div><div class="list"><div class="row"><div class="main">
    ${tg.linked
      ? `<div class="title">Бот подключён</div><div class="meta">Утром присылает пробные на день, а после занятия спрашивает итог. Команда /cab — ссылка на этот кабинет.</div>`
      : tg.link
        ? `<div class="title">Бот не подключён</div><div class="meta">Утром он пришлёт пробные на день, а после занятия спросит итог одной кнопкой.</div>
           <div class="actions"><a class="btn primary" href="${esc(tg.link)}" target="_blank" rel="noopener">${ic('send', 2)}Подключить Telegram</a></div>`
        : '<div class="title">Бот ещё не настроен</div><div class="meta">Пробные и итоги доступны здесь, во вкладке «Пробные».</div>'}
  </div></div></div></section>

  <section class="section"><div class="menu">
    <button data-act="tMsg">${ic('send')}<span>Написать менеджеру</span></button>
  </div></section>
  </div><div>

  <section class="section"><div class="section-h"><h2>На экран «Домой»</h2></div>
    <div class="list"><div class="row"><div class="main"><div class="meta">
      iPhone: откройте эту страницу в Safari → «Поделиться» → «На экран „Домой“».<br>
      Android: Chrome → ⋮ → «Добавить на главный экран».<br>
      Ссылка личная — не пересылайте её другим.</div></div></div></div></section>

  <section class="section"><div class="section-h"><h2>Оформление</h2></div>
    <div class="seg">${Object.entries(SKINS).map(([k, label]) => `<label class="chip"><input type="radio" name="skin" value="${k}"
      ${(lsGet('espada-skin') || 'brand') === k ? 'checked' : ''} data-skin-pick><span>${label}</span></label>`).join('')}</div>
    ${APP_VERSION ? `<p class="hint">Версия приложения: ${esc(APP_VERSION)}</p>` : ''}</section>

  <section class="section"><div class="menu">
    <button data-act="refresh">${ic('refresh')}<span>Обновить данные</span></button>
    ${d.preview ? `<button data-act="exitCab">${ic('board')}<span>Вернуться в CRM</span></button>`
      : `<button data-act="logout" style="color:var(--red)">${ic('x')}<span>Выйти</span></button>`}
  </div></section></div></div>`;
}

/* ============================== Ученик ============================== */

/** Полная запись ученика для сервера (сервер перезаписывает все ручные столбцы строки). */
const tPayload = (s, patch = {}) => ({
  row: s.row, orig: s.name, name: s.name, phone: s.phone, grade: s.grade, format: s.format, onl: s.onl, days: s.days, time: s.time,
  price: s.price || '', paid: s.paid || '', payDate: s.payDate, freezes: s.freezes || '', status: s.status, comment: s.comment,
  lessons: /^\d+$/.test(String(s.lessons)) ? s.lessons : '', ...patch,
});
const tFind = (el) => stFind(el); // карточка общая с менеджером (students.js)

function tOpenForm(s) {
  const ctx = stCtx(s && s.teacher);
  const m = ctx.meta;
  const v = s || { format: 'Группа', onl: 'Офлайн', status: 'Учится', price: m.prices['Группа'] || '', payDate: todayS() };
  openSheet(() => sheetHead(s ? 'Изменить ученика' : 'Новый ученик') + `
    <form id="tForm" autocomplete="off">
      <div class="field"><label for="tf-name">Имя</label><input class="input" id="tf-name" name="name" value="${esc(v.name || '')}"></div>
      <div class="field"><label for="tf-phone">Телефон</label><input class="input" id="tf-phone" name="phone" type="tel" value="${esc(v.phone ? prettyPhone(v.phone) : '')}" placeholder="Необязательно"></div>
      <div class="field"><label for="tf-grade">Класс</label><input class="input" id="tf-grade" name="grade" inputmode="numeric" value="${esc(v.grade || '')}" placeholder="Например, 9 или 1 курс"></div>
      <div class="field"><span class="lbl">Формат</span><div class="seg">${radios('format', m.formats, v.format)}</div></div>
      <div class="field"><span class="lbl">Онл / Офф</span><div class="seg">${radios('onl', ['Офлайн', 'Онлайн'], v.onl || 'Офлайн')}</div></div>
      <div class="field"><span class="lbl">Дни занятий</span><div class="chips">${radios('days', m.days, v.days || '')}</div></div>
      <div class="field"><span class="lbl">Время</span><div class="chips nowrap">${radios('time', T_HOURS, v.time || '')}</div></div>
      <div class="field"><label for="tf-price">Цена абонемента, сом</label><input class="input" id="tf-price" name="price" type="number" inputmode="numeric" value="${esc(v.price || '')}"></div>
      <div class="field"><label for="tf-paid">Оплачено, сом</label><input class="input" id="tf-paid" name="paid" type="number" inputmode="numeric" value="${esc(s ? v.paid || '' : v.price || '')}"></div>
      <div class="field"><label for="tf-date">Дата оплаты</label><input class="input" id="tf-date" name="payDate" type="date" value="${esc(v.payDate || '')}"></div>
      <div class="field"><label for="tf-fr">Заморозки, занятий</label><input class="input" id="tf-fr" name="freezes" type="number" inputmode="numeric" min="0" max="36" value="${esc(v.freezes || '')}" placeholder="0"></div>
      <div class="field"><label for="tf-les">Занятий в абонементе</label><input class="input" id="tf-les" name="lessons" type="number" inputmode="numeric" value="${esc(/^\d+$/.test(String(v.lessons || '')) ? v.lessons : '')}" placeholder="12"></div>
      <div class="field"><span class="lbl">Статус</span><div class="seg">${radios('status', m.statuses, v.status || 'Учится')}</div></div>
      <div class="field"><label for="tf-comment">Комментарий</label><input class="input" id="tf-comment" name="comment" value="${esc(v.comment || '')}" placeholder="Необязательно"></div>
      <p class="hint">${ctx.mgr ? `Изменения сразу запишутся в строку на листе «${esc(ctx.teacher)}» в «Базе учеников».` : s ? 'Изменения сразу запишутся в вашу строку в «Базе учеников».' : 'Ученик появится в «Базе учеников» и в вашем расписании в течение минуты. Менеджер получит сообщение.'}</p>
      <div class="sheet-foot"><button class="btn primary lg" type="submit">${s ? 'Сохранить' : 'Добавить в Базу'}</button></div>
    </form>`, {
    after: (sh) => {
      const f = $('#tForm', sh.panel);
      const price = f.elements.price, paid = f.elements.paid;
      let priceTouched = !!s, paidTouched = !!s;
      price.addEventListener('input', () => { priceTouched = true; if (!paidTouched) paid.value = price.value; });
      paid.addEventListener('input', () => { paidTouched = true; });
      f.addEventListener('change', (e) => {
        if (e.target.name === 'format' && !priceTouched) {
          price.value = m.prices[e.target.value] || '';
          if (!paidTouched) paid.value = price.value;
        }
      });
      if (!s) setTimeout(() => f.elements.name.focus(), 300);
      const send = async (force) => {
        const x = Object.fromEntries(new FormData(f).entries());
        if (!x.name.trim()) return toast('Укажите имя', { err: true });
        if (!x.days || !x.time) return toast('Выберите дни и время — без них ученик не попадёт в расписание', { err: true });
        const student = { ...(s ? tPayload(s) : {}), ...x, name: x.name.trim(), grade: x.grade.trim(), comment: x.comment.trim() };
        const b = $('button[type=submit]', f);
        b.disabled = true; b.textContent = 'Записываю в Базу…';
        try {
          const r = await ctx.run('tStudent', { student, force: !!force });
          if (r.duplicate) {
            b.disabled = false; b.textContent = s ? 'Сохранить' : 'Добавить в Базу';
            if (confirm(`У вас уже есть «${student.name}». Это другой ученик? Добавить всё равно?`)) send(true);
            return;
          }
          sh.close();
          toast(s ? 'Сохранено в Базе' : `${student.name} — теперь в Базе`);
        } catch { b.disabled = false; b.textContent = s ? 'Сохранить' : 'Добавить в Базу'; }
      };
      f.onsubmit = (e) => { e.preventDefault(); send(false); };
    },
  });
}

function tOpenPay(s) {
  const ctx = stCtx(s.teacher);
  const mode0 = s.debt > 0 ? 'add' : 'renew';
  openSheet(() => sheetHead('Оплата') + `<p class="hint" style="margin-top:0">${esc(s.name)} · ${esc([s.format, s.days, s.time].filter(Boolean).join(' · '))}</p>
    <div class="list kv">
      <div class="k">Цена</div><div>${money(s.price)} сом</div>
      <div class="k">Оплачено</div><div>${money(s.paid)} сом${s.debt > 0 ? ` · <span style="color:var(--red)">долг ${money(s.debt)}</span>` : ''}</div>
      <div class="k">Следующая оплата</div><div>${esc(s.next ? s.next.split('-').reverse().join('.') : s.nextText || '—')}</div>
    </div>
    <div class="field"><span class="lbl">Что оплатили</span><div class="seg">${radios('mode', [['renew', 'Новый абонемент'], ['add', 'Доплата']], mode0)}</div></div>
    <div class="field"><label for="tp-amount">Сумма, сом</label><input class="input" id="tp-amount" type="number" inputmode="numeric" value="${mode0 === 'add' ? s.debt : s.price || ''}"></div>
    <div class="field" id="tp-dateBox"><label for="tp-date">Дата оплаты</label><input class="input" id="tp-date" type="date" value="${todayS()}"></div>
    <p class="hint" id="tp-hint"></p>
    <div class="sheet-foot"><button class="btn primary lg" id="tpBtn">Записать оплату</button></div>`, {
    small: true,
    after: (sh) => {
      const p = sh.panel;
      const amount = $('#tp-amount', p);
      const hint = () => {
        const m = $('input[name=mode]:checked', p).value;
        const a = Number(amount.value) || 0;
        $('#tp-dateBox', p).classList.toggle('hidden', m === 'add' && !!s.payDate);
        $('#tp-hint', p).textContent = m === 'renew'
          ? `Дата оплаты станет ${$('#tp-date', p).value.split('-').reverse().join('.')}, оплачено — ${money(a)} сом, заморозки обнулятся. Следующая оплата пересчитается сама.`
          : `Оплачено: ${money(s.paid)} → ${money(s.paid + a)} сом.`;
      };
      p.addEventListener('change', (e) => { if (e.target.name === 'mode') amount.value = e.target.value === 'add' ? s.debt : s.price || ''; hint(); });
      amount.addEventListener('input', hint);
      hint();
      $('#tpBtn', p).onclick = async () => {
        const b = $('#tpBtn', p);
        const mode = $('input[name=mode]:checked', p).value;
        if (!(Number(amount.value) > 0)) return toast('Укажите сумму', { err: true });
        b.disabled = true; b.textContent = 'Записываю…';
        try {
          const r = await ctx.run('tPay', { name: s.name, row: s.row, mode, amount: amount.value, date: $('#tp-date', p).value });
          sh.close();
          toast(`Оплата ${money(amount.value)} сом записана`, {
            action: 'Отменить',
            onAction: () => ctx.run('tUndoPay', { id: r.payment.id }).then(() => toast('Оплата отменена')).catch(() => {}),
          });
        } catch { b.disabled = false; b.textContent = 'Записать оплату'; }
      };
    },
  });
}

/** Своя корректировка к зарплате за неделю (лист «Зарплаты», столбцы G и I). */
function tOpenCorr() {
  const z = S.d.zp || {};
  const was = z.correction || 0;
  openSheet(() => sheetHead('Корректировка') + `<p class="hint" style="margin-top:0">Прибавится к сумме «К выплате» или вычтется из неё. Сейчас к выплате ${money(z.total)} сом.</p>
    <div class="field"><span class="lbl">Что сделать</span><div class="seg">${radios('sign', [['plus', 'Прибавить'], ['minus', 'Вычесть']], was < 0 ? 'minus' : 'plus')}</div></div>
    <div class="field"><label for="tc-amount">Сумма, сом</label><input class="input" id="tc-amount" type="number" inputmode="numeric" min="0" placeholder="0" value="${was ? Math.abs(was) : ''}"></div>
    <div class="field"><label for="tc-note">За что</label><textarea class="input" id="tc-note" rows="3" placeholder="Например: замена в среду, 2 урока">${esc(z.comment || '')}</textarea></div>
    <p class="hint" id="tc-hint"></p>
    <div class="sheet-foot"><button class="btn primary lg" id="tcBtn">Сохранить</button></div>`, {
    small: true,
    after: (sh) => {
      const p = sh.panel;
      const amount = $('#tc-amount', p);
      const val = () => Math.round(Math.abs(Number(amount.value) || 0)) * ($('input[name=sign]:checked', p).value === 'minus' ? -1 : 1);
      const hint = () => {
        const v = val();
        $('#tc-hint', p).textContent = `К выплате: ${money(z.total || 0)} → ${money((z.total || 0) - was + v)} сом.${v ? '' : ' Пустая сумма — корректировки не будет.'}`;
      };
      p.addEventListener('change', hint);
      amount.addEventListener('input', hint);
      hint();
      $('#tcBtn', p).onclick = async () => {
        const b = $('#tcBtn', p);
        const v = val(), comment = $('#tc-note', p).value.trim();
        if (v && !comment) return toast('Напишите, за что корректировка', { err: true });
        b.disabled = true; b.textContent = 'Сохраняю…';
        try {
          await tRun('tCorr', { amount: v, comment: v ? comment : '', was });
          sh.close();
          toast(v ? 'Корректировка сохранена, менеджер получит сообщение' : 'Корректировка убрана');
        } catch { b.disabled = false; b.textContent = 'Сохранить'; }
      };
    },
  });
}

/** Заморозить ученика на выбранный день (из карточки ученика). */
function tOpenFreezeDay(s) {
  const ctx = stCtx(s.teacher);
  const fz = stFreezes(ctx, s.name);
  const pat = (ctx.meta.patterns || {})[s.days] || [];
  const next = [...Array(14)].map((_, i) => addDays(todayS(), i)).filter((d) => pat[parseD(d).getDay()]).slice(0, 6);
  openSheet(() => sheetHead('Заморозка на день') + `<p class="hint" style="margin-top:0">${esc(s.name)} · ${esc([s.days, s.time].filter(Boolean).join(' в '))}</p>
    ${next.length ? `<div class="field"><span class="lbl">Ближайшие занятия</span><div class="chips">${next.map((d) => `<button type="button" class="chip-btn ${fz.some((f) => f.d === d) ? 'on' : ''}" data-d="${d}">${esc(dayLabel(d))}</button>`).join('')}</div></div>` : ''}
    <div class="field"><label for="tz-date">Или другой день</label><input class="input" id="tz-date" type="date" value="${next[0] || todayS()}"></div>
    <p class="hint">Урок этого дня не пойдёт в ЗП «за уроки», а дата следующей оплаты сдвинется на одно занятие. Снять заморозку можно в карточке ученика или в расписании.</p>
    <div class="sheet-foot"><button class="btn primary lg" id="tzBtn">${ic('snow', 2)}Заморозить</button></div>`, {
    small: true,
    after: (sh) => {
      const p = sh.panel;
      $$('[data-d]', p).forEach((b) => { b.onclick = () => { $('#tz-date', p).value = b.dataset.d; $$('[data-d]', p).forEach((x) => x.classList.toggle('on', x === b)); }; });
      $('#tzBtn', p).onclick = () => {
        const d = $('#tz-date', p).value;
        if (!d) return toast('Выберите день', { err: true });
        sh.close();
        tSetFreeze(d, [s.name], true, false, ctx.teacher);
      };
    },
  });
}

/** Рабочие часы и статус каждого часа в один день недели. */
function tHourRows(dow) {
  const g = S.d.grid || { hours: [], slots: [] };
  const h = (g.hours || []).find((x) => x.dow === dow) || { from: '', to: '' };
  const from = h.off ? 'выходной' : h.from || '';
  return T_HOURS.map((t) => {
    const sl = (g.slots || []).find((x) => x.dow === dow && x.time === t) || {};
    const outside = from === 'выходной' || (h.from && t < h.from) || (h.to && t >= h.to);
    return `<button class="row t-hour ${outside ? 'out' : ''}" data-act="tSlotPick" data-dow="${dow}" data-time="${t}">
      <div class="time-col">${t}</div>
      <div class="main"><div class="title">${sl.type ? esc(sl.type) : '<span class="noname">не задано</span>'}</div>
        ${sl.who ? `<div class="meta">${esc(sl.who)}</div>` : ''}</div>
      ${ic('chev', 2.2)}</button>`;
  }).join('');
}

function tGridSheet(dow) {
  const g = S.d.grid || { hours: [], slots: [] };
  const m = S.d.meta;
  const h = (g.hours || []).find((x) => x.dow === dow) || { from: '', to: '' };
  const from = h.off ? 'выходной' : h.from || '';
  const rows = tHourRows(dow);
  return sheetHead(esc(WDF[dow])) + `
    <div class="field"><span class="lbl">Рабочие часы</span><div class="btn-row">
      <select class="input" id="tg-from" aria-label="С какого часа"><option value="">весь день</option>${m.from.map((x) => `<option ${x === from ? 'selected' : ''}>${x}</option>`).join('')}</select>
      <select class="input" id="tg-to" aria-label="До какого часа" ${from === 'выходной' ? 'disabled' : ''}><option value="">до конца</option>${m.to.map((x) => `<option ${x === h.to ? 'selected' : ''}>${x}</option>`).join('')}</select>
    </div></div>
    <section class="section"><div class="section-h"><h2>Статус по часам</h2></div><div class="list">${rows}</div></section>
    <p class="hint">Статус меняет постоянное расписание на все недели. Если урок не состоялся один раз — заморозьте учеников на этот день в расписании.</p>`;
}

function tOpenMsg(student) {
  openSheet(() => sheetHead('Сообщение менеджеру') + `
    ${student ? `<p class="hint" style="margin-top:0">Об ученике: ${esc(student)}</p>` : ''}
    <div class="field"><textarea class="input" id="tMsgText" rows="4" placeholder="${student ? 'Например: мама просит перенести на субботу' : 'Например: заболел, в четверг не смогу провести занятия'}"></textarea></div>
    <p class="hint">Менеджер получит задачу и сообщение в Telegram.</p>
    <div class="sheet-foot"><button class="btn primary lg" id="tMsgSend">Отправить</button></div>`, {
    after: (sh) => {
      const p = sh.panel;
      setTimeout(() => $('#tMsgText', p).focus(), 300);
      $('#tMsgSend', p).onclick = async () => {
        const text = $('#tMsgText', p).value.trim();
        if (!text) return toast('Напишите, что передать', { err: true });
        const b = $('#tMsgSend', p);
        b.disabled = true;
        try { await tRun('tMsg', { text, student: student || '' }); sh.close(); toast('Отправлено менеджеру'); } catch { b.disabled = false; }
      };
    },
  });
}

function tOpenNote(row) {
  const x = S.d.trials.find((t) => t.row === row);
  if (!x) return;
  openSheet(() => sheetHead('Отзыв о ребёнке') + `
    <p class="hint" style="margin-top:0">Пробный ${esc(dayLabel(x.date))}, ${esc(x.time)} · ${esc(x.name || 'без имени')}${x.grade ? ', ' + esc(gr(x.grade)) : ''}</p>
    <div class="field"><textarea class="input" id="tNoteText" rows="4" placeholder="Уровень, что получилось, над чем поработать — менеджер расскажет родителям"></textarea></div>
    <div class="sheet-foot"><button class="btn primary lg" id="tNoteSend">Отправить менеджеру</button></div>`, {
    after: (sh) => {
      const p = sh.panel;
      setTimeout(() => $('#tNoteText', p).focus(), 300);
      $('#tNoteSend', p).onclick = async () => {
        const text = $('#tNoteText', p).value.trim();
        if (!text) return toast('Напишите пару слов о ребёнке', { err: true });
        const b = $('#tNoteSend', p);
        b.disabled = true;
        try { await tRun('tNote', { key: x.key, text }); sh.close(); toast('Отзыв передан менеджеру'); } catch { b.disabled = false; }
      };
    },
  });
}

/* ============================== Действия ============================== */

/** Изменение в кабинете: сразу на экране, потом на сервере; при ошибке — откат. */
async function tRun(action, payload, optimistic) {
  const snap = JSON.stringify(S.d);
  if (optimistic) { optimistic(); render(); rerenderSheets(); }
  S.busy++; updBusy();
  try {
    const r = await call(action, { ...payload, as: S.as || undefined });
    (r.trials || []).forEach((t) => upsert(S.d.trials, t, 'row'));
    ['students', 'freezes', 'grid', 'zp'].forEach((k) => { if (r[k]) S.d[k] = r[k]; });
    stForget();
    if (!S.as) lsSet(cacheKey(), JSON.stringify(S.d));
    render(); rerenderSheets();
    return r;
  } catch (e) {
    S.d = JSON.parse(snap); render(); rerenderSheets();
    toast(e.message, { err: true });
    throw e;
  } finally {
    S.busy--; updBusy();
  }
}

/** Заморозить или снять заморозку на день. */
function tSetFreeze(date, names, on, quiet, teacher) {
  const ctx = stCtx(teacher);
  return ctx.run('tFreeze', { date, names, on }, ctx.mgr ? null : () => {
    names.forEach((n) => {
      S.d.freezes = S.d.freezes.filter((f) => !(f.d === date && f.n === n));
      if (on) S.d.freezes.push({ d: date, n, k: 1 });
    });
  }).then((r) => {
    if (r.skipped && r.skipped.length) toast(r.skipped.join('; '), { err: true });
    if (quiet || !r.done.length) return;
    const who = r.done.length > 1 ? `${r.done.length} ${plural(r.done.length, ['ученик', 'ученика', 'учеников'])}` : r.done[0];
    toast(on ? `${who}: заморозка на ${dayLabel(date)}` : `${who}: заморозка снята`,
      { action: 'Отменить', onAction: () => tSetFreeze(date, r.done, !on, true, teacher).catch(() => {}) });
  }).catch(() => {});
}

function tSetResult(x, v) {
  tRun('tResult', { row: x.row, key: x.key, result: v }, () => { x.result = v; x.mine = true; })
    .then(() => {
      const fresh = S.d.trials.find((t) => t.row === x.row) || x;
      const noted = /(^|\n)Преп\.:/.test(fresh.comment || '');
      if (v === 'Записался' || v === 'Думает' || v === 'Отказ') {
        toast(v === 'Записался' ? 'Отлично! Добавьте ученика во вкладке «Ученики»' : 'Итог записан, менеджер получит уведомление',
          noted ? {} : { action: 'Отзыв', onAction: () => tOpenNote(x.row) });
      } else toast('Итог записан, менеджер получит уведомление');
    }).catch(() => load(true));
}

function tSaveStudent(s, patch, msg) {
  return stCtx(s.teacher).run('tStudent', { student: tPayload(s, patch) }, () => Object.assign(s, patch))
    .then(() => { if (msg) toast(msg); }).catch(() => {});
}

/** Менеджер открывает кабинет преподавателя («Ещё → Преподаватели → Открыть»). */
async function tOpenCab(name) {
  S.mgr = { d: S.d, view: S.view, scroll: window.scrollY };
  S.as = name;
  S.d = null;
  TS.day = todayS();
  renderSkeleton();
  window.scrollTo(0, 0);
  try {
    const d = await call('tBootstrap', { as: name });
    if (S.as !== name) return;
    S.d = d;
    S.view = 'tday';
    render({ anim: 'fade' });
  } catch (e) {
    tExitCab();
    toast(e.message, { err: true });
  }
}
function tExitCab() {
  if (!S.mgr) return;
  const m = S.mgr;
  S.as = null;
  S.mgr = null;
  while (stack.length) stack[stack.length - 1].close();
  S.d = m.d;
  S.view = m.view;
  render({ anim: 'fade' });
  window.scrollTo(0, m.scroll || 0);
  load(true);
}

const T_ACT = {
  tDay(el) {
    const v = el.dataset.v;
    if (v === TS.day) return;
    const dir = v > TS.day ? 'left' : 'right';
    const week = tWeekStart(v) !== tWeekStart(TS.day);
    TS.day = v;
    render({ anim: week ? dir : 'soft' });
  },
  tWeek(el) {
    const n = Number(el.dataset.v);
    TS.day = addDays(tWeekStart(TS.day || todayS()), n);
    if (tWeekStart(TS.day) === tWeekStart(todayS())) TS.day = todayS();
    render({ anim: n > 0 ? 'left' : 'right' });
  },
  tFreeze(el) {
    const { date, name, on, teacher } = el.dataset;
    tSetFreeze(date, [name], on === '1', false, teacher);
  },
  tLessonMenu(el) {
    const { date, time } = el.dataset;
    const l = tLessons(date).find((x) => x.time === time);
    if (!l) return;
    const dow = parseD(date).getDay();
    const names = l.kids.filter((k) => k.st).map((k) => k.name);
    const open = names.filter((n) => !tFrozen(date, n));
    const items = [{ label: 'Статус часа', note: l.type || 'не задан', onPick: () => tPickSlot(dow, time) }];
    if (tCanFreeze(date) && open.length) items.push({ label: 'Урок не состоялся — заморозить всех', onPick: () => tSetFreeze(date, open, true) });
    if (tCanFreeze(date) && open.length < names.length) items.push({ label: 'Снять заморозку со всех', onPick: () => tSetFreeze(date, names.filter((n) => tFrozen(date, n)), false) });
    pick(esc(`${tDayTitle(date)}, ${time}`), items);
  },
  tGrid(el) {
    const dow = Number(el.dataset.v);
    openSheet(() => tGridSheet(dow), {
      live: true,
      after: (sh) => {
        const p = sh.panel;
        const save = () => {
          const from = $('#tg-from', p).value, to = $('#tg-to', p).value;
          tRun('tSlot', { dow, from, to }).then(() => toast('Часы сохранены')).catch(() => {});
        };
        $('#tg-from', p).onchange = save;
        $('#tg-to', p).onchange = save;
      },
    });
  },
  tSlotPick(el) { tPickSlot(Number(el.dataset.dow), el.dataset.time); },
  tRes(el) {
    const x = S.d.trials.find((t) => t.row === Number(el.dataset.row));
    if (x) tSetResult(x, el.dataset.v);
  },
  tResMenu(el) {
    const x = S.d.trials.find((t) => t.row === Number(el.dataset.row));
    if (!x) return;
    pick('Изменить итог', RESULTS.map((r) => ({ label: r, cur: r === x.result, onPick: () => { if (r !== x.result) tSetResult(x, r); } })));
  },
  tNote(el) { tOpenNote(Number(el.dataset.row)); },
  tStud(el) { stOpen(el.dataset.teacher, el.dataset.name, Number(el.dataset.row) || 0); },
  tNewStudent() { tOpenForm(null); },
  tCorr() { tOpenCorr(); },
  tEdit(el) { const s = tFind(el); if (s) tOpenForm(s); },
  tPay(el) { const s = tFind(el); if (s) tOpenPay(s); },
  tFreezeDay(el) { const s = tFind(el); if (s) tOpenFreezeDay(s); },
  tStatus(el) {
    const s = tFind(el);
    const v = el.dataset.v;
    if (!s || s.status === v) return;
    const go = () => tSaveStudent(s, { status: v }, `${s.name}: ${v.toLowerCase()}`);
    if (v === 'Выбыл') confirmSheet({ title: `${esc(s.name)}: статус «Выбыл»?`, text: 'Строка в «Базе» станет серой, ученик пропадёт из расписания и сводки. Вернуть можно здесь же, статусом «Учится».', ok: 'Да, «Выбыл»', onOk: go });
    else go();
  },
  tFrCount(el) {
    const s = tFind(el);
    if (!s) return;
    const n = Math.max(0, Math.min(36, (s.freezes || 0) + Number(el.dataset.v)));
    if (n !== s.freezes) tSaveStudent(s, { freezes: n });
  },
  tMsg(el) {
    const sh = sheetOf(el);
    if (sh) sh.close();
    tOpenMsg(el.dataset.student || '');
  },
  tGone() { TS.gone = !TS.gone; render({ anim: 'soft' }); },
  openCab(el) { tOpenCab(el.dataset.name); },
  exitCab() { tExitCab(); },
};

/** Выбор статуса часа. «Не работает» убирает уроки этого часа из ЗП каждую неделю — предупреждаем. */
function tPickSlot(dow, time) {
  const sl = (S.d.grid.slots || []).find((x) => x.dow === dow && x.time === time) || {};
  const types = S.d.meta.types;
  const set = (type) => tRun('tSlot', { dow, time, type }, () => {
    const g = S.d.grid;
    const i = g.slots.findIndex((x) => x.dow === dow && x.time === time);
    if (i >= 0) g.slots[i] = { ...g.slots[i], type }; else g.slots.push({ dow, time, type, who: '' });
  }).then(() => {
    if (type === 'Не работает' && sl.who) toast('Уроки в этот час не пойдут в ЗП каждую неделю. Если урок не состоялся один раз — лучше заморозить учеников на этот день');
    else toast(`${WD[dow]} ${time}: ${type || 'без статуса'}`);
  }).catch(() => {});
  pick(esc(`${WDF[dow]}, ${time}`), [...types.map((t) => ({ label: t, cur: t === sl.type, onPick: () => { if (t !== sl.type) set(t); } })),
    { label: 'Очистить', cls: 'danger', onPick: () => { if (sl.type) set(''); } }]);
}
