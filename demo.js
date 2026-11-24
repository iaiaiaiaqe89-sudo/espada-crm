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
      { date: day(-1), time: '17:00', teacher: 'Артур', name: 'Нурбек', grade: '7', phone: '0700000208', format: 'Офлайн', result: '', who: 'Билал', comment: 'Мама просит группу после школы' },
      { date: day(-4), time: '18:00', teacher: 'Артур', name: 'Дастан', grade: '5', phone: '0700000209', format: 'Офлайн', result: 'Записался', who: 'Алтынай', comment: 'Преп.: хорошо считает, слабые дроби' },
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
    if (!db.archV) { addHistory(db); save(); }
    return db;
  }
  /** Пробные за прошлые месяцы — чтобы в архиве была статистика. */
  function addHistory(d) {
    const names = ['Алима', 'Айдай', 'Мээрим', 'Тимур', 'Сайкал', 'Аслан', 'Эмир', 'Айбек', 'Жибек', 'Сабина', 'Улан', 'Бекзат', 'Айгерим', 'Дильназ',
      'Арген', 'Нуржан', 'Асель', 'Самира', 'Эрлан', 'Аяна', 'Байэл', 'Аида', 'Мирас', 'Нурсултан', 'Адель', 'Каныкей', 'Элдос', 'Ариет'];
    const res = ['Записался', 'Записался', 'Отказ', 'Думает', 'Записался', 'Не пришёл', 'Записался', 'Перенос', 'Отказ', 'Записался'];
    const notes = ['Преп.: уверенно решает уравнения, подтянуть геометрию', 'Преп.: стеснялся, но к концу разговорился', '', 'Дорого, подумают',
      'Преп.: сильный, можно в олимпиадную группу', '', 'Преп.: пробелы с 5 класса — дроби, проценты', '', 'Далеко ездить', ''];
    const times = ['15:00', '16:00', '17:00', '18:00', '19:00'];
    let row = Math.max(...d.trials.map((t) => t.row)) + 1;
    for (let i = 0; i < 46; i++) {
      const ago = 6 + Math.round(i * 2.6);
      const teacher = TEACHERS[(i * 5) % TEACHERS.length];
      const k = i < 7 ? i : -1; // первые — ученики Артура из «Базы»
      d.trials.push({ row: row++, date: day(-ago), time: times[i % times.length], teacher: k >= 0 ? 'Артур' : teacher,
        name: k >= 0 ? names[i] : names[(i * 3) % names.length], grade: String(5 + (i % 7)),
        phone: k >= 0 ? '07000004' + p2([0, 2, 4, 11, 5, 8, 6][i]) : '0700005' + p2(i) + '0', format: i % 3 ? 'Офлайн' : 'Онлайн',
        result: k >= 0 ? 'Записался' : res[i % res.length], who: i % 4 ? 'Алтынай' : 'Билал', comment: notes[i % notes.length] });
    }
    d.archV = 1;
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
      teacherBot: TEACHERS.map((n, i) => ({ name: n, linked: i < 2, link: 'https://t.me/espada_demo_bot?start=t' + i,
        cab: location.href.split('#')[0] + '#api=https://script.google.com/demo&k=demo' + i, seen: i < 3 ? day(-i) : '' })),
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
      const same = db.trials.find((t) => norm(t.phone) === norm(l.phone) && t.date === r.date && t.time === r.time && t.result !== 'Отказ');
      const tr = same || { row: Math.max(2, ...db.trials.map((t) => t.row)) + 1 };
      Object.assign(tr, { date: r.date, time: r.time, teacher: r.teacher, name: l.name, grade: l.grade,
        phone: l.phone, format: r.format, result: '', who: 'Алтынай', comment: r.comment || '' });
      if (!same) db.trials.push(tr);
      out.trials.push(tr);
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
        done.forEach((t) => { t.key = 'x|' + t.key; t.title = '(отменено) ' + t.title; });
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
      done.forEach((t) => { t.key = 'x|' + t.key; t.title = '(отменено) ' + t.title; });
      return { tasks: done };
    },
  });

  Object.assign(A, {
    deleteTrial: (r) => {
      const t = db.trials.find((x) => x.row === r.row);
      if (!t) throw new Error('Пробный не найден');
      db.trials = db.trials.filter((x) => x !== t);
      const leads = db.leads.filter((l) => norm(l.phone) === norm(t.phone) && l.trialDate === t.date);
      leads.forEach((l) => {
        Object.assign(l, { trialDate: '', trialTime: '', teacher: '', trialResult: '' });
        if (l.stage === 'Пробный' || l.stage === 'После пробного') l.stage = 'В диалоге';
        log(l, `пробный удалён (${ruD(t.date)} ${t.time})`);
      });
      return { leads, removed: { trials: [t.row] } };
    },
    deleteLead: (r) => {
      const l = find(r.id);
      const tasks = db.tasks.filter((t) => t.leadId === l.id).map((t) => t.id);
      db.tasks = db.tasks.filter((t) => t.leadId !== l.id);
      const trials = r.withTrials ? db.trials.filter((t) => norm(t.phone) === norm(l.phone)).map((t) => t.row) : [];
      db.trials = db.trials.filter((t) => !trials.includes(t.row));
      db.leads = db.leads.filter((x) => x !== l);
      return { removed: { leads: [l.id], tasks, trials } };
    },
    deleteTask: (r) => {
      db.tasks = db.tasks.filter((t) => t.id !== r.id);
      return { removed: { tasks: [r.id] } };
    },
  });

  /* ---------- Кабинет преподавателя ---------- */
  const DOWS = { 'Пн': 1, 'Вт': 2, 'Ср': 3, 'Чт': 4, 'Пт': 5, 'Сб': 6 };
  const PATTERNS = {};
  ['Пн-Ср-Пт', 'Вт-Чт-Сб', 'Пн-Ср', 'Вт-Чт', 'Сб', 'Вт + Сб×2'].forEach((n) => {
    const w = [0, 0, 0, 0, 0, 0, 0];
    (n.match(/Пн|Вт|Ср|Чт|Пт|Сб/g) || []).forEach((x) => { w[DOWS[x]] = 1; });
    if (/Сб×2/.test(n)) w[6] = 2;
    PATTERNS[n] = w;
  });
  const RATES = { 'Группа': 200, 'Пара': 540, 'Инд': 400 };
  const KIDS = [
    ['Алима', '8', 'Инд', 'Офлайн', 'Пн-Ср-Пт', '16:00', 12000, 12000, -22, 3],
    ['Малика', '9', 'Инд', 'Онлайн', 'Вт-Чт-Сб', '16:00', 12000, 12000, -27, 0],
    ['Айдай', '11', 'Группа', 'Офлайн', 'Вт-Чт-Сб', '17:00', 6000, 6000, -8, 1],
    ['Адина', '7', 'Группа', 'Офлайн', 'Вт-Чт-Сб', '17:00', 6000, 6000, 0, 0],
    ['Мээрим', '9', 'Группа', 'Офлайн', 'Вт-Чт-Сб', '17:00', 6000, 6000, -15, 0],
    ['Сайкал', '9', 'Группа', 'Офлайн', 'Пн-Ср-Пт', '17:00', 6000, 6000, -10, 0],
    ['Эмир', '9', 'Группа', 'Офлайн', 'Пн-Ср-Пт', '17:00', 6000, 2000, -12, 0],
    ['Розанна', '8', 'Группа', 'Офлайн', 'Пн-Ср-Пт', '17:00', 6000, 6000, -5, 0],
    ['Аслан', '5', 'Группа', 'Офлайн', 'Пн-Ср-Пт', '18:00', 6000, 6000, -29, 2],
    ['Перизат', '5', 'Группа', 'Офлайн', 'Вт-Чт-Сб', '18:00', 6000, 6000, -17, 0],
    ['Амалия', '5', 'Инд', 'Онлайн', 'Вт + Сб×2', '19:00', 12000, 12000, -20, 0],
    ['Тимур', '6', 'Пара', 'Офлайн', 'Пн-Ср-Пт', '19:00', 8000, 8000, -9, 0],
    ['Сезим', '6', 'Пара', 'Офлайн', 'Пн-Ср-Пт', '19:00', 8000, 8000, -9, 0],
  ];
  const ws = () => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return dS(d); };
  const addD = (s, n) => { const d = new Date(s + 'T12:00'); d.setDate(d.getDate() + n); return dS(d); };
  const dowOf = (s) => new Date(s + 'T12:00').getDay();
  /** Пересчёт того, что в «Базе» делают формулы: долг, следующая оплата, статус, ЗП за неделю. */
  function calc(c, s) {
    s.debt = Math.max(0, (s.price || 0) - (s.paid || 0));
    const w = PATTERNS[s.days] || [];
    s.next = ''; s.nextText = '';
    if (s.payDate && s.days) {
      let cnt = 0, d = s.payDate;
      const need = (Number(s.lessons) || 12) + 1 + (Number(s.freezes) || 0);
      for (let i = 0; i < 400; i++) { cnt += w[dowOf(d)] || 0; if (cnt >= need) { s.next = d; break; } d = addD(d, 1); }
    }
    const t = day(0);
    s.payStatus = s.status === 'Выбыл' ? '—' : s.status === 'Заморозка' ? 'Заморозка' : s.debt > 0 ? 'Долг' : !s.payDate ? 'Укажи дату оплаты'
      : !s.days ? 'Укажи дни занятий' : s.next < t ? 'Закончился' : (new Date(s.next) - new Date(t)) / 864e5 <= 2 ? 'Продлить' : 'Оплачено';
    s.zpLessons = 0;
    if (s.status === 'Учится' && s.paid > 0 && s.next) {
      for (let i = 0; i < 6; i++) {
        const d = addD(ws(), i);
        if (d < s.next && d <= t && !c.freezes.some((f) => f.d === d && f.n === s.name)) s.zpLessons += w[dowOf(d)] || 0;
      }
    }
    s.zp = s.zpLessons * (RATES[s.format] || 0);
    return s;
  }
  const POOL = ['Айбек', 'Нурай', 'Эльдар', 'Жибек', 'Сабина', 'Улан', 'Бекзат', 'Айгерим', 'Дильназ', 'Арген', 'Камила', 'Нуржан', 'Асель',
    'Аружан', 'Медина', 'Самира', 'Эрлан', 'Аяна', 'Байэл', 'Нурсултан', 'Аида', 'Мирас', 'Адель', 'Каныкей'];
  function cab(name) {
    db.cab = db.cab || {};
    if (db.cab[name] && db.cab[name].v === 3) return db.cab[name];
    const ti = Math.max(0, TEACHERS.indexOf(name));
    const kids = KIDS.map((k, j) => (ti ? [POOL[(ti * 5 + j) % POOL.length], ...k.slice(1)] : k)).slice(0, KIDS.length - ti);
    const students = kids.map(([n, g, f, o, d, t, price, paid, pd, fr], i) => ({ row: i + 4, name: n, phone: '070' + ti + '0004' + p2(i), grade: g, format: f, onl: o,
      days: d, time: t, price, paid, payDate: day(pd), freezes: fr, status: 'Учится', comment: n === 'Айдай' ? 'Перевелась в группу с индивидуальных' : '', lessons: '' }));
    (db.payments || []).filter((p) => p.teacher === name && !students.some((s) => s.name === p.name)).forEach((p) => {
      const debt = p.status === 'Долг';
      students.push({ row: students.length + 4, name: p.name, phone: p.phone, grade: '7', format: 'Группа', onl: 'Офлайн', days: 'Пн-Ср-Пт', time: '18:00',
        price: 6000, paid: debt ? 6000 - Number(String(p.debt).replace(/\D/g, '')) : 6000, payDate: day(debt ? -10 : -26), freezes: 0, status: 'Учится', comment: '', lessons: '' });
    });
    if (ti % 2 === 0) students.push({ row: students.length + 4, name: ti ? POOL[(ti * 5 + 20) % POOL.length] : 'София', phone: '', grade: '3', format: 'Пара', onl: 'Онлайн',
      days: 'Пн-Ср-Пт', time: '19:00', price: 8000, paid: 8000, payDate: day(-60), freezes: 0, status: 'Выбыл', comment: '', lessons: '' });
    if (ti === 2) students[3].status = 'Заморозка';
    const c = { v: 3, students, freezes: [], pays: {}, hist: [] };
    const nextFri = [...Array(7)].map((_, i) => day(i + 1)).find((d) => dowOf(d) === 5);
    c.freezes.push({ d: nextFri, n: 'Аслан', k: 1 });
    db.cab[name] = c;
    return c;
  }
  function grid(c) {
    const slots = [];
    for (let dow = 1; dow <= 6; dow++) {
      ['15:00', '16:00', '17:00', '18:00', '19:00', '20:00'].forEach((time) => {
        const kids = c.students.filter((s) => s.status !== 'Выбыл' && s.time === time && (PATTERNS[s.days] || [])[dow]);
        const set = (c.types || {})[dow + '|' + time];
        if (!kids.length && !set) return;
        const f = kids[0] ? kids[0].format : '';
        slots.push({ dow, time, type: set !== undefined ? set : f === 'Группа' ? 'Гр. есть места' : f,
          who: kids.length ? `${kids.length} чел.: ${kids.map((s) => `${s.name} ${s.grade} кл${s.onl === 'Онлайн' ? ' онл' : ''}`).join(', ')}` : '' });
      });
    }
    const hours = [1, 2, 3, 4, 5, 6].map((dow) => ({ dow, from: '15:00', to: '20:00', off: false, ...((c.hours || {})[dow] || {}) }));
    return { hours, slots };
  }
  const students = (c) => c.students.map((s) => calc(c, s));
  function zp(c, name) {
    const list = students(c);
    const lessons = list.reduce((n, s) => n + s.zpLessons, 0);
    const accrued = list.reduce((n, s) => n + s.zp, 0);
    return { week: 'Эта неделя', from: ws(), scheme: 'За уроки', lessons, payments: 0, accrued, trials: 200, correction: (c.corr || {}).amount || 0, total: accrued + 200 + ((c.corr || {}).amount || 0), comment: (c.corr || {}).comment || '',
      rates: [['Группа', '200'], ['Пара', '540'], ['Инд', '400'], ['% от оплат', '40%'], ['За запись с пробного', '200']],
      journal: [{ date: day(-((new Date().getDay() || 7))), week: addD(ws(), -7), sum: 5400, comment: '' }, { date: addD(ws(), -8), week: addD(ws(), -14), sum: 6200, comment: 'с заменой' }] };
  }
  const tKey = (t) => [t.date, t.time, norm(t.phone) || t.name, t.teacher].join('|');
  const tTrial = (t) => ({ row: t.row, key: tKey(t), date: t.date, time: t.time, name: t.name, grade: t.grade, format: t.format,
    result: t.result, comment: t.comment, mine: !!t.result && (db.own || {})[tKey(t)] === t.result });
  const trialOf = (r) => {
    const t = db.trials.find((x) => tKey(x) === r.key) || db.trials.find((x) => x.row === r.row);
    if (!t || t.teacher !== r.as) throw new Error('Этого пробного уже нет в таблице');
    return t;
  };
  const studentOf = (c, r) => {
    const s = c.students.find((x) => x.name === (r.orig || r.name) && (!r.row || x.row === Number(r.row)));
    if (!s) throw new Error('Строки в «Базе» сдвинулись — обновите страницу');
    return s;
  };
  const META = () => ({ days: Object.keys(PATTERNS), patterns: PATTERNS, prices: { 'Группа': 6000, 'Пара': 8000, 'Инд': 12000 }, formats: ['Группа', 'Пара', 'Инд'],
    statuses: ['Учится', 'Заморозка', 'Выбыл'], types: ['Гр. есть места', 'Гр. полная', 'Пара', 'Инд', 'Свободно', 'Не работает'],
    from: ['выходной', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'],
    to: ['11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'] });
  Object.assign(A, {
    tBootstrap: (r) => {
      const c = cab(r.as);
      return {
        role: 'teacher', me: r.as, preview: true, main: 'Алтынай', today: day(0), results: [],
        grid: grid(c), students: students(c), freezes: c.freezes, zp: zp(c, r.as),
        meta: META(),
        trials: db.trials.filter((t) => t.teacher === r.as).map(tTrial),
        telegram: { bot: 'espada_demo_bot', linked: r.as === 'Артур', link: 'https://t.me/espada_demo_bot' },
      };
    },
    tResult: (r) => {
      const t = trialOf(r);
      db.own = db.own || {};
      if (t.result && db.own[tKey(t)] !== t.result) throw new Error('Итог уже поставил менеджер: ' + t.result);
      t.result = r.result;
      db.own[tKey(t)] = r.result;
      const l = db.leads.find((x) => norm(x.phone) === norm(t.phone) && x.trialDate === t.date);
      if (l) applyResult(l, r.result);
      return { trials: [tTrial(t)] };
    },
    tNote: (r) => {
      const t = trialOf(r);
      t.comment = (t.comment ? t.comment + '\n' : '') + 'Преп.: ' + r.text;
      return { trials: [tTrial(t)] };
    },
    tStudent: (r) => {
      const c = cab(r.as);
      const v = r.student;
      const num = (x) => (x === '' || x == null ? 0 : Number(x));
      const vals = { name: v.name, phone: v.phone, grade: v.grade, format: v.format, onl: v.onl, days: v.days, time: v.time, price: num(v.price),
        paid: num(v.paid), payDate: v.payDate || '', freezes: num(v.freezes), status: v.status || 'Учится', comment: v.comment || '', lessons: v.lessons || '' };
      if (v.row) Object.assign(studentOf(c, v), vals);
      else {
        if (!r.force && c.students.some((s) => s.name.toLowerCase() === v.name.toLowerCase() && s.status !== 'Выбыл')) return { duplicate: true };
        c.students.push({ row: Math.max(...c.students.map((s) => s.row)) + 1, ...vals });
      }
      return { students: students(c) };
    },
    tPay: (r) => {
      const c = cab(r.as);
      const s = studentOf(c, r);
      const id = 'p' + Date.now();
      c.pays[id] = { name: s.name, row: s.row, payDate: s.payDate, paid: s.paid, freezes: s.freezes };
      (c.hist = c.hist || []).push({ id, name: s.name, at: dtS(new Date()), who: 'Алтынай', type: r.mode === 'renew' ? 'Новый абонемент' : 'Доплата', sum: Number(r.amount), undone: false });
      if (r.mode === 'renew') Object.assign(s, { payDate: r.date || day(0), paid: Number(r.amount), freezes: 0 });
      else s.paid += Number(r.amount);
      return { payment: { id }, students: students(c) };
    },
    tUndoPay: (r) => {
      const c = cab(r.as);
      const p = c.pays[r.id];
      if (!p) throw new Error('Запись об оплате не найдена');
      Object.assign(studentOf(c, p), { payDate: p.payDate, paid: p.paid, freezes: p.freezes });
      delete c.pays[r.id];
      (c.hist || []).forEach((h) => { if (h.id === r.id) h.undone = true; });
      return { students: students(c) };
    },
    tFreeze: (r) => {
      const c = cab(r.as);
      const done = [], skipped = [];
      r.names.forEach((n) => {
        const s = c.students.find((x) => x.name === n && x.status !== 'Выбыл');
        if (!s) throw new Error(`Ученика «${n}» нет в вашем списке`);
        calc(c, s);
        const i = c.freezes.findIndex((f) => f.d === r.date && f.n === n);
        const k = (PATTERNS[s.days] || [])[dowOf(r.date)] || 0;
        if (r.on) {
          if (i >= 0) { done.push(n); return; }
          if (!k) { skipped.push(`${n}: в этот день нет урока по дням занятий`); return; }
          if (r.date < s.payDate) { skipped.push(`${n}: этот день раньше последней оплаты`); return; }
          if (s.next && r.date >= s.next) { skipped.push(`${n}: к этому дню абонемент закончится — сначала отметьте оплату`); return; }
          c.freezes.push({ d: r.date, n, k });
          s.freezes += k;
        } else {
          if (i < 0) { done.push(n); return; }
          s.freezes = Math.max(0, s.freezes - c.freezes[i].k);
          c.freezes.splice(i, 1);
        }
        done.push(n);
      });
      return { done, skipped, students: students(c), freezes: c.freezes };
    },
    tSlot: (r) => {
      const c = cab(r.as);
      if (r.type !== undefined) { c.types = c.types || {}; c.types[r.dow + '|' + r.time] = r.type; }
      else { c.hours = c.hours || {}; c.hours[r.dow] = { from: r.from === 'выходной' ? '' : r.from, to: r.from === 'выходной' ? '' : r.to, off: r.from === 'выходной' }; }
      return { grid: grid(c) };
    },
    tCorr: (r) => {
      const c = cab(r.as);
      const amount = Math.round(Number(r.amount) || 0);
      if (amount && !String(r.comment || '').trim()) throw new Error('Напишите, за что корректировка');
      c.corr = { amount, comment: String(r.comment || '').trim() };
      return { zp: zp(c, r.as) };
    },
    students: () => ({ students: TEACHERS.flatMap((t) => students(cab(t)).map((s) => ({ ...s, teacher: t }))), meta: { ...META(), teachers: TEACHERS } }),
    tCard: (r) => {
      const c = cab(r.as);
      const raw = c.students.find((x) => x.name === r.name && (!r.row || x.row === Number(r.row))) || c.students.find((x) => x.name === r.name);
      if (!raw) throw new Error(`«${r.name}» нет на листе «${r.as}» — обновите страницу`);
      const s = { ...calc(c, raw), teacher: r.as };
      const p = norm(s.phone);
      const trials = db.trials.filter((t) => (p.length >= 11 && norm(t.phone) === p) || (t.name === s.name && t.teacher === r.as))
        .map((t) => ({ row: t.row, date: t.date, time: t.time, teacher: t.teacher, name: t.name, grade: t.grade, format: t.format, result: t.result, comment: t.comment }));
      const pays = [];
      if (s.payDate && s.paid) {
        pays.push({ id: 'h1', at: addD(s.payDate, -28) + 'T15:10', who: 'Билал', type: 'Новый абонемент', sum: s.price || s.paid, undone: false });
        pays.push({ id: 'h2', at: s.payDate + 'T16:40', who: s.row % 3 ? 'Алтынай' : r.as + ' (преп.)', type: 'Новый абонемент', sum: s.paid, undone: false });
      }
      (c.hist || []).filter((h) => h.name === s.name).forEach((h) => pays.push(h));
      const tr = trials[0];
      const lead = db.leads.find((l) => p.length >= 11 && norm(l.phone) === p)
        || (tr ? { source: ['Instagram', 'Посоветовали', '2ГИС', 'Реклама'][s.row % 4], contact: ['мама', 'папа', 'мама Айгуль', ''][s.row % 4], created: addD(tr.date, -4) + 'T11:20', owner: 'Алтынай' } : null);
      return { student: s, payments: pays, freezes: c.freezes.filter((f) => f.n === s.name).map((f) => ({ d: f.d, k: f.k, who: r.as + ' (преп.)' })),
        trials, lead: lead ? { id: lead.id, source: lead.source, contact: lead.contact, created: lead.created, owner: lead.owner, stage: lead.stage } : null };
    },
    trialArchive: () => {
      const all = TEACHERS.flatMap((t) => cab(t).students.map((s) => ({ ...s, teacher: t })));
      return { trials: db.trials.map((t) => {
        const p = norm(t.phone);
        const b = all.find((s) => p.length >= 11 && norm(s.phone) === p) || all.find((s) => s.teacher === t.teacher && s.name.toLowerCase() === (t.name || '').toLowerCase());
        return { ...t, base: b ? { teacher: b.teacher, name: b.name, status: b.status } : null };
      }) };
    },
    tMsg: (r) => {
      addTask({ title: `От ${r.as}: ${r.text}`, leadName: r.student ? `${r.student} (${r.as})` : '', due: soon(), author: r.as + ' (преп.)' });
      return { ok: true };
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
