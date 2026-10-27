import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import usuarioRoutes from './routes/usuarioRoutes.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Usada pelo Kubernetes e pelo Load Balancer para saber se o serviço está pronto
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Rota base do serviço
app.use('/api/usuarios', usuarioRoutes);

app.listen(PORT, () => {
  console.log(`Perfil Service a correr na porta ${PORT}`);
});

// Executar com npm run dev para desenvolvimento ou npm start para produção.