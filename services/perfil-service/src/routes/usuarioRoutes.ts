import { verificarToken } from '../middlewares/authMiddleware.js';
import { Router } from 'express';
import { getUsuarios, createUsuario, atualizarUsuario } from '../controllers/usuarioController.js';

const router = Router();

router.get('/', verificarToken, getUsuarios);
router.post('/', createUsuario);
router.put('/:id', verificarToken, atualizarUsuario)

export default router;