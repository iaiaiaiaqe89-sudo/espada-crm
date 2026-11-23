'use strict';
/* Демо-сервер: повторяет логику Apps Script в браузере на вымышленных данных. */

const Demo = (() => {
  const KEY = 'espada-demo-db';
  const USERS = ['Алтынай', 'Билал'];
  const TEACHERS = ['Артур', 'Билал', 'Дмитрий', 'Алтынай', 'Алинур', 'Акбар'];
  const SETTINGS = {
    'Источники': 'Instagram, WhatsApp, 2ГИС, Посоветовали, Реклама, Сайт, Ученик вернулся, Другое',
    'Причины отказа': 'Дорого, Не подошло время, Далеко, Выбрали другое, Пропал / не отвечает, Другое',
    'Утренний план в (час)': '9',
    'Перезвонить «Думает» через (дней)': '2',
    'Снова напомнить об оплате через (дней)': '3',
    'Шаблон: приветствие': 'Здравствуйте! Это центр математики «Эспада» 😊 Подскажите, пожалуйста, в каком классе учится ребёнок и какой формат удобнее — онлайн или офлайн?',
    'Шаблон: напоминание о пробном': 'Здравствуйте! Напоминаем о пробном занятии по математике: {дата} в {время}, {формат}. Ученик: {имя}. Ждём вас! 😊',
    'Шаблон: после пробного': 'Здравствуйте! Спасибо, что пришли на пробное занятие 😊 Как впечатления? Будем рады ответить на вопросы и подобрать удобную группу.',
    'Шаблон: продление': 'Здравствуйте! Напоминаем, что абонемент заканчивается {дата} (ученик: {имя}). Продлеваем? 🙂',
    'Шаблон: долг': 'Здравствуйте! Напоминаем об оплате занятий (ученик: {имя}): осталось внести {долг} сом. Спасибо! 🙏',
  };

  const p2 = (n) => String(n).padStart(2, '0');
  const dS = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
  const dtS = (d) => `${dS(d)}T${p2(d.getHours())}:${p2(d.getMinutes())}`;
  const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return dS(d); };
  const at = (n, hm) => day(n) + 'T' + hm;
  const ago = (min) => dtS(new Date(Date.now() - min * 60000));
  const ruD = (s) => s.split('-').reverse().join('.');
  const norm = (p) => { let d = String(p || '').replace(/\D/g, ''); if (d.length === 10 && d[0] === '0') d = '996' + d.slice(1); return d; };
  const id = () => Math.random().toString(36).slice(2, 12);
  const stamp = () => { const d = new Date(); return `${p2(d.getDate())}.${p2(d.getMonth() + 1)} ${p2(d.getHours())}:${p2(d.getMinutes())}`; };

  function seed() {
    const L = (o) => ({ id: id(), created: ago(o.ago || 60), updated: ago(o.upd || o.ago || 60), stage: 'Новый', name: '', contact: '', phone: '',
      grade: '', source: '', format: '', owner: 'Алтынай', trialDate: '', trialTime: '', teacher: '', trialResult: '', lostReason: '',
      comment: '', log: '', ...o });
    const leads = [
      L({ name: 'Нурислам', phone: '0700000101', grade: '7', source: 'Instagram', ago: 25, contact: 'мама', comment: 'Спрашивали про подготовку к ОРТ заранее' }),
      L({ name: '', phone: '0700000102', source: 'WhatsApp', ago: 70 }),
      L({ name: 'Камила', phone: '0700000103', grade: '9', source: '2ГИС', ago: 200, format: 'Онлайн' }),
      L({ name: 'Тимур', phone: '0700000104', grade: '5', source: 'Посоветовали', stage: 'В диалоге', ago: 1500, upd: 300, contact: 'папа' }),
      L({ name: 'Элина', phone: '0700000105', grade: '11', source: 'Instagram', stage: 'В диалоге', ago: 3000, upd: 1600, owner: 'Билал' }),
      L({ name: 'Бекжан', phone: '0700000106', grade: '8', source: 'Реклама', stage: 'Пробный', ago: 2900, trialDate: day(0), trialTime: '17:00', teacher: 'Дмитрий', format: 'Офлайн' }),
      L({ name: 'Арууке', phone: '0700000107', grade: '6', source: 'Instagram', stage: 'Пробный', ago: 4000, trialDate: day(1), trialTime: '16:00', teacher: 'Артур', format: 'Онлайн' }),
      L({ name: 'Даниял', phone: '0700000108', grade: '10', source: 'Посоветовали', stage: 'Пробный', ago: 5000, trialDate: day(-1), trialTime: '18:00', teacher: 'Алинур', format: 'Офлайн' }),
      L({ name: 'Мирлан', phone: '0700000109', grade: '9', source: '2ГИС', stage: 'После пробного', ago: 8000, trialDate: day(-3), trialTime: '17:00', teacher: 'Дмитрий', trialResult: 'Думает', format: 'Офлайн' }),
      L({ name: 'Эльдана', phone: '0700000110', grade: '4', source: 'Instagram', stage: 'Записался', ago: 12000, upd: 2000, trialDate: day(-5), trialTime: '15:00', teacher: 'Акбар', trialResult: 'Записался' }),
      L({ name: 'Санжар', phone: '0700000111', grade: '11', source: 'Реклама', stage: 'Отказ', ago: 9000, upd: 4000, lostReason: 'Дорого' }),
      L({ name: 'Айсулуу', phone: '0700000112', grade: '3', source: 'Посоветовали', stage: 'Записался', ago: 20000, upd: 9000, trialResult: 'Записался' }),
    ];
    leads.forEach((l) => { l.log = `${stamp()} ${l.owner}: новый лид (${l.source})`; });
    const by = (n) => leads.find((l) => l.name === n);
    const T = (o) => ({ id: id(), created: ago(300), leadId: '', leadName: '', title: '', due: '', owner: 'Алтынай', done: false, doneAt: '', notified: '', key: '', author: 'Алтынай', ...o });
    const lbl = (l) => `${l.name}, ${l.grade} кл`;
    const tasks = [
      T({ leadId: by('Тимур').id, leadName: lbl(by('Тимур')), title: 'Позвонить: папа хотел обсудить время', due: at(0, '09:30') }),
      T({ leadId: by('Мирлан').id, leadName: lbl(by('Мирлан')), title: 'Перезвонить после пробного', due: at(0, '16:00') }),
      T({ leadId: by('Элина').id, leadName: lbl(by('Элина')), title: 'Отправить расписание групп 11 класса', due: at(0, '18:00'), owner: 'Билал' }),
      T({ leadId: by('Эльдана').id, leadName: lbl(by('Эльдана')), title: 'Добавить в «Базу учеников» и в расписание', due: at(-1, '12:00') }),
      T({ title: 'Обновить прайс в Instagram', due: at(2, '11:00') }),
    ];
    const trials = [
      { date: day(0), time: '16:00', teacher: 'Артур', name: 'Ислам', grade: '6', phone: '0700000201', format: 'Офлайн', result: '', who: 'Алтынай', comment: '' },
      { date: day(0), time: '17:00', teacher: 'Дмитрий', name: 'Бекжан', grade: '8', phone: '0700000106', format: 'Офлайн', result: '', who: 'Алтынай', comment: '' },
      { date: day(0), time: '19:00', teacher: 'Акбар', name: '', grade: '11', phone: '0700000203', format: 'Онлайн', result: '', who: 'Билал', comment: '' },
      { date: day(-1), time: '18:00', teacher: 'Алинур', name: 'Даниял', grade: '10', phone: '0700000108', format: 'Офлайн', result: '', who: 'Алтынай', comment: '' },
      { date: day(-2), time: '16:00', teacher: 'Билал', name: 'Медина', grade: '7', phone: '0700000205', format: 'Онлайн', result: '', who: 'Алтынай', comment: '' },
      { date: day(-3), time: '17:00', teacher: 'Дмитрий', name: 'Мирлан', grade: '9', phone: '0700000109', format: 'Офлайн', result: 'Думает', who: 'Алтынай', comment: '' },
      { date: day(-5), time: '15:00', teacher: 'Акбар', name: 'Эльдана', grade: '4', phone: '0700000110', format: 'Офлайн', result: 'Записался', who: 'Алтынай', comment: '' },
      { date: day(1), time: '16:00', teacher: 'Артур', name: 'Арууке', grade: '6', phone: '0700000107', format: 'Онлайн', result: '', who: 'Алтынай', comment: '' },
    ].map((t, i) => ({ row: i + 3, ...t }));
    const payments = [
      { teacher: 'Артур', name: 'Алихан', phone: '0700000301', status: 'Продлить', debt: '0', nextDate: ruD(day(2)) },
      { teacher: 'Дмитрий', name: 'Сезим', phone: '0700000302', status: 'Продлить', debt: '0', nextDate: ruD(day(0)) },
      { teacher: 'Дмитрий', name: 'Адилет', phone: '0700000303', status: 'Продлить', debt: '0', nextDate: ruD(day(1)) },
      { teacher: 'Билал', name: 'Нурай', phone: '', status: 'Долг', debt: '6 000', nextDate: '' },
      { teacher: 'Алинур', name: 'Тилек', phone: '0700000305', status: 'Долг', debt: '4 000', nextDate: ruD(day(20)) },
    ].map((p) => ({ ...p, key: ['pay', p.teacher, p.name, p.status, p.nextDate].join('|') }));
    return { leads, tasks, trials, payments };
  }

  let db = null;
  function get() {
    if (db) return db;
    try { db = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { db = null; }
    if (!db) { db = seed(); save(); }
    return db;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* ничего */ } }
  const lbl = (l) => (l.name || 'Без имени') + (l.grade ? `, ${l.grade} кл` : '');
  const log = (l, text) => { l.log = (l.log ? l.log + '\n' : '') + `${stamp()} Алтынай: ${text}`; l.updated = dtS(new Date()); };
  function addTask(o) {
    const t = { id: id(), created: dtS(new Date()), leadId: '', leadName: '', title: '', due: '', owner: 'Алтынай', done: false, doneAt: '',
      notified: '', key: '', author: 'Алтынай', ...o };
    db.tasks.push(t);
    return t;
  }
  function soon() { const d = new Date(); return d.getHours() < 18 ? dtS(new Date(Date.now() + 3600000)) : at(1, '11:00'); }
  function applyResult(l, r) {
    l.trialResult = r;
    log(l, 'итог пробного: ' + r);
    const owner = l.owner || 'Алтынай';
    if (r === 'Записался') { l.stage = 'Записался'; addTask({ leadId: l.id, leadName: lbl(l), title: 'Добавить в «Базу учеников» и в расписание', due: dtS(new Date()), owner }); }
    if (r === 'Думает') { l.stage = 'После пробного'; addTask({ leadId: l.id, leadName: lbl(l), title: 'Перезвонить после пробного', due: at(2, '11:00'), owner }); }
    if (r === 'Не пришёл') { l.stage = 'После пробного'; addTask({ leadId: l.id, leadName: lbl(l), title: 'Не пришёл на пробный: узнать причину, предложить новую дату', due: soon(), owner }); }
    if (r === 'Перенос') { l.stage = 'В диалоге'; addTask({ leadId: l.id, leadName: lbl(l), title: 'Назначить новую дату пробного', due: soon(), owner }); }
    if (r === 'Отказ') { l.stage = 'Отказ'; db.tasks.forEach((t) => { if (t.leadId === l.id && !t.done) { t.done = true; t.doneAt = dtS(new Date()); } }); }
  }
  const find = (lid) => { const l = db.leads.find((x) => x.id === lid); if (!l) throw new Error('Лид не найден'); return l; };
  const touchTasks = (lid) => db.tasks.filter((t) => t.leadId === lid);

  const A = {
    bootstrap: () => ({
      me: 'Алтынай', main: 'Алтынай', users: USERS, today: day(0), teachers: TEACHERS, settings: SETTINGS,
      stages: [], results: [], leads: db.leads, tasks: db.tasks, trials: db.trials, payments: db.payments,
      telegram: { bot: 'espada_demo_bot', linked: false, link: 'https://t.me/' },
      links: { base: 'https://docs.google.com/spreadsheets/', sched: 'https://docs.google.com/spreadsheets/' },
    }),
    saveLead: (r) => {
      const src = r.lead;
      let l;
      if (src.id) { l = find(src.id); Object.assign(l, src); l.updated = dtS(new Date()); } else {
        l = { id: id(), created: dtS(new Date()), updated: dtS(new Date()), stage: src.stage || 'Новый', trialDate: '', trialTime: '', teacher: '',
          trialResult: '', lostReason: '', log: '', ...src };
        delete l.stage; l.stage = src.stage || 'Новый';
        log(l, 'новый лид' + (l.source ? ` (${l.source})` : ''));
        db.leads.push(l);
      }
      const tasks = [];
      if (r.firstTask) tasks.push(addTask({ leadId: l.id, leadName: lbl(l), title: r.firstTask.title, due: r.firstTask.due, owner: l.owner }));
      return { leads: [l], tasks };
    },
    moveLead: (r) => {
      const l = find(r.id);
      log(l, `${l.stage} → ${r.stage}${r.lostReason ? ' (' + r.lostReason + ')' : ''}`);
      l.stage = r.stage;
      if (r.stage === 'Отказ') { l.lostReason = r.lostReason || ''; db.tasks.forEach((t) => { if (t.leadId === l.id && !t.done) { t.done = true; t.doneAt = dtS(new Date()); } }); }
      if (r.stage === 'Записался') addTask({ leadId: l.id, leadName: lbl(l), title: 'Добавить в «Базу учеников» и в расписание', due: dtS(new Date()), owner: l.owner });
      return { leads: [l], tasks: touchTasks(l.id) };
    },
    addNote: (r) => { const l = find(r.id); log(l, r.text); return { leads: [l] }; },
    bookTrial: (r) => {
      const l = find(r.id);
      const out = { trials: [] };
      const old = db.trials.find((t) => t.date === l.trialDate && t.time === l.trialTime && norm(t.phone) === norm(l.phone) && !t.result);
      if (old) { old.result = 'Перенос'; out.trials.push(old); }
      const tr = { row: Math.max(2, ...db.trials.map((t) => t.row)) + 1, date: r.date, time: r.time, teacher: r.teacher, name: l.name, grade: l.grade,
        phone: l.phone, format: r.format, result: '', who: 'Алтынай', comment: r.comment || '' };
      db.trials.push(tr); out.trials.push(tr);
      Object.assign(l, { trialDate: r.date, trialTime: r.time, teacher: r.teacher, trialResult: '', format: r.format, stage: 'Пробный' });
      log(l, `записан(а) на пробный ${ruD(r.date)} ${r.time}, ${r.teacher}`);
      db.tasks.forEach((t) => { if (t.leadId === l.id && !t.done && /пробн/i.test(t.title) && /назнач/i.test(t.title)) { t.done = true; t.doneAt = dtS(new Date()); } });
      return { ...out, leads: [l], tasks: touchTasks(l.id) };
    },
    setTrialResult: (r) => {
      const t = db.trials.find((x) => x.row === r.row);
      t.result = r.result;
      const l = (r.leadId && db.leads.find((x) => x.id === r.leadId)) || db.leads.find((x) => norm(x.phone) === norm(t.phone) && x.trialDate === t.date);
      if (l) applyResult(l, r.result);
      return { trials: [t], leads: l ? [l] : [], tasks: l ? touchTasks(l.id) : [] };
    },
    slots: (r) => {
      const dow = new Date(r.date + 'T12:00').getDay();
      if (dow === 0) return { dayOff: true, slots: [] };
      const seedN = r.teacher.length * 7 + dow;
      const slots = [];
      for (let h = 9; h <= 20; h++) {
        const time = p2(h) + ':00';
        let status = 'off', type = '', who = '';
        if (h >= 15 && h < 20) {
          const k = (seedN + h) % 5;
          if (k === 0) status = 'free';
          else if (k === 1 || k === 3) { status = 'group'; type = 'Гр. есть места'; who = k === 1 ? '3 чел.: Айдана 8 кл, Эмир 8 кл, Атай 9 кл' : '2 чел.: Сауле 6 кл, Нурай 5 кл'; }
          else if (k === 2) { status = 'busy'; type = 'Гр. полная'; who = '7 чел.: …'; }
          else { status = 'busy'; type = 'Инд'; who = '1 чел.: …'; }
        }
        const trials = db.trials.filter((t) => t.teacher === r.teacher && t.date === r.date && t.time === time && t.result !== 'Перенос')
          .map((t) => (t.name || 'без имени') + (t.grade ? ` (${t.grade})` : ''));
        slots.push({ time, status, type, who, trials });
      }
      return { date: r.date, dayOff: false, slots };
    },
    checkPhone: (r) => {
      const p = norm(r.phone);
      return {
        leads: db.leads.filter((l) => norm(l.phone) === p && l.id !== r.exceptId),
        students: p === '996700000301' ? [{ teacher: 'Артур', name: 'Алихан', grade: '6', status: 'Учится' }] : [],
        trials: db.trials.filter((t) => norm(t.phone) === p),
      };
    },
    saveTask: (r) => {
      const src = r.task;
      if (src.id) { const t = db.tasks.find((x) => x.id === src.id); Object.assign(t, src); return { tasks: [t] }; }
      return { tasks: [addTask({ ...src, author: 'Алтынай' })] };
    },
    setTaskDone: (r) => {
      const t = db.tasks.find((x) => x.id === r.id);
      t.done = r.done; t.doneAt = r.done ? dtS(new Date()) : '';
      const l = t.leadId && db.leads.find((x) => x.id === t.leadId);
      if (l && r.done) log(l, '✓ ' + t.title);
      return { tasks: [t], leads: l ? [l] : [] };
    },
    dismiss: (r) => {
      if (r.undo) {
        const done = db.tasks.filter((t) => t.key === r.key);
        done.forEach((t) => { t.key = ''; t.title = '(отменено) ' + t.title; });
        return { tasks: done };
      }
      return { tasks: [addTask({ title: r.title, key: r.key, done: true, doneAt: dtS(new Date()), due: dtS(new Date()), leadId: r.leadId || '' })] };
    },
  };

  Object.assign(A, {
    baseMeta: () => ({ days: ['Пн-Ср-Пт', 'Вт-Чт-Сб', 'Пн-Ср', 'Вт-Чт', 'Сб', 'Вт + Сб×2'], prices: { 'Группа': 6000, 'Пара': 8000, 'Инд': 12000 },
      teachers: TEACHERS, formats: ['Группа', 'Пара', 'Инд'] }),
    enroll: (r) => {
      const st = r.student;
      if (!r.force && st.name === 'Алихан') return { duplicate: { row: 4, name: 'Алихан', teacher: st.teacher } };
      db.baseRow = (db.baseRow || 11) + 1;
      const out = { leads: [], tasks: [], enrolled: { teacher: st.teacher, row: db.baseRow } };
      const l = r.leadId && db.leads.find((x) => x.id === r.leadId);
      if (l) {
        l.inBase = `${st.teacher}, строка ${db.baseRow}`;
        l.stage = 'Записался';
        log(l, `добавлен(а) в Базу: ${st.teacher}, ${st.format} ${st.days} ${st.time}`);
        db.tasks.forEach((t) => { if (t.leadId === l.id && !t.done && /Базу учеников/.test(t.title)) { t.done = true; t.doneAt = dtS(new Date()); } });
        out.leads.push(l); out.tasks = touchTasks(l.id);
      }
      return out;
    },
    studentInfo: (r) => {
      const p = db.payments.find((x) => x.name === r.name && x.teacher === r.teacher);
      if (!p) throw new Error('Ученик не найден в Базе');
      const debt = Number(String(p.debt).replace(/\D/g, '')) || 0;
      const price = debt || 6000;
      return { row: 7, name: p.name, phone: p.phone, format: 'Группа', days: 'Пн-Ср-Пт', time: '17:00', price,
        paid: debt ? 0 : price, debt, payDate: debt ? '' : day(-26), freezes: '', next: p.nextDate, payStatus: p.status };
    },
    recordPayment: (r) => {
      const i = db.payments.findIndex((x) => x.name === r.name && x.teacher === r.teacher);
      const pid = id();
      db.paid = db.paid || {};
      if (i >= 0) { db.paid[pid] = db.payments[i]; db.payments.splice(i, 1); }
      return { payment: { id: pid }, tasks: [addTask({ title: `Оплата ${r.amount} сом: ${r.name}`, key: r.key, done: true, doneAt: dtS(new Date()), due: dtS(new Date()) })] };
    },
    undoPayment: (r) => {
      if (db.paid && db.paid[r.id]) { db.payments.push(db.paid[r.id]); delete db.paid[r.id]; }
      const done = db.tasks.filter((t) => t.key === r.key);
      done.forEach((t) => { t.key = ''; t.title = '(отменено) ' + t.title; });
      return { tasks: done };
    },
  });

  return {
    call(action, payload) {
      get();
      return new Promise((res, rej) => setTimeout(() => {
        try {
          const fn = A[action];
          if (!fn) throw new Error('Неизвестное действие');
          const out = fn(payload || {});
          save();
          res(JSON.parse(JSON.stringify(out)));
        } catch (e) { rej(e); }
      }, action === 'slots' ? 350 : 220));
    },
    reset() { db = seed(); save(); },
  };
})();
