import 'dotenv/config';
import path from 'path';
import express from 'express';
import cors from 'cors';
import publicacaoRoutes from './routes/publicacaoRoutes.js';
import postagemRoutes from './routes/postagemRoutes.js';

const app = express();
const PORT = process.env.PORT || 3002; // Porta diferente do perfil-service!

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/api/publicacoes', publicacaoRoutes);
app.use('/api/postagens', postagemRoutes);

app.listen(PORT, () => {
  console.log(`Academico Service rodando na porta ${PORT}`);
});