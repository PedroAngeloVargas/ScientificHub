import { verificarToken, verificarTokenSemMfa } from '../middlewares/authMiddleware.js';
import { Router } from 'express';
import { getUsuarios, getUsuario, createUsuario, atualizarUsuario } from '../controllers/usuarioController.js';

const router = Router();

router.get('/', verificarToken, getUsuarios);
router.get('/:id', verificarToken, getUsuario);
router.post('/', createUsuario);
// Usada no primeiro acesso, antes de o MFA estar configurado
router.put('/:id', verificarTokenSemMfa, atualizarUsuario)

export default router;