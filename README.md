# QueryPeriodDB

Sistema web para consultar e gerenciar a **grade horária** de uma escola: turmas, professores, disciplinas e horários. API em **Node.js + Express** com banco **MySQL (XAMPP)** e uma interface simples em HTML/JavaScript, sem framework.

## Funcionalidades

**Grade principal**
- 6 filtros em caixas de seleção, preenchidas pela própria API: ano, turno, grupo, professor, disciplina e dia da semana.
- Quadro semanal quando uma turma completa é escolhida (ano + turno + grupo).
- Resultados agrupáveis por turma, dia, professor ou disciplina, em blocos recolhidos que você expande se quiser.
- O grupo B enxerga também as aulas da classe inteira (herdadas do grupo A).

**Consulta avançada**
- Barra de pesquisa com busca aproximada: tolera erros de digitação e ignora acentos e maiúsculas.
- Combina várias palavras (ex.: `1 manha A`, `maria quarta`) e classifica os resultados por categoria: professores, disciplinas, turmas, horários e aulas.

**Adições**
- **Adicionar professor** à lista geral.
- **Adicionar à grade:** preencher um slot "A definir" ou criar uma aula nova em um horário livre. Horários já ocupados aparecem desativados com o motivo.
- **Editar ou excluir** uma atribuição existente, inclusive só para o grupo A ou só para o grupo B.

##  Tecnologias

Node.js 18+ · Express 4 · mysql2 · MySQL (XAMPP) · HTML, CSS e JavaScript puro

##  Estrutura

```
grade-escolar/
├── server.js        # sobe o Express, serve o front e carrega as rotas
├── routes.js        # todas as rotas da API
├── database.js      # conexão MySQL, criação do banco/tabelas e as 12 turmas
├── dados_pdf.sql    # carga inicial da grade (dados do PDF de horários)
├── package.json
└── public/
    └── index.html   # interface (3 abas)
```

##  Como rodar

### Primeira vez em uma máquina nova

1. **Instale o Node.js** (18 ou mais novo) e o **XAMPP**.
2. **Ligue o MySQL e o Apache** no XAMPP Control Panel. O Apache só é necessário para abrir o phpMyAdmin.
3. **Abra o projeto no VS Code**, na pasta que tem o `server.js`, e abra o terminal nela.
4. **Instale as dependências:**
   ```bash
   npm install
   ```
5. **Rode o servidor pela primeira vez:**
   ```bash
   npm start
   ```
   Esse primeiro start cria sozinho o banco `grade_escolar` e as tabelas. Pode deixar rodando.
6. **Abra o phpMyAdmin** em <http://localhost/phpmyadmin> e clique no banco `grade_escolar`.
7. **Rode o `dados_pdf.sql` dentro do banco:** na aba **Importar**, escolha o arquivo e clique em **Importar** (ou cole o conteúdo na aba **SQL** e clique em **Executar**). No final, o resultado deve mostrar `total_aulas = 237`.
8. **Acesse** <http://localhost:3000>.

### No dia a dia

Ligue só o **MySQL** no XAMPP, rode `npm start` e abra <http://localhost:3000>. Não rode o `dados_pdf.sql` de novo: a grade dá erro de duplicidade. O Apache só é preciso quando você quiser mexer direto no banco.

> Para refazer a carga do zero, apague a grade antes: `DELETE FROM grade_horaria;`

### Configuração (opcional)

O padrão do XAMPP é usuário `root`, sem senha, porta 3306. Para mudar, use variáveis de ambiente:

| Variável | Padrão | Descrição |
|---|---|---|
| `DB_HOST` | `localhost` | Servidor MySQL |
| `DB_PORT` | `3306` | Porta do MySQL |
| `DB_USER` | `root` | Usuário |
| `DB_PASSWORD` | *(vazio)* | Senha |
| `DB_NAME` | `grade_escolar` | Nome do banco |
| `PORT` | `3000` | Porta do servidor web |

Exemplo no PowerShell: `$env:DB_PASSWORD="minhasenha"; npm start`

##  Como os dados estão organizados

- **Turma** = ano (1 a 3) + turno (`Manha` ou `Tarde`) + grupo (`A` ou `B`), totalizando 12 turmas criadas automaticamente.
- **Aulas da classe inteira** ficam gravadas no **grupo A**; o grupo B as herda automaticamente. O grupo B só tem registro próprio quando seu professor ou disciplina é diferente.
- A tabela `grade_excecoes` guarda os horários em que o grupo B **não** tem a aula do A.
- Cada horário (`horarios_aula`) é identificado por turno + dia + número da aula. O número 9 é o contraturno. Na tarde, a 1ª aula da 2ª e da 3ª série (13:00) é a 3ª aula no banco, para os horários baterem pelo relógio.
- As regras `UNIQUE` impedem que uma turma tenha duas aulas no mesmo horário e que um professor esteja em dois lugares ao mesmo tempo.
- O professor **"A definir"** marca aulas cujo professor não constava no PDF.

##  Rotas da API

| Recurso | Rotas |
|---|---|
| Professores | `GET /professores` · `GET /professores/:id` · `POST` · `PUT /:id` · `DELETE /:id` |
| Disciplinas | `GET /disciplinas` · `POST` · `DELETE /:id` |
| Turmas | `GET /turmas?ano=&turno=&grupo=` |
| Horários | `GET /horarios?turno=&dia_semana=` · `POST /horarios` |
| Grade | `GET /grade?ano=&turno=&grupo=&professor_id=&disciplina_id=` · `POST /grade` · `PUT /grade/:id` · `DELETE /grade/:id` |
| Grade (só um grupo) | `POST /grade/:id/excluir-so-a` · `GET/POST /grade/excecoes` · `DELETE /grade/excecoes/:id` |

Exemplo de atribuição de aula:

```json
POST /grade
{
  "professor_id": 1,
  "disciplina_id": 1,
  "ano": 1,
  "turno": "Manha",
  "grupo": "A",
  "dia_semana": 2,
  "numero_aula": 1
}
```

`dia_semana`: 2 = segunda … 6 = sexta. Turno e grupo aceitam variações como `manhã` ou `b`.

##  Problemas comuns

| Erro | Causa e solução |
|---|---|
| `Cannot find module './routes'` | O `routes.js` não está na mesma pasta do `server.js`. |
| `ECONNREFUSED` ou "Falha ao iniciar" | O MySQL do XAMPP não está ligado. |
| `Access denied for user 'root'` | Seu MySQL tem senha: defina `DB_PASSWORD`. |
| `EADDRINUSE` na porta 3000 | Use outra porta: `$env:PORT=3001; npm start`. |
| Apache não inicia | A porta 80 ou 443 está ocupada; troque em **Config → Service and Port Settings** no XAMPP. |
| Grupo B mostra só as aulas próprias | O servidor está com o `routes.js` antigo: pare (`Ctrl + C`), rode `npm start` de novo e atualize a página com `Ctrl + F5`. |

##  Observações

- O banco **não** vai no repositório: ele fica no MySQL de cada máquina. Para levar o estado atual para outra máquina, use **Exportar** e **Importar** do phpMyAdmin no banco `grade_escolar`.
- Os horários de término das aulas são estimados em 50 minutos, pois o PDF original só traz o início.
