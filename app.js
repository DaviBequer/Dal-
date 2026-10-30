'use strict';

// ---------- Armazenamento ----------
const STORAGE_KEY = 'dal.v1';

const DEFAULT_SUBJECTS = [
  { id: 'mat', name: 'Matemática', color: '#4f46e5' },
  { id: 'por', name: 'Português', color: '#e11d48' },
  { id: 'cie', name: 'Ciências', color: '#10b981' },
  { id: 'his', name: 'História', color: '#f59e0b' },
  { id: 'geo', name: 'Geografia', color: '#0ea5e9' },
  { id: 'ing', name: 'Inglês', color: '#a855f7' },
];

const KIND_LABELS = {
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
function taskHTML(t, { showDate = true } = {}) {
  const subj = t.category === 'escola' ? subjectById(t.subject) : null;
  const late = !t.done && t.date && diffDays(t.date) < 0;
  const chips = [];

  chips.push(`<span class="chip"><span class="prio ${t.priority}"></span>${PRIORITY_LABELS[t.priority]}</span>`);
  if (t.category === 'escola') {
    if (subj) chips.push(`<span class="chip">${escapeHTML(subj.name)}</span>`);
    chips.push(`<span class="chip ${t.kind === 'prova' ? 'prova' : ''}">${KIND_LABELS[t.kind] || 'Outro'}</span>`);
  } else {
    chips.push('<span class="chip">🏠 Dia a dia</span>');
  }
  if (showDate && t.date) {
    chips.push(`<span class="chip ${late ? 'late' : ''}">📅 ${relativeDate(t.date)}</span>`);
  }
  if (t.time) chips.push(`<span class="chip">🕒 ${t.time}</span>`);
  if (t.date && t.reminder) chips.push(`<span class="chip">🔔 ${REMINDER_LABELS[t.reminder] || ''}</span>`);
  if (t.repeat) chips.push(`<span class="chip">🔁 ${t.repeat === 'diario' ? 'Diária' : 'Semanal'}</span>`);

  const style = subj ? ` style="--subject-color:${escapeHTML(subj.color)}"` : '';
  return `
    <li class="task ${t.category} ${t.done ? 'done' : ''}" data-id="${t.id}"${style}>
      <button class="check" type="button" data-action="toggle" aria-label="${t.done ? 'Desmarcar' : 'Concluir'} tarefa">${t.done ? '✓' : ''}</button>
      <div class="task-body" data-action="edit">
        <div class="task-title">${escapeHTML(t.title)}</div>
        <div class="task-meta">${chips.join('')}</div>
        ${t.notes ? `<div class="task-notes">${escapeHTML(t.notes)}</div>` : ''}
      </div>
    </li>`;
}

function listHTML(tasks, opts, emptyMsg = 'Nada por aqui.') {
  if (!tasks.length) return `<p class="empty">${emptyMsg}</p>`;
  return `<ul class="task-list">${sortTasks(tasks).map((t) => taskHTML(t, opts)).join('')}</ul>`;
}

// ---------- View: Hoje ----------
function renderHoje() {
  const today = todayISO();
  const pending = state.tasks.filter((t) => !t.done);
  const overdue = pending.filter((t) => t.date && t.date < today);
  const todays = state.tasks.filter((t) => t.date === today);
  const week = pending.filter((t) => t.date && t.date > today && t.date <= addDays(today, 7));
  const noDate = pending.filter((t) => !t.date);
  const exams = pending.filter((t) => t.kind === 'prova' && t.category === 'escola' && t.date && t.date >= today);

  const doneToday = todays.filter((t) => t.done).length;
  $('#stats').innerHTML = `
    <div class="stat"><strong>${todays.length - doneToday}</strong><span>para hoje</span></div>
    <div class="stat"><strong>${doneToday}</strong><span>concluídas hoje</span></div>
    <div class="stat ${overdue.length ? 'warn' : ''}"><strong>${overdue.length}</strong><span>atrasadas</span></div>
    <div class="stat"><strong>${exams.length}</strong><span>provas à frente</span></div>`;

  let html = '';
  if (overdue.length) {
    html += `<div class="group overdue"><h2>Atrasadas</h2>${listHTML(overdue)}</div>`;
  }
  html += `<div class="group"><h2>Hoje</h2>${listHTML(todays, { showDate: false }, 'Nenhuma tarefa para hoje. Aproveite! 🎉')}</div>`;
  html += `<div class="group"><h2>Próximos 7 dias</h2>${listHTML(week, {}, 'Semana tranquila.')}</div>`;
  if (noDate.length) {
    html += `<div class="group"><h2>Sem data</h2>${listHTML(noDate)}</div>`;
  }
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

  const dows = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  let html = dows.map((d) => `<div class="cal-dow">${d}</div>`).join('');

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
    const dots = tasks.slice(0, 6).map((t) => {
      const c = t.kind === 'prova' && t.category === 'escola' ? 'prova' : t.category;
      return `<span class="dot ${c} ${t.done ? 'done' : ''}"></span>`;
    }).join('');
    const label = `${formatDate(iso, { day: 'numeric', month: 'long' })}, ${tasks.length} tarefa(s)`;
    html += `<button type="button" class="${classes.join(' ')}" data-date="${iso}" aria-label="${label}">
      <span class="num">${d.getDate()}</span><span class="dots">${dots}</span></button>`;
    // Para depois da última semana do mês
    if (i % 7 === 6 && i >= 27 && d.getMonth() !== cal.month) break;
  }
  $('#calendar').innerHTML = html;

  $('#dayTitle').textContent = cap(formatDate(cal.selected, { weekday: 'long', day: 'numeric', month: 'long' }));
  const dayTasks = byDate[cal.selected] || [];
  $('#dayTasks').innerHTML = dayTasks.length
    ? sortTasks(dayTasks).map((t) => taskHTML(t, { showDate: false })).join('')
    : '<li class="empty">Nenhuma tarefa neste dia.</li>';
}

// ---------- View: Escola ----------
function renderEscola() {
  const today = todayISO();
  const school = state.tasks.filter((t) => t.category === 'escola');

  const exams = sortTasks(school.filter((t) => !t.done && t.kind === 'prova' && t.date && t.date >= today));
  $('#examsBox').innerHTML = exams.length
    ? `<div class="exams"><h3>📝 Próximas provas</h3><ul>${exams.map((t) => {
        const s = subjectById(t.subject);
        const n = diffDays(t.date);
        const when = n === 0 ? 'hoje' : n === 1 ? 'amanhã' : `em ${n} dias`;
        return `<li><strong>${escapeHTML(s ? s.name : 'Sem matéria')}</strong> — ${escapeHTML(t.title)} · ${formatDate(t.date)} (${when})</li>`;
      }).join('')}</ul></div>`
    : '';

  const cards = state.subjects.map((s) => {
    const tasks = school.filter((t) => t.subject === s.id && !t.done);
    return `
      <article class="subject-card" style="--subject-color:${escapeHTML(s.color)}">
        <header><h3>${escapeHTML(s.name)}</h3><span class="count">${tasks.length} pendente(s)</span></header>
        ${listHTML(tasks, {}, 'Tudo em dia ✨')}
        <button class="btn ghost small" type="button" data-add-subject="${s.id}">+ Tarefa de ${escapeHTML(s.name)}</button>
      </article>`;
  });

  const orphan = school.filter((t) => !t.done && !subjectById(t.subject));
  if (orphan.length) {
    cards.push(`<article class="subject-card" style="--subject-color:var(--muted)">
      <header><h3>Sem matéria</h3><span class="count">${orphan.length} pendente(s)</span></header>
      ${listHTML(orphan)}</article>`);
  }

  $('#subjectsGrid').innerHTML = cards.join('') ||
    '<p class="empty">Cadastre suas matérias em “Gerenciar matérias”.</p>';
}

// ---------- View: Todas ----------
function renderTodas() {
  const q = $('#search').value.trim().toLowerCase();
  const cat = $('#filterCat').value;
  const status = $('#filterStatus').value;

  const list = state.tasks.filter((t) => {
    if (cat && t.category !== cat) return false;
    if (status === 'pendentes' && t.done) return false;
    if (status === 'concluidas' && !t.done) return false;
    if (q) {
      const subj = subjectById(t.subject);
      const hay = `${t.title} ${t.notes || ''} ${subj ? subj.name : ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  $('#allTasks').innerHTML = list.length
    ? sortTasks(list).map((t) => taskHTML(t)).join('')
    : '<li class="empty">Nenhuma tarefa encontrada.</li>';
  $('#clearDone').hidden = !state.tasks.some((t) => t.done);
}

// ---------- Render geral ----------
let currentView = 'hoje';

function render() {
  $('#todayLabel').textContent = cap(new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  }));
  ({ hoje: renderHoje, agenda: renderAgenda, escola: renderEscola, todas: renderTodas })[currentView]();
}

function switchView(view) {
  currentView = view;
  document.querySelectorAll('.tab').forEach((b) => {
    const active = b.dataset.view === view;
    b.classList.toggle('active', active);
    b.setAttribute('aria-selected', active);
  });
  document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === `view-${view}`));
  try { localStorage.setItem('dal.view', view); } catch (e) { /* ignora */ }
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
  $('#subjectSelect').innerHTML = state.subjects.length
    ? state.subjects.map((s) => `<option value="${s.id}" ${s.id === selected ? 'selected' : ''}>${escapeHTML(s.name)}</option>`).join('')
    : '<option value="">(cadastre uma matéria)</option>';
}

function updateSchoolFields() {
  $('#schoolFields').hidden = form.category.value !== 'escola';
}

function openForm(task = null, defaults = {}) {
  editingId = task ? task.id : null;
  form.reset();
  const data = task || { category: 'dia', priority: 'media', kind: 'licao', reminder: '0', ...defaults };
  $('#formTitle').textContent = task ? 'Editar tarefa' : 'Nova tarefa';
  $('#deleteBtn').hidden = !task;

  fillSubjectSelect(data.subject);
  form.title.value = data.title || '';
  form.category.value = data.category;
  form.kind.value = data.kind || 'licao';
  form.date.value = data.date || '';
  form.time.value = data.time || '';
  form.priority.value = data.priority || 'media';
  form.repeat.value = data.repeat || '';
  form.reminder.value = data.reminder || '';
  form.notes.value = data.notes || '';
  updateSchoolFields();
  dialog.returnValue = '';
  dialog.showModal();
  form.title.focus();
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

$('#deleteBtn').addEventListener('click', () => {
  if (!editingId || !confirm('Excluir esta tarefa?')) return;
  state.tasks = state.tasks.filter((t) => t.id !== editingId);
  save();
  dialog.close('deleted');
  toast('Tarefa excluída');
  render();
});

// ---------- Matérias ----------
const subjectsDialog = $('#subjectsDialog');

function renderSubjectEditor() {
  $('#subjectEditList').innerHTML = state.subjects.map((s) => `
    <li data-id="${s.id}">
      <input type="color" value="${escapeHTML(s.color)}" data-subject-color aria-label="Cor de ${escapeHTML(s.name)}">
      <span>${escapeHTML(s.name)}</span>
      <button class="btn ghost small danger-text" type="button" data-remove-subject>Remover</button>
    </li>`).join('') || '<li class="empty">Nenhuma matéria cadastrada.</li>';
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
    toast('Essa matéria já existe');
    return;
  }
  state.subjects.push({ id: uid(), name, color: $('#newSubjectColor').value });
  input.value = '';
  save();
  renderSubjectEditor();
  input.focus();
});

$('#newSubjectName').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); $('#addSubjectBtn').click(); }
});

$('#subjectEditList').addEventListener('input', (e) => {
  if (!e.target.matches('[data-subject-color]')) return;
  const s = subjectById(e.target.closest('li').dataset.id);
  if (s) { s.color = e.target.value; save(); }
});

$('#subjectEditList').addEventListener('click', (e) => {
  if (!e.target.matches('[data-remove-subject]')) return;
  const id = e.target.closest('li').dataset.id;
  const used = state.tasks.filter((t) => t.subject === id).length;
  const msg = used
    ? `Remover esta matéria? ${used} tarefa(s) ficarão como “Sem matéria”.`
    : 'Remover esta matéria?';
  if (!confirm(msg)) return;
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
  const day = e.target.closest('.cal-day');
  if (day) {
    cal.selected = day.dataset.date;
    const d = fromISO(cal.selected);
    if (d.getMonth() !== cal.month) { cal.month = d.getMonth(); cal.year = d.getFullYear(); }
    renderAgenda();
    return;
  }
  const actionEl = e.target.closest('[data-action]');
  const taskEl = e.target.closest('.task');
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

['#search', '#filterCat', '#filterStatus'].forEach((sel) => $(sel).addEventListener('input', renderTodas));

$('#clearDone').addEventListener('click', () => {
  const n = state.tasks.filter((t) => t.done).length;
  if (!n || !confirm(`Apagar ${n} tarefa(s) concluída(s)?`)) return;
  state.tasks = state.tasks.filter((t) => !t.done);
  save();
  render();
});

// Atualiza ao virar o dia com o app aberto
document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });

// ---------- Versão e PWA ----------
const APP_VERSION = self.APP_VERSION || '';
$('#appVersion').textContent = `v${APP_VERSION}`;
$('#footerVersion').textContent = APP_VERSION;

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  // Recarrega só quando o usuário pediu a atualização (não na primeira instalação)
  let updateRequested = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!updateRequested) return;
    updateRequested = false;
    location.reload();
  });

  navigator.serviceWorker.register('sw.js').then((reg) => {
    const offerUpdate = (worker) => {
      // Lê a versão nova direto do servidor para mostrar no aviso
      fetch('version.js', { cache: 'no-store' })
        .then((r) => r.text())
        .then((txt) => {
          const m = txt.match(/APP_VERSION = '([^']+)'/);
          if (m) $('#updateText').textContent = `Nova versão ${m[1]} disponível`;
        })
        .catch(() => {});
      $('#updateBar').hidden = false;
      $('#updateBtn').onclick = () => {
        updateRequested = true;
        worker.postMessage('skipWaiting');
      };
    };

    if (reg.waiting && navigator.serviceWorker.controller) offerUpdate(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const worker = reg.installing;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(worker);
      });
    });

    // Procura atualizações ao voltar para o app
    document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update(); });
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
    parts.push(KIND_LABELS[t.kind] || 'Escola');
    if (s) parts.push(s.name);
  } else {
    parts.push('Dia a dia');
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
  btn.textContent = on ? '🔔' : '🔕';
  const label = on ? 'Desativar notificações' : 'Ativar notificações';
  btn.setAttribute('aria-label', label);
  btn.title = label;
}

$('#notifyBtn').addEventListener('click', async () => {
  if (!notifySupported()) {
    toast(/iPhone|iPad/.test(navigator.userAgent)
      ? 'No iPhone, instale o app na Tela de Início para receber notificações.'
      : 'Este navegador não suporta notificações.');
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

// ---------- Início ----------
let initialView = 'hoje';
try { initialView = localStorage.getItem('dal.view') || 'hoje'; } catch (e) { /* ignora */ }
switchView(['hoje', 'agenda', 'escola', 'todas'].includes(initialView) ? initialView : 'hoje');
