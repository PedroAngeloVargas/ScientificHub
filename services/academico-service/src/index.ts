import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import publicacaoRoutes from './routes/publicacaoRoutes.js';
import postagemRoutes from './routes/postagemRoutes.js';
import { enviarArquivo } from './lib/armazenamento.js';

const app = express();
const PORT = process.env.PORT || 3002; // Porta diferente do perfil-service!

app.use(cors());
app.use(express.json());

// Usada pelo Kubernetes e pelo Load Balancer para saber se o serviço está pronto
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// PDFs e imagens: vêm do Cloud Storage em produção ou da pasta uploads/ localmente
app.get('/uploads/:nome', (req, res) => {
  enviarArquivo(req.params.nome, res);
});

app.use('/api/publicacoes', publicacaoRoutes);
app.use('/api/postagens', postagemRoutes);

app.listen(PORT, () => {
  console.log(`Academico Service rodando na porta ${PORT}`);
});