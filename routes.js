// routes.js - todas as rotas da API em um único arquivo
const router = require('express').Router();
const { query, getPool } = require('./database');

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

// Remove exceções do grupo B num horário (usado quando a aula do grupo A muda de lugar ou é apagada)
const limparExcecoes = (ano, turno, horarioId) => query(
  `DELETE e FROM grade_excecoes e
     JOIN turmas t ON t.id = e.turma_id
    WHERE t.ano = ? AND t.turno = ? AND e.horario_id = ?`,
  [ano, turno, horarioId]
);

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
  // se o B estava marcado como "sem aula" nesse horário, a exceção deixa de valer
  await query('DELETE FROM grade_excecoes WHERE turma_id = ? AND horario_id = ?', [turma.id, horario.id]);
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
    // horários em que o B foi marcado como "sem aula" (exceções)
    const exc = await query(
      'SELECT t.ano, t.turno, e.horario_id FROM grade_excecoes e JOIN turmas t ON t.id = e.turma_id'
    );
    const semB = new Set(exc.map((e) => `${e.ano}|${e.turno}|${e.horario_id}`));
    const herdadas = rows
      .filter((r) => {
        const k = `${r.ano}|${r.turno}|${r.horario_id}`;
        return r.grupo === 'A' && !comB.has(k) && !semB.has(k);
      })
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

// Editar uma aula da grade: professor, disciplina e/ou horário (dia_semana + numero_aula)
// body (qualquer subconjunto): { professor_id, disciplina_id, dia_semana, numero_aula }
router.put('/grade/:id', h(async (req, res) => {
  const [atual] = await query(
    `SELECT g.id, g.turma_id, g.disciplina_id, g.professor_id, g.horario_id,
            t.ano, t.turno, t.grupo, hr.dia_semana, hr.numero_aula
       FROM grade_horaria g
       JOIN turmas t         ON t.id = g.turma_id
       JOIN horarios_aula hr ON hr.id = g.horario_id
      WHERE g.id = ?`,
    [req.params.id]
  );
  if (!atual) throw erro(404, 'Aula não encontrada na grade');

  const b = req.body;
  const professor_id = b.professor_id !== undefined ? intOk(b.professor_id, 1, ID_MAX) : atual.professor_id;
  const disciplina_id = b.disciplina_id !== undefined ? intOk(b.disciplina_id, 1, ID_MAX) : atual.disciplina_id;
  const dia = b.dia_semana !== undefined ? intOk(b.dia_semana, 2, 6) : atual.dia_semana;
  const aula = b.numero_aula !== undefined ? intOk(b.numero_aula, 1, 10) : atual.numero_aula;
  if (!professor_id || !disciplina_id || !dia || !aula) throw erro(400, 'Dados inválidos para edição');

  const [prof] = await query('SELECT id, nome FROM professores WHERE id = ?', [professor_id]);
  if (!prof) throw erro(404, 'Professor não encontrado');
  const [disc] = await query('SELECT id FROM disciplinas WHERE id = ?', [disciplina_id]);
  if (!disc) throw erro(404, 'Disciplina não encontrada');

  // o horário continua dentro do turno da turma
  const [horario] = await query(
    'SELECT id FROM horarios_aula WHERE turno = ? AND dia_semana = ? AND numero_aula = ?',
    [atual.turno, dia, aula]
  );
  if (!horario) throw erro(404, `Horário não cadastrado: ${atual.turno}, ${DIAS[dia]}, ${aula}ª aula`);

  // conflitos, ignorando a própria aula
  const [cTurma] = await query(
    `SELECT d.nome AS disciplina, p.nome AS professor
       FROM grade_horaria g
       JOIN disciplinas d ON d.id = g.disciplina_id
       JOIN professores p ON p.id = g.professor_id
      WHERE g.turma_id = ? AND g.horario_id = ? AND g.id <> ?`,
    [atual.turma_id, horario.id, atual.id]
  );
  if (cTurma) throw erro(409, `A turma já tem ${cTurma.disciplina} com ${cTurma.professor} nesse horário`);

  const [cProf] = await query(
    `SELECT t.ano, t.grupo, d.nome AS disciplina
       FROM grade_horaria g
       JOIN turmas t      ON t.id = g.turma_id
       JOIN disciplinas d ON d.id = g.disciplina_id
      WHERE g.professor_id = ? AND g.horario_id = ? AND g.id <> ?`,
    [professor_id, horario.id, atual.id]
  );
  if (cProf) throw erro(409, `${prof.nome} já está alocado nesse horário (${cProf.disciplina} no ${cProf.ano}º ${cProf.grupo})`);

  await query(
    'UPDATE grade_horaria SET professor_id = ?, disciplina_id = ?, horario_id = ? WHERE id = ?',
    [professor_id, disciplina_id, horario.id, atual.id]
  );
  if (atual.grupo === 'A' && horario.id !== atual.horario_id) {
    await limparExcecoes(atual.ano, atual.turno, atual.horario_id);
  }
  res.json({ id: atual.id, professor_id, disciplina_id, dia_semana: dia, numero_aula: aula });
}));

router.delete('/grade/:id', h(async (req, res) => {
  const [aula] = await query(
    `SELECT g.horario_id, t.ano, t.turno, t.grupo
       FROM grade_horaria g JOIN turmas t ON t.id = g.turma_id
      WHERE g.id = ?`,
    [req.params.id]
  );
  if (!aula) throw erro(404, 'Aula não encontrada na grade');
  await query('DELETE FROM grade_horaria WHERE id = ?', [req.params.id]);
  if (aula.grupo === 'A') await limparExcecoes(aula.ano, aula.turno, aula.horario_id);
  res.status(204).end();
}));

// Exclui a aula só do grupo A: o grupo B continua com ela, agora como aula própria (mesmo professor/disciplina).
// Só vale quando o B apenas herda a aula do A; se o B já tem aula própria ou foi marcado "sem aula", use o DELETE normal.
router.post('/grade/:id/excluir-so-a', h(async (req, res) => {
  const [a] = await query(
    `SELECT g.id, g.disciplina_id, g.professor_id, g.horario_id, t.ano, t.turno, t.grupo
       FROM grade_horaria g JOIN turmas t ON t.id = g.turma_id
      WHERE g.id = ?`,
    [req.params.id]
  );
  if (!a) throw erro(404, 'Aula não encontrada na grade');
  if (a.grupo !== 'A') throw erro(409, 'Esta aula não é do grupo A');

  const [turmaB] = await query("SELECT id FROM turmas WHERE ano = ? AND turno = ? AND grupo = 'B'", [a.ano, a.turno]);
  if (!turmaB) throw erro(404, 'Turma do grupo B não encontrada');

  const [propriaB] = await query(
    'SELECT id FROM grade_horaria WHERE turma_id = ? AND horario_id = ?', [turmaB.id, a.horario_id]
  );
  if (propriaB) throw erro(409, 'O grupo B tem aula própria nesse horário; use a exclusão normal (ela afeta só o grupo A).');

  const [semB] = await query(
    'SELECT id FROM grade_excecoes WHERE turma_id = ? AND horario_id = ?', [turmaB.id, a.horario_id]
  );
  if (semB) throw erro(409, 'O grupo B já não tem esta aula; use a exclusão normal.');

  // o mesmo professor não pode ter duas aulas no mesmo horário, então: apaga a do A e cria a do B na mesma transação
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute('DELETE FROM grade_horaria WHERE id = ?', [a.id]);
    const [ins] = await conn.execute(
      'INSERT INTO grade_horaria (turma_id, disciplina_id, professor_id, horario_id) VALUES (?, ?, ?, ?)',
      [turmaB.id, a.disciplina_id, a.professor_id, a.horario_id]
    );
    await conn.commit();
    res.status(201).json({ id: ins.insertId, grupo: 'B', disciplina_id: a.disciplina_id, professor_id: a.professor_id });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}));

/* ======================== Exceções: aula do A que o B não tem ======================== */

router.get('/grade/excecoes', h(async (req, res) => {
  const rows = await query(
    `SELECT e.id, e.horario_id, t.ano, t.turno, t.grupo,
            hr.dia_semana, hr.numero_aula, hr.hora_inicio, hr.hora_fim
       FROM grade_excecoes e
       JOIN turmas t         ON t.id = e.turma_id
       JOIN horarios_aula hr ON hr.id = e.horario_id
      ORDER BY t.ano, t.turno, hr.dia_semana, hr.numero_aula`
  );
  res.json(rows.map((x) => ({ ...x, dia: DIAS[x.dia_semana] })));
}));

// body: { ano, turno, dia_semana, numero_aula }  -> o grupo B deixa de ter a aula do A nesse horário
router.post('/grade/excecoes', h(async (req, res) => {
  const ano = intOk(req.body.ano, 1, 3);
  const turno = turnoOk(req.body.turno);
  const dia = intOk(req.body.dia_semana, 2, 6);
  const aula = intOk(req.body.numero_aula, 1, 10);
  if (!ano || !turno || !dia || !aula) throw erro(400, 'Informe ano, turno, dia_semana e numero_aula');

  const [turmaA] = await query("SELECT id FROM turmas WHERE ano = ? AND turno = ? AND grupo = 'A'", [ano, turno]);
  const [turmaB] = await query("SELECT id FROM turmas WHERE ano = ? AND turno = ? AND grupo = 'B'", [ano, turno]);
  const [horario] = await query(
    'SELECT id FROM horarios_aula WHERE turno = ? AND dia_semana = ? AND numero_aula = ?', [turno, dia, aula]
  );
  if (!turmaA || !turmaB) throw erro(404, 'Turma não encontrada');
  if (!horario) throw erro(404, 'Horário não cadastrado');

  const [aulaA] = await query('SELECT id FROM grade_horaria WHERE turma_id = ? AND horario_id = ?', [turmaA.id, horario.id]);
  if (!aulaA) throw erro(409, 'O grupo A não tem aula nesse horário; não há o que remover do grupo B');

  const [aulaB] = await query('SELECT id FROM grade_horaria WHERE turma_id = ? AND horario_id = ?', [turmaB.id, horario.id]);
  if (aulaB) throw erro(409, 'O grupo B tem aula própria nesse horário; edite ou exclua essa aula');

  const r = await query('INSERT INTO grade_excecoes (turma_id, horario_id) VALUES (?, ?)', [turmaB.id, horario.id]);
  res.status(201).json({ id: r.insertId, ano, turno, grupo: 'B', dia_semana: dia, numero_aula: aula });
}));

// restaura: o grupo B volta a herdar a aula do A
router.delete('/grade/excecoes/:id', h(async (req, res) => {
  const r = await query('DELETE FROM grade_excecoes WHERE id = ?', [req.params.id]);
  if (!r.affectedRows) throw erro(404, 'Exceção não encontrada');
  res.status(204).end();
}));

module.exports = router;