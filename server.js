// server.js
const express = require('express');
const path = require('path');
const { initDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Serve o front-end (public/index.html) em http://localhost:3000
app.use(express.static(path.join(__dirname, 'public')));
app.get('/status', (req, res) => res.json({ status: 'ok', api: 'grade-escolar' }));

async function start() {
  // Banco precisa estar pronto antes de carregar as rotas
  await initDatabase();

  app.use(require('./routes'));

  app.use((req, res) => res.status(404).json({ erro: 'Rota não encontrada' }));

  // Tratamento global de erros
  app.use((err, req, res, next) => {
    if (err.status) return res.status(err.status).json({ erro: err.message });
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ erro: 'Registro duplicado ou conflito de horário' });
    }
    console.error(err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  });

  app.listen(PORT, () => console.log(`🚀 Servidor em http://localhost:${PORT}`));
}

start().catch((err) => {
  console.error('Falha ao iniciar (o MySQL do XAMPP está ligado?):', err.message);
  process.exit(1);
});