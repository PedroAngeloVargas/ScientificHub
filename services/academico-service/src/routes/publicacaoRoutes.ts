import { verificarToken } from '../middlewares/authMiddleware.js';
import { Router } from 'express';
import { getPublicacoes, createPublicacao } from '../controllers/publicacaoController.js';

const router = Router();

router.get('/', getPublicacoes);
router.post('/', verificarToken, createPublicacao);

export default router;