import { verificarToken } from '../middlewares/authMiddleware.js';
import { Router } from 'express';
import { getUsuarios, createUsuario } from '../controllers/usuarioController.js';

const router = Router();

router.get('/', verificarToken, getUsuarios);
router.post('/', createUsuario);

export default router;