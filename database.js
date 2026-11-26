// database.js
// Conexão Node.js + MySQL (XAMPP) usando mysql2 com Promises
// Instalação: npm install mysql2

const mysql = require('mysql2/promise');

// Configuração padrão do XAMPP: usuário root, SEM senha, porta 3306
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'grade_escolar',
};

let pool;

/**
 * Cria o banco (se não existir), as tabelas e popula as 12 turmas.
 * Chame uma vez ao iniciar o servidor: await initDatabase();
 */
async function initDatabase() {
  // 1) Conexão sem banco selecionado, só para criar o banco
  const conn = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
  });

  await conn.query(
    `CREATE DATABASE IF NOT EXISTS \`${config.database}\`
     CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await conn.end();

  // 2) Pool de conexões já apontando para o banco
  pool = mysql.createPool({
    ...config,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4',
  });

  // 3) Tabelas (ordem respeita as chaves estrangeiras)
  const tabelas = [
    `CREATE TABLE IF NOT EXISTS turmas (
      id INT PRIMARY KEY AUTO_INCREMENT,
      ano INT NOT NULL,                -- 1, 2 ou 3
      turno VARCHAR(10) NOT NULL,      -- 'Manha' ou 'Tarde'
      grupo CHAR(1) NOT NULL,          -- 'A' ou 'B'
      UNIQUE (ano, turno, grupo)       -- garante as 12 combinações
    ) ENGINE=InnoDB`,

    `CREATE TABLE IF NOT EXISTS professores (
      id INT PRIMARY KEY AUTO_INCREMENT,
      nome VARCHAR(100) NOT NULL
    ) ENGINE=InnoDB`,

    `CREATE TABLE IF NOT EXISTS disciplinas (
      id INT PRIMARY KEY AUTO_INCREMENT,
      nome VARCHAR(100) NOT NULL
    ) ENGINE=InnoDB`,

    `CREATE TABLE IF NOT EXISTS horarios_aula (
      id INT PRIMARY KEY AUTO_INCREMENT,
      turno VARCHAR(10) NOT NULL,
      dia_semana INT NOT NULL,         -- 2 = Segunda ... 6 = Sexta
      numero_aula INT NOT NULL,        -- 1ª aula, 2ª aula, etc.
      hora_inicio TIME NOT NULL,
      hora_fim TIME NOT NULL,
      UNIQUE (turno, dia_semana, numero_aula)
    ) ENGINE=InnoDB`,

    `CREATE TABLE IF NOT EXISTS grade_horaria (
      id INT PRIMARY KEY AUTO_INCREMENT,
      turma_id INT NOT NULL,
      disciplina_id INT NOT NULL,
      professor_id INT NOT NULL,
      horario_id INT NOT NULL,
      FOREIGN KEY (turma_id) REFERENCES turmas(id),
      FOREIGN KEY (disciplina_id) REFERENCES disciplinas(id),
      FOREIGN KEY (professor_id) REFERENCES professores(id),
      FOREIGN KEY (horario_id) REFERENCES horarios_aula(id),
      -- Impede choque de horário para a mesma turma ou o mesmo professor
      UNIQUE (turma_id, horario_id),
      UNIQUE (professor_id, horario_id)
    ) ENGINE=InnoDB`,

    // Aulas do grupo A que o grupo B NÃO tem (o B normalmente herda as aulas do A)
    `CREATE TABLE IF NOT EXISTS grade_excecoes (
      id INT PRIMARY KEY AUTO_INCREMENT,
      turma_id INT NOT NULL,           -- turma do grupo B
      horario_id INT NOT NULL,
      FOREIGN KEY (turma_id) REFERENCES turmas(id),
      FOREIGN KEY (horario_id) REFERENCES horarios_aula(id),
      UNIQUE (turma_id, horario_id)
    ) ENGINE=InnoDB`,
  ];

  for (const sql of tabelas) {
    await pool.query(sql);
  }

  // 4) Seed das 12 turmas (INSERT IGNORE evita duplicar por causa do UNIQUE)
  const valores = [];
  for (const ano of [1, 2, 3]) {
    for (const turno of ['Manha', 'Tarde']) {
      for (const grupo of ['A', 'B']) {
        valores.push([ano, turno, grupo]);
      }
    }
  }
  await pool.query('INSERT IGNORE INTO turmas (ano, turno, grupo) VALUES ?', [valores]);

  console.log(`✅ Banco "${config.database}" pronto (MySQL XAMPP).`);
  return pool;
}

/** Retorna o pool já inicializado */
function getPool() {
  if (!pool) {
    throw new Error('Banco não inicializado. Chame initDatabase() antes.');
  }
  return pool;
}

/** Atalho para executar queries: const rows = await query('SELECT ...', [params]) */
async function query(sql, params = []) {
  const [rows] = await getPool().execute(sql, params);
  return rows;
}

module.exports = { initDatabase, getPool, query };