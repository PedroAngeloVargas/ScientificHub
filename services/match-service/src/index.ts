import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import matchRoutes from './routes/matchRoutes.js';

const app = express();
const PORT = process.env.PORT || 3003;

app.use(cors());
app.use(express.json());

app.use('/api/match', matchRoutes);

app.listen(PORT, () => {
  console.log(`Match Service (Neo4j) rodando na porta ${PORT}`);
});