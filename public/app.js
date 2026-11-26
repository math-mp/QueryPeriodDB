const API_BASE = '';

const DIAS = {
  2: 'Segunda',
  3: 'Terça',
  4: 'Quarta',
  5: 'Quinta',
  6: 'Sexta'
};

const DIAS_ORDER = [2, 3, 4, 5, 6];

const A_DEFINIR = 'A definir';

const FILTROS_KEYS = ['ano', 'turno', 'grupo', 'professor', 'disciplina', 'dia'];

const state = {
  theme: 'light',
  currentTab: 'schedule',
  data: {
    professores: [],
    disciplinas: [],
    turmas: [],
    horarios: [],
    grade: [],
    excecoes: []
  },
  filters: {
    ano: '',
    turno: '',
    grupo: '',
    professor: '',
    disciplina: '',
    dia: '',
    agrupar: 'turma'
  },
  advancedSearch: {
    query: '',
    activeCategory: 'todas',
    index: []
  },
  gradeData: {
    linhasAtuais: [],
    filtrosAtuais: {}
  },
  editMode: {
    editando: null,
    modoGrade: 'definir'
  },
  ui: {
    sidebarOpen: false
  }
};

const $ = (selector, context = document) => context.querySelector(selector);
const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));

const esc = (str) => String(str ?? '').replace(/[&<>"']/g, (c) => {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return map[c];
});

const nomeTurno = (t) => t === 'Manha' ? 'Manhã' : t;
const hhmm = (t) => String(t || '').slice(0, 5);
const aulaRotulo = (n) => n === 9 ? 'Contraturno' : `${n}ª aula`;

const norm = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[ºª°]/g, '').toLowerCase();
const palavras = (s) => norm(s).split(/[^a-z0-9]+/).filter(Boolean);

async function api(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.erro || `Erro ${response.status}`);
    }

    return data;
  } catch (e) {
    clearTimeout(timeoutId);
    if (e.name === 'AbortError') {
      throw new Error('Tempo de conexão esgotado. Verifique se o servidor está rodando.');
    }
    throw e;
  }
}

function showToast(title, message, type = 'info') {
  const container = $('#toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-icon">
      ${getToastIcon(type)}
    </div>
    <div class="toast-content">
      <div class="toast-title">${esc(title)}</div>
      <div class="toast-message">${esc(message)}</div>
    </div>
    <button class="toast-close" aria-label="Fechar">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  `;

  toast.querySelector('.toast-close').addEventListener('click', () => hideToast(toast));
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('show'));

  setTimeout(() => hideToast(toast), 5000);
}

function getToastIcon(type) {
  const icons = {
    success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
    warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
    info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`
  };
  return icons[type] || icons.info;
}

function hideToast(toast) {
  toast.classList.remove('show');
  toast.classList.add('hide');
  setTimeout(() => toast.remove(), 300);
}

function showModal(modalId) {
  const modal = $(`#${modalId}`);
  if (modal) {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    const focusable = modal.querySelector('input, select, button, [tabindex]:not([tabindex="-1"])');
    if (focusable) focusable.focus();
  }
}

function hideModal(modalId) {
  const modal = $(`#${modalId}`);
  if (modal) {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }
}

function setTheme(theme) {
  state.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  updateThemeToggle();
}

function toggleTheme() {
  setTheme(state.theme === 'light' ? 'dark' : 'light');
}

function updateThemeToggle() {
  const toggle = $('#theme-toggle');
  if (toggle) {
    toggle.setAttribute('aria-label', state.theme === 'light' ? 'Alternar para tema escuro' : 'Alternar para tema claro');
  }
}

function toggleSidebar() {
  state.ui.sidebarOpen = !state.ui.sidebarOpen;
  const sidebar = $('.sidebar');
  const overlay = $('.sidebar-overlay');
  if (sidebar) sidebar.classList.toggle('open', state.ui.sidebarOpen);
  if (overlay) overlay.classList.toggle('visible', state.ui.sidebarOpen);
  document.body.style.overflow = state.ui.sidebarOpen ? 'hidden' : '';
}

function closeSidebar() {
  if (state.ui.sidebarOpen) {
    state.ui.sidebarOpen = false;
    const sidebar = $('.sidebar');
    const overlay = $('.sidebar-overlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('visible');
    document.body.style.overflow = '';
  }
}

function switchTab(tabName) {
  state.currentTab = tabName;

  $$('.nav-tab').forEach(btn => {
    const isActive = btn.dataset.tab === tabName;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive);
  });

  $$('.tab-panel').forEach(panel => {
    const isActive = panel.id === tabName;
    panel.classList.toggle('active', isActive);
    panel.setAttribute('aria-hidden', !isActive);
    if (isActive) {
      panel.hidden = false;
    } else {
      panel.hidden = true;
    }
  });

  closeSidebar();

  if (tabName === 'search') {
    $('#search-input')?.focus();
  }
}

function opcoes(selectEl, itens, rotuloTodos) {
  const atual = selectEl.value;
  selectEl.innerHTML = `<option value="">${esc(rotuloTodos)}</option>` +
    itens.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join('');
  if ([...selectEl.options].some(o => o.value === atual)) selectEl.value = atual;
}

function repovoar(selectEl, itens, rotulo) {
  const atual = selectEl.value;
  opcoes(selectEl, itens, rotulo);
  if ([...selectEl.options].some(o => o.value === atual)) selectEl.value = atual;
}

const unicos = (arr) => [...new Set(arr)];

async function carregarDadosIniciais() {
  try {
    showLoading(true);
    const [professores, disciplinas, turmas, horarios, grade, excecoes] = await Promise.all([
      api('/professores'),
      api('/disciplinas'),
      api('/turmas'),
      api('/horarios'),
      api('/grade?expandir=0'),
      api('/grade/excecoes').catch(() => [])
    ]);

    Object.assign(state.data, { professores, disciplinas, turmas, horarios, grade, excecoes });

    preencherFiltros();
    preencherAdicoes();
    montarIndiceBusca();
    await consultarGrade();
    buscarAvancada();
    atualizarResumo();
  } catch (e) {
    showToast('Erro ao carregar', 'Não foi possível carregar os dados. Verifique se o servidor está rodando.', 'error');
    console.error(e);
  } finally {
    showLoading(false);
  }
}

function showLoading(show) {
  const loader = $('#global-loader');
  if (loader) {
    if (show) {
      loader.hidden = false;
      loader.style.display = 'flex';
    } else {
      loader.hidden = true;
      loader.style.display = 'none';
    }
  }
}

function preencherFiltros() {
  const { turmas, professores, disciplinas, horarios } = state.data;

  opcoes($('#f-ano'), unicos(turmas.map(t => t.ano)).sort().map(a => [a, `${a}º ano`]), 'Todos');
  opcoes($('#f-turno'), unicos(turmas.map(t => t.turno)).map(t => [t, nomeTurno(t)]), 'Todos');
  opcoes($('#f-grupo'), unicos(turmas.map(t => t.grupo)).sort().map(g => [g, `Grupo ${g}`]), 'Todos');
  opcoes($('#f-professor'), professores.map(p => [p.id, p.nome]), 'Todos');
  opcoes($('#f-disciplina'), disciplinas.map(d => [d.id, d.nome]), 'Todas');
  opcoes($('#f-dia'), unicos(horarios.map(h => h.dia_semana)).sort().map(d => [d, DIAS[d]]), 'Todos');
}

async function consultarGrade() {
  const v = Object.fromEntries(FILTROS_KEYS.map(f => [f, $(`#f-${f}`).value]));

  const qs = new URLSearchParams();
  if (v.ano) qs.set('ano', v.ano);
  if (v.turno) qs.set('turno', v.turno);
  if (v.grupo) qs.set('grupo', v.grupo);
  if (v.professor) qs.set('professor_id', v.professor);
  if (v.disciplina) qs.set('disciplina_id', v.disciplina);

  try {
    let linhas = await api('/grade' + (qs.toString() ? '?' + qs : ''));

    if (linhas.length && !('classe_inteira' in linhas[0])) {
      showToast('Versão antiga do servidor', 'O servidor precisa ser reiniciado para mostrar aulas herdadas corretamente.', 'warning');
    }

    if (v.dia) {
      linhas = linhas.filter(l => String(l.dia_semana) === v.dia);
    }

    state.gradeData.linhasAtuais = linhas;
    state.gradeData.filtrosAtuais = v;
    renderGrade();
  } catch (e) {
    showToast('Erro', 'Erro ao consultar a grade: ' + e.message, 'error');
  }
}

function renderGrade() {
  const { linhasAtuais, filtrosAtuais } = state.gradeData;
  const modo = $('#f-agrupar').value;
  const container = $('#grade-resultado');

  if (!linhasAtuais.length) {
    $('#grade-count').textContent = '0 aulas encontradas';
    container.innerHTML = `
      <div class="empty-state">
        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
        <div class="empty-state-title">Nenhuma aula encontrada</div>
        <div class="empty-state-description">Tente ajustar os filtros ou adicione novas aulas à grade.</div>
      </div>
    `;
    return;
  }

  if (filtrosAtuais.ano && filtrosAtuais.turno && filtrosAtuais.grupo && modo === 'turma') {
    $('#grade-count').textContent = `${linhasAtuais.length} aula(s) encontrada(s)`;
    container.innerHTML = renderGridSemanal(linhasAtuais, filtrosAtuais.turno, filtrosAtuais.dia);
    return;
  }

  const grupos = agrupar(linhasAtuais, modo);
  $('#grade-count').textContent = `${linhasAtuais.length} aula(s) em ${grupos.length} grupo(s)`;
  container.innerHTML = `<div class="accordion">${grupos.map(g => renderCard(g, modo)).join('')}</div>`;
}

const CHAVE = {
  turma: (l) => `${l.ano}|${l.turno}|${l.grupo}`,
  dia: (l) => l.dia_semana,
  professor: (l) => l.professor_id,
  disciplina: (l) => l.disciplina_id,
};

const TITULO = {
  turma: (l) => `${l.ano}º ano · ${nomeTurno(l.turno)} · Grupo ${l.grupo}`,
  dia: (l) => l.dia,
  professor: (l) => l.professor,
  disciplina: (l) => l.disciplina,
};

function agrupar(linhas, modo) {
  const mapa = new Map();
  linhas.forEach(l => {
    const k = CHAVE[modo](l);
    if (!mapa.has(k)) mapa.set(k, { chave: k, titulo: TITULO[modo](l), linhas: [] });
    mapa.get(k).linhas.push(l);
  });
  const grupos = [...mapa.values()];
  if (modo === 'dia') grupos.sort((a, b) => a.chave - b.chave);
  else if (modo !== 'turma') grupos.sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'));
  grupos.forEach(g => g.linhas.sort((a, b) =>
    a.dia_semana - b.dia_semana || a.numero_aula - b.numero_aula ||
    a.ano - b.ano || a.turno.localeCompare(b.turno) || a.grupo.localeCompare(b.grupo)));
  return grupos;
}

const COLUNAS = [
  { id: 'turma', nome: 'Turma', cel: (l) => `${esc(l.ano)}º ano · Grupo ${esc(l.grupo)}<small>${esc(nomeTurno(l.turno))}</small>` },
  { id: 'dia', nome: 'Dia', cel: (l) => esc(l.dia) },
  { id: 'aula', nome: 'Aula', cel: (l) => `${esc(l.numero_aula)}ª aula<small>${esc(hhmm(l.hora_inicio))}–${esc(hhmm(l.hora_fim))}</small>` },
  { id: 'disciplina', nome: 'Disciplina', cel: (l) => `${esc(l.disciplina)}${l.classe_inteira ? '<small> · Classe inteira (com grupo A)</small>' : ''}` },
  { id: 'professor', nome: 'Professor', cel: (l) => esc(l.professor) },
];

function renderCard(g, modo) {
  const cols = COLUNAS.filter(c => c.id !== modo);
  const cab = cols.map(c => `<th>${c.nome}</th>`).join('');
  const corpo = g.linhas.map(l => `<tr>${cols.map(c => `<td>${c.cel(l)}</td>`).join('')}</tr>`).join('');

  return `
    <details class="accordion-item">
      <summary class="accordion-header">
        <div class="accordion-title">
          <span class="accordion-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </span>
          <span>${esc(g.titulo)}</span>
          <span class="accordion-count">${g.linhas.length} aula(s)</span>
        </div>
      </summary>
      <div class="accordion-content">
        <div class="table-wrapper">
          <table class="table">
            <thead><tr>${cab}</tr></thead>
            <tbody>${corpo}</tbody>
          </table>
        </div>
      </div>
    </details>
  `;
}

function renderGridSemanal(linhas, turno, diaFiltro) {
  const dias = diaFiltro ? [Number(diaFiltro)] : DIAS_ORDER;
  const horas = {};
  linhas.forEach(l => {
    horas[l.numero_aula] = horas[l.numero_aula] || `${hhmm(l.hora_inicio)}–${hhmm(l.hora_fim)}`;
  });
  const aulas = Object.keys(horas).map(Number).sort((a, b) => a - b);
  const mapa = {};
  linhas.forEach(l => (mapa[`${l.dia_semana}-${l.numero_aula}`] = l));

  const header = `<tr><th></th>${dias.map(d => `<th class="schedule-day-header"><span class="day-name">${DIAS[d]}</span><span class="day-number">${d}</span></th>`).join('')}</tr>`;

  const corpo = aulas.map(n => `
    <tr>
      <td>${n}ª aula<small>${esc(horas[n])}</small></td>
      ${dias.map(d => {
        const l = mapa[`${d}-${n}`];
        if (!l) return '<td class="schedule-cell"><span class="schedule-empty">—</span></td>';
        const whole = l.classe_inteira ? ' class-whole' : '';
        return `<td class="schedule-cell">
          <div class="schedule-lesson${whole}" data-id="${l.id}" tabindex="0" role="button" aria-label="${esc(l.disciplina)} com ${esc(l.professor)}">
            <div class="schedule-lesson subject">${esc(l.disciplina)}</div>
            <div class="schedule-lesson teacher">${esc(l.professor)}</div>
          </div>
        </td>`;
      }).join('')}
    </tr>
  `).join('');

  return `
    <div class="schedule-grid">
      <table class="schedule-table">
        <thead>${header}</thead>
        <tbody>${corpo}</tbody>
      </table>
    </div>
  `;
}

function montarIndiceBusca() {
  const { professores, disciplinas, turmas, horarios, grade } = state.data;

  const aulasProf = {}, aulasDisc = {};
  grade.forEach(g => {
    aulasProf[g.professor_id] = (aulasProf[g.professor_id] || 0) + 1;
    aulasDisc[g.disciplina_id] = (aulasDisc[g.disciplina_id] || 0) + 1;
  });

  state.advancedSearch.index = [];

  professores.forEach(p => state.advancedSearch.index.push({
    cat: 'professores', titulo: p.nome, sub: `${aulasProf[p.id] || 0} aula(s) na grade`, texto: p.nome
  }));

  disciplinas.forEach(d => state.advancedSearch.index.push({
    cat: 'disciplinas', titulo: d.nome, sub: `${aulasDisc[d.id] || 0} aula(s) na grade`, texto: d.nome
  }));

  turmas.forEach(t => state.advancedSearch.index.push({
    cat: 'turmas', titulo: `${t.ano}º ano ${t.grupo}`, sub: nomeTurno(t.turno), texto: `turma ${t.ano} ano ${t.grupo} ${t.turno}`
  }));

  horarios.forEach(h => state.advancedSearch.index.push({
    cat: 'horarios', titulo: `${DIAS[h.dia_semana]} · ${h.numero_aula}ª aula`, sub: `${nomeTurno(h.turno)} · ${hhmm(h.hora_inicio)}–${hhmm(h.hora_fim)}`, texto: `${DIAS[h.dia_semana]} ${h.numero_aula} aula ${h.turno} ${hhmm(h.hora_inicio)}`
  }));

  grade.forEach(g => state.advancedSearch.index.push({
    cat: 'grade', titulo: `${g.disciplina} — ${g.professor}`, sub: `${g.ano}º ${g.grupo} · ${nomeTurno(g.turno)} · ${g.dia} · ${g.numero_aula}ª aula (${hhmm(g.hora_inicio)})`, texto: `${g.disciplina} ${g.professor} ${g.ano} ano ${g.grupo} ${g.turno} ${g.dia} ${g.numero_aula} aula`
  }));

  state.advancedSearch.index.forEach(e => e.palavras = palavras(e.texto));
}

function lev(a, b) {
  const m = a.length, n = b.length;
  if (Math.abs(m - n) > 2) return 3;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

function pontuarTermo(termo, palavrasEntrada) {
  let melhor = 0;
  for (const w of palavrasEntrada) {
    let s = 0;
    if (w === termo) s = 10;
    else if (termo.length >= 3 && w.startsWith(termo)) s = 8;
    else if (termo.length >= 3 && w.includes(termo)) s = 5;
    else if (termo.length >= 4) {
      const tol = termo.length >= 7 ? 2 : 1;
      const d = Math.min(lev(termo, w), lev(termo, w.slice(0, termo.length)));
      if (d <= tol) s = 4 - d;
    }
    if (s > melhor) melhor = s;
  }
  return melhor;
}

function buscarAvancada() {
  const termos = palavras($('#search-input').value);
  const container = $('#search-results');

  if (!termos.length) {
    $('#search-chips').innerHTML = '';
    container.innerHTML = `
      <div class="empty-state">
        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <div class="empty-state-title">Pesquise algo</div>
        <div class="empty-state-description">Digite para buscar professores, disciplinas, turmas, horários ou aulas. A busca tolera erros de digitação (ex.: "matematca", "mariya") e combina várias palavras (ex.: "1 manha A", "joao quarta").</div>
      </div>
    `;
    return;
  }

  const achados = [];
  for (const e of state.advancedSearch.index) {
    let total = 0, ok = true;
    for (const t of termos) {
      const s = pontuarTermo(t, e.palavras);
      if (!s) { ok = false; break; }
      total += s;
    }
    if (ok) achados.push({ ...e, score: total });
  }
  achados.sort((a, b) => b.score - a.score || a.titulo.localeCompare(b.titulo, 'pt-BR'));

  const porCat = {};
  achados.forEach(a => porCat[a.cat] = (porCat[a.cat] || 0) + 1);

  const CATEGORIAS = {
    professores: 'Professores',
    disciplinas: 'Disciplinas',
    turmas: 'Turmas',
    horarios: 'Horários',
    grade: 'Aulas na grade'
  };

  if (state.advancedSearch.activeCategory !== 'todas' && !porCat[state.advancedSearch.activeCategory]) {
    state.advancedSearch.activeCategory = 'todas';
  }

  const chips = [['todas', 'Todas', achados.length], ...Object.entries(CATEGORIAS).map(([k, l]) => [k, l, porCat[k] || 0])];
  $('#search-chips').innerHTML = chips.map(([k, l, n]) =>
    `<button class="category-tab ${k === state.advancedSearch.activeCategory ? 'active' : ''}" data-cat="${k}">${esc(l)} <span class="count">${n}</span></button>`
  ).join('');

  $$('#search-chips .category-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      state.advancedSearch.activeCategory = btn.dataset.cat;
      buscarAvancada();
    });
  });

  if (!achados.length) {
    container.innerHTML = `
      <div class="empty-state">
        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          <line x1="15" y1="11" x2="9" y2="11"></line>
        </svg>
        <div class="empty-state-title">Nada encontrado</div>
        <div class="empty-state-description">Tente termos diferentes ou verifique a ortografia.</div>
      </div>
    `;
    return;
  }

  const LIMITE = 40;
  container.innerHTML = Object.entries(CATEGORIAS)
    .filter(([k]) => porCat[k] && (state.advancedSearch.activeCategory === 'todas' || state.advancedSearch.activeCategory === k))
    .map(([k, rotulo]) => {
      const lista = achados.filter(a => a.cat === k);
      return `
        <div class="accordion">
          <details class="accordion-item" open>
            <summary class="accordion-header">
              <div class="accordion-title">
                <span>${esc(rotulo)}</span>
                <span class="accordion-count">${lista.length} resultado(s)</span>
              </div>
            </summary>
            <div class="accordion-content">
              <div class="results-grid">
                ${lista.slice(0, LIMITE).map(a => `
                  <article class="result-card">
                    <div class="result-card-header">
                      <h3 class="result-card-title">${esc(a.titulo)}</h3>
                    </div>
                    <div class="result-card-subtitle">${esc(a.sub)}</div>
                    <div class="result-card-meta">
                      <span class="badge badge-primary">${esc(k.slice(0, -1))}</span>
                    </div>
                  </article>
                `).join('')}
                ${lista.length > LIMITE ? `<div class="help-text">+ ${lista.length - LIMITE} resultado(s) — refine a pesquisa para ver mais.</div>` : ''}
              </div>
            </div>
          </details>
        </div>
      `;
    }).join('');
}

let searchTimer;

function preencherAdicoes() {
  const ANOS = [1, 2, 3].map(a => [a, `${a}º ano`]);
  const TURNOS = [['Manha', 'Manhã'], ['Tarde', 'Tarde']];
  const GRUPOS = [['A', 'Grupo A'], ['B', 'Grupo B']];
  const DIAS_OPC = DIAS_ORDER.map(d => [d, DIAS[d]]);

  opcoes($('#a-ano'), ANOS, 'Selecione...');
  opcoes($('#a-turno'), TURNOS, 'Selecione...');
  opcoes($('#a-grupo'), [['A', 'Grupo A (classe inteira)'], ['B', 'Grupo B']], 'Selecione...');
  opcoes($('#a-dia'), DIAS_OPC, 'Selecione...');
  opcoes($('#a-disciplina'), state.data.disciplinas.map(d => [d.id, d.nome]), 'Selecione...');

  opcoes($('#e-ano'), ANOS, 'Todos');
  opcoes($('#e-turno'), TURNOS, 'Todos');
  opcoes($('#e-grupo'), GRUPOS, 'Todos');
  opcoes($('#e-dia'), DIAS_OPC, 'Todos');

  opcoes($('#x-dia'), DIAS_OPC, 'Selecione...');
  opcoes($('#x-disciplina'), state.data.disciplinas.map(d => [d.id, d.nome]), 'Selecione...');

  atualizarListasAdicoes();
}

function atualizarListasAdicoes() {
  const todos = state.data.professores.map(p => [p.id, p.nome]);
  const reais = state.data.professores.filter(p => p.nome !== A_DEFINIR).map(p => [p.id, p.nome]);

  repovoar($('#a-professor'), reais, 'Selecione...');
  repovoar($('#e-professor'), todos, 'Todos');
  repovoar($('#x-professor'), todos, 'Selecione...');

  atualizarSlotsDefinir();
  atualizarAulasLivre();
  renderListaEdicao();
}

async function recarregarDados() {
  const [professores, disciplinas, grade, excecoes] = await Promise.all([
    api('/professores'),
    api('/disciplinas'),
    api('/grade?expandir=0'),
    api('/grade/excecoes').catch(() => [])
  ]);
  Object.assign(state.data, { professores, disciplinas, grade, excecoes });

  repovoar($('#f-professor'), professores.map(p => [p.id, p.nome]), 'Todos');
  atualizarListasAdicoes();
  montarIndiceBusca();
  buscarAvancada();
  await consultarGrade();
  atualizarResumo();
}

async function aposAlteracao() {
  await recarregarDados();
  showToast('Sucesso', 'Dados atualizados.', 'success');
}

function atualizarResumo() {
  const { professores, disciplinas, turmas, grade } = state.data;
  $('#stat-teachers').textContent = professores.length;
  $('#stat-subjects').textContent = disciplinas.length;
  $('#stat-classes').textContent = turmas.length;
  $('#stat-lessons').textContent = grade.length;
}

async function adicionarProfessor() {
  const nome = $('#n-nome').value.trim().replace(/\s+/g, ' ');
  if (!nome) return showToast('Atenção', 'Digite o nome do professor.', 'warning');

  const existente = state.data.professores.find(p => norm(p.nome) === norm(nome));
  if (existente) return showToast('Já existe', `"${existente.nome}" já está na lista.`, 'warning');

  try {
    const novo = await api('/professores', { method: 'POST', body: JSON.stringify({ nome }) });
    $('#n-nome').value = '';
    await aposAlteracao();
    showToast('Professor adicionado', `"${novo.nome}" foi adicionado com sucesso.`, 'success');
  } catch (e) {
    showToast('Erro', e.message, 'error');
  }
}

function atualizarAulasLivre() {
  const sel = $('#a-aula');
  const turno = $('#a-turno').value;
  const dia = Number($('#a-dia').value);
  const atual = sel.value;
  if (!turno || !dia) { sel.innerHTML = '<option value="">Escolha turno e dia</option>'; return; }

  const html = opcoesAulas(turno, dia, {
    ano: Number($('#a-ano').value) || null,
    grupo: $('#a-grupo').value,
    profId: Number($('#a-professor').value) || null,
  });

  if (!html) { sel.innerHTML = '<option value="">Nenhum horário cadastrado</option>'; return; }
  sel.innerHTML = '<option value="">Selecione...</option>' + html;
  if (atual && [...sel.options].some(o => o.value === atual && !o.disabled)) sel.value = atual;
}

// ---------- Preencher slot "A definir" ----------
function slotsADefinir() {
  return state.data.grade
    .filter(g => g.professor === A_DEFINIR)
    .sort((a, b) =>
      a.ano - b.ano || a.turno.localeCompare(b.turno) || a.grupo.localeCompare(b.grupo) ||
      a.dia_semana - b.dia_semana || a.numero_aula - b.numero_aula);
}

function atualizarSlotsDefinir() {
  const sel = $('#d-slot');
  if (!sel) return;
  const atual = sel.value;
  const slots = slotsADefinir();
  const btn = $('#btn-definir');

  if (!slots.length) {
    sel.innerHTML = '<option value="">Nenhum slot "A definir" pendente</option>';
    sel.disabled = true;
    if (btn) btn.disabled = true;
    atualizarProfDefinir();
    return;
  }

  sel.disabled = false;
  if (btn) btn.disabled = false;
  sel.innerHTML = '<option value="">Selecione...</option>' + slots.map(g =>
    `<option value="${esc(g.id)}">${esc(`${g.ano}º ano ${nomeTurno(g.turno)} · Grupo ${g.grupo} · ${g.dia} · ${aulaRotulo(g.numero_aula)} (${hhmm(g.hora_inicio)}) · ${g.disciplina}`)}</option>`
  ).join('');
  if ([...sel.options].some(o => o.value === atual)) sel.value = atual;
  atualizarProfDefinir();
}

function atualizarProfDefinir() {
  const selProf = $('#d-professor');
  const info = $('#d-info');
  if (!selProf) return;
  const slot = state.data.grade.find(g => String(g.id) === $('#d-slot')?.value);
  const atual = selProf.value;
  const reais = state.data.professores.filter(p => p.nome !== A_DEFINIR);

  selProf.innerHTML = '<option value="">Selecione...</option>' + reais.map(p => {
    const motivo = slot
      ? ocupacao({ turno: slot.turno, dia: slot.dia_semana, aula: slot.numero_aula, profId: p.id, ignorarId: slot.id })
      : '';
    return `<option value="${esc(p.id)}"${motivo ? ' disabled' : ''}>${esc(p.nome + motivo)}</option>`;
  }).join('');
  if ([...selProf.options].some(o => o.value === atual && !o.disabled)) selProf.value = atual;

  if (info) {
    info.textContent = slot
      ? `${slot.disciplina} · ${slot.ano}º ano ${nomeTurno(slot.turno)}, grupo ${slot.grupo} · ${slot.dia}, ${aulaRotulo(slot.numero_aula)}. Professores já ocupados neste horário aparecem desativados.`
      : '';
  }
}

const LIMITE_LISTA = 60;
const chaveHorario = (g) => `${g.ano}|${g.turno}|${g.horario_id}`;

function linhasEdicao() {
  const out = state.data.grade.map(g => ({ ...g, tipo: 'real' }));
  const comB = new Set(state.data.grade.filter(g => g.grupo === 'B').map(chaveHorario));
  const exc = new Map(state.data.excecoes.map(e => [chaveHorario(e), e]));
  const reaisA = new Map(out.filter(g => g.grupo === 'A').map(g => [g.id, g]));

  state.data.grade.filter(g => g.grupo === 'A').forEach(a => {
    const k = chaveHorario(a);
    if (comB.has(k)) return;
    const e = exc.get(k);
    if (!e) reaisA.get(a.id).bHerda = true;
    out.push({ ...a, grupo: 'B', tipo: e ? 'excecao' : 'herdada', excecao_id: e ? e.id : null });
  });
  return out;
}

function celulaDisciplina(g) {
  if (g.tipo === 'herdada') return `${esc(g.disciplina)}<small>Herdada do grupo A</small>`;
  if (g.tipo === 'excecao') return `${esc(g.disciplina)}<small>Grupo B não tem esta aula (o A mantém)</small>`;
  if (g.grupo === 'B') return `${esc(g.disciplina)}<small>Aula própria do grupo B</small>`;
  return esc(g.disciplina);
}

function botoesAcao(g) {
  const b = (acao, rotulo, classe = '') =>
    `<button type="button" class="table-action-btn ${classe}" data-acao="${acao}" data-tipo="${g.tipo}" data-id="${g.id}" data-tooltip="${esc(rotulo)}" aria-label="${esc(rotulo)}">
      ${getActionIcon(acao)}
    </button>`;

  if (g.tipo === 'herdada') {
    return b('editarB', 'Editar só para o grupo B (o grupo A não muda)') +
      b('excluirB', 'Excluir só para o grupo B (o grupo A mantém a aula)', 'danger');
  }
  if (g.tipo === 'excecao') return b('restaurarB', 'Restaurar a aula no grupo B (volta a herdar do grupo A)');

  const afetaDois = g.grupo === 'A' && g.bHerda;
  return b('editar', afetaDois ? 'Editar aula (vale para os grupos A e B)' : 'Editar aula') +
    b('excluir',
      afetaDois ? 'Excluir tudo: remove a aula dos grupos A e B (pede confirmação)'
        : g.grupo === 'B' ? 'Excluir a aula própria do grupo B (pede confirmação)'
        : 'Excluir a aula do grupo A (pede confirmação)',
      'danger') +
    (afetaDois ? b('excluirA', 'Excluir só para o grupo A (o grupo B mantém a aula)', 'danger') : '');
}

function getActionIcon(acao) {
  const icons = {
    editar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`,
    editarB: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`,
    excluir: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
    excluirB: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
    excluirA: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
    restaurarB: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2z"></path></svg>`
  };
  return icons[acao] || '';
}

function renderListaEdicao() {
  const f = {
    ano: $('#e-ano').value,
    turno: $('#e-turno').value,
    grupo: $('#e-grupo').value,
    dia: $('#e-dia').value,
    prof: $('#e-professor').value,
  };

  const lista = linhasEdicao()
    .filter(g =>
      (!f.ano || String(g.ano) === f.ano) &&
      (!f.turno || g.turno === f.turno) &&
      (!f.grupo || g.grupo === f.grupo) &&
      (!f.dia || String(g.dia_semana) === f.dia) &&
      (!f.prof || (g.tipo !== 'excecao' && String(g.professor_id) === f.prof)))
    .sort((a, b) => (
      a.ano - b.ano ||
      a.turno.localeCompare(b.turno) ||
      a.grupo.localeCompare(b.grupo) ||
      a.dia_semana - b.dia_semana ||
      a.numero_aula - b.numero_aula
    ) || a.tipo.localeCompare(b.tipo));

  const container = $('#e-lista');

  if (!lista.length) {
    container.innerHTML = `
      <div class="empty-state">
        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
        <div class="empty-state-title">Nenhuma aula encontrada</div>
        <div class="empty-state-description">Ajuste os filtros para localizar aulas.</div>
      </div>
    `;
    return;
  }

  const mostrar = lista.slice(0, LIMITE_LISTA);
  container.innerHTML = `
    <div class="table-wrapper">
      <table class="table">
        <thead>
          <tr><th>Turma</th><th>Dia</th><th>Aula</th><th>Disciplina</th><th>Professor</th><th></th></tr>
        </thead>
        <tbody>
          ${mostrar.map(g => `
            <tr class="${g.tipo === 'excecao' ? 'excecao' : ''}">
              <td>${esc(g.ano)}º ano · Grupo ${esc(g.grupo)}<small>${esc(nomeTurno(g.turno))}</small></td>
              <td>${esc(g.dia)}</td>
              <td>${esc(aulaRotulo(g.numero_aula))}<small>${esc(hhmm(g.hora_inicio))}–${esc(hhmm(g.hora_fim))}</small></td>
              <td>${celulaDisciplina(g)}</td>
              <td>${g.tipo === 'excecao' ? '—' : esc(g.professor)}</td>
              <td class="table-actions"><div class="table-actions-group">${botoesAcao(g)}</div></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ${lista.length > LIMITE_LISTA ? `<div class="help-text">Mostrando ${LIMITE_LISTA} de ${lista.length} aulas — use os filtros para refinar.</div>` : ''}
  `;
}

const resumoAula = (g) =>
  `${g.ano}º ano ${nomeTurno(g.turno)}, grupo ${g.grupo} · ${g.dia}, ${aulaRotulo(g.numero_aula)} · ${g.disciplina}${g.professor ? ` (${g.professor})` : ''}`;

function abrirEditor(g) {
  state.editMode.editando = g;
  const soB = g.tipo === 'herdada';

  $('#e-titulo').textContent = (soB ? 'Editando SÓ para o grupo B (o grupo A não muda): ' : 'Editando: ') + resumoAula(g);
  $('#x-professor').value = String(g.professor_id);
  $('#x-disciplina').value = String(g.disciplina_id);
  $('#x-dia').value = String(g.dia_semana);
  $('#x-dia').disabled = soB;

  if (soB) {
    $('#x-aula').innerHTML = `<option value="${g.numero_aula}">${aulaRotulo(g.numero_aula)} (${hhmm(g.hora_inicio)}–${hhmm(g.hora_fim)})</option>`;
    $('#x-aula').disabled = true;
  } else {
    $('#x-aula').disabled = false;
    atualizarAulasEdicao(g.numero_aula);
  }

  const msg = $('#msg-edit');
  if (msg) msg.style.display = 'none';
  $('#e-editor').hidden = false;
  $('#e-editor').style.display = 'block';
  $('#e-editor').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function fecharEditor() {
  state.editMode.editando = null;
  $('#e-editor').style.display = 'none';
  $('#e-editor').hidden = true;
}

function atualizarAulasEdicao(preferida) {
  if (!state.editMode.editando || state.editMode.editando.tipo === 'herdada') return;
  const sel = $('#x-aula');
  const dia = Number($('#x-dia').value);
  const alvo = preferida ?? Number(sel.value);
  if (!dia) { sel.innerHTML = '<option value="">Escolha o dia</option>'; return; }

  const html = opcoesAulas(state.editMode.editando.turno, dia, {
    ano: state.editMode.editando.ano,
    grupo: state.editMode.editando.grupo,
    profId: Number($('#x-professor').value) || null,
    ignorarId: state.editMode.editando.id,
  });

  if (!html) { sel.innerHTML = '<option value="">Nenhum horário cadastrado</option>'; return; }
  sel.innerHTML = '<option value="">Selecione...</option>' + html;
  if (alvo && [...sel.options].some(o => o.value === String(alvo) && !o.disabled)) sel.value = String(alvo);
}

async function excluirAula(g) {
  const bHerda = g.grupo === 'A' && linhasEdicao().some(x => x.tipo === 'herdada' && x.id === g.id);
  const aviso1 = g.grupo === 'B'
    ? '\n\nEsta é uma aula própria do grupo B. Ao excluir, o B volta a seguir a aula do grupo A (se houver).'
    : bHerda ? '\n\nO grupo B herda esta aula e também deixará de tê-la. Para tirar de só um grupo, use "Excluir só do A" (nesta linha) ou "Excluir só do B" (na linha do grupo B).' : '';

  if (!confirm(`Excluir esta aula da grade?\n\n${resumoAula(g)}${aviso1}`)) return;

  try {
    await api('/grade/' + g.id, { method: 'DELETE' });
    if (state.editMode.editando && state.editMode.editando.id === g.id) fecharEditor();
    await aposAlteracao();
    showToast('Excluído', `Aula removida: ${resumoAula(g)}`, 'success');
  } catch (e) {
    showToast('Erro', e.message, 'error');
  }
}

async function excluirSoA(g) {
  if (!confirm(`Excluir esta aula SÓ do grupo A?\nO grupo B continua com ela (vira aula própria do B, com o mesmo professor).\n\n${resumoAula(g)}`)) return;

  try {
    await api(`/grade/${g.id}/excluir-so-a`, { method: 'POST' });
    if (state.editMode.editando && state.editMode.editando.id === g.id) fecharEditor();
    await aposAlteracao();
    showToast('Sucesso', `Aula removida só do grupo A; o grupo B mantém: ${resumoAula(g)}`, 'success');
  } catch (e) {
    showToast('Erro', e.message, 'error');
  }
}

async function excluirSoB(g) {
  if (!confirm(`Excluir esta aula SÓ do grupo B?\nO grupo A continua com ela.\n\n${resumoAula(g)}`)) return;

  try {
    await api('/grade/excecoes', {
      method: 'POST',
      body: JSON.stringify({ ano: g.ano, turno: g.turno, dia_semana: g.dia_semana, numero_aula: g.numero_aula })
    });
    if (state.editMode.editando && state.editMode.editando.id === g.id) fecharEditor();
    await aposAlteracao();
    showToast('Sucesso', `Aula removida só do grupo B: ${resumoAula(g)}`, 'success');
  } catch (e) {
    showToast('Erro', e.message, 'error');
  }
}

async function restaurarB(g) {
  try {
    await api('/grade/excecoes/' + g.excecao_id, { method: 'DELETE' });
    await aposAlteracao();
    showToast('Restaurado', `Aula restaurada no grupo B: ${resumoAula(g)}`, 'success');
  } catch (e) {
    showToast('Erro', e.message, 'error');
  }
}

function ocupacao({ turno, dia, aula, ano, grupo, profId, ignorarId }) {
  const mesmo = (g) => g.id !== ignorarId && g.turno === turno && g.dia_semana === dia && g.numero_aula === aula;
  if (ano && grupo) {
    const t = state.data.grade.find(g => mesmo(g) && g.ano === ano && g.grupo === grupo);
    if (t) return ` — turma já tem ${t.disciplina}`;
  }
  if (profId) {
    const p = state.data.grade.find(g => mesmo(g) && g.professor_id === profId);
    if (p) return ` — professor está no ${p.ano}º ano, grupo ${p.grupo}`;
  }
  return '';
}

function opcoesAulas(turno, dia, filtro) {
  const hs = state.data.horarios
    .filter(x => x.turno === turno && x.dia_semana === dia)
    .sort((a, b) => a.numero_aula - b.numero_aula);
  if (!hs.length) return null;
  return hs.map(x => {
    const motivo = ocupacao({ turno, dia, aula: x.numero_aula, ...filtro });
    return `<option value="${x.numero_aula}"${motivo ? ' disabled' : ''}>${aulaRotulo(x.numero_aula)} (${hhmm(x.hora_inicio)}–${hhmm(x.hora_fim)})${esc(motivo)}</option>`;
  }).join('');
}

// ---------- Tooltip dos botões (data-tooltip) ----------
function initTooltips() {
  const tip = document.createElement('div');
  tip.className = 'app-tooltip';
  tip.setAttribute('role', 'tooltip');
  document.body.appendChild(tip);
  let alvo = null;

  const esconder = () => { alvo = null; tip.classList.remove('visible'); };

  const mostrar = (el) => {
    alvo = el;
    tip.textContent = el.dataset.tooltip;
    tip.classList.add('visible');
    const r = el.getBoundingClientRect();
    const t = tip.getBoundingClientRect();
    const margem = 8;
    let top = r.top - t.height - margem;
    if (top < margem) top = r.bottom + margem;
    let left = r.left + r.width / 2 - t.width / 2;
    left = Math.max(margem, Math.min(left, window.innerWidth - t.width - margem));
    tip.style.top = `${top}px`;
    tip.style.left = `${left}px`;
  };

  const achar = (e) => e.target.closest ? e.target.closest('[data-tooltip]') : null;

  document.addEventListener('mouseover', (e) => { const el = achar(e); if (el && el !== alvo) mostrar(el); });
  document.addEventListener('mouseout', (e) => { const el = achar(e); if (el && !el.contains(e.relatedTarget)) esconder(); });
  document.addEventListener('focusin', (e) => { const el = achar(e); if (el) mostrar(el); });
  document.addEventListener('focusout', esconder);
  document.addEventListener('click', esconder);
  window.addEventListener('scroll', esconder, true);
}

function initEventListeners() {
  initTooltips();
  $('#theme-toggle')?.addEventListener('click', toggleTheme);
  $('#sidebar-toggle')?.addEventListener('click', toggleSidebar);
  $('.sidebar-overlay')?.addEventListener('click', closeSidebar);

  $$('.nav-tab').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  $$('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) {
        hideModal(overlay.id);
      }
    });
  });

  $$('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => hideModal(btn.closest('.modal-overlay').id));
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      $$('.modal-overlay.open').forEach(m => hideModal(m.id));
      if (state.ui.sidebarOpen) closeSidebar();
    }
  });

  $('#btn-nova-disciplina')?.addEventListener('click', () => showModal('modal-disciplina'));
  $('#btn-novo-horario')?.addEventListener('click', () => showModal('modal-horario'));

  $('#form-disciplina')?.addEventListener('submit', async e => {
    e.preventDefault();
    const nome = $('#disciplina-nome').value.trim();
    if (!nome) return showToast('Atenção', 'Informe o nome da disciplina.', 'warning');
    try {
      await api('/disciplinas', { method: 'POST', body: JSON.stringify({ nome }) });
      hideModal('modal-disciplina');
      $('#form-disciplina').reset();
      await aposAlteracao();
      showToast('Sucesso', 'Disciplina adicionada.', 'success');
    } catch (err) {
      showToast('Erro', err.message, 'error');
    }
  });

  $('#form-horario')?.addEventListener('submit', async e => {
    e.preventDefault();
    const turno = $('#horario-turno').value;
    const dia = Number($('#horario-dia').value);
    const aula = Number($('#horario-aula').value);
    const inicio = $('#horario-inicio').value;
    const fim = $('#horario-fim').value;
    if (!turno || !dia || !aula || !inicio || !fim) return showToast('Atenção', 'Preencha todos os campos.', 'warning');
    try {
      await api('/horarios', { method: 'POST', body: JSON.stringify({ turno, dia_semana: dia, numero_aula: aula, hora_inicio: inicio, hora_fim: fim }) });
      hideModal('modal-horario');
      $('#form-horario').reset();
      await aposAlteracao();
      showToast('Sucesso', 'Horário adicionado.', 'success');
    } catch (err) {
      showToast('Erro', err.message, 'error');
    }
  });

  // Filtros da grade
  FILTROS_KEYS.forEach(f => {
    const el = $(`#f-${f}`);
    if (el) el.addEventListener('change', consultarGrade);
  });

  $('#limpar-filtros')?.addEventListener('click', () => {
    FILTROS_KEYS.forEach(f => $(`#f-${f}`).value = '');
    consultarGrade();
  });

  $('#f-agrupar')?.addEventListener('change', renderGrade);

  // Busca avançada
  $('#search-input')?.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(buscarAvancada, 150);
  });

  // Expandir/recolher
  $('#expandir-tudo')?.addEventListener('click', () => {
    $$('#grade-resultado details').forEach(d => d.open = true);
  });

  $('#recolher-tudo')?.addEventListener('click', () => {
    $$('#grade-resultado details').forEach(d => d.open = false);
  });

  // Adicionar professor
  $('#btn-prof')?.addEventListener('click', adicionarProfessor);
  $('#n-nome')?.addEventListener('keydown', e => { if (e.key === 'Enter') adicionarProfessor(); });

  // Modo de adição à grade (chips)
  $$('#modo-grade .chip').forEach(c => {
    c.addEventListener('click', () => {
      $$('#modo-grade .chip').forEach(x => x.classList.toggle('active', x === c));
      state.editMode.modoGrade = c.dataset.modo;
      $('#modo-definir').hidden = c.dataset.modo !== 'definir';
      $('#modo-livre').hidden = c.dataset.modo !== 'livre';
      // Atualizar aria-checked
      $$('#modo-grade .chip').forEach(x => x.setAttribute('aria-checked', x === c));
    });
  });

  $('#d-slot')?.addEventListener('change', atualizarProfDefinir);
  $('#btn-definir')?.addEventListener('click', async () => {
    const slotId = Number($('#d-slot').value);
    const profId = Number($('#d-professor').value);
    if (!slotId || !profId) return showToast('Atenção', 'Escolha o slot e o professor.', 'warning');

    const slot = state.data.grade.find(g => g.id === slotId);
    const nome = $('#d-professor').selectedOptions[0].text;

    try {
      await api('/grade/' + slotId, { method: 'PUT', body: JSON.stringify({ professor_id: profId }) });
      await aposAlteracao();
      showToast('Atribuído', `${nome} atribuído: ${slot.disciplina} · ${slot.ano}º ano ${nomeTurno(slot.turno)}, grupo ${slot.grupo} · ${slot.dia}, ${aulaRotulo(slot.numero_aula)}.`, 'success');
    } catch (e) {
      showToast('Erro', e.message, 'error');
    }
  });

  // Nova aula em horário livre
  ['a-professor', 'a-ano', 'a-turno', 'a-grupo', 'a-dia'].forEach(id => $('#' + id)?.addEventListener('change', atualizarAulasLivre));
  $('#btn-atribuir')?.addEventListener('click', async () => {
    const campos = {
      professor_id: Number($('#a-professor').value),
      disciplina_id: Number($('#a-disciplina').value),
      ano: Number($('#a-ano').value),
      turno: $('#a-turno').value,
      grupo: $('#a-grupo').value,
      dia_semana: Number($('#a-dia').value),
      numero_aula: Number($('#a-aula').value),
    };
    if (Object.values(campos).some(v => !v)) return showToast('Atenção', 'Preencha todos os campos.', 'warning');

    const texto = (id) => $('#' + id).selectedOptions[0].text;
    const resumo = `${texto('a-professor')} → ${texto('a-disciplina')} · ${campos.ano}º ano ${nomeTurno(campos.turno)}, grupo ${campos.grupo} · ${DIAS[campos.dia_semana]}, ${aulaRotulo(campos.numero_aula)}`;

    try {
      await api('/grade', { method: 'POST', body: JSON.stringify(campos) });
      await aposAlteracao();
      showToast('Aula adicionada', resumo, 'success');
    } catch (e) {
      showToast('Erro', e.message, 'error');
    }
  });

  // Editar/excluir - filtros
  ['e-ano', 'e-turno', 'e-grupo', 'e-dia', 'e-professor'].forEach(id =>
    $('#' + id)?.addEventListener('change', renderListaEdicao)
  );

  $('#e-lista')?.addEventListener('click', ev => {
    const btn = ev.target.closest('button[data-acao]');
    if (!btn) return;

    const g = linhasEdicao().find(x => String(x.id) === btn.dataset.id && x.tipo === btn.dataset.tipo);
    if (!g) return;

    const acoes = {
      editar: abrirEditor,
      editarB: abrirEditor,
      excluir: excluirAula,
      excluirB: excluirSoB,
      excluirA: excluirSoA,
      restaurarB: restaurarB
    };
    acoes[btn.dataset.acao](g);
  });

  // Editor de aula
  $('#x-dia')?.addEventListener('change', () => atualizarAulasEdicao());
  $('#x-professor')?.addEventListener('change', () => atualizarAulasEdicao());
  $('#btn-cancelar')?.addEventListener('click', fecharEditor);
  $('#btn-salvar')?.addEventListener('click', async () => {
    if (!state.editMode.editando) return;
    const g = state.editMode.editando;
    const professor_id = Number($('#x-professor').value);
    const disciplina_id = Number($('#x-disciplina').value);

    try {
      if (g.tipo === 'herdada') {
        if (!professor_id || !disciplina_id) return showToast('Atenção', 'Preencha todos os campos.', 'warning');
        if (professor_id === g.professor_id) {
          return showToast('Atenção', 'Escolha um professor diferente do grupo A: o B já recebe esta aula com ele.', 'warning');
        }
        await api('/grade', {
          method: 'POST',
          body: JSON.stringify({
            professor_id, disciplina_id, ano: g.ano, turno: g.turno, grupo: 'B',
            dia_semana: g.dia_semana, numero_aula: g.numero_aula,
          })
        });
        fecharEditor();
        await aposAlteracao();
        showToast('Sucesso', `Grupo B agora tem aula própria com ${$('#x-professor').selectedOptions[0].text}. O grupo A continua igual.`, 'success');
      } else {
        const corpo = { professor_id, disciplina_id, dia_semana: Number($('#x-dia').value), numero_aula: Number($('#x-aula').value) };
        if (Object.values(corpo).some(v => !v)) return showToast('Atenção', 'Preencha todos os campos.', 'warning');
        await api('/grade/' + g.id, { method: 'PUT', body: JSON.stringify(corpo) });
        fecharEditor();
        await aposAlteracao();
        showToast('Atualizado', 'Aula atualizada com sucesso.', 'success');
      }
    } catch (e) {
      showToast('Erro', e.message, 'error');
    }
  });
}

function init() {
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  setTheme(savedTheme || (prefersDark ? 'dark' : 'light'));

  try {
    initEventListeners();
  } catch (e) {
    console.error('Falha ao iniciar os eventos:', e);
    showToast('Erro', 'Falha ao iniciar a interface: ' + e.message, 'error');
  }
  carregarDadosIniciais();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}