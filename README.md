# html css js
# mysql xaamp
# node.js

# abas

# estrutura do banco

tabelas:

professores:
nome
id-prof
status

materia:
nome
id-materia

turma
id-turma:
turno:
grupo:

horario
id-horario
turno
dia_semana
numero_aula
hora_inicio
hora_fim

grade horaria
id-grade
id-turma
id-materia
id-prof
id-horario

CREATE TABLE turmas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ano INT NOT NULL, -- 1, 2 ou 3
    turno VARCHAR(10) NOT NULL, -- 'Manha' ou 'Tarde'
    grupo CHAR(1) NOT NULL, -- 'A' ou 'B'
    UNIQUE (ano, turno, grupo) -- Garante exatamente as 12 combinações
);

CREATE TABLE professores (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL
);

CREATE TABLE disciplinas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL
);

CREATE TABLE horarios_aula (
    id INT PRIMARY KEY AUTO_INCREMENT,
    turno VARCHAR(10) NOT NULL,
    dia_semana INT NOT NULL, -- 2 = Segunda, 3 = Terça ... 6 = Sexta
    numero_aula INT NOT NULL, -- 1ª aula, 2ª aula, etc.
    hora_inicio TIME NOT NULL,
    hora_fim TIME NOT NULL
);

CREATE TABLE grade_horaria (
    id INT PRIMARY KEY AUTO_INCREMENT,
    turma_id INT NOT NULL,
    disciplina_id INT NOT NULL,
    professor_id INT NOT NULL,
    horario_id INT NOT NULL,
    FOREIGN KEY (turma_id) REFERENCES turmas(id),
    FOREIGN KEY (disciplina_id) REFERENCES disciplinas(id),
    FOREIGN KEY (professor_id) REFERENCES professores(id),
    FOREIGN KEY (horario_id) REFERENCES horarios_aula(id),
    -- Impede choque de horário para a mesma turma/grupo ou mesmo professor:
    UNIQUE (turma_id, horario_id),
    UNIQUE (professor_id, horario_id)
);

dados:
-- =====================================================================
-- dados_pdf.sql  |  Carga da grade horária (PDF 'Horário para Bruno', gerado em 28/10/2026)
-- Rode DEPOIS de iniciar o servidor uma vez (npm start), que cria o banco e as tabelas.
-- Pode ser executado no phpMyAdmin (aba SQL) do XAMPP, de uma vez só.
--
-- Mapeamento: 1ª/2ª/3ª série -> ano 1/2/3 | turma A (manhã) / B (tarde) -> turno Manha/Tarde
--             'Grupo A ou Classe Inteira' -> grupo A | 'Grupo B' -> grupo B
-- =====================================================================
SET NAMES utf8mb4;
USE grade_escolar;

-- 1) PROFESSORES (só insere os que ainda não existem)
INSERT INTO professores (nome)
SELECT t.nome FROM (
  SELECT 'Aleteia V. M. Souto' AS nome
  UNION ALL
  SELECT 'Alícia V. Lima'
  UNION ALL
  SELECT 'Andre S. Maia'
  UNION ALL
  SELECT 'Bruno Cano'
  UNION ALL
  SELECT 'Cassio M. L. de Aquino'
  UNION ALL
  SELECT 'Célide T. da Silva'
  UNION ALL
  SELECT 'Danilo K. dos S. Araujo'
  UNION ALL
  SELECT 'Davi Vilar'
  UNION ALL
  SELECT 'Fabiano de A. Machado'
  UNION ALL
  SELECT 'Fernanda C. Medeiros'
  UNION ALL
  SELECT 'Gustavo M. G. Martins'
  UNION ALL
  SELECT 'Henrique D. Pastor'
  UNION ALL
  SELECT 'Joao E. T. Martins'
  UNION ALL
  SELECT 'Joao P. T. de Siles'
  UNION ALL
  SELECT 'Jose A. de Campos'
  UNION ALL
  SELECT 'Jose A. do Amaral'
  UNION ALL
  SELECT 'Juarez B. de S. Junior'
  UNION ALL
  SELECT 'Lara C. Dable'
  UNION ALL
  SELECT 'Leandro B. de Souza'
  UNION ALL
  SELECT 'Luis T. V. Festino'
  UNION ALL
  SELECT 'Luiz A. de Lima'
  UNION ALL
  SELECT 'Marcelo P. Broti'
  UNION ALL
  SELECT 'Marcio Bergamin'
  UNION ALL
  SELECT 'Marcos V. R. Vital'
  UNION ALL
  SELECT 'Maria de L. B. Fuentes'
  UNION ALL
  SELECT 'Marilene A. Viana'
  UNION ALL
  SELECT 'Miriam F. R. Couto'
  UNION ALL
  SELECT 'Moyses B. Filho'
  UNION ALL
  SELECT 'Paola C. de Oliveira'
  UNION ALL
  SELECT 'Raphael de A. N. Gomes'
  UNION ALL
  SELECT 'Regina C. P. Ramos'
  UNION ALL
  SELECT 'Renata F. Ferrari'
  UNION ALL
  SELECT 'Rhanyel E. A. R. G. de Lima'
  UNION ALL
  SELECT 'Ricardo F. Palhares'
  UNION ALL
  SELECT 'Ricardo S. Arruda / Gabriel P. de G. Alves'
  UNION ALL
  SELECT 'Ruth do Carmo'
  UNION ALL
  SELECT 'Sandra R. S. de Oliveira'
  UNION ALL
  SELECT 'Silvio A. Pêra'
  UNION ALL
  SELECT 'Talyta C. A. Rubio'
  UNION ALL
  SELECT 'Thiago G. Pascotto'
  UNION ALL
  SELECT 'Valdeci B. Mangianelli'
  UNION ALL
  SELECT 'Vanessa A. G. Giron'
  UNION ALL
  SELECT 'Veruska M. de Sousa'
  UNION ALL
  SELECT 'Vinicius B. M. Guidio'
  UNION ALL
  SELECT 'Vivaldo R. Silva'
  UNION ALL
  SELECT 'A definir'
) t
WHERE NOT EXISTS (SELECT 1 FROM professores x WHERE x.nome = t.nome);

-- 2) DISCIPLINAS (siglas como no PDF)
INSERT INTO disciplinas (nome)
SELECT t.nome FROM (
  SELECT 'ARTE' AS nome
  UNION ALL
  SELECT 'BD'
  UNION ALL
  SELECT 'BD I'
  UNION ALL
  SELECT 'BIO'
  UNION ALL
  SELECT 'CPRT'
  UNION ALL
  SELECT 'DS'
  UNION ALL
  SELECT 'ECO'
  UNION ALL
  SELECT 'EF'
  UNION ALL
  SELECT 'FILO'
  UNION ALL
  SELECT 'FIS'
  UNION ALL
  SELECT 'GEO'
  UNION ALL
  SELECT 'HIST'
  UNION ALL
  SELECT 'INGLÊS'
  UNION ALL
  SELECT 'IPSSI'
  UNION ALL
  SELECT 'LI'
  UNION ALL
  SELECT 'LP'
  UNION ALL
  SELECT 'LPL'
  UNION ALL
  SELECT 'MAT'
  UNION ALL
  SELECT 'PA'
  UNION ALL
  SELECT 'PAM'
  UNION ALL
  SELECT 'PAM II'
  UNION ALL
  SELECT 'PDTCC'
  UNION ALL
  SELECT 'PTIC'
  UNION ALL
  SELECT 'PW'
  UNION ALL
  SELECT 'PW I'
  UNION ALL
  SELECT 'PW III'
  UNION ALL
  SELECT 'QTS'
  UNION ALL
  SELECT 'QUI'
  UNION ALL
  SELECT 'SE'
  UNION ALL
  SELECT 'SEIT'
  UNION ALL
  SELECT 'SOCIO'
) t
WHERE NOT EXISTS (SELECT 1 FROM disciplinas x WHERE x.nome = t.nome);

-- 3) HORÁRIOS (numero_aula = posição no turno; 9 = contraturno; fins estimados em 50 min)
INSERT IGNORE INTO horarios_aula (turno, dia_semana, numero_aula, hora_inicio, hora_fim) VALUES
  ('Manha', 2, 1, '07:00', '07:50'),
  ('Manha', 2, 2, '07:50', '08:40'),
  ('Manha', 2, 3, '08:40', '09:30'),
  ('Manha', 2, 4, '09:45', '10:35'),
  ('Manha', 2, 5, '10:35', '11:25'),
  ('Manha', 2, 6, '11:25', '12:15'),
  ('Manha', 3, 1, '07:00', '07:50'),
  ('Manha', 3, 2, '07:50', '08:40'),
  ('Manha', 3, 3, '08:40', '09:30'),
  ('Manha', 3, 4, '09:45', '10:35'),
  ('Manha', 3, 5, '10:35', '11:25'),
  ('Manha', 3, 6, '11:25', '12:15'),
  ('Manha', 4, 1, '07:00', '07:50'),
  ('Manha', 4, 2, '07:50', '08:40'),
  ('Manha', 4, 3, '08:40', '09:30'),
  ('Manha', 4, 4, '09:45', '10:35'),
  ('Manha', 4, 5, '10:35', '11:25'),
  ('Manha', 4, 6, '11:25', '12:15'),
  ('Manha', 5, 1, '07:00', '07:50'),
  ('Manha', 5, 2, '07:50', '08:40'),
  ('Manha', 5, 3, '08:40', '09:30'),
  ('Manha', 5, 4, '09:45', '10:35'),
  ('Manha', 5, 5, '10:35', '11:25'),
  ('Manha', 5, 6, '11:25', '12:15'),
  ('Manha', 5, 9, '14:40', '15:30'),
  ('Manha', 6, 1, '07:00', '07:50'),
  ('Manha', 6, 2, '07:50', '08:40'),
  ('Manha', 6, 3, '08:40', '09:30'),
  ('Manha', 6, 4, '09:45', '10:35'),
  ('Manha', 6, 5, '10:35', '11:25'),
  ('Manha', 6, 6, '11:25', '12:15'),
  ('Manha', 6, 7, '13:15', '14:05'),
  ('Manha', 6, 8, '14:05', '14:55'),
  ('Tarde', 2, 3, '13:00', '13:50'),
  ('Tarde', 2, 4, '13:50', '14:40'),
  ('Tarde', 2, 5, '14:40', '15:30'),
  ('Tarde', 2, 6, '15:45', '16:35'),
  ('Tarde', 2, 7, '16:35', '17:25'),
  ('Tarde', 2, 8, '17:25', '18:15'),
  ('Tarde', 3, 3, '13:00', '13:50'),
  ('Tarde', 3, 4, '13:50', '14:40'),
  ('Tarde', 3, 5, '14:40', '15:30'),
  ('Tarde', 3, 6, '15:45', '16:35'),
  ('Tarde', 3, 7, '16:35', '17:25'),
  ('Tarde', 3, 8, '17:25', '18:15'),
  ('Tarde', 3, 9, '09:45', '10:20'),
  ('Tarde', 4, 3, '13:00', '13:50'),
  ('Tarde', 4, 4, '13:50', '14:40'),
  ('Tarde', 4, 5, '14:40', '15:30'),
  ('Tarde', 4, 6, '15:45', '16:35'),
  ('Tarde', 4, 7, '16:35', '17:25'),
  ('Tarde', 4, 8, '17:25', '18:15'),
  ('Tarde', 5, 3, '13:00', '13:50'),
  ('Tarde', 5, 4, '13:50', '14:40'),
  ('Tarde', 5, 5, '14:40', '15:30'),
  ('Tarde', 5, 6, '15:45', '16:35'),
  ('Tarde', 5, 7, '16:35', '17:25'),
  ('Tarde', 5, 8, '17:25', '18:15'),
  ('Tarde', 6, 1, '10:20', '11:10'),
  ('Tarde', 6, 2, '11:10', '12:00'),
  ('Tarde', 6, 3, '13:00', '13:50'),
  ('Tarde', 6, 4, '13:50', '14:40'),
  ('Tarde', 6, 5, '14:40', '15:30'),
  ('Tarde', 6, 6, '15:45', '16:35'),
  ('Tarde', 6, 7, '16:35', '17:25'),
  ('Tarde', 6, 8, '17:25', '18:15');

-- 4) GRADE: tabela temporária com nomes, depois convertida para os IDs
DROP TEMPORARY TABLE IF EXISTS tmp_grade;
CREATE TEMPORARY TABLE tmp_grade (
  ano INT, turno VARCHAR(10), grupo CHAR(1), dia_semana INT, numero_aula INT,
  disciplina VARCHAR(100), professor VARCHAR(100)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO tmp_grade (ano, turno, grupo, dia_semana, numero_aula, disciplina, professor) VALUES
  (1, 'Manha', 'A', 2, 1, 'BD I', 'Thiago G. Pascotto'),
  (1, 'Manha', 'A', 2, 2, 'BD I', 'Thiago G. Pascotto'),
  (1, 'Manha', 'A', 2, 3, 'MAT', 'Joao E. T. Martins'),
  (1, 'Manha', 'A', 2, 4, 'MAT', 'Joao E. T. Martins'),
  (1, 'Manha', 'A', 2, 5, 'PTIC', 'Bruno Cano'),
  (1, 'Manha', 'A', 2, 6, 'PTIC', 'Bruno Cano'),
  (1, 'Manha', 'A', 3, 1, 'HIST', 'Silvio A. Pêra'),
  (1, 'Manha', 'A', 3, 2, 'HIST', 'Silvio A. Pêra'),
  (1, 'Manha', 'A', 3, 3, 'LP', 'Vanessa A. G. Giron'),
  (1, 'Manha', 'A', 3, 4, 'LP', 'Vanessa A. G. Giron'),
  (1, 'Manha', 'A', 3, 5, 'SEIT', 'Aleteia V. M. Souto'),
  (1, 'Manha', 'A', 3, 6, 'SEIT', 'Aleteia V. M. Souto'),
  (1, 'Manha', 'A', 4, 1, 'ARTE', 'Talyta C. A. Rubio'),
  (1, 'Manha', 'A', 4, 2, 'ARTE', 'Talyta C. A. Rubio'),
  (1, 'Manha', 'A', 4, 3, 'GEO', 'Cassio M. L. de Aquino'),
  (1, 'Manha', 'A', 4, 4, 'GEO', 'Cassio M. L. de Aquino'),
  (1, 'Manha', 'A', 4, 5, 'QUI', 'Paola C. de Oliveira'),
  (1, 'Manha', 'A', 4, 6, 'QUI', 'Paola C. de Oliveira'),
  (1, 'Manha', 'A', 5, 1, 'LI', 'Lara C. Dable'),
  (1, 'Manha', 'A', 5, 2, 'LI', 'Lara C. Dable'),
  (1, 'Manha', 'A', 5, 3, 'BIO', 'Sandra R. S. de Oliveira'),
  (1, 'Manha', 'A', 5, 4, 'PA', 'Thiago G. Pascotto'),
  (1, 'Manha', 'A', 5, 5, 'PA', 'Thiago G. Pascotto'),
  (1, 'Manha', 'A', 5, 6, 'PA', 'Thiago G. Pascotto'),
  (1, 'Manha', 'A', 5, 9, 'CPRT', 'Marcelo P. Broti'),
  (1, 'Manha', 'A', 6, 1, 'FIS', 'Jose A. de Campos'),
  (1, 'Manha', 'A', 6, 2, 'FIS', 'Jose A. de Campos'),
  (1, 'Manha', 'A', 6, 3, 'BIO', 'Sandra R. S. de Oliveira'),
  (1, 'Manha', 'A', 6, 4, 'PW I', 'Thiago G. Pascotto'),
  (1, 'Manha', 'A', 6, 5, 'PW I', 'Thiago G. Pascotto'),
  (1, 'Manha', 'A', 6, 6, 'PW I', 'Thiago G. Pascotto'),
  (1, 'Manha', 'A', 6, 7, 'EF', 'A definir'),
  (1, 'Manha', 'A', 6, 8, 'EF', 'A definir'),
  (1, 'Manha', 'B', 2, 1, 'BD I', 'Danilo K. dos S. Araujo'),
  (1, 'Manha', 'B', 2, 2, 'BD I', 'Danilo K. dos S. Araujo'),
  (1, 'Manha', 'B', 3, 5, 'SEIT', 'Célide T. da Silva'),
  (1, 'Manha', 'B', 3, 6, 'SEIT', 'Célide T. da Silva'),
  (1, 'Manha', 'B', 5, 4, 'PA', 'Aleteia V. M. Souto'),
  (1, 'Manha', 'B', 5, 5, 'PA', 'Aleteia V. M. Souto'),
  (1, 'Manha', 'B', 5, 6, 'PA', 'Aleteia V. M. Souto'),
  (1, 'Tarde', 'A', 2, 3, 'BIO', 'Fernanda C. Medeiros'),
  (1, 'Tarde', 'A', 2, 4, 'BIO', 'Fernanda C. Medeiros'),
  (1, 'Tarde', 'A', 2, 5, 'SEIT', 'Ricardo F. Palhares'),
  (1, 'Tarde', 'A', 2, 6, 'SEIT', 'Ricardo F. Palhares'),
  (1, 'Tarde', 'A', 2, 7, 'HIST', 'A definir'),
  (1, 'Tarde', 'A', 2, 8, 'HIST', 'A definir'),
  (1, 'Tarde', 'A', 3, 3, 'LP', 'Vinicius B. M. Guidio'),
  (1, 'Tarde', 'A', 3, 4, 'LP', 'Vinicius B. M. Guidio'),
  (1, 'Tarde', 'A', 3, 5, 'QUI', 'Paola C. de Oliveira'),
  (1, 'Tarde', 'A', 3, 6, 'QUI', 'Paola C. de Oliveira'),
  (1, 'Tarde', 'A', 3, 7, 'PTIC', 'Ricardo F. Palhares'),
  (1, 'Tarde', 'A', 3, 8, 'PTIC', 'Ricardo F. Palhares'),
  (1, 'Tarde', 'A', 3, 9, 'CPRT', 'Marcelo P. Broti'),
  (1, 'Tarde', 'A', 4, 3, 'FIS', 'Jose A. de Campos'),
  (1, 'Tarde', 'A', 4, 4, 'FIS', 'Jose A. de Campos'),
  (1, 'Tarde', 'A', 4, 5, 'BD I', 'Renata F. Ferrari'),
  (1, 'Tarde', 'A', 4, 6, 'BD I', 'Renata F. Ferrari'),
  (1, 'Tarde', 'A', 4, 7, 'GEO', 'A definir'),
  (1, 'Tarde', 'A', 4, 8, 'GEO', 'A definir'),
  (1, 'Tarde', 'A', 5, 3, 'PA', 'Andre S. Maia'),
  (1, 'Tarde', 'A', 5, 4, 'PA', 'Andre S. Maia'),
  (1, 'Tarde', 'A', 5, 5, 'PA', 'Andre S. Maia'),
  (1, 'Tarde', 'A', 5, 6, 'PW I', 'Andre S. Maia'),
  (1, 'Tarde', 'A', 5, 7, 'PW I', 'Andre S. Maia'),
  (1, 'Tarde', 'A', 5, 8, 'PW I', 'Andre S. Maia'),
  (1, 'Tarde', 'A', 6, 1, 'EF', 'A definir'),
  (1, 'Tarde', 'A', 6, 2, 'EF', 'A definir'),
  (1, 'Tarde', 'A', 6, 3, 'LI', 'Marcos V. R. Vital'),
  (1, 'Tarde', 'A', 6, 4, 'LI', 'Marcos V. R. Vital'),
  (1, 'Tarde', 'A', 6, 5, 'ARTE', 'Vivaldo R. Silva'),
  (1, 'Tarde', 'A', 6, 6, 'ARTE', 'Vivaldo R. Silva'),
  (1, 'Tarde', 'A', 6, 7, 'MAT', 'Maria de L. B. Fuentes'),
  (1, 'Tarde', 'A', 6, 8, 'MAT', 'Maria de L. B. Fuentes'),
  (1, 'Tarde', 'B', 4, 5, 'BD I', 'Andre S. Maia'),
  (1, 'Tarde', 'B', 4, 6, 'BD I', 'Andre S. Maia'),
  (1, 'Tarde', 'B', 5, 3, 'PA', 'Aleteia V. M. Souto'),
  (1, 'Tarde', 'B', 5, 4, 'PA', 'Aleteia V. M. Souto'),
  (1, 'Tarde', 'B', 5, 5, 'PA', 'Aleteia V. M. Souto'),
  (1, 'Tarde', 'B', 5, 6, 'PW I', 'Henrique D. Pastor'),
  (1, 'Tarde', 'B', 5, 7, 'PW I', 'Henrique D. Pastor'),
  (1, 'Tarde', 'B', 5, 8, 'PW I', 'Henrique D. Pastor'),
  (2, 'Manha', 'A', 2, 1, 'DS', 'Davi Vilar'),
  (2, 'Manha', 'A', 2, 2, 'DS', 'Davi Vilar'),
  (2, 'Manha', 'A', 2, 3, 'DS', 'Davi Vilar'),
  (2, 'Manha', 'A', 2, 4, 'ECO', 'Marilene A. Viana'),
  (2, 'Manha', 'A', 2, 5, 'LPL', 'Ruth do Carmo'),
  (2, 'Manha', 'A', 2, 6, 'LPL', 'Ruth do Carmo'),
  (2, 'Manha', 'A', 3, 1, 'PW', 'Thiago G. Pascotto'),
  (2, 'Manha', 'A', 3, 2, 'PW', 'Thiago G. Pascotto'),
  (2, 'Manha', 'A', 3, 3, 'HIST', 'Silvio A. Pêra'),
  (2, 'Manha', 'A', 3, 4, 'HIST', 'Silvio A. Pêra'),
  (2, 'Manha', 'A', 3, 5, 'EF', 'Regina C. P. Ramos'),
  (2, 'Manha', 'A', 3, 6, 'EF', 'Regina C. P. Ramos'),
  (2, 'Manha', 'A', 4, 1, 'BIO', 'Sandra R. S. de Oliveira'),
  (2, 'Manha', 'A', 4, 2, 'BIO', 'Sandra R. S. de Oliveira'),
  (2, 'Manha', 'A', 4, 3, 'MAT', 'Joao E. T. Martins'),
  (2, 'Manha', 'A', 4, 4, 'LPL', 'Ruth do Carmo'),
  (2, 'Manha', 'A', 4, 5, 'QUI', 'Moyses B. Filho'),
  (2, 'Manha', 'A', 4, 6, 'QUI', 'Moyses B. Filho'),
  (2, 'Manha', 'A', 5, 1, 'FIS', 'Moyses B. Filho'),
  (2, 'Manha', 'A', 5, 2, 'FIS', 'Moyses B. Filho'),
  (2, 'Manha', 'A', 5, 3, 'MAT', 'Joao E. T. Martins'),
  (2, 'Manha', 'A', 5, 4, 'MAT', 'Joao E. T. Martins'),
  (2, 'Manha', 'A', 5, 5, 'BD', 'Davi Vilar'),
  (2, 'Manha', 'A', 5, 6, 'BD', 'Davi Vilar'),
  (2, 'Manha', 'A', 6, 1, 'INGLÊS', 'Leandro B. de Souza'),
  (2, 'Manha', 'A', 6, 2, 'INGLÊS', 'Leandro B. de Souza'),
  (2, 'Manha', 'A', 6, 3, 'PAM', 'Jose A. do Amaral'),
  (2, 'Manha', 'A', 6, 4, 'PAM', 'Jose A. do Amaral'),
  (2, 'Manha', 'A', 6, 5, 'GEO', 'A definir'),
  (2, 'Manha', 'A', 6, 6, 'GEO', 'A definir'),
  (2, 'Manha', 'B', 2, 1, 'DS', 'Joao P. T. de Siles'),
  (2, 'Manha', 'B', 2, 2, 'DS', 'Joao P. T. de Siles'),
  (2, 'Manha', 'B', 2, 3, 'DS', 'Joao P. T. de Siles'),
  (2, 'Manha', 'B', 3, 1, 'PW', 'Célide T. da Silva'),
  (2, 'Manha', 'B', 3, 2, 'PW', 'Célide T. da Silva'),
  (2, 'Manha', 'B', 5, 5, 'BD', 'Célide T. da Silva'),
  (2, 'Manha', 'B', 5, 6, 'BD', 'Célide T. da Silva'),
  (2, 'Manha', 'B', 6, 3, 'PAM', 'Célide T. da Silva'),
  (2, 'Manha', 'B', 6, 4, 'PAM', 'Célide T. da Silva'),
  (2, 'Tarde', 'A', 2, 3, 'HIST', 'Fabiano de A. Machado'),
  (2, 'Tarde', 'A', 2, 4, 'HIST', 'Fabiano de A. Machado'),
  (2, 'Tarde', 'A', 2, 5, 'LPL', 'Gustavo M. G. Martins'),
  (2, 'Tarde', 'A', 2, 6, 'MAT', 'Joao E. T. Martins'),
  (2, 'Tarde', 'A', 2, 7, 'FIS', 'Raphael de A. N. Gomes'),
  (2, 'Tarde', 'A', 2, 8, 'FIS', 'Raphael de A. N. Gomes'),
  (2, 'Tarde', 'A', 3, 3, 'BD', 'Davi Vilar'),
  (2, 'Tarde', 'A', 3, 4, 'BD', 'Davi Vilar'),
  (2, 'Tarde', 'A', 3, 5, 'PW', 'Thiago G. Pascotto'),
  (2, 'Tarde', 'A', 3, 6, 'PW', 'Thiago G. Pascotto'),
  (2, 'Tarde', 'A', 3, 7, 'MAT', 'Joao E. T. Martins'),
  (2, 'Tarde', 'A', 3, 8, 'MAT', 'Joao E. T. Martins'),
  (2, 'Tarde', 'A', 4, 3, 'INGLÊS', 'Veruska M. de Sousa'),
  (2, 'Tarde', 'A', 4, 4, 'INGLÊS', 'Veruska M. de Sousa'),
  (2, 'Tarde', 'A', 4, 5, 'PAM', 'Marcio Bergamin'),
  (2, 'Tarde', 'A', 4, 6, 'PAM', 'Marcio Bergamin'),
  (2, 'Tarde', 'A', 4, 7, 'GEO', 'Miriam F. R. Couto'),
  (2, 'Tarde', 'A', 4, 8, 'GEO', 'Miriam F. R. Couto'),
  (2, 'Tarde', 'A', 5, 3, 'DS', 'Henrique D. Pastor'),
  (2, 'Tarde', 'A', 5, 4, 'DS', 'Henrique D. Pastor'),
  (2, 'Tarde', 'A', 5, 5, 'DS', 'Henrique D. Pastor'),
  (2, 'Tarde', 'A', 5, 6, 'ECO', 'Marcelo P. Broti'),
  (2, 'Tarde', 'A', 5, 7, 'EF', 'Rhanyel E. A. R. G. de Lima'),
  (2, 'Tarde', 'A', 5, 8, 'EF', 'Rhanyel E. A. R. G. de Lima'),
  (2, 'Tarde', 'A', 6, 3, 'QUI', 'Paola C. de Oliveira'),
  (2, 'Tarde', 'A', 6, 4, 'QUI', 'Paola C. de Oliveira'),
  (2, 'Tarde', 'A', 6, 5, 'BIO', 'Fernanda C. Medeiros'),
  (2, 'Tarde', 'A', 6, 6, 'BIO', 'Fernanda C. Medeiros'),
  (2, 'Tarde', 'A', 6, 7, 'LPL', 'Gustavo M. G. Martins'),
  (2, 'Tarde', 'A', 6, 8, 'LPL', 'Gustavo M. G. Martins'),
  (2, 'Tarde', 'B', 3, 3, 'BD', 'Bruno Cano'),
  (2, 'Tarde', 'B', 3, 4, 'BD', 'Bruno Cano'),
  (2, 'Tarde', 'B', 3, 5, 'PW', 'Ricardo F. Palhares'),
  (2, 'Tarde', 'B', 3, 6, 'PW', 'Ricardo F. Palhares'),
  (2, 'Tarde', 'B', 5, 3, 'DS', 'Ricardo F. Palhares'),
  (2, 'Tarde', 'B', 5, 4, 'DS', 'Ricardo F. Palhares'),
  (2, 'Tarde', 'B', 5, 5, 'DS', 'Ricardo F. Palhares'),
  (3, 'Manha', 'A', 2, 1, 'IPSSI', 'Juarez B. de S. Junior'),
  (3, 'Manha', 'A', 2, 2, 'IPSSI', 'Juarez B. de S. Junior'),
  (3, 'Manha', 'A', 2, 3, 'BIO', 'Sandra R. S. de Oliveira'),
  (3, 'Manha', 'A', 2, 4, 'BIO', 'Sandra R. S. de Oliveira'),
  (3, 'Manha', 'A', 2, 5, 'FILO', 'Alícia V. Lima'),
  (3, 'Manha', 'A', 2, 6, 'FILO', 'Alícia V. Lima'),
  (3, 'Manha', 'A', 3, 1, 'LP', 'Gustavo M. G. Martins'),
  (3, 'Manha', 'A', 3, 2, 'LP', 'Gustavo M. G. Martins'),
  (3, 'Manha', 'A', 3, 3, 'SE', 'Aleteia V. M. Souto'),
  (3, 'Manha', 'A', 3, 4, 'SE', 'Aleteia V. M. Souto'),
  (3, 'Manha', 'A', 3, 5, 'MAT', 'Joao E. T. Martins'),
  (3, 'Manha', 'A', 3, 6, 'MAT', 'Joao E. T. Martins'),
  (3, 'Manha', 'A', 4, 1, 'PAM II', 'Joao P. T. de Siles'),
  (3, 'Manha', 'A', 4, 2, 'PAM II', 'Joao P. T. de Siles'),
  (3, 'Manha', 'A', 4, 3, 'GEO', 'Luis T. V. Festino'),
  (3, 'Manha', 'A', 4, 4, 'GEO', 'Luis T. V. Festino'),
  (3, 'Manha', 'A', 4, 5, 'QTS', 'Marcio Bergamin'),
  (3, 'Manha', 'A', 4, 6, 'QTS', 'Marcio Bergamin'),
  (3, 'Manha', 'A', 5, 1, 'PDTCC', 'Davi Vilar'),
  (3, 'Manha', 'A', 5, 2, 'PDTCC', 'Davi Vilar'),
  (3, 'Manha', 'A', 5, 3, 'PDTCC', 'Davi Vilar'),
  (3, 'Manha', 'A', 5, 4, 'LP', 'Gustavo M. G. Martins'),
  (3, 'Manha', 'A', 5, 5, 'LI', 'Leandro B. de Souza'),
  (3, 'Manha', 'A', 5, 6, 'LI', 'Leandro B. de Souza'),
  (3, 'Manha', 'A', 6, 1, 'MAT', 'Joao E. T. Martins'),
  (3, 'Manha', 'A', 6, 2, 'MAT', 'Joao E. T. Martins'),
  (3, 'Manha', 'A', 6, 3, 'SOCIO', 'Alícia V. Lima'),
  (3, 'Manha', 'A', 6, 4, 'SOCIO', 'Alícia V. Lima'),
  (3, 'Manha', 'A', 6, 5, 'PW III', 'Joao P. T. de Siles'),
  (3, 'Manha', 'A', 6, 6, 'PW III', 'Joao P. T. de Siles'),
  (3, 'Manha', 'B', 2, 1, 'IPSSI', 'Bruno Cano'),
  (3, 'Manha', 'B', 2, 2, 'IPSSI', 'Bruno Cano'),
  (3, 'Manha', 'B', 4, 5, 'QTS', 'Thiago G. Pascotto'),
  (3, 'Manha', 'B', 4, 6, 'QTS', 'Thiago G. Pascotto'),
  (3, 'Manha', 'B', 5, 1, 'PDTCC', 'Célide T. da Silva'),
  (3, 'Manha', 'B', 5, 2, 'PDTCC', 'Célide T. da Silva'),
  (3, 'Manha', 'B', 5, 3, 'PDTCC', 'Célide T. da Silva'),
  (3, 'Tarde', 'A', 2, 3, 'SE', 'Bruno Cano'),
  (3, 'Tarde', 'A', 2, 4, 'SE', 'Bruno Cano'),
  (3, 'Tarde', 'A', 2, 5, 'GEO', 'Valdeci B. Mangianelli'),
  (3, 'Tarde', 'A', 2, 6, 'GEO', 'Valdeci B. Mangianelli'),
  (3, 'Tarde', 'A', 2, 7, 'MAT', 'Joao E. T. Martins'),
  (3, 'Tarde', 'A', 2, 8, 'MAT', 'Joao E. T. Martins'),
  (3, 'Tarde', 'A', 3, 3, 'IPSSI', 'Aleteia V. M. Souto'),
  (3, 'Tarde', 'A', 3, 4, 'IPSSI', 'Aleteia V. M. Souto'),
  (3, 'Tarde', 'A', 3, 5, 'BIO', 'Fernanda C. Medeiros'),
  (3, 'Tarde', 'A', 3, 6, 'BIO', 'Fernanda C. Medeiros'),
  (3, 'Tarde', 'A', 3, 7, 'SOCIO', 'Ricardo S. Arruda / Gabriel P. de G. Alves'),
  (3, 'Tarde', 'A', 3, 8, 'SOCIO', 'Ricardo S. Arruda / Gabriel P. de G. Alves'),
  (3, 'Tarde', 'A', 4, 3, 'PW III', 'Davi Vilar'),
  (3, 'Tarde', 'A', 4, 4, 'PW III', 'Davi Vilar'),
  (3, 'Tarde', 'A', 4, 5, 'QTS', 'Davi Vilar'),
  (3, 'Tarde', 'A', 4, 6, 'QTS', 'Davi Vilar'),
  (3, 'Tarde', 'A', 4, 7, 'MAT', 'Joao E. T. Martins'),
  (3, 'Tarde', 'A', 4, 8, 'MAT', 'Joao E. T. Martins'),
  (3, 'Tarde', 'A', 5, 3, 'LP', 'Vinicius B. M. Guidio'),
  (3, 'Tarde', 'A', 5, 4, 'LP', 'Vinicius B. M. Guidio'),
  (3, 'Tarde', 'A', 5, 5, 'LP', 'Vinicius B. M. Guidio'),
  (3, 'Tarde', 'A', 5, 6, 'PDTCC', 'Davi Vilar'),
  (3, 'Tarde', 'A', 5, 7, 'PDTCC', 'Davi Vilar'),
  (3, 'Tarde', 'A', 5, 8, 'PDTCC', 'Davi Vilar'),
  (3, 'Tarde', 'A', 6, 3, 'PAM II', 'Bruno Cano'),
  (3, 'Tarde', 'A', 6, 4, 'PAM II', 'Bruno Cano'),
  (3, 'Tarde', 'A', 6, 5, 'FILO', 'Alícia V. Lima'),
  (3, 'Tarde', 'A', 6, 6, 'FILO', 'Alícia V. Lima'),
  (3, 'Tarde', 'A', 6, 7, 'LI', 'Veruska M. de Sousa'),
  (3, 'Tarde', 'A', 6, 8, 'LI', 'Veruska M. de Sousa'),
  (3, 'Tarde', 'B', 2, 3, 'SE', 'Ricardo F. Palhares'),
  (3, 'Tarde', 'B', 2, 4, 'SE', 'Ricardo F. Palhares'),
  (3, 'Tarde', 'B', 3, 3, 'IPSSI', 'Célide T. da Silva'),
  (3, 'Tarde', 'B', 3, 4, 'IPSSI', 'Célide T. da Silva'),
  (3, 'Tarde', 'B', 4, 3, 'PW III', 'Luiz A. de Lima'),
  (3, 'Tarde', 'B', 4, 4, 'PW III', 'Luiz A. de Lima'),
  (3, 'Tarde', 'B', 4, 5, 'QTS', 'Luiz A. de Lima'),
  (3, 'Tarde', 'B', 4, 6, 'QTS', 'Luiz A. de Lima'),
  (3, 'Tarde', 'B', 5, 6, 'PDTCC', 'Ricardo F. Palhares'),
  (3, 'Tarde', 'B', 5, 7, 'PDTCC', 'Ricardo F. Palhares'),
  (3, 'Tarde', 'B', 5, 8, 'PDTCC', 'Ricardo F. Palhares'),
  (3, 'Tarde', 'B', 6, 3, 'PAM II', 'Ricardo F. Palhares'),
  (3, 'Tarde', 'B', 6, 4, 'PAM II', 'Ricardo F. Palhares');

INSERT INTO grade_horaria (turma_id, disciplina_id, professor_id, horario_id)
SELECT t.id, d.id, p.id, h.id
FROM tmp_grade g
JOIN turmas t        ON t.ano = g.ano AND t.turno = g.turno AND t.grupo = g.grupo
JOIN disciplinas d   ON d.nome = g.disciplina
JOIN professores p   ON p.nome = g.professor
JOIN horarios_aula h ON h.turno = g.turno AND h.dia_semana = g.dia_semana AND h.numero_aula = g.numero_aula;

DROP TEMPORARY TABLE tmp_grade;

-- Conferência: deve retornar 237
SELECT COUNT(*) AS total_aulas FROM grade_horaria;