'use strict';
/* Orbe — tarefas, agenda e diário das áreas da vida. Dados ficam no aparelho (localStorage 'orbe.v1'). */

const KEY = 'orbe.v1';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const APP = $('#app');
const ic = (n, s = 20) => `<span class="ms" style="--s:${s}px" aria-hidden="true">${n}</span>`;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const pl = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/* ---------- datas ---------- */
const WD = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const WDF = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const MO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MOF = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const today = () => ymd(new Date());
const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return ymd(d); };
const monday = (s) => { const d = parse(s); const k = (d.getDay() + 6) % 7; d.setDate(d.getDate() - k); return ymd(d); };
const weekOf = (s) => { const m = monday(s); return [...Array(7)].map((_, i) => addDays(m, i)); };
const weekNo = (s) => { const d = parse(s); d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7)); const w1 = new Date(d.getFullYear(), 0, 4); return 1 + Math.round(((d - w1) / 864e5 - 3 + ((w1.getDay() + 6) % 7)) / 7); };
const dayDiff = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
function fmtDate(s, long) {
  const d = parse(s), t = today();
  const base = `${WD[d.getDay()]}, ${d.getDate()} ${MO[d.getMonth()]}`;
  if (s === t) return long ? `Hoje · ${base}` : 'hoje';
  if (s === addDays(t, 1)) return long ? `Amanhã · ${base}` : 'amanhã';
  if (s === addDays(t, -1)) return long ? `Ontem · ${base}` : 'ontem';
  return base;
}

/* ---------- dados ---------- */
const Q = { 1: { k: 'Fazer agora', d: 'Urgente e importante', s: 'Fazer' }, 2: { k: 'Agendar', d: 'Importante, sem pressa', s: 'Agendar' }, 3: { k: 'Delegar', d: 'Urgente, pouco importante', s: 'Delegar' }, 4: { k: 'Eliminar', d: 'Nem urgente, nem importante', s: 'Eliminar' } };
const SUBI = { Clientes: 'handshake', Projetos: 'folder_open', Estudos: 'school', Saúde: 'favorite', Casa: 'cottage', Finanças: 'account_balance_wallet', Leitura: 'menu_book', Oração: 'volunteer_activism', Igreja: 'church' };
const ICONS = ['work', 'person', 'self_improvement', 'fitness_center', 'family_restroom', 'savings', 'school', 'palette', 'rocket_launch', 'volunteer_activism', 'travel_explore', 'eco', 'favorite', 'home', 'menu_book', 'church', 'sports_soccer', 'music_note'];
const COLORS = ['#111214', '#0F5463', '#7A7D82', '#3F7F8C', '#5B5F66', '#A3A7AC'];
const DEFAULT = () => ({
  v: 1, name: 'Davi',
  areas: [
    { k: 'pro', n: 'Profissional', i: 'work', c: '#111214', subs: ['Clientes', 'Projetos', 'Estudos'] },
    { k: 'pes', n: 'Pessoal', i: 'person', c: '#0F5463', subs: ['Saúde', 'Casa', 'Finanças'] },
    { k: 'esp', n: 'Espiritual', i: 'self_improvement', c: '#7A7D82', subs: ['Leitura', 'Oração', 'Igreja'] },
  ],
  tasks: [], notes: [],
});
let DB;
try { DB = JSON.parse(localStorage.getItem(KEY)) || DEFAULT(); } catch (e) { DB = DEFAULT(); }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) { toast('Não consegui salvar no aparelho.'); } };
const area = (k) => DB.areas.find((a) => a.k === k);
const areaName = (k) => (area(k) || { n: 'Sem área' }).n;
const subIcon = (s) => SUBI[s] || 'label';

/* ---------- estado da tela ---------- */
const UI = {
  tab: 'home', qf: 0, view: 'semana', sel: today(), sview: 'semana', open: new Set(), det: null, dtab: 'tudo', adding: null,
  form: null, cm: null, areaForm: null,
};

/* ---------- utilidades ---------- */
let toastT;
function toast(msg) { const t = $('.toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2200); }
const mini = (q, s = 12) => `<svg class="mini q${q}" width="${s}" height="${s}" viewBox="0 0 14 14" aria-hidden="true">${[[0, 0], [8, 0], [0, 8], [8, 8]].map(([x, y], i) => `<rect x="${x + 0.5}" y="${y + 0.5}" width="5.5" height="5.5" rx="1.4"${i === q - 1 ? ' class="f"' : ''}/>`).join('')}</svg>`;
const byQ = (a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0) || a.q - b.q || ((a.time || '99') < (b.time || '99') ? -1 : 1);
const sig = (t) => (t.done ? '×' : t.time ? '○' : '•');
const isLate = (t) => !t.done && t.date && t.date < today();

function row(t) {
  const meta = [
    isLate(t) ? `<span class="late">${ic('history', 13)}atrasada · ${fmtDate(t.date)}</span>` : '',
    t.time ? `<span class="tm">${ic('schedule', 13)}${t.time}</span>` : '',
    `<span>${esc(areaName(t.a))}${t.s ? ' · ' + esc(t.s) : ''}</span>`,
    t.hist && t.hist.length ? `<span class="rm">${ic('event_repeat', 13)}remarcada ${t.hist.length}×</span>` : '',
  ].join('');
  return `<div class="task q${t.q}${t.done ? ' done' : ''}" data-id="${t.id}"><button class="ck" aria-label="${t.done ? 'Desmarcar' : 'Concluir'}">${ic('check', 15)}</button><div class="tb"><div class="tt">${esc(t.t)}</div><div class="tmeta">${meta}</div></div></div>`;
}

/* ---------- HOJE ---------- */
function greeting() { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; }
function inTxt(time) {
  const [h, m] = time.split(':').map(Number), now = new Date(), mins = h * 60 + m - (now.getHours() * 60 + now.getMinutes());
  if (mins <= 0) return 'agora';
  if (mins < 60) return `em ${mins} min`;
  return `em ${Math.floor(mins / 60)}h${mins % 60 ? pad(mins % 60) : ''}`;
}
function home() {
  const t0 = today();
  const td = DB.tasks.filter((t) => t.date === t0 || isLate(t) || (t.done && t.doneAt && t.doneAt.slice(0, 10) === t0 && t.date && t.date < t0)).sort(byQ);
  const done = td.filter((t) => t.done).length, open = td.length - done, p = td.length ? Math.round((done / td.length) * 100) : 0;
  const cnt = (q) => td.filter((t) => t.q === q && !t.done).length;
  const d = new Date();
  const now = pad(d.getHours()) + ':' + pad(d.getMinutes());
  const n = td.filter((t) => t.date === t0 && t.time && t.q <= 2 && !t.done && t.time >= now).sort((a, b) => (a.time < b.time ? -1 : 1))[0];
  let h = `<div class="hero"><div class="logo">${ic('light_mode', 18)}Orbe<button data-settings aria-label="Configurações">${ic('settings', 19)}</button></div>
    <h2>${greeting()}${DB.name ? ', ' + esc(DB.name) : ''}</h2><p>${WDF[d.getDay()][0].toUpperCase() + WDF[d.getDay()].slice(1)}, ${d.getDate()} de ${MOF[d.getMonth()].toLowerCase()} · ${pl(open, 'aberta', 'abertas')} hoje</p>
    <div class="pl"><span>Progresso de hoje</span><b>${done} de ${td.length}</b></div><div class="prog"><i style="width:${p}%"></i></div>
    <div class="ht">${[1, 2, 3, 4].map((q) => `<button class="q${q}${UI.qf === q ? ' on' : ''}" data-qf="${q}"><span class="tn">${mini(q)}<b>${cnt(q)}</b></span><small>${Q[q].s}</small></button>`).join('')}</div></div>`;
  const nextH = n ? `<div class="next" data-id="${n.id}"><span class="ni">${ic('schedule', 22)}</span><div><small>Próximo importante</small><b>${n.time} · ${esc(n.t)}</b></div><span class="in">${inTxt(n.time)}</span></div>` : '';
  h += nextH.replace('class="next"', 'class="next m-only"') + '<div class="cols"><div class="ca">';
  h += `<div class="sec-h">Hoje por prioridade<small>${UI.qf ? 'filtrado · toque de novo para ver tudo' : pl(open, 'aberta', 'abertas')}</small></div>`;
  let any = false;
  [1, 2, 3, 4].filter((q) => !UI.qf || UI.qf === q).forEach((q) => {
    const l = td.filter((t) => t.q === q); if (!l.length) return; any = true;
    h += `<div class="qgroup q${q}"><h5>${mini(q)}${Q[q].k}<span>· ${Q[q].d}</span><span class="cnt">${l.filter((t) => !t.done).length}</span></h5>${l.map(row).join('')}</div>`;
  });
  if (!any) h += `<div class="empty-big">${ic('wb_sunny')}${UI.qf ? 'Nada nesta prioridade hoje.' : 'Nada para hoje.<br>Toque no + para criar uma tarefa.'}</div>`;
  h += '</div><div class="cb">' + nextH.replace('class="next"', 'class="next d-only"');
  const tmw = addDays(t0, 1), tm = DB.tasks.filter((t) => t.date === tmw).sort(byQ);
  if (tm.length) h += `<div class="sec-h">Amanhã<small>${fmtDate(tmw, true).split(' · ')[1]} · ${tm.length}</small></div><div class="qgroup plain">${tm.map(row).join('')}</div>`;
  else {
    const wk = DB.tasks.filter((t) => t.date && t.date > tmw && t.date <= addDays(t0, 7)).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : byQ(a, b)));
    if (wk.length) h += `<div class="sec-h">Próximos dias<small>${wk.length}</small></div><div class="qgroup plain">${wk.map((t) => row(t).replace('<div class="tmeta">', `<div class="tmeta"><span>${fmtDate(t.date)}</span>`)).join('')}</div>`;
  }
  const nd = DB.tasks.filter((t) => !t.date && !t.done).sort(byQ);
  if (nd.length) h += `<div class="sec-h">Sem data<small>${nd.length}</small></div><div class="qgroup plain">${nd.map(row).join('')}</div>`;
  return h + '</div></div>';
}

/* ---------- AGENDA ---------- */
const dayTasks = (s) => DB.tasks.filter((t) => t.date === s).sort(byQ);
const dayDots = (s) => dayTasks(s).filter((t) => !t.done).slice(0, 3).map((t) => `<i class="q${t.q}"></i>`).join('');
function monthGrid() {
  const sel = parse(UI.sel), y = sel.getFullYear(), m = sel.getMonth(), t0 = today(), wk = weekOf(UI.sel);
  let days;
  if (UI.view === 'semana') days = wk.map((s) => [s, 0]);
  else {
    const first = ymd(new Date(y, m, 1)), start = monday(first); days = [];
    for (let s = start; days.length < 42; s = addDays(s, 1)) { days.push([s, parse(s).getMonth() !== m ? 1 : 0]); if (days.length >= 35 && days.length % 7 === 0 && parse(addDays(s, 1)).getMonth() !== m) break; }
  }
  return `<div class="month">${['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((x) => `<span class="wd">${x}</span>`).join('')}${days.map(([s, o]) => `<button class="md${o ? ' o' : ''}${s === t0 ? ' today' : ''}${s === UI.sel ? ' sel' : ''}${wk.includes(s) && s !== UI.sel ? ' wk' : ''}" data-d="${s}" data-drop="${s}">${parse(s).getDate()}<span class="dots">${dayDots(s)}</span></button>`).join('')}</div>`;
}
function spread() {
  const t0 = today(), wk = weekOf(UI.sel);
  return `<div class="spread">${wk.map((s) => {
    const l = dayTasks(s), d = parse(s), wide = s === t0;
    return `<div class="sp${wide ? ' wide' : ''}${s === UI.sel ? ' sel' : ''}" data-drop="${s}" data-day="${s}"><h5><span>${wide ? 'Hoje · ' : ''}${WD[d.getDay()][0].toUpperCase() + WD[d.getDay()].slice(1)} ${d.getDate()}</span><span>${l.length || ''}</span></h5>${l.map((t) => `<p class="q${t.q}${t.done ? ' dn' : ''}" data-id="${t.id}" draggable="true"><span class="s">${sig(t)}</span><span class="t">${esc(t.t)}</span>${t.time ? `<small>${t.time}</small>` : ''}</p>`).join('') || '<span class="free">livre</span>'}</div>`;
  }).join('')}</div>`;
}
function agenda() {
  const sem = UI.view === 'semana', sel = parse(UI.sel), wk = weekOf(UI.sel);
  const title = sem ? `Semana ${weekNo(UI.sel)}` : `${MOF[sel.getMonth()]}`;
  const sub = sem ? `${parse(wk[0]).getDate()} ${MO[parse(wk[0]).getMonth()]} a ${parse(wk[6]).getDate()} ${MO[parse(wk[6]).getMonth()]}` : String(sel.getFullYear());
  let h = `<div class="ag-h"><b>${title}</b><div class="seg"><button data-view="semana" class="${sem ? 'on' : ''}">Semana</button><button data-view="mes" class="${!sem ? 'on' : ''}">Mês</button></div></div>
  <div class="ag-nav"><p class="sub-h">${sub}</p>${UI.sel !== today() ? `<button data-gotoday aria-label="Ir para hoje">${ic('today', 18)}</button>` : ''}<button data-agnav="-1" aria-label="Anterior">${ic('chevron_left', 20)}</button><button data-agnav="1" aria-label="Próximo">${ic('chevron_right', 20)}</button></div>`;
  h = '<div class="cols ag"><div class="ca">' + h + monthGrid();
  if (!sem) {
    const l = dayTasks(UI.sel);
    h += `<div class="sec-h">${fmtDate(UI.sel, true)}<small>${l.length}</small></div><div class="qgroup plain">${l.map(row).join('') || '<p class="empty">Dia livre. Toque no + para criar algo neste dia.</p>'}</div>`;
  }
  h += '</div><div class="cb">';
  h += `<div class="sec-h">Semana ${weekNo(UI.sel)}<small>${matchMedia('(pointer:fine)').matches ? 'arraste para mudar o dia' : 'toque para editar'}</small></div>` + spread();
  h += `<div class="legend"><span>• tarefa</span><span>○ compromisso</span><span>× feita</span><span><b>•</b> fazer agora</span></div>`;
  return h + '</div></div>';
}

/* ---------- VIDA ---------- */
function visual() {
  const A = DB.areas, wk = weekOf(today());
  if (!A.length) return '';
  const sh = A.map((a) => DB.tasks.filter((t) => t.a === a.k && t.date && wk.includes(t.date)).length);
  const tot = sh.reduce((x, y) => x + y, 0), pc = sh.map((x) => (tot ? Math.round((x / tot) * 100) : 0)), N = A.length;
  const W = 280, H = 214, cx = W / 2, cy = H / 2, R0 = N === 1 ? 0 : N === 2 ? 34 : 44;
  const pos = A.map((a, i) => { const ang = ((-150 + (i * 360) / N) * Math.PI) / 180; return [cx + R0 * Math.cos(ang), cy + R0 * Math.sin(ang), ang]; });
  const circ = A.map((a, i) => `<circle cx="${pos[i][0]}" cy="${pos[i][1]}" r="${tot ? Math.max(26, 30 + pc[i] * 0.55) : 42}" fill="none" stroke="${a.c}" stroke-width="1.25"/>`).join('');
  const lab = A.map((a, i) => { const [x, y, ang] = pos[i], lx = x + Math.cos(ang) * 16, ly = y + Math.sin(ang) * 16; return `<text x="${lx}" y="${ly}" text-anchor="middle" class="v">${tot ? pc[i] + '%' : '–'}</text><text x="${lx}" y="${ly + 14}" text-anchor="middle" class="l">${esc(a.n.length > 14 ? a.n.slice(0, 13) + '…' : a.n)}</text>`; }).join('');
  return `<div class="vis"><svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Equilíbrio entre as áreas">${circ}${lab}</svg><p class="cap">${tot ? 'Quanto das tarefas desta semana foi para cada área' : 'Quando tiver tarefas nesta semana, aqui aparece o equilíbrio entre as áreas'}</p></div>`;
}
function areas() {
  let h = `<div class="ag-h"><b>Vida</b><span class="muted" style="font-size:12px">${pl(DB.areas.length, 'área', 'áreas')}</span></div>` + '<div class="cols vida"><div class="ca">' + visual() + '</div><div class="cb">';
  DB.areas.forEach((a) => {
    const op = DB.tasks.filter((t) => t.a === a.k && !t.done).length, nts = DB.notes.filter((n) => n.a === a.k).length;
    h += `<div class="acc${UI.open.has(a.k) ? ' open' : ''}" data-acc="${a.k}"><button><span class="ai2" style="--c:${a.c}">${ic(a.i, 20)}</span><div><b>${esc(a.n)}</b><small>${pl(a.subs.length, 'parte', 'partes')} · ${pl(op, 'aberta', 'abertas')} · ${pl(nts, 'anotação', 'anotações')}</small></div>${ic('chevron_right', 18).replace('class="ms"', 'class="ms chev"')}</button><div class="in"><div>
    ${a.subs.map((s) => { const o = DB.tasks.filter((t) => t.a === a.k && t.s === s && !t.done).length, nt = DB.notes.filter((n) => n.a === a.k && n.s === s).length; return `<div class="srow" data-det="${a.k}" data-sub="${esc(s)}"><span class="si">${ic(subIcon(s), 19)}</span><div><b>${esc(s)}</b><small>${pl(o, 'tarefa', 'tarefas')} · ${pl(nt, 'anotação', 'anotações')}</small></div>${ic('chevron_right', 16)}</div>`; }).join('')}
    ${UI.adding === a.k ? `<div class="addrow"><span class="si2">${ic('label', 18)}</span><input id="newpart" placeholder="Nome da parte" aria-label="Nome da nova parte" enterkeyhint="done"><button class="ok" data-okp="${a.k}" aria-label="Criar parte">${ic('check', 16)}</button></div>` : `<button class="addrow" data-addp="${a.k}"><span class="si2">${ic('add', 18)}</span>Nova parte em ${esc(a.n)}</button>`}
    <div class="accedit"><button data-editarea="${a.k}">${ic('edit', 16)}Editar área</button></div>
    </div></div></div>`;
  });
  h += `<button class="newarea" data-newarea>${ic('add', 18)}Nova área</button>`;
  return h + '</div></div>';
}
function detail() {
  if (!UI.det) return '';
  const [k, s] = UI.det, a = area(k); if (!a) return '';
  const ts = DB.tasks.filter((t) => t.a === k && t.s === s).sort(byQ), ns = DB.notes.filter((n) => n.a === k && n.s === s).sort((x, y) => (x.at < y.at ? 1 : -1)), tab = UI.dtab;
  const open = ts.filter((t) => !t.done).length;
  let h = `<div class="dhd"><button class="rbtn" data-back aria-label="Voltar">${ic('arrow_back', 20)}</button><small>Vida › ${esc(a.n)}</small><button class="rbtn" data-delpart aria-label="Excluir parte">${ic('delete', 19)}</button></div>
  <div class="dtitle"><span class="si">${ic(subIcon(s), 24)}</span><div><h3>${esc(s)}</h3><p>${pl(open, 'tarefa aberta', 'tarefas abertas')} · ${pl(ns.length, 'anotação', 'anotações')}</p></div></div>
  <div class="seg" style="margin-top:10px">${[['tudo', 'Tudo'], ['tarefas', 'Tarefas'], ['notas', 'Anotações']].map(([v, l]) => `<button data-dtab="${v}" class="${tab === v ? 'on' : ''}">${l}</button>`).join('')}</div>
  <div class="wr2"><textarea id="newnote" rows="1" placeholder="Escrever uma anotação…" aria-label="Nova anotação"></textarea><button data-addnote>${ic('edit', 16)}Anotar</button></div>`;
  if (tab !== 'notas') h += `<div class="sec-h">Tarefas<small>por prioridade</small></div><div class="qgroup plain">${ts.map(row).join('') || '<p class="empty">Nenhuma tarefa aqui ainda.</p>'}</div>`;
  if (tab !== 'tarefas') h += `<div class="sec-h">Anotações<small>${ns.length}</small></div><div>${ns.map((n) => `<div class="dnote">${ic('sticky_note_2', 18)}<span>${esc(n.t).replace(/\n/g, '<br>')}<small>${fmtDate(n.at.slice(0, 10))}</small></span><button class="rm" data-delnote="${n.id}" aria-label="Apagar anotação">${ic('close', 16)}</button></div>`).join('') || '<p class="empty">Nada anotado ainda.</p>'}</div>`;
  h += `<div class="dacts"><button data-newtask>${ic('task_alt', 18)}Nova tarefa em ${esc(s)}</button></div>`;
  return h;
}

/* ---------- NÚMEROS ---------- */
function period(kind, offset = 0) {
  const t0 = today();
  if (kind === 'semana') { const s = addDays(monday(t0), offset * 7); return [s, addDays(s, 6)]; }
  const d = parse(t0), s = new Date(d.getFullYear(), d.getMonth() + offset, 1), e = new Date(d.getFullYear(), d.getMonth() + offset + 1, 0);
  return [ymd(s), ymd(e)];
}
const due = (t) => t.orig || t.date;
function measure(a, b) {
  const t0 = today();
  const inP = DB.tasks.filter((t) => due(t) && due(t) >= a && due(t) <= b);
  const cons = inP.filter((t) => t.done || due(t) <= t0 || (t.date && t.date <= t0));
  const onTime = cons.filter((t) => t.done && (!t.hist || !t.hist.length) && t.doneAt && t.doneAt.slice(0, 10) <= due(t)).length;
  const rem = cons.filter((t) => t.hist && t.hist.length).length;
  const late = cons.filter((t) => isLate(t)).length;
  const doneL = inP.filter((t) => t.done && t.doneAt && t.created);
  const avg = doneL.length ? doneL.reduce((x, t) => x + Math.max(0, dayDiff(t.created.slice(0, 10), t.doneAt.slice(0, 10))), 0) / doneL.length : null;
  const n = cons.length, pc = (x) => (n ? Math.round((x / n) * 100) : null);
  const qs = [1, 2, 3, 4].map((q) => (inP.length ? Math.round((inP.filter((t) => t.q === q).length / inP.length) * 100) : 0));
  const ar = DB.areas.map((ar) => { const l = inP.filter((t) => t.a === ar.k); return [ar.n, l.length ? Math.round((l.filter((t) => t.done).length / l.length) * 100) : null]; });
  return { n, total: inP.length, ok: pc(onTime), rem: pc(rem), late: pc(late), avg, qs, ar };
}
function lineData(kind) {
  const t0 = today();
  if (kind === 'semana') return weekOf(t0).map((s) => { const p = s <= t0 ? measure(s, s) : null; return [WD[parse(s).getDay()][0].toUpperCase(), p && p.n ? p.ok : null]; });
  return [-5, -4, -3, -2, -1, 0].map((o) => { const [a, b] = period('mes', o), p = measure(a, b); return [MO[parse(a).getMonth()][0].toUpperCase() + MO[parse(a).getMonth()].slice(1), p.n ? p.ok : null]; });
}
function lineSvg(pts) {
  const W = 284, H = 96, xs = (i) => 12 + (i * (W - 24)) / (pts.length - 1), ys = (v) => H - (v / 100) * H;
  const valid = pts.map((p, i) => [i, p[1]]).filter((p) => p[1] !== null);
  if (valid.length < 2) return `<p class="empty">O gráfico aparece quando houver pelo menos dois ${UI.sview === 'semana' ? 'dias' : 'meses'} com tarefas vencidas.</p>`;
  const d = valid.map(([i, v], k) => `${k ? 'L' : 'M'}${xs(i).toFixed(1)},${ys(v).toFixed(1)}`).join('');
  const [li, lv] = valid[valid.length - 1];
  return `<div style="position:relative"><svg class="spark" viewBox="0 -6 ${W} ${H + 24}" role="img" aria-label="Tendência de tarefas feitas no dia certo">${[25, 50, 75].map((v) => `<line class="gd" x1="0" x2="${W}" y1="${ys(v)}" y2="${ys(v)}"/>`).join('')}<path class="ar" d="${d}L${xs(li)},${H}L${xs(valid[0][0])},${H}Z"/><path class="ln" d="${d}"/>${pts.map((p, i) => `<text x="${xs(i)}" y="${H + 16}" text-anchor="middle">${p[0]}</text>`).join('')}<circle class="pt" cx="${xs(li)}" cy="${ys(lv)}" r="4.5"/>${valid.map(([i, v]) => `<rect x="${xs(i) - 18}" y="-6" width="36" height="${H + 6}" fill="transparent" data-tip="${pts[i][0]}: ${v}% no dia certo" data-x="${(xs(i) / W) * 100}" data-y="${((ys(v) + 6) / (H + 24)) * 100}"/>`).join('')}</svg><span class="tip"></span></div>`;
}
function stats() {
  const per = UI.sview === 'semana', [a, b] = period(UI.sview), S = measure(a, b), [pa, pb] = period(UI.sview, -1), P = measure(pa, pb);
  const f = (v) => (v === null ? '–' : v + '%');
  let h = `<div class="ag-h"><b>Números</b><div class="seg"><button data-sview="semana" class="${per ? 'on' : ''}">Semana</button><button data-sview="mes" class="${!per ? 'on' : ''}">Mês</button></div></div>`;
  if (!S.total && !DB.tasks.length) return h + `<div class="empty-big">${ic('monitoring')}Os números aparecem conforme tu cria e conclui tarefas.<br>Eles mostram quanto tu faz no dia marcado, quanto remarca e o que mais volta.</div>`;
  h += `<div class="kpis"><div class="kpi dk"><small>No dia certo</small><b>${f(S.ok)}</b></div><div class="kpi"><small>Remarcadas</small><b>${f(S.rem)}</b></div><div class="kpi"><small>Atrasadas</small><b>${f(S.late)}</b></div><div class="kpi"><small>Tempo até fazer</small><b>${S.avg === null ? '–' : S.avg.toFixed(1).replace('.', ',')}<span> dias</span></b></div></div>`;
  let delta = '';
  if (S.ok !== null && P.ok !== null) { const dd = S.ok - P.ok; delta = `${dd >= 0 ? '+' : ''}${dd}% que ${per ? 'a semana passada' : 'o mês passado'}`; }
  h += '<div class="sgrid">';
  h += `<div class="card"><h6><span>Feitas no dia certo</span><b>${delta}</b></h6>${lineSvg(lineData(UI.sview))}</div>`;
  if (S.total) {
    const top = S.qs[1] >= S.qs[0];
    h += `<div class="card"><h6>Onde vai teu tempo</h6><div class="qd">${S.qs.map((p, i) => `<div class="q${i + 1}"><b>${p}%</b><small>${Q[i + 1].k}</small></div>`).join('')}</div><p class="ins">A maior parte está em <b>${top ? 'Agendar' : 'Fazer agora'}</b>${top ? ': importante sem ser urgente. Bom sinal.' : ': muita coisa está virando urgente.'}</p></div>`;
  }
  const rep = DB.tasks.filter((t) => t.hist && t.hist.length).sort((x, y) => y.hist.length - x.hist.length).slice(0, 3);
  h += `<div class="card"><h6>Tarefas que mais voltam</h6>${rep.map((t) => `<div class="rep"><span>${esc(t.t)}</span><b>${t.hist.length}×</b></div>`).join('') || '<p class="empty" style="padding:4px 0">Nenhuma tarefa remarcada até agora.</p>'}${S.avg !== null ? `<p class="ins">Uma tarefa leva em média <b>${S.avg.toFixed(1).replace('.', ',')} dias</b> entre ser criada e ser feita.</p>` : ''}</div>`;
  h += `<div class="card"><h6>Por área</h6><div class="bars">${S.ar.map(([n, p]) => `<div><div class="bar-l"><span>${esc(n)}</span><b>${p === null ? '–' : p + '%'}</b></div><div class="bar"><i data-w="${p || 0}"></i></div></div>`).join('')}</div></div>`;
  return h + '</div>';
}

/* ---------- render ---------- */
const R = { home, agenda, areas, stats };
function anim(el) { requestAnimationFrame(() => requestAnimationFrame(() => $$('.bar i[data-w]', el).forEach((b) => (b.style.width = b.dataset.w + '%')))); }
function render(s, keep = true) { const el = $(`[data-s="${s}"]`); const sc = el.scrollTop; el.innerHTML = R[s](); if (keep) el.scrollTop = sc; anim(el); }
function renderAll() { Object.keys(R).forEach((s) => render(s)); if (UI.det) renderDet(); }
function renderDet(keep = true) { const el = $('.detail'); const sc = el.scrollTop; el.innerHTML = detail(); if (keep) el.scrollTop = sc; }
function go(tab) {
  UI.tab = tab;
  $$('.nav button').forEach((b) => b.classList.toggle('on', b.dataset.go === tab));
  $$('.screen').forEach((s) => s.classList.toggle('on', s.dataset.s === tab));
  closeDetail();
  render(tab, false);
}

/* ---------- voltar do Android ---------- */
const layers = [];
let ignorePop = 0, exitArmed = 0;
function pushLayer(close) { layers.push(close); history.pushState({ orbe: layers.length }, ''); }
function popLayer() { if (!layers.length) return; layers.pop(); ignorePop++; history.back(); }
window.addEventListener('popstate', () => {
  if (ignorePop) { ignorePop--; return; }
  if (layers.length) { const close = layers.pop(); close(); return; }
  if (UI.tab !== 'home') { go('home'); history.pushState({ orbe: 0 }, ''); return; }
  if (Date.now() - exitArmed > 2500) { exitArmed = Date.now(); toast('Toque em voltar de novo para sair'); history.pushState({ orbe: 0 }, ''); return; }
  history.back();
});
history.replaceState({ orbe: 'base' }, ''); history.pushState({ orbe: 0 }, '');

/* ---------- janelas ---------- */
function openSheet(name, html) {
  const sh = $(`[data-sh="${name}"]`); sh.innerHTML = html;
  requestAnimationFrame(() => sh.classList.add('open'));
  pushLayer(() => sh.classList.remove('open'));
}
function closeSheet(name) { const sh = $(`[data-sh="${name}"]`); if (!sh.classList.contains('open')) return; sh.classList.remove('open'); popLayer(); }
function openPop(html) {
  const p = $('.pop'); p.innerHTML = `<div class="pbd"></div><div class="pc">${html}</div>`;
  requestAnimationFrame(() => p.classList.add('open'));
  pushLayer(() => p.classList.remove('open'));
}
function closePop() { const p = $('.pop'); if (!p.classList.contains('open')) return; p.classList.remove('open'); popLayer(); }
function openDetail(k, s) { UI.det = [k, s]; UI.dtab = 'tudo'; renderDet(false); $('.detail').classList.add('open'); pushLayer(() => { $('.detail').classList.remove('open'); UI.det = null; }); }
function closeDetail() { if (!$('.detail').classList.contains('open')) return; $('.detail').classList.remove('open'); UI.det = null; popLayer(); }

let confirmCb = null;
function askConfirm(msg, okLabel, cb) { confirmCb = cb; openPop(`<div class="calh"><b>${esc(msg)}</b></div><p class="msg">Isso não pode ser desfeito.</p><div class="pact"><button data-pclose>Cancelar</button><button class="pri" data-confirm>${esc(okLabel)}</button></div>`); }

/* ---------- formulário de tarefa ---------- */
function newForm(over = {}) {
  const a = over.a || (DB.areas[0] && DB.areas[0].k) || '';
  const ar = area(a);
  return Object.assign({ id: null, t: '', a, s: ar && ar.subs[0] ? ar.subs[0] : '', q: 2, date: today(), time: null }, over);
}
function taskSheet() {
  const F = UI.form, A = area(F.a);
  return `<div class="bd"></div><div class="pn"><span class="grab"></span><h4>${F.id ? 'Editar tarefa' : 'Nova tarefa'}<button class="rbtn" data-closetask aria-label="Fechar">${ic('close', 18)}</button></h4>
  <input class="ttl" id="ttl" placeholder="O que precisa ser feito?" value="${esc(F.t)}" autocomplete="off" enterkeyhint="done">
  <div class="dts"><button class="dt${F.date ? ' set' : ''}" data-pick="date">${ic('calendar_month', 18)}<span>${F.date ? fmtDate(F.date, true) : 'Data'}</span></button><button class="dt${F.time ? ' set' : ''}" data-pick="time">${ic('schedule', 18)}<span>${F.time || 'Hora'}</span>${F.time ? `<span class="x" data-clrtime>${ic('close', 16)}</span>` : ''}</button></div>
  <div class="lbl">Área</div><div class="chips">${DB.areas.map((v) => `<button class="chip${v.k === F.a ? ' on' : ''}" data-farea="${v.k}">${ic(v.i, 16)}${esc(v.n)}</button>`).join('')}</div>
  ${A && A.subs.length ? `<div class="chips">${A.subs.map((s) => `<button class="chip sub${s === F.s ? ' on' : ''}" data-fsub="${esc(s)}">${esc(s)}</button>`).join('')}</div>` : ''}
  <div class="lbl">Prioridade</div>
  <div class="mx"><span></span><span class="ax">Urgente</span><span class="ax">Não urgente</span><span class="ay">Importante</span>${[1, 2].map(qcell).join('')}<span class="ay">Não importante</span>${[3, 4].map(qcell).join('')}</div>
  <div class="save-row">${F.id ? `<button class="del" data-deltask>${ic('delete', 18)}</button>` : ''}<button class="save" data-savetask>Salvar</button></div></div>`;
}
const qcell = (q) => `<button class="qc q${q}${UI.form.q === q ? ' on' : ''}" data-q="${q}"><b>${Q[q].k}</b><small>${Q[q].d}</small></button>`;
function readTitle() { const i = $('#ttl'); if (i && UI.form) UI.form.t = i.value; }
function rerenderTask() { readTitle(); $('[data-sh="task"]').innerHTML = taskSheet(); }
function openTask(form) { UI.form = form; openSheet('task', taskSheet()); }
function setDate(t, newDate) {
  if (t.date === newDate) return;
  if (t.date && !t.done) { t.hist = t.hist || []; t.hist.push({ from: t.date, to: newDate, at: new Date().toISOString() }); }
  if (!t.orig && t.date) t.orig = t.date;
  t.date = newDate;
}
function saveTask() {
  readTitle();
  const F = UI.form, title = F.t.trim();
  if (!title) { toast('Escreva o que precisa ser feito.'); $('#ttl').focus(); return; }
  if (F.id) {
    const t = DB.tasks.find((x) => x.id === F.id); if (!t) return;
    setDate(t, F.date); Object.assign(t, { t: title, a: F.a, s: F.s, q: F.q, time: F.time });
    toast('Tarefa atualizada.');
  } else {
    DB.tasks.push({ id: uid(), t: title, a: F.a, s: F.s, q: F.q, date: F.date, time: F.time, done: false, doneAt: null, created: new Date().toISOString(), hist: [] });
    toast('Tarefa criada.');
  }
  save(); closeSheet('task'); renderAll();
}

/* calendário */
function calPop() {
  const y = UI.cm.getFullYear(), m = UI.cm.getMonth(), first = (new Date(y, m, 1).getDay() + 6) % 7, n = new Date(y, m + 1, 0).getDate(), t0 = today();
  let cells = ''; for (let i = 0; i < first; i++) cells += '<span></span>';
  for (let d = 1; d <= n; d++) { const s = ymd(new Date(y, m, d)); cells += `<button class="cd${s === t0 ? ' today' : ''}${s === UI.form.date ? ' sel' : ''}${s < t0 ? ' past' : ''}" data-cd="${s}">${d}</button>`; }
  let k = 1; while (parse(addDays(t0, k)).getDay() !== 1) k++;
  return `<div class="calh"><button data-cm="-1" aria-label="Mês anterior">${ic('chevron_left', 20)}</button><b>${MOF[m]} <span class="muted">${y}</span></b><button data-cm="1" aria-label="Próximo mês">${ic('chevron_right', 20)}</button></div>
  <div class="cal">${['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((x) => `<span class="wd">${x}</span>`).join('')}${cells}</div>
  <div class="quick"><button data-quick="0">Hoje</button><button data-quick="1">Amanhã</button><button data-quick="${k}">Próx. segunda</button></div>
  <div class="pact"><button data-nodate>Sem data</button><button class="pri" data-pclose>Fechar</button></div>`;
}
/* hora em colunas que rolam */
const HRS = [...Array(24).keys()], MINS = [0, 10, 20, 30, 40, 50], IH = 40;
function timePop() {
  const col = (arr) => `<div class="wheel"><span class="pad"></span>${arr.map((v, i) => `<div data-wi="${i}">${pad(v)}</div>`).join('')}<span class="pad"></span></div>`;
  return `<div class="calh"><b>Hora</b><span class="muted" style="font-size:12px">arraste para escolher</span></div>
  <div class="wlab"><span>Hora</span><span></span><span>Minutos</span></div>
  <div class="wheels">${col(HRS)}<span class="wsep">:</span>${col(MINS)}</div>
  <div class="pact"><button data-notime>Sem hora</button><button class="pri" data-tset>Definir</button></div>`;
}
const wIdx = (w) => Math.max(0, Math.min($$('[data-wi]', w).length - 1, Math.round(w.scrollTop / IH)));
function initWheels() {
  let [h, mi] = (UI.form.time || '09:00').split(':').map(Number);
  $$('.pop .wheel').forEach((w, k) => {
    const mark = () => { const i = wIdx(w); $$('[data-wi]', w).forEach((e) => e.classList.toggle('on', +e.dataset.wi === i)); };
    w.scrollTop = (k === 0 ? h : MINS.indexOf(mi - (mi % 10))) * IH; mark();
    w.addEventListener('scroll', mark, { passive: true });
    let sy = null, st = 0, moved = false;
    w.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') return; sy = e.clientY; st = w.scrollTop; moved = false; w.style.scrollSnapType = 'none'; w.classList.add('drag'); w.setPointerCapture(e.pointerId); });
    w.addEventListener('pointermove', (e) => { if (sy === null) return; const dy = e.clientY - sy; if (Math.abs(dy) > 3) moved = true; w.scrollTop = st - dy; });
    const up = () => { if (sy === null) return; sy = null; w.style.scrollSnapType = ''; w.classList.remove('drag'); w.scrollTo({ top: wIdx(w) * IH, behavior: 'smooth' }); if (moved) w.addEventListener('click', (ev) => ev.stopPropagation(), { capture: true, once: true }); };
    w.addEventListener('pointerup', up); w.addEventListener('pointercancel', up);
  });
}

/* área: criar / editar */
function areaSheet() {
  const F = UI.areaForm;
  return `<div class="bd"></div><div class="pn"><span class="grab"></span><h4>${F.k ? 'Editar área' : 'Nova área'}<button class="rbtn" data-closearea aria-label="Fechar">${ic('close', 18)}</button></h4>
  <input class="ttl" id="aname" placeholder="Nome da área" value="${esc(F.n)}" autocomplete="off">
  <div class="lbl">Ícone</div><div class="icgrid">${ICONS.map((n) => `<button data-fai="${n}" class="${F.i === n ? 'on' : ''}" aria-label="${n}">${ic(n, 22)}</button>`).join('')}</div>
  <div class="lbl">Cor no gráfico</div><div class="clrs">${COLORS.map((c) => `<button data-fac="${c}" class="${F.c === c ? 'on' : ''}" style="--c:${c}" aria-label="Cor ${c}"></button>`).join('')}</div>
  <div class="save-row">${F.k ? `<button class="del" data-delarea>${ic('delete', 18)}</button>` : ''}<button class="save" data-savearea>${F.k ? 'Salvar' : 'Criar área'}</button></div></div>`;
}
function settingsSheet() {
  return `<div class="bd"></div><div class="pn"><span class="grab"></span><h4>Configurações<button class="rbtn" data-closeset aria-label="Fechar">${ic('close', 18)}</button></h4>
  <div class="lbl">Teu nome na saudação</div><input class="ttl" id="uname" value="${esc(DB.name)}" placeholder="Teu nome" autocomplete="off">
  <div class="set-row"><span>Tarefas guardadas</span><small>${DB.tasks.length}</small></div>
  <div class="set-row"><span>Os dados ficam</span><small>só neste aparelho</small></div>
  <div class="set-row"><span>Versão</span><small>v${self.APP_VERSION}</small></div>
  <div class="save-row"><button class="save" data-saveset>Salvar</button></div></div>`;
}

/* ---------- cliques ---------- */
APP.addEventListener('click', (e) => {
  const c = (s) => e.target.closest(s); let x;
  // janelinhas
  if ((x = c('[data-cm]'))) { UI.cm = new Date(UI.cm.getFullYear(), UI.cm.getMonth() + +x.dataset.cm, 1); $('.pop .pc').innerHTML = calPop(); return; }
  if ((x = c('[data-cd]'))) { UI.form.date = x.dataset.cd; closePop(); rerenderTask(); return; }
  if ((x = c('[data-quick]'))) { UI.form.date = addDays(today(), +x.dataset.quick); closePop(); rerenderTask(); return; }
  if (c('[data-nodate]')) { UI.form.date = null; closePop(); rerenderTask(); return; }
  if (c('[data-notime]')) { UI.form.time = null; closePop(); rerenderTask(); return; }
  if (c('[data-tset]')) { const w = $$('.pop .wheel'); UI.form.time = pad(HRS[wIdx(w[0])]) + ':' + pad(MINS[wIdx(w[1])]); closePop(); rerenderTask(); return; }
  if ((x = c('.wheel [data-wi]'))) { x.parentNode.scrollTo({ top: +x.dataset.wi * IH, behavior: 'smooth' }); return; }
  if (c('[data-confirm]')) { const cb = confirmCb; confirmCb = null; closePop(); if (cb) setTimeout(cb, 50); return; }
  if (c('.pbd') || c('[data-pclose]')) { closePop(); return; }
  // formulário de tarefa
  if (c('[data-clrtime]')) { UI.form.time = null; rerenderTask(); return; }
  if ((x = c('[data-pick]'))) { readTitle(); if (x.dataset.pick === 'date') { const b = parse(UI.form.date || today()); UI.cm = new Date(b.getFullYear(), b.getMonth(), 1); openPop(calPop()); } else { openPop(timePop()); initWheels(); } return; }
  if ((x = c('[data-farea]'))) { readTitle(); UI.form.a = x.dataset.farea; const A = area(UI.form.a); UI.form.s = A.subs[0] || ''; rerenderTask(); return; }
  if ((x = c('[data-fsub]'))) { UI.form.s = x.dataset.fsub; $$('[data-fsub]').forEach((y) => y.classList.toggle('on', y === x)); return; }
  if ((x = c('.qc'))) { UI.form.q = +x.dataset.q; $$('.qc').forEach((y) => y.classList.toggle('on', y === x)); return; }
  if (c('[data-savetask]')) { saveTask(); return; }
  if (c('[data-deltask]')) { const id = UI.form.id; askConfirm('Excluir esta tarefa?', 'Excluir', () => { DB.tasks = DB.tasks.filter((t) => t.id !== id); save(); closeSheet('task'); renderAll(); toast('Tarefa excluída.'); }); return; }
  if (c('[data-closetask]')) { closeSheet('task'); return; }
  if (c('[data-sh="area"] .bd') || c('[data-closearea]')) { closeSheet('area'); return; }
  if (c('[data-sh="set"] .bd') || c('[data-closeset]')) { closeSheet('set'); return; }
  // área
  if ((x = c('[data-fai]'))) { UI.areaForm.i = x.dataset.fai; $$('[data-fai]').forEach((y) => y.classList.toggle('on', y === x)); return; }
  if ((x = c('[data-fac]'))) { UI.areaForm.c = x.dataset.fac; $$('[data-fac]').forEach((y) => y.classList.toggle('on', y === x)); return; }
  if (c('[data-savearea]')) {
    const F = UI.areaForm, n = $('#aname').value.trim(); if (!n) { toast('Dê um nome para a área.'); return; }
    if (F.k) Object.assign(area(F.k), { n, i: F.i, c: F.c }); else { const k = 'a' + uid(); DB.areas.push({ k, n, i: F.i, c: F.c, subs: [] }); UI.open.add(k); }
    save(); closeSheet('area'); render('areas'); toast(F.k ? 'Área atualizada.' : 'Área criada.'); return;
  }
  if (c('[data-delarea]')) {
    const k = UI.areaForm.k, used = DB.tasks.filter((t) => t.a === k).length;
    askConfirm(`Excluir a área ${area(k).n}?`, 'Excluir', () => { DB.areas = DB.areas.filter((a) => a.k !== k); DB.tasks = DB.tasks.filter((t) => t.a !== k); DB.notes = DB.notes.filter((n) => n.a !== k); save(); closeSheet('area'); renderAll(); toast(used ? `Área e ${pl(used, 'tarefa excluída', 'tarefas excluídas')}.` : 'Área excluída.'); });
    return;
  }
  if (c('[data-saveset]')) { DB.name = $('#uname').value.trim(); save(); closeSheet('set'); render('home'); return; }
  // navegação
  if ((x = c('[data-go]'))) { go(x.dataset.go); return; }
  if (c('.fab') || c('[data-new]')) {
    const over = {};
    if (UI.det) { over.a = UI.det[0]; over.s = UI.det[1]; }
    else if (UI.tab === 'agenda') over.date = UI.sel;
    openTask(newForm(over)); return;
  }
  if (c('[data-settings]')) { openSheet('set', settingsSheet()); return; }
  // tarefas
  if ((x = c('.ck'))) {
    const r = x.closest('[data-id]'), t = DB.tasks.find((y) => y.id === r.dataset.id); if (!t) return;
    t.done = !t.done; t.doneAt = t.done ? new Date().toISOString() : null; save();
    $$(`.task[data-id="${t.id}"]`).forEach((y) => y.classList.toggle('done', t.done));
    if (t.done && navigator.vibrate) navigator.vibrate(12);
    setTimeout(renderAll, 480); return;
  }
  if ((x = c('.task[data-id], .next[data-id], .sp p[data-id]'))) {
    const t = DB.tasks.find((y) => y.id === x.dataset.id); if (!t) return;
    openTask({ id: t.id, t: t.t, a: t.a, s: t.s, q: t.q, date: t.date, time: t.time }); return;
  }
  if ((x = c('[data-qf]'))) { const q = +x.dataset.qf; UI.qf = UI.qf === q ? 0 : q; render('home'); return; }
  // agenda
  if ((x = c('[data-view]'))) { UI.view = x.dataset.view; render('agenda'); return; }
  if ((x = c('[data-agnav]'))) { const k = +x.dataset.agnav; if (UI.view === 'semana') UI.sel = addDays(UI.sel, 7 * k); else { const d = parse(UI.sel); UI.sel = ymd(new Date(d.getFullYear(), d.getMonth() + k, 1)); } render('agenda'); return; }
  if (c('[data-gotoday]')) { UI.sel = today(); render('agenda'); return; }
  if ((x = c('[data-d]'))) { UI.sel = x.dataset.d; render('agenda'); return; }
  if ((x = c('.sp[data-day]'))) { UI.sel = x.dataset.day; render('agenda'); return; }
  if ((x = c('[data-sview]'))) { UI.sview = x.dataset.sview; render('stats'); return; }
  // vida
  if ((x = c('[data-acc]>button'))) { const k = x.parentNode.dataset.acc; UI.open.has(k) ? UI.open.delete(k) : UI.open.add(k); x.parentNode.classList.toggle('open'); return; }
  if ((x = c('[data-det]'))) { openDetail(x.dataset.det, x.dataset.sub); return; }
  if (c('[data-back]')) { closeDetail(); return; }
  if ((x = c('[data-dtab]'))) { UI.dtab = x.dataset.dtab; renderDet(); return; }
  if (c('[data-addnote]')) { addNote(); return; }
  if ((x = c('[data-delnote]'))) { const id = x.dataset.delnote; askConfirm('Apagar esta anotação?', 'Apagar', () => { DB.notes = DB.notes.filter((n) => n.id !== id); save(); renderDet(); render('areas'); }); return; }
  if (c('[data-newtask]')) { openTask(newForm({ a: UI.det[0], s: UI.det[1] })); return; }
  if (c('[data-delpart]')) {
    const [k, s] = UI.det, used = DB.tasks.filter((t) => t.a === k && t.s === s).length;
    askConfirm(`Excluir a parte ${s}?`, 'Excluir', () => { const a = area(k); a.subs = a.subs.filter((y) => y !== s); DB.tasks.forEach((t) => { if (t.a === k && t.s === s) t.s = ''; }); DB.notes = DB.notes.filter((n) => !(n.a === k && n.s === s)); save(); closeDetail(); renderAll(); toast(used ? 'Parte excluída. As tarefas continuam na área.' : 'Parte excluída.'); });
    return;
  }
  if ((x = c('[data-addp]'))) { UI.adding = x.dataset.addp; render('areas'); const i = $('#newpart'); if (i) i.focus(); return; }
  if ((x = c('[data-okp]'))) { addPart(x.dataset.okp); return; }
  if (c('[data-newarea]')) { UI.areaForm = { k: null, n: '', i: 'fitness_center', c: COLORS[(DB.areas.length + 3) % COLORS.length] }; openSheet('area', areaSheet()); return; }
  if ((x = c('[data-editarea]'))) { const a = area(x.dataset.editarea); UI.areaForm = { k: a.k, n: a.n, i: a.i, c: a.c }; openSheet('area', areaSheet()); return; }
});
function addPart(k) {
  const i = $('#newpart'), v = i && i.value.trim(); const a = area(k);
  if (!v) { UI.adding = null; render('areas'); return; }
  if (a.subs.includes(v)) { toast('Essa parte já existe.'); return; }
  a.subs.push(v); UI.adding = null; save(); render('areas'); toast('Parte criada.');
}
function addNote() {
  const i = $('#newnote'), v = i && i.value.trim(); if (!v) return;
  DB.notes.push({ id: uid(), a: UI.det[0], s: UI.det[1], t: v, at: new Date().toISOString() });
  save(); UI.dtab = UI.dtab === 'tarefas' ? 'tudo' : UI.dtab; renderDet(); render('areas'); toast('Anotação salva.');
}
document.addEventListener('keydown', (e) => {
  const typing = /INPUT|TEXTAREA/.test((document.activeElement || {}).tagName || '');
  if (e.key === 'Escape' && layers.length) { e.preventDefault(); history.back(); return; }
  if (!typing && !layers.length && (e.key === 'n' || e.key === 'N') && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); $('.fab').click(); }
});
APP.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  if (e.target.id === 'newpart') { e.preventDefault(); addPart(UI.adding); }
  if (e.target.id === 'ttl') { e.preventDefault(); e.target.blur(); }
  if (e.target.id === 'newnote' && !e.shiftKey && matchMedia('(pointer:fine)').matches) { e.preventDefault(); addNote(); }
});
APP.addEventListener('input', (e) => { if (e.target.id === 'newnote') { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; } });

/* dica no gráfico */
APP.addEventListener('pointermove', (e) => {
  const r = e.target.closest('[data-tip]');
  $$('.tip').forEach((tp) => { if (!r || !tp.parentNode.contains(r)) { tp.style.opacity = 0; return; } tp.textContent = r.dataset.tip; tp.style.left = r.dataset.x + '%'; tp.style.top = r.dataset.y + '%'; tp.style.opacity = 1; });
});

/* arrastar tarefa para outro dia (computador) */
let dragId = null;
APP.addEventListener('dragstart', (e) => { const p = e.target.closest && e.target.closest('.sp p[data-id]'); if (!p) return; dragId = p.dataset.id; p.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', dragId); } catch (_) {} });
APP.addEventListener('dragend', () => { dragId = null; $$('.dragging, .over, .drop').forEach((x) => x.classList.remove('dragging', 'over', 'drop')); });
APP.addEventListener('dragover', (e) => { if (!dragId) return; const z = e.target.closest('[data-drop]'); if (!z) return; e.preventDefault(); $$('.over, .drop').forEach((x) => x !== z && x.classList.remove('over', 'drop')); z.classList.add(z.classList.contains('sp') ? 'over' : 'drop'); });
APP.addEventListener('drop', (e) => {
  const z = e.target.closest('[data-drop]'); if (!z || !dragId) return; e.preventDefault();
  const t = DB.tasks.find((x) => x.id === dragId); if (!t) return;
  const to = z.dataset.drop; if (t.date !== to) { setDate(t, to); save(); toast(`Movida para ${fmtDate(to, true).toLowerCase()}.`); }
  dragId = null; renderAll();
});

/* atualiza ao voltar para o app (virada do dia, contagem "em 1h20") */
document.addEventListener('visibilitychange', () => { if (!document.hidden) renderAll(); });
setInterval(() => { if (!document.hidden && UI.tab === 'home') render('home'); }, 60000);

renderAll();
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
