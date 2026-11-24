// routes.js - todas as rotas da API em um único arquivo
const router = require('express').Router();
const { query } = require('./database');

/* ======================== Helpers ======================== */

const DIAS = { 2: 'Segunda', 3: 'Terça', 4: 'Quarta', 5: 'Quinta', 6: 'Sexta' };

// Express 4 não captura erros de async; este wrapper resolve isso
const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const erro = (status, msg) => Object.assign(new Error(msg), { status });

const turnoOk = (v) => {
  const t = String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  return t === 'manha' ? 'Manha' : t === 'tarde' ? 'Tarde' : null;
};
const grupoOk = (v) => {
  const g = String(v || '').trim().toUpperCase();
  return g === 'A' || g === 'B' ? g : null;
};
const intOk = (v, min, max) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
};
const ID_MAX = Number.MAX_SAFE_INTEGER;

// Monta "WHERE a = ? AND b = ?" a partir de [coluna, valor]; ignora valores vazios
const montarWhere = (filtros) => {
  const ativos = filtros.filter(([, v]) => v !== undefined && v !== null);
  return {
    sql: ativos.length ? 'WHERE ' + ativos.map(([c]) => `${c} = ?`).join(' AND ') : '',
    params: ativos.map(([, v]) => v),
  };
};

/* ======================== Professores ======================== */

router.post('/professores', h(async (req, res) => {
  const nome = (req.body.nome || '').trim();
  if (!nome) throw erro(400, 'Informe o nome do professor');
  const r = await query('INSERT INTO professores (nome) VALUES (?)', [nome]);
  res.status(201).json({ id: r.insertId, nome });
}));

router.get('/professores', h(async (req, res) => {
  res.json(await query('SELECT id, nome FROM professores ORDER BY nome'));
}));

// Professor + todas as aulas dele
router.get('/professores/:id', h(async (req, res) => {
  const [prof] = await query('SELECT id, nome FROM professores WHERE id = ?', [req.params.id]);
  if (!prof) throw erro(404, 'Professor não encontrado');
  prof.aulas = await query(
    `SELECT g.id, d.nome AS disciplina, t.ano, t.turno, t.grupo,
            hr.dia_semana, hr.numero_aula, hr.hora_inicio, hr.hora_fim
       FROM grade_horaria g
       JOIN disciplinas d    ON d.id = g.disciplina_id
       JOIN turmas t         ON t.id = g.turma_id
       JOIN horarios_aula hr ON hr.id = g.horario_id
      WHERE g.professor_id = ?
      ORDER BY hr.dia_semana, hr.numero_aula`,
    [prof.id]
  );
  res.json(prof);
}));

router.put('/professores/:id', h(async (req, res) => {
  const nome = (req.body.nome || '').trim();
  if (!nome) throw erro(400, 'Informe o nome do professor');
  const r = await query('UPDATE professores SET nome = ? WHERE id = ?', [nome, req.params.id]);
  if (!r.affectedRows) throw erro(404, 'Professor não encontrado');
  res.json({ id: Number(req.params.id), nome });
}));

router.delete('/professores/:id', h(async (req, res) => {
  const [uso] = await query('SELECT COUNT(*) AS total FROM grade_horaria WHERE professor_id = ?', [req.params.id]);
  if (uso.total > 0) throw erro(409, `Professor tem ${uso.total} aula(s) na grade. Remova-as primeiro.`);
  const r = await query('DELETE FROM professores WHERE id = ?', [req.params.id]);
  if (!r.affectedRows) throw erro(404, 'Professor não encontrado');
  res.status(204).end();
}));

/* ======================== Disciplinas ======================== */

router.post('/disciplinas', h(async (req, res) => {
  const nome = (req.body.nome || '').trim();
  if (!nome) throw erro(400, 'Informe o nome da disciplina');
  const r = await query('INSERT INTO disciplinas (nome) VALUES (?)', [nome]);
  res.status(201).json({ id: r.insertId, nome });
}));

router.get('/disciplinas', h(async (req, res) => {
  res.json(await query('SELECT id, nome FROM disciplinas ORDER BY nome'));
}));

router.delete('/disciplinas/:id', h(async (req, res) => {
  const [uso] = await query('SELECT COUNT(*) AS total FROM grade_horaria WHERE disciplina_id = ?', [req.params.id]);
  if (uso.total > 0) throw erro(409, 'Disciplina está em uso na grade');
  const r = await query('DELETE FROM disciplinas WHERE id = ?', [req.params.id]);
  if (!r.affectedRows) throw erro(404, 'Disciplina não encontrada');
  res.status(204).end();
}));

/* ======================== Turmas (já criadas pelo initDatabase) ======================== */

// GET /turmas?ano=1&turno=manha&grupo=A
router.get('/turmas', h(async (req, res) => {
  const w = montarWhere([
    ['ano', req.query.ano ? intOk(req.query.ano, 1, 3) : undefined],
    ['turno', req.query.turno ? turnoOk(req.query.turno) : undefined],
    ['grupo', req.query.grupo ? grupoOk(req.query.grupo) : undefined],
  ]);
  res.json(await query(`SELECT id, ano, turno, grupo FROM turmas ${w.sql} ORDER BY ano, turno, grupo`, w.params));
}));

/* ======================== Horários ======================== */

// body: { turno, dia_semana (2-6), numero_aula, hora_inicio "07:00", hora_fim "07:50" }
router.post('/horarios', h(async (req, res) => {
  const turno = turnoOk(req.body.turno);
  const dia = intOk(req.body.dia_semana, 2, 6);
  const aula = intOk(req.body.numero_aula, 1, 10);
  const { hora_inicio, hora_fim } = req.body;
  if (!turno) throw erro(400, "turno deve ser 'Manha' ou 'Tarde'");
  if (!dia) throw erro(400, 'dia_semana deve ser de 2 (segunda) a 6 (sexta)');
  if (!aula) throw erro(400, 'numero_aula inválido');
  if (!hora_inicio || !hora_fim) throw erro(400, 'Informe hora_inicio e hora_fim (HH:MM)');

  const r = await query(
    'INSERT INTO horarios_aula (turno, dia_semana, numero_aula, hora_inicio, hora_fim) VALUES (?, ?, ?, ?, ?)',
    [turno, dia, aula, hora_inicio, hora_fim]
  );
  res.status(201).json({ id: r.insertId, turno, dia_semana: dia, numero_aula: aula, hora_inicio, hora_fim });
}));

// GET /horarios?turno=Manha&dia_semana=2
router.get('/horarios', h(async (req, res) => {
  const w = montarWhere([
    ['turno', req.query.turno ? turnoOk(req.query.turno) : undefined],
    ['dia_semana', req.query.dia_semana ? intOk(req.query.dia_semana, 2, 6) : undefined],
  ]);
  res.json(await query(`SELECT * FROM horarios_aula ${w.sql} ORDER BY turno, dia_semana, numero_aula`, w.params));
}));

/* ======================== Grade (atribuição de aulas) ======================== */

// body: { professor_id, disciplina_id, ano, turno, grupo, dia_semana, numero_aula }
router.post('/grade', h(async (req, res) => {
  const professor_id = intOk(req.body.professor_id, 1, ID_MAX);
  const disciplina_id = intOk(req.body.disciplina_id, 1, ID_MAX);
  const ano = intOk(req.body.ano, 1, 3);
  const turno = turnoOk(req.body.turno);
  const grupo = grupoOk(req.body.grupo);
  const dia = intOk(req.body.dia_semana, 2, 6);
  const aula = intOk(req.body.numero_aula, 1, 10);

  if (!professor_id || !disciplina_id) throw erro(400, 'Informe professor_id e disciplina_id');
  if (!ano || !turno || !grupo) throw erro(400, "Informe ano (1-3), turno ('Manha'/'Tarde') e grupo ('A'/'B')");
  if (!dia || !aula) throw erro(400, 'Informe dia_semana (2-6) e numero_aula');

  const [prof] = await query('SELECT id FROM professores WHERE id = ?', [professor_id]);
  if (!prof) throw erro(404, 'Professor não encontrado');

  const [disc] = await query('SELECT id FROM disciplinas WHERE id = ?', [disciplina_id]);
  if (!disc) throw erro(404, 'Disciplina não encontrada');

  const [turma] = await query('SELECT id FROM turmas WHERE ano = ? AND turno = ? AND grupo = ?', [ano, turno, grupo]);
  if (!turma) throw erro(404, 'Turma não encontrada');

  // O horário pertence ao turno da turma
  const [horario] = await query(
    'SELECT id FROM horarios_aula WHERE turno = ? AND dia_semana = ? AND numero_aula = ?',
    [turno, dia, aula]
  );
  if (!horario) throw erro(404, `Horário não cadastrado: ${turno}, ${DIAS[dia]}, ${aula}ª aula. Use POST /horarios`);

  // Conflitos com mensagens claras (o UNIQUE do banco continua como garantia final)
  const [cTurma] = await query(
    `SELECT p.nome AS professor, d.nome AS disciplina
       FROM grade_horaria g
       JOIN professores p ON p.id = g.professor_id
       JOIN disciplinas d ON d.id = g.disciplina_id
      WHERE g.turma_id = ? AND g.horario_id = ?`,
    [turma.id, horario.id]
  );
  if (cTurma) throw erro(409, `A turma ${ano}º ${grupo} (${turno}) já tem ${cTurma.disciplina} com ${cTurma.professor} nesse horário`);

  const [cProf] = await query(
    `SELECT t.ano, t.grupo, d.nome AS disciplina
       FROM grade_horaria g
       JOIN turmas t      ON t.id = g.turma_id
       JOIN disciplinas d ON d.id = g.disciplina_id
      WHERE g.professor_id = ? AND g.horario_id = ?`,
    [professor_id, horario.id]
  );
  if (cProf) throw erro(409, `O professor já está alocado nesse horário (${cProf.disciplina} no ${cProf.ano}º ${cProf.grupo})`);

  const r = await query(
    'INSERT INTO grade_horaria (turma_id, disciplina_id, professor_id, horario_id) VALUES (?, ?, ?, ?)',
    [turma.id, disciplina_id, professor_id, horario.id]
  );
  res.status(201).json({
    id: r.insertId, professor_id, disciplina_id,
    turma: { id: turma.id, ano, turno, grupo },
    horario: { id: horario.id, dia_semana: dia, dia: DIAS[dia], numero_aula: aula },
  });
}));

// GET /grade?ano=1&turno=Manha&grupo=A  |  /grade?professor_id=3  |  /grade?disciplina_id=2
// As aulas da classe inteira são gravadas só no grupo A. Para o grupo B enxergá-las, elas são
// duplicadas na resposta (classe_inteira: true) nos horários em que o B não tem aula própria:
//   - grupo=B  -> aulas próprias do B + herdadas
//   - sem grupo -> tudo do A e do B + herdadas (a mesma aula aparece para os dois grupos)
//   - grupo=A  -> só o A
//   - expandir=0 desliga a duplicação (usado pela busca avançada)
router.get('/grade', h(async (req, res) => {
  const q = req.query;
  const w = montarWhere([
    ['t.ano', q.ano ? intOk(q.ano, 1, 3) : undefined],
    ['t.turno', q.turno ? turnoOk(q.turno) : undefined],
  ]);
  const rows = await query(
    `SELECT g.id, g.horario_id, t.ano, t.turno, t.grupo,
            d.id AS disciplina_id, d.nome AS disciplina,
            p.id AS professor_id, p.nome AS professor,
            hr.dia_semana, hr.numero_aula, hr.hora_inicio, hr.hora_fim
       FROM grade_horaria g
       JOIN turmas t         ON t.id = g.turma_id
       JOIN disciplinas d    ON d.id = g.disciplina_id
       JOIN professores p    ON p.id = g.professor_id
       JOIN horarios_aula hr ON hr.id = g.horario_id
       ${w.sql}`,
    w.params
  );

  const grupo = q.grupo ? grupoOk(q.grupo) : null;
  let lista = rows.map((r) => ({ ...r, classe_inteira: false }));

  const expandir = grupo === 'B' || (!grupo && q.expandir !== '0');
  if (grupo === 'A') {
    lista = lista.filter((r) => r.grupo === 'A');
  } else if (expandir) {
    // horários (por ano/turno) em que o grupo B tem aula própria
    const comB = new Set(rows.filter((r) => r.grupo === 'B').map((r) => `${r.ano}|${r.turno}|${r.horario_id}`));
    const herdadas = rows
      .filter((r) => r.grupo === 'A' && !comB.has(`${r.ano}|${r.turno}|${r.horario_id}`))
      .map((r) => ({ ...r, grupo: 'B', classe_inteira: true }));
    if (grupo === 'B') lista = lista.filter((r) => r.grupo === 'B');
    lista = lista.concat(herdadas);
  }

  const prof = q.professor_id ? intOk(q.professor_id, 1, ID_MAX) : null;
  const disc = q.disciplina_id ? intOk(q.disciplina_id, 1, ID_MAX) : null;
  if (prof) lista = lista.filter((r) => r.professor_id === prof);
  if (disc) lista = lista.filter((r) => r.disciplina_id === disc);

  lista.sort((a, b) =>
    a.ano - b.ano || a.turno.localeCompare(b.turno) || a.grupo.localeCompare(b.grupo) ||
    a.dia_semana - b.dia_semana || a.numero_aula - b.numero_aula);

  res.json(lista.map((r) => ({ ...r, dia: DIAS[r.dia_semana] })));
}));

router.delete('/grade/:id', h(async (req, res) => {
  const r = await query('DELETE FROM grade_horaria WHERE id = ?', [req.params.id]);
  if (!r.affectedRows) throw erro(404, 'Aula não encontrada na grade');
  res.status(204).end();
}));

module.exports = router;