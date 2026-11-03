import { Router } from 'express';
import { getNotificacoes, getContagem, marcarComoLida, marcarTodasComoLidas } from '../controllers/notificacaoController.js';
import { verificarToken } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(verificarToken);

router.get('/', getNotificacoes);
router.get('/contagem', getContagem);
router.post('/lidas', marcarTodasComoLidas);
router.post('/:id/lida', marcarComoLida);

export default router;
