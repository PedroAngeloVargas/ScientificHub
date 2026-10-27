import { Router } from 'express';
import { registrar, login, atualizarSenha, loginMfa, configurarMfa, ativarMfa, alterarSenha } from '../controllers/authController.js';
import { verificarToken, verificarTokenSemMfa } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/registrar', registrar);
router.post('/login', login);
router.post('/login/mfa', loginMfa);

// Permitidas antes do MFA: fazem parte do primeiro acesso / da configuração do segundo fator
router.put('/atualizar-senha', verificarTokenSemMfa, atualizarSenha);
router.post('/mfa/configurar', verificarTokenSemMfa, configurarMfa);
router.post('/mfa/ativar', verificarTokenSemMfa, ativarMfa);

// Menu de perfil
router.put('/senha', verificarToken, alterarSenha);

export default router;