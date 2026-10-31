'use strict';

// ---------- Armazenamento ----------
// Dois mundos: Escola (padrão) e Profissional. Cada modo guarda as próprias tarefas e grupos.
const MODE_KEY = 'dal.mode';
function getMode() {
  try { return localStorage.getItem(MODE_KEY) === 'pro' ? 'pro' : 'escola'; } catch (e) { return 'escola'; }
}
const MODE = getMode();
const STORAGE_KEY = MODE === 'pro' ? 'dal.pro' : 'dal.v1';

const MODES = {
  escola: {
    catA: 'Dia a dia', catB: 'Escola', tabB: 'Escola', tabIcon: 'book', group: 'Matéria', groups: 'Matérias',
    kinds: { licao: 'Lição', trabalho: 'Trabalho', prova: 'Prova', estudo: 'Estudar', outro: 'Outro' }, defaultKind: 'licao',
    examKind: 'prova', examTag: 'PROVA', spotlight: 'Próxima prova', carousel: 'Provas chegando', noExam: 'Nenhuma prova marcada.',
    heroB: 'Seus estudos', examWord: ['prova', 'provas'], listTitle: 'Lições e trabalhos', placeholder: 'O que você precisa fazer?',
  },
  pro: {
    catA: 'Casa', catB: 'Trabalho', tabB: 'Trabalho', tabIcon: 'brief', group: 'Projeto', groups: 'Projetos',
    kinds: { tarefa: 'Tarefa', reuniao: 'Reunião', entrega: 'Entrega', ligacao: 'Ligação', pagamento: 'Pagamento' }, defaultKind: 'tarefa',
    examKind: 'entrega', examTag: 'PRAZO', spotlight: 'Próximo prazo', carousel: 'Prazos chegando', noExam: 'Nenhum prazo marcado.',
    heroB: 'Seu trabalho', examWord: ['prazo', 'prazos'], listTitle: 'Tarefas de trabalho', placeholder: 'Qual é a próxima ação?',
  },
};
const M = MODES[MODE];

const DEFAULT_PROJECTS = [
  { id: 'cli', name: 'Clientes', color: '#4f6bff' },
  { id: 'equ', name: 'Equipe', color: '#f59e0b' },
  { id: 'fin', name: 'Financeiro', color: '#2f7a5d' },
  { id: 'cur', name: 'Cursos', color: '#06b6d4' },
];

const DEFAULT_SUBJECTS_ESCOLA = [
  { id: 'mat', name: 'Matemática', color: '#4f46e5' },
  { id: 'por', name: 'Português', color: '#e11d48' },
  { id: 'cie', name: 'Ciências', color: '#10b981' },
  { id: 'his', name: 'História', color: '#f59e0b' },
  { id: 'geo', name: 'Geografia', color: '#0ea5e9' },
  { id: 'ing', name: 'Inglês', color: '#a855f7' },
];

const DEFAULT_SUBJECTS = MODE === 'pro' ? DEFAULT_PROJECTS : DEFAULT_SUBJECTS_ESCOLA;

const KIND_LABELS = {
  ...MODES.pro.kinds,
  licao: 'Lição de casa',
  trabalho: 'Trabalho',
  prova: 'Prova',
  estudo: 'Estudar',
  outro: 'Outro',
};

const REMINDER_LABELS = {
  0: 'Na hora', 10: '10 min antes', 30: '30 min antes', 60: '1 h antes', 1440: '1 dia antes',
};

const PRIORITY_LABELS = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };
const PRIORITY_ORDER = { alta: 0, media: 1, baixa: 2 };

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      return {
        tasks: Array.isArray(data.tasks) ? data.tasks : [],
        subjects: Array.isArray(data.subjects) ? data.subjects : DEFAULT_SUBJECTS.slice(),
      };
    }
  } catch (e) {
    console.warn('Não foi possível carregar os dados salvos.', e);
  }
  return { tasks: [], subjects: DEFAULT_SUBJECTS.slice() };
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    toast('Não foi possível salvar no navegador.');
  }
  if (typeof syncReminders === 'function') syncReminders();
}

const state = load();

// ---------- Datas ----------
function toISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fromISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addDays(iso, n) {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

function todayISO() { return toISO(new Date()); }

function diffDays(iso) {
  return Math.round((fromISO(iso) - fromISO(todayISO())) / 86400000);
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function formatDate(iso, opts = { day: '2-digit', month: 'short' }) {
  return fromISO(iso).toLocaleDateString('pt-BR', opts);
}

function relativeDate(iso) {
  const n = diffDays(iso);
  if (n === 0) return 'Hoje';
  if (n === 1) return 'Amanhã';
  if (n === -1) return 'Ontem';
  if (n < 0) return `${-n} dias atrás`;
  if (n < 7) return formatDate(iso, { weekday: 'long' });
  return formatDate(iso);
}

// ---------- Utilidades ----------
const $ = (sel) => document.querySelector(sel);

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function subjectById(id) {
  return state.subjects.find((s) => s.id === id);
}

function sortTasks(list) {
  return list.slice().sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    const da = a.date || '9999-99-99';
    const db = b.date || '9999-99-99';
    if (da !== db) return da < db ? -1 : 1;
    const ta = a.time || '99:99';
    const tb = b.time || '99:99';
    if (ta !== tb) return ta < tb ? -1 : 1;
    return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
  });
}

let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

// ---------- Renderização de tarefas ----------
const icon = (id) => `<svg class="ico"><use href="#i-${id}"/></svg>`;

function taskColor(t) {
  const subj = t.category === 'escola' ? subjectById(t.subject) : null;
  return subj ? subj.color : (t.category === 'escola' ? 'var(--escola)' : 'var(--dia)');
}

function taskHTML(t, { showDate = true } = {}) {
  const subj = t.category === 'escola' ? subjectById(t.subject) : null;
  const late = !t.done && t.date && diffDays(t.date) < 0;
  const isExam = t.category === 'escola' && t.kind === M.examKind;
  const label = t.category === 'escola'
    ? `${subj ? escapeHTML(subj.name) : M.catB} · ${M.kinds[t.kind] || KIND_LABELS[t.kind] || 'Outro'}`
    : M.catA;
  const badge = subj ? escapeHTML(subj.name.slice(0, 2)) : (t.category === 'escola' ? icon('book') : icon('house'));
  const meta = [];
  if (showDate && t.date) meta.push(`<span class="${late ? 'late' : ''}">${icon('cal')}${relativeDate(t.date)}</span>`);
  if (t.date && t.reminder) meta.push(`<span>${icon('bell')}${REMINDER_LABELS[t.reminder] || ''}</span>`);
  if (t.repeat) meta.push(`<span>${icon('repeat')}${t.repeat === 'diario' ? 'Diária' : 'Semanal'}</span>`);
  return `
    <li class="task ${t.category} ${t.done ? 'done' : ''} ${isExam ? 'exam' : ''} prio-${t.priority}" data-id="${t.id}" style="--c:${escapeHTML(taskColor(t))}">
      <span class="badge" aria-hidden="true">${badge}</span>
      <div class="task-body" data-action="edit">
        <span class="task-kicker">${label}${isExam ? ` <b class="exam-tag">${M.examTag}</b>` : ''}</span>
        <span class="task-title">${escapeHTML(t.title)}</span>
        ${meta.length ? `<span class="task-meta">${meta.join('')}</span>` : ''}
        ${t.notes ? `<span class="task-notes">${escapeHTML(t.notes)}</span>` : ''}
      </div>
      <div class="task-side">
        ${t.time ? `<span class="time">${t.time}</span>` : ''}
        <button class="check" type="button" data-action="toggle" aria-label="${t.done ? 'Desmarcar' : 'Concluir'} tarefa">${icon('check')}</button>
      </div>
    </li>`;
}

function listHTML(tasks, opts, emptyMsg = 'Nada por aqui.') {
  if (!tasks.length) return `<p class="empty">${emptyMsg}</p>`;
  return `<ul class="task-list">${sortTasks(tasks).map((t) => taskHTML(t, opts)).join('')}</ul>`;
}

function setHero({ kicker = '', title = '', sub = '', ring = null, week = false }) {
  $('#heroKicker').textContent = kicker;
  $('#heroTitle').textContent = title;
  $('#heroSub').textContent = sub;
  $('#ring').hidden = !ring;
  if (ring) {
    $('#ring').style.setProperty('--p', ring.total ? Math.round((ring.done / ring.total) * 100) : 0);
    $('#ringNum').textContent = `${ring.done}/${ring.total}`;
  }
  $('#week').hidden = !week;
  $('#kpis').hidden = !week;
}

function renderKpis() {
  const today = todayISO();
  const pending = state.tasks.filter((t) => !t.done);
  const items = [
    ['Hoje', pending.filter((t) => t.date === today).length],
    ['Atrasadas', pending.filter((t) => t.date && t.date < today).length],
    ['Semana', pending.filter((t) => t.date && t.date > today && t.date <= addDays(today, 7)).length],
    [cap(M.examWord[1]), pending.filter((t) => t.kind === M.examKind && t.date && t.date >= today).length],
  ];
  $('#kpis').innerHTML = items.map(([l, n], i) => `<div class="kpi ${i === 1 && n ? 'warn' : ''}"><b>${n}</b><span>${l}</span></div>`).join('');
}

function userName() {
  try { return (localStorage.getItem('dal.name') || '').trim(); } catch (e) { return ''; }
}

function greeting() {
  const h = new Date().getHours();
  const g = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  const n = userName();
  return n ? `${g}, ${n}!` : `${g}!`;
}

// ---------- View: Hoje ----------
let hojeFilter = '';

function renderWeek() {
  const today = todayISO();
  let html = '';
  for (let i = -1; i < 6; i++) {
    const iso = addDays(today, i);
    const n = state.tasks.filter((t) => t.date === iso && !t.done).length;
    const d = fromISO(iso);
    html += `<button type="button" class="day-pill ${i === 0 ? 'today' : ''}" data-date="${iso}">
      <span class="dw">${d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span>
      <span class="dn">${d.getDate()}</span>
      <span class="dd">${n ? '•'.repeat(Math.min(n, 3)) : ''}</span></button>`;
  }
  $('#week').innerHTML = html;
}

function renderHoje() {
  const today = todayISO();
  const match = (t) => !hojeFilter || t.category === hojeFilter;
  const pending = state.tasks.filter((t) => !t.done && match(t));
  const overdue = pending.filter((t) => t.date && t.date < today);
  const todaysAll = state.tasks.filter((t) => t.date === today);
  const todays = todaysAll.filter(match);
  const soon = pending.filter((t) => t.date && t.date > today && t.date <= addDays(today, 7));
  const noDate = pending.filter((t) => !t.date);
  const left = todaysAll.filter((t) => !t.done).length;

  setHero({
    kicker: greeting(),
    title: cap(new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })),
    sub: left ? `${left} ${left === 1 ? 'tarefa' : 'tarefas'} para hoje` : 'Tudo feito por hoje',
    ring: { done: todaysAll.length - left, total: todaysAll.length },
    week: true,
  });
  renderWeek();
  renderKpis();

  const exam = sortTasks(state.tasks.filter((t) => !t.done && t.category === 'escola' && t.kind === M.examKind && t.date && t.date >= today))[0];
  if (exam) {
    const s = subjectById(exam.subject);
    const n = diffDays(exam.date);
    $('#spotlight').innerHTML = `
      <article class="spotlight" data-id="${exam.id}" style="--c:${escapeHTML(s ? s.color : 'var(--alta)')}">
        <div class="spot-text" data-action="edit">
          <span class="spot-kicker">${M.spotlight}</span>
          <strong>${escapeHTML(s ? s.name : exam.title)}</strong>
          <span>${escapeHTML(exam.title)} · ${formatDate(exam.date, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
        </div>
        <div class="countdown"><b>${n}</b><span>${n === 1 ? 'dia' : 'dias'}</span></div>
      </article>`;
  } else {
    $('#spotlight').innerHTML = '';
  }

  let html = '';
  if (overdue.length) html += `<section class="group overdue"><h2>Atrasadas <span class="count">${overdue.length}</span></h2>${listHTML(overdue)}</section>`;
  html += `<section class="group"><h2>Hoje <span class="count">${todays.length}</span></h2>${listHTML(todays, { showDate: false }, 'Nada para hoje. Aproveite!')}</section>`;
  html += `<section class="group"><h2>Próximos dias <span class="count">${soon.length}</span></h2>${listHTML(soon, {}, 'Semana tranquila.')}</section>`;
  if (noDate.length) html += `<section class="group"><h2>Sem data <span class="count">${noDate.length}</span></h2>${listHTML(noDate)}</section>`;
  $('#hojeLists').innerHTML = html;
}

// ---------- View: Agenda ----------
const cal = {
  year: new Date().getFullYear(),
  month: new Date().getMonth(),
  selected: todayISO(),
};

function renderAgenda() {
  const first = new Date(cal.year, cal.month, 1);
  $('#monthTitle').textContent = cap(first.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }));

  const byDate = {};
  for (const t of state.tasks) {
    if (t.date) (byDate[t.date] ||= []).push(t);
  }
  const monthCount = Object.keys(byDate).filter((d) => fromISO(d).getMonth() === cal.month).reduce((n, d) => n + byDate[d].length, 0);
  setHero({ kicker: 'Agenda', title: cap(first.toLocaleDateString('pt-BR', { month: 'long' })), sub: `${monthCount} tarefas neste mês` });

  let html = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d) => `<div class="cal-dow">${d}</div>`).join('');
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  const today = todayISO();
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const iso = toISO(d);
    const tasks = byDate[iso] || [];
    const classes = ['cal-day'];
    if (d.getMonth() !== cal.month) classes.push('other');
    if (iso === today) classes.push('today');
    if (iso === cal.selected) classes.push('selected');
    if (tasks.some((t) => t.kind === M.examKind && !t.done)) classes.push('has-exam');
    const dots = tasks.slice(0, 3).map((t) => `<span class="dot ${t.done ? 'done' : ''}" style="background:${escapeHTML(taskColor(t))}"></span>`).join('');
    html += `<button type="button" class="${classes.join(' ')}" data-date="${iso}" aria-label="${formatDate(iso, { day: 'numeric', month: 'long' })}, ${tasks.length} tarefa(s)">
      <span class="num">${d.getDate()}</span><span class="dots">${dots}</span></button>`;
    if (i % 7 === 6 && i >= 27 && d.getMonth() !== cal.month) break;
  }
  $('#calendar').innerHTML = html;

  $('#dayTitle').textContent = cap(formatDate(cal.selected, { weekday: 'long', day: 'numeric', month: 'long' }));
  const dayTasks = sortTasks(byDate[cal.selected] || []);
  $('#dayTasks').innerHTML = dayTasks.length
    ? dayTasks.map((t) => `<li class="tl-item"><span class="tl-time">${t.time || 'Dia todo'}</span><span class="tl-line" style="--c:${escapeHTML(taskColor(t))}"></span><ul class="task-list">${taskHTML(t, { showDate: false })}</ul></li>`).join('')
    : '<li class="empty">Nenhuma tarefa neste dia.</li>';
}

// ---------- View: Escola ----------
let escolaSubject = '';

function renderEscola() {
  const today = todayISO();
  const school = state.tasks.filter((t) => t.category === 'escola');
  const pending = school.filter((t) => !t.done);
  const exams = sortTasks(pending.filter((t) => t.kind === M.examKind && t.date && t.date >= today));
  setHero({ kicker: M.tabB, title: M.heroB, sub: `${pending.length} pendentes · ${exams.length} ${M.examWord[exams.length === 1 ? 0 : 1]} chegando` });

  $('#examsBox').innerHTML = exams.length
    ? exams.map((t) => {
        const s = subjectById(t.subject);
        const n = diffDays(t.date);
        return `<article class="exam-card" data-id="${t.id}" style="--c:${escapeHTML(s ? s.color : 'var(--alta)')}">
          <div class="exam-count"><b>${n}</b><span>${n === 1 ? 'dia' : 'dias'}</span></div>
          <div class="exam-info" data-action="edit"><strong>${escapeHTML(s ? s.name : 'Prova')}</strong><span>${escapeHTML(t.title)}</span><span class="exam-date">${formatDate(t.date, { weekday: 'short', day: 'numeric', month: 'short' })}</span></div>
        </article>`;
      }).join('')
    : `<p class="empty">${M.noExam}</p>`;

  $('#subjectsGrid').innerHTML = state.subjects.map((s) => {
    const all = school.filter((t) => t.subject === s.id);
    const open = all.filter((t) => !t.done).length;
    const pct = all.length ? Math.round(((all.length - open) / all.length) * 100) : 0;
    return `<button type="button" class="subject-tile ${escolaSubject === s.id ? 'active' : ''}" data-subject="${s.id}" style="--c:${escapeHTML(s.color)}">
      <span class="tile-badge">${escapeHTML(s.name.slice(0, 2))}</span>
      <span class="tile-name">${escapeHTML(s.name)}</span>
      <span class="tile-count">${open ? `${open} pendente${open > 1 ? 's' : ''}` : 'Em dia'}</span>
      <span class="tile-bar"><i style="width:${pct}%"></i></span>
    </button>`;
  }).join('');

  const subj = subjectById(escolaSubject);
  $('#schoolListTitle').textContent = subj ? `Tarefas de ${subj.name}` : M.listTitle;
  const list = pending.filter((t) => (subj ? t.subject === subj.id : t.kind !== M.examKind));
  $('#schoolList').innerHTML = listHTML(list, {}, 'Tudo em dia ✨');
}

// ---------- View: Todas ----------
const todasFilter = { status: 'pendentes', cat: '' };

function renderTodas() {
  const q = $('#search').value.trim().toLowerCase();
  const list = state.tasks.filter((t) => {
    if (todasFilter.cat && t.category !== todasFilter.cat) return false;
    if (todasFilter.status === 'pendentes' && t.done) return false;
    if (todasFilter.status === 'concluidas' && !t.done) return false;
    if (q) {
      const subj = subjectById(t.subject);
      if (!`${t.title} ${t.notes || ''} ${subj ? subj.name : ''}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });
  setHero({ kicker: 'Todas', title: 'Suas tarefas', sub: `${state.tasks.filter((t) => !t.done).length} pendentes · ${state.tasks.filter((t) => t.done).length} concluídas` });
  document.querySelectorAll('#statusChips [data-status]').forEach((b) => b.classList.toggle('active', b.dataset.status === todasFilter.status));
  document.querySelectorAll('#statusChips [data-cat]').forEach((b) => b.classList.toggle('active', b.dataset.cat === todasFilter.cat));
  $('#allTasks').innerHTML = listHTML(list, {}, 'Nenhuma tarefa encontrada.');
  $('#clearDone').hidden = !state.tasks.some((t) => t.done);
}

// ---------- Render geral ----------
let currentView = 'hoje';

function render() {
  ({ hoje: renderHoje, agenda: renderAgenda, escola: renderEscola, todas: renderTodas })[currentView]();
}

function switchView(view) {
  currentView = view;
  document.body.dataset.view = view;
  document.querySelectorAll('.tab').forEach((b) => {
    const active = b.dataset.view === view;
    b.classList.toggle('active', active);
    b.setAttribute('aria-selected', active);
  });
  document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === `view-${view}`));
  try { localStorage.setItem('dal.view', view); } catch (e) { /* ignora */ }
  window.scrollTo(0, 0);
  render();
}

// ---------- Ações em tarefas ----------
function toggleTask(id) {
  const t = state.tasks.find((x) => x.id === id);
  if (!t) return;
  if (!t.done && t.repeat && t.date) {
    // Tarefas repetidas avançam para a próxima ocorrência
    const step = t.repeat === 'diario' ? 1 : 7;
    let next = addDays(t.date, step);
    while (next <= todayISO()) next = addDays(next, step);
    t.date = next;
    toast(`Feito! Próxima: ${relativeDate(next).toLowerCase()}`);
  } else {
    t.done = !t.done;
    t.doneAt = t.done ? Date.now() : null;
    if (t.done) toast('Tarefa concluída ✓');
  }
  save();
  render();
}

// ---------- Formulário ----------
const dialog = $('#taskDialog');
const form = $('#taskForm');
let editingId = null;

function fillSubjectSelect(selected) {
  const sel = selected || (state.subjects[0] && state.subjects[0].id);
  $('#subjectSelect').innerHTML = state.subjects.length
    ? state.subjects.map((s) => `<label class="choice subj" style="--c:${escapeHTML(s.color)}"><input type="radio" name="subject" value="${s.id}" ${s.id === sel ? 'checked' : ''}><span><i></i>${escapeHTML(s.name)}</span></label>`).join('')
    : `<p class="hint">Cadastre ${M.group === 'Projeto' ? 'um projeto' : 'uma matéria'} na aba ${M.tabB}.</p>`;
}

function updateSchoolFields() {
  $('#schoolFields').hidden = form.category.value !== 'escola';
}

function openForm(task = null, defaults = {}) {
  editingId = task ? task.id : null;
  form.reset();
  const data = task || { category: 'dia', priority: 'media', kind: M.defaultKind, reminder: '0', ...defaults };
  $('#formTitle').textContent = task ? 'Editar tarefa' : 'Nova tarefa';
  $('#deleteBtn').hidden = !task;

  fillSubjectSelect(data.subject);
  form.title.value = data.title || '';
  // Marca a opção pelo valor (inclusive a de valor vazio, que form.x.value = '' não marca)
  const setChoice = (name, value) => {
    form.querySelectorAll(`input[name="${name}"]`).forEach((r) => { r.checked = r.value === value; });
  };
  setChoice('category', data.category);
  setChoice('kind', data.kind || M.defaultKind);
  form.date.value = data.date || '';
  form.time.value = data.time || '';
  updatePickerLabels();
  setChoice('priority', data.priority || 'media');
  setChoice('repeat', data.repeat || '');
  setChoice('reminder', data.reminder || '');
  form.notes.value = data.notes || '';
  updateSchoolFields();
  dialog.returnValue = '';
  dialog.showModal();
  if (!task) form.title.focus();
}

form.addEventListener('change', (e) => {
  if (e.target.name === 'category') updateSchoolFields();
});

dialog.addEventListener('close', () => {
  if (dialog.returnValue !== 'save') return;
  const title = form.title.value.trim();
  if (!title) return;

  const category = form.category.value;
  const fields = {
    title,
    category,
    subject: category === 'escola' ? form.subject.value : '',
    kind: category === 'escola' ? form.kind.value : '',
    date: form.date.value,
    time: form.time.value,
    priority: form.priority.value,
    repeat: form.repeat.value,
    reminder: form.reminder.value,
    notes: form.notes.value.trim(),
  };

  if (editingId) {
    Object.assign(state.tasks.find((t) => t.id === editingId), fields);
    toast('Tarefa atualizada');
  } else {
    state.tasks.push({ id: uid(), done: false, createdAt: Date.now(), ...fields });
    toast('Tarefa criada');
  }
  save();
  render();
});

$('#deleteBtn').addEventListener('click', async () => {
  if (!editingId) return;
  const t = state.tasks.find((x) => x.id === editingId);
  if (!(await askConfirm({ title: 'Excluir tarefa?', text: `“${t ? t.title : ''}” será apagada. Não dá para desfazer.` }))) return;
  state.tasks = state.tasks.filter((t) => t.id !== editingId);
  save();
  dialog.close('deleted');
  toast('Tarefa excluída');
  render();
});

// ---------- Janelas próprias: confirmar, data, hora e cor ----------
// Substituem confirm() e os seletores nativos do Android, que abrem com o visual do sistema.
function openSheet(dlg) {
  return new Promise((resolve) => {
    const done = (value) => {
      dlg.removeEventListener('close', onClose);
      resolve(value);
    };
    const onClose = () => done(dlg.dataset.result ? JSON.parse(dlg.dataset.result) : null);
    dlg.dataset.result = '';
    dlg.addEventListener('close', onClose);
    dlg.showModal();
  });
}

function closeSheet(dlg, value) {
  dlg.dataset.result = JSON.stringify(value);
  dlg.close();
}

document.querySelectorAll('dialog.small-sheet').forEach((dlg) => {
  // Toque fora da janela ou no X fecha sem escolher
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg || e.target.closest('[data-close]')) dlg.close();
  });
});

function askConfirm({ title, text = '', yes = 'Excluir', tone = 'danger' }) {
  const dlg = $('#confirmDialog');
  dlg.classList.toggle('neutral', tone !== 'danger');
  $('#confirmTitle').textContent = title;
  $('#confirmText').textContent = text;
  $('#confirmYes').textContent = yes;
  return openSheet(dlg).then((v) => v === true);
}
$('#confirmYes').addEventListener('click', () => closeSheet($('#confirmDialog'), true));
$('#confirmNo').addEventListener('click', () => closeSheet($('#confirmDialog'), false));

function dateLabel(iso) {
  if (!iso) return 'Sem data';
  const n = diffDays(iso);
  if (n === 0) return 'Hoje';
  if (n === 1) return 'Amanhã';
  return cap(formatDate(iso, { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, ''));
}

function updatePickerLabels() {
  $('#dateLabel').textContent = dateLabel(form.date.value);
  $('#timeLabel').textContent = form.time.value || 'Sem horário';
  $('#dateBtn').classList.toggle('filled', !!form.date.value);
  $('#timeBtn').classList.toggle('filled', !!form.time.value);
}

const picker = { year: 0, month: 0, value: '' };

function renderDatePicker() {
  const first = new Date(picker.year, picker.month, 1);
  $('#pickMonth').textContent = cap(first.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }));
  const today = todayISO();
  let html = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d) => `<div class="cal-dow">${d}</div>`).join('');
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const iso = toISO(d);
    const cls = ['cal-day'];
    if (d.getMonth() !== picker.month) cls.push('other');
    if (iso === today) cls.push('today');
    if (iso === picker.value) cls.push('selected');
    html += `<button type="button" class="${cls.join(' ')}" data-pick="${iso}"><span class="num">${d.getDate()}</span></button>`;
    if (i % 7 === 6 && i >= 27 && d.getMonth() !== picker.month) break;
  }
  $('#pickDays').innerHTML = html;

  const today0 = fromISO(today);
  const nextMonday = addDays(today, ((8 - today0.getDay()) % 7) || 7);
  const quick = [['Hoje', today], ['Amanhã', addDays(today, 1)], ['Próx. segunda', nextMonday], ['Sem data', '']];
  $('#dateQuick').innerHTML = quick.map(([label, iso]) =>
    `<button type="button" class="choice-chip ${iso === picker.value ? 'on' : ''}" data-pick="${iso}">${label}</button>`).join('');
}

$('#dateBtn').addEventListener('click', async () => {
  picker.value = form.date.value;
  const base = fromISO(picker.value || todayISO());
  picker.year = base.getFullYear();
  picker.month = base.getMonth();
  renderDatePicker();
  const v = await openSheet($('#dateDialog'));
  if (v !== null) { form.date.value = v; updatePickerLabels(); }
});
$('#dateDialog').addEventListener('click', (e) => {
  const b = e.target.closest('[data-pick]');
  if (b) closeSheet($('#dateDialog'), b.dataset.pick);
});
const shiftPicker = (n) => {
  const d = new Date(picker.year, picker.month + n, 1);
  picker.year = d.getFullYear();
  picker.month = d.getMonth();
  renderDatePicker();
};
$('#pickPrev').addEventListener('click', () => shiftPicker(-1));
$('#pickNext').addEventListener('click', () => shiftPicker(1));

const timePick = { h: '', m: '' };

function renderTimePicker() {
  $('#pickHours').innerHTML = Array.from({ length: 18 }, (_, i) => String(i + 6).padStart(2, '0'))
    .map((h) => `<button type="button" class="choice-chip ${h === timePick.h ? 'on' : ''}" data-h="${h}">${h}</button>`).join('');
  $('#pickMinutes').innerHTML = ['00', '10', '15', '20', '30', '40', '45', '50']
    .map((m) => `<button type="button" class="choice-chip ${m === timePick.m ? 'on' : ''}" data-m="${m}">:${m}</button>`).join('');
  $('#timePreview').textContent = `${timePick.h || '--'}:${timePick.m || '--'}`;
  $('#timeOk').disabled = !timePick.h;
}

$('#timeBtn').addEventListener('click', async () => {
  const [h, m] = (form.time.value || ':').split(':');
  timePick.h = h;
  timePick.m = m;
  renderTimePicker();
  const v = await openSheet($('#timeDialog'));
  if (v !== null) { form.time.value = v; updatePickerLabels(); }
});
$('#timeDialog').addEventListener('click', (e) => {
  const b = e.target.closest('[data-h], [data-m]');
  if (!b) return;
  if (b.dataset.h) { timePick.h = b.dataset.h; if (!timePick.m) timePick.m = '00'; }
  if (b.dataset.m) { timePick.m = b.dataset.m; if (!timePick.h) timePick.h = '08'; }
  renderTimePicker();
});
$('#timeOk').addEventListener('click', () => closeSheet($('#timeDialog'), `${timePick.h}:${timePick.m || '00'}`));
$('#timeClear').addEventListener('click', () => closeSheet($('#timeDialog'), ''));

const PALETTE = ['#4f6bff', '#2f7a5d', '#18b6a4', '#06b6d4', '#22c55e', '#84cc16', '#e3b65b', '#f59e0b',
  '#f97316', '#ef4444', '#e11d48', '#ec4899', '#a855f7', '#7c5cff', '#8b5e3c', '#64748b'];

function pickColor(current) {
  $('#palette').innerHTML = PALETTE.map((c) =>
    `<button type="button" class="color-dot big ${c === current ? 'on' : ''}" style="--dot:${c}" data-color="${c}" aria-label="Cor ${c}"></button>`).join('');
  return openSheet($('#colorDialog'));
}
$('#palette').addEventListener('click', (e) => {
  const b = e.target.closest('[data-color]');
  if (b) closeSheet($('#colorDialog'), b.dataset.color);
});

// ---------- Matérias ----------
const subjectsDialog = $('#subjectsDialog');

function renderSubjectEditor() {
  $('#subjectEditList').innerHTML = state.subjects.map((s) => `
    <li data-id="${s.id}" style="--c:${escapeHTML(s.color)}">
      <button class="color-dot" type="button" data-subject-color style="--dot:${escapeHTML(s.color)}" aria-label="Mudar a cor de ${escapeHTML(s.name)}"></button>
      <span>${escapeHTML(s.name)}</span>
      <button class="icon-btn small" type="button" data-remove-subject aria-label="Remover ${escapeHTML(s.name)}"><svg><use href="#i-x"/></svg></button>
    </li>`).join('') || `<li class="empty">Nenhum item em ${M.groups}.</li>`;
}

$('#manageSubjects').addEventListener('click', () => {
  renderSubjectEditor();
  subjectsDialog.showModal();
});

$('#addSubjectBtn').addEventListener('click', () => {
  const input = $('#newSubjectName');
  const name = input.value.trim();
  if (!name) return input.focus();
  if (state.subjects.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
    toast(`Já existe ${M.group.toLowerCase()} com esse nome`);
    return;
  }
  state.subjects.push({ id: uid(), name, color: $('#newSubjectColor').dataset.color });
  input.value = '';
  save();
  renderSubjectEditor();
  input.focus();
});

$('#newSubjectName').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); $('#addSubjectBtn').click(); }
});

$('#newSubjectColor').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  const color = await pickColor(btn.dataset.color);
  if (color) { btn.dataset.color = color; btn.style.setProperty('--dot', color); }
});

$('#subjectEditList').addEventListener('click', async (e) => {
  const colorBtn = e.target.closest('[data-subject-color]');
  if (colorBtn) {
    const s = subjectById(colorBtn.closest('li').dataset.id);
    const color = s && await pickColor(s.color);
    if (color) { s.color = color; save(); renderSubjectEditor(); }
    return;
  }
  const removeBtn = e.target.closest('[data-remove-subject]');
  if (!removeBtn) return;
  const id = removeBtn.closest('li').dataset.id;
  const subj = subjectById(id);
  const used = state.tasks.filter((t) => t.subject === id).length;
  const ok = await askConfirm({
    title: `Remover ${subj ? subj.name : M.group.toLowerCase()}?`,
    text: used ? `${used} tarefa(s) ficarão sem ${M.group.toLowerCase()}.` : `Sai da lista de ${M.groups.toLowerCase()}.`,
    yes: 'Remover',
  });
  if (!ok) return;
  state.subjects = state.subjects.filter((s) => s.id !== id);
  save();
  renderSubjectEditor();
});

subjectsDialog.addEventListener('close', render);

// ---------- Eventos gerais ----------
document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => switchView(b.dataset.view)));

$('#addBtn').addEventListener('click', () => {
  const defaults = currentView === 'escola' ? { category: 'escola' } : {};
  if (currentView === 'agenda') defaults.date = cal.selected;
  else if (currentView === 'hoje') defaults.date = todayISO();
  openForm(null, defaults);
});

document.querySelector('main').addEventListener('click', (e) => {
  const addSubj = e.target.closest('[data-add-subject]');
  if (addSubj) {
    openForm(null, { category: 'escola', subject: addSubj.dataset.addSubject });
    return;
  }
  const tile = e.target.closest('.subject-tile');
  if (tile) {
    escolaSubject = escolaSubject === tile.dataset.subject ? '' : tile.dataset.subject;
    renderEscola();
    return;
  }
  const day = e.target.closest('.cal-day');
  if (day) {
    cal.selected = day.dataset.date;
    const d = fromISO(cal.selected);
    if (d.getMonth() !== cal.month) { cal.month = d.getMonth(); cal.year = d.getFullYear(); }
    renderAgenda();
    return;
  }
  const actionEl = e.target.closest('[data-action]');
  const taskEl = e.target.closest('.task, .spotlight, .exam-card');
  if (!actionEl || !taskEl) return;
  const id = taskEl.dataset.id;
  if (actionEl.dataset.action === 'toggle') toggleTask(id);
  else openForm(state.tasks.find((t) => t.id === id));
});

function shiftMonth(n) {
  const d = new Date(cal.year, cal.month + n, 1);
  cal.year = d.getFullYear();
  cal.month = d.getMonth();
  renderAgenda();
}
$('#prevMonth').addEventListener('click', () => shiftMonth(-1));
$('#nextMonth').addEventListener('click', () => shiftMonth(1));
$('#goToday').addEventListener('click', () => {
  const now = new Date();
  cal.year = now.getFullYear();
  cal.month = now.getMonth();
  cal.selected = todayISO();
  renderAgenda();
});
$('#addOnDay').addEventListener('click', () => openForm(null, { date: cal.selected }));

$('#search').addEventListener('input', renderTodas);
$('#statusChips').addEventListener('click', (e) => {
  const b = e.target.closest('.chip-btn');
  if (!b) return;
  if ('status' in b.dataset) todasFilter.status = b.dataset.status;
  if ('cat' in b.dataset) todasFilter.cat = todasFilter.cat === b.dataset.cat ? '' : b.dataset.cat;
  renderTodas();
});
$('#hojeFilter').addEventListener('click', (e) => {
  const b = e.target.closest('.chip-btn');
  if (!b) return;
  hojeFilter = b.dataset.hf;
  document.querySelectorAll('#hojeFilter .chip-btn').forEach((x) => x.classList.toggle('active', x === b));
  renderHoje();
});
$('#week').addEventListener('click', (e) => {
  const b = e.target.closest('.day-pill');
  if (!b) return;
  cal.selected = b.dataset.date;
  const d = fromISO(cal.selected);
  cal.month = d.getMonth();
  cal.year = d.getFullYear();
  switchView('agenda');
});

$('#clearDone').addEventListener('click', async () => {
  const n = state.tasks.filter((t) => t.done).length;
  if (!n || !(await askConfirm({ title: 'Apagar concluídas?', text: `${n} tarefa(s) concluída(s) serão apagadas. Não dá para desfazer.`, yes: 'Apagar' }))) return;
  state.tasks = state.tasks.filter((t) => !t.done);
  save();
  render();
});

// Atualiza ao virar o dia com o app aberto
document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });

// ---------- Versão e PWA ----------
const APP_VERSION = self.APP_VERSION || '';
$('#appVersion').textContent = `v${APP_VERSION}`;

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  // Atualização automática: o service worker novo assume sozinho e a página recarrega.
  // Se um formulário estiver aberto, espera ele fechar para não perder o que foi digitado.
  let hadController = !!navigator.serviceWorker.controller;
  let pendingReload = false;
  const reloadWhenIdle = () => {
    if (document.querySelector('dialog[open]')) {
      pendingReload = true;
      return;
    }
    location.reload();
  };
  document.querySelectorAll('dialog').forEach((d) => d.addEventListener('close', () => {
    if (pendingReload) setTimeout(reloadWhenIdle, 300);
  }));
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Na primeira instalação não há o que recarregar; nas seguintes, sim
    if (!hadController) {
      hadController = true;
      return;
    }
    reloadWhenIdle();
  });

  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((reg) => {
    // Procura versão nova ao voltar para o app e a cada 30 minutos
    document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update(); });
    setInterval(() => reg.update(), 30 * 60000);
  }).catch((e) => console.warn('Service worker não registrado.', e));
}

// ---------- Lembretes ----------
// O app não tem servidor: os lembretes são disparados pela página enquanto ela está aberta
// e, onde o navegador permite (Chrome/Android com o app instalado), pelo service worker
// em segundo plano via Periodic Background Sync. Os dois usam a mesma "tag" por lembrete,
// então uma notificação repetida substitui a anterior em vez de duplicar.
const NOTIFY_KEY = 'dal.notify';
const NOTIFIED_KEY = 'dal.notified';
const REMINDER_WINDOW = 12 * 3600000; // lembretes perdidos há mais que isso são ignorados
const DATA_CACHE = 'dal-data';

function notifySupported() {
  return 'Notification' in window;
}

function notifyEnabled() {
  try {
    return notifySupported() && Notification.permission === 'granted' && localStorage.getItem(NOTIFY_KEY) === '1';
  } catch (e) {
    return false;
  }
}

function reminderBody(t, at) {
  const parts = [];
  if (t.category === 'escola') {
    const s = subjectById(t.subject);
    parts.push(M.kinds[t.kind] || KIND_LABELS[t.kind] || M.catB);
    if (s) parts.push(s.name);
  } else {
    parts.push(M.catA);
  }
  const sameDay = toISO(new Date(at)) === t.date;
  const when = sameDay ? 'Hoje' : relativeFrom(t.date, toISO(new Date(at)));
  parts.push(t.time ? `${when} às ${t.time}` : when);
  return parts.join(' · ');
}

function relativeFrom(iso, fromIso) {
  const n = Math.round((fromISO(iso) - fromISO(fromIso)) / 86400000);
  if (n === 1) return 'Amanhã';
  return formatDate(iso, { weekday: 'long', day: 'numeric', month: 'short' });
}

function reminderList() {
  return state.tasks
    .filter((t) => !t.done && t.date && t.reminder !== undefined && t.reminder !== '')
    .map((t) => {
      const at = new Date(`${t.date}T${t.time || '08:00'}`).getTime() - Number(t.reminder) * 60000;
      return { key: `${t.id}@${at}`, at, title: t.title, body: reminderBody(t, at) };
    });
}

function loadNotified() {
  try { return JSON.parse(localStorage.getItem(NOTIFIED_KEY)) || {}; } catch (e) { return {}; }
}

function saveNotified(map) {
  const cutoff = Date.now() - 3 * 86400000;
  for (const k of Object.keys(map)) if (map[k] < cutoff) delete map[k];
  try { localStorage.setItem(NOTIFIED_KEY, JSON.stringify(map)); } catch (e) { /* ignora */ }
}

async function showNotification(title, options) {
  const opts = { icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', lang: 'pt-BR', ...options };
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) return reg.showNotification(title, opts);
  }
  return new Notification(title, opts);
}

function checkReminders() {
  if (!notifyEnabled()) return;
  const now = Date.now();
  const notified = loadNotified();
  const due = reminderList().filter((r) => r.at <= now && now - r.at < REMINDER_WINDOW && !notified[r.key]);
  for (const r of due) {
    notified[r.key] = now;
    showNotification(r.title, { body: r.body, tag: r.key }).catch((e) => console.warn(e));
  }
  if (due.length) {
    saveNotified(notified);
    if (!document.hidden) toast(`🔔 ${due[0].title}`);
  }
}

// Guarda os próximos lembretes onde o service worker consegue ler (ele não acessa o localStorage)
function syncReminders() {
  checkReminders();
  if (!('caches' in window) || location.protocol === 'file:') return;
  const data = { enabled: notifyEnabled(), list: reminderList() };
  caches.open(DATA_CACHE)
    .then((c) => c.put(new URL('reminders.json', location.href).href, new Response(JSON.stringify(data))))
    .catch(() => {});
}

async function registerBackgroundCheck() {
  try {
    const reg = await navigator.serviceWorker.ready;
    if (!('periodicSync' in reg)) return;
    const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
    if (status.state === 'granted') {
      await reg.periodicSync.register('dal-lembretes', { minInterval: 60 * 60 * 1000 });
    }
  } catch (e) { /* não suportado neste navegador */ }
}

function updateNotifyButton() {
  const on = notifyEnabled();
  const btn = $('#notifyBtn');
  btn.classList.toggle('on', on);
  const label = on ? 'Desativar notificações' : 'Ativar notificações';
  btn.setAttribute('aria-label', label);
  btn.title = label;
}

$('#notifyBtn').addEventListener('click', async () => {
  if (!notifySupported()) {
    toast('Este navegador não suporta notificações.');
    return;
  }
  if (notifyEnabled()) {
    try { localStorage.setItem(NOTIFY_KEY, '0'); } catch (e) { /* ignora */ }
    updateNotifyButton();
    syncReminders();
    toast('Notificações desativadas');
    return;
  }
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') {
    toast('Permissão negada. Libere as notificações nas configurações do navegador.');
    return;
  }
  try { localStorage.setItem(NOTIFY_KEY, '1'); } catch (e) { /* ignora */ }
  updateNotifyButton();
  syncReminders();
  registerBackgroundCheck();
  showNotification('Notificações ativadas', { body: 'Você vai receber os lembretes das suas tarefas.', tag: 'dal-ativado' })
    .catch(() => {});
});

updateNotifyButton();
syncReminders();
if (notifyEnabled() && 'serviceWorker' in navigator && location.protocol !== 'file:') registerBackgroundCheck();
setInterval(checkReminders, 20000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) checkReminders(); });

// ---------- Modo (Escola / Profissional) e configurações ----------
function applyMode() {
  document.documentElement.dataset.mode = MODE;
  document.querySelector('meta[name="theme-color"]').content = MODE === 'pro' ? '#0f4c5c' : '#123d2f';
  document.querySelectorAll('[data-l]').forEach((el) => { el.textContent = M[el.dataset.l]; });
  document.querySelector('.tab[data-view="escola"] use').setAttribute('href', `#i-${M.tabIcon}`);
  document.querySelector('.cat-toggle label:nth-child(2) use').setAttribute('href', `#i-${M.tabIcon}`);
  form.title.placeholder = M.placeholder;
  $('#kindRow').innerHTML = Object.entries(M.kinds).map(([v, l]) =>
    `<label class="choice"><input type="radio" name="kind" value="${v}" ${v === M.defaultKind ? 'checked' : ''}><span>${l}</span></label>`).join('');
}

function renderSettings() {
  document.querySelectorAll('#modeSwitch [data-mode]').forEach((b) => b.classList.toggle('on', b.dataset.mode === MODE));
  $('#userName').value = userName();
  const on = notifyEnabled();
  $('#notifySwitch').classList.toggle('on', on);
  $('#notifySwitch').setAttribute('aria-checked', on);
  $('#settingsVersion').textContent = `v${APP_VERSION}`;
}

$('#settingsBtn').addEventListener('click', () => {
  renderSettings();
  $('#settingsDialog').showModal();
});
$('#modeSwitch').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-mode]');
  if (!b || b.dataset.mode === MODE) return;
  const pro = b.dataset.mode === 'pro';
  const ok = await askConfirm({
    title: pro ? 'Mudar para o modo Profissional?' : 'Mudar para o modo Escola?',
    text: 'Cada modo tem as próprias tarefas. As do modo atual ficam guardadas e voltam quando você trocar de novo.',
    yes: 'Mudar',
    tone: 'neutral',
  });
  if (!ok) return;
  try { localStorage.setItem(MODE_KEY, b.dataset.mode); } catch (err) { /* ignora */ }
  location.reload();
});
$('#userName').addEventListener('input', (e) => {
  try { localStorage.setItem('dal.name', e.target.value.trim()); } catch (err) { /* ignora */ }
  if (currentView === 'hoje') renderHoje();
});
$('#notifySwitch').addEventListener('click', async () => {
  await $('#notifyBtn').click();
  setTimeout(renderSettings, 300);
});

applyMode();

// ---------- Início ----------
let initialView = 'hoje';
try { initialView = localStorage.getItem('dal.view') || 'hoje'; } catch (e) { /* ignora */ }
switchView(['hoje', 'agenda', 'escola', 'todas'].includes(initialView) ? initialView : 'hoje');
