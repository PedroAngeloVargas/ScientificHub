import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';

const app = express();
const PORT = process.env.PORT || 3000; // Auth rodará na 3000

app.use(cors());
app.use(express.json());

// Usada pelo Kubernetes e pelo Load Balancer para saber se o serviço está pronto
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);

app.listen(PORT, () => {
  console.log(`Auth Service a correr na porta ${PORT}`);
});