import { Router } from 'express';
import { registrar, login, atualizarSenha } from '../controllers/authController.js';
import { verificarToken } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/registrar', registrar);
router.post('/login', login);
router.put('/atualizar-senha', verificarToken, atualizarSenha);

export default router;