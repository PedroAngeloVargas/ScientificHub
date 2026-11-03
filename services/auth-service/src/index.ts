import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import { contaAtiva } from './controllers/authController.js';

const app = express();
const PORT = process.env.PORT || 3000; // Auth rodará na 3000

app.use(cors());
app.use(express.json());

// Usada pelo Kubernetes e pelo Load Balancer para saber se o serviço está pronto
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);

// Só para os outros serviços, dentro do cluster. Fica fora de /api/auth de propósito: o Ingress só
// encaminha /api/auth, então esta rota não é alcançável pela internet.
app.get('/interno/contas/:perfilId/ativa', contaAtiva);

app.listen(PORT, () => {
  console.log(`Auth Service a correr na porta ${PORT}`);
});