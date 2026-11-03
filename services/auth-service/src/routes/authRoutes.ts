import { Router } from 'express';
import {
  registrar, login, atualizarSenha, loginMfa, configurarMfa, ativarMfa, alterarSenha,
  listarContas, definirAtivo, redefinirSenha,
} from '../controllers/authController.js';
import { verificarAdmin, verificarToken, verificarTokenSemMfa, verificarTokenTrocaSenha } from '../middlewares/authMiddleware.js';

const router = Router();

// Contas são criadas apenas pela Reitoria
router.post('/registrar', verificarToken, verificarAdmin, registrar);
router.post('/login', login);
router.post('/login/mfa', loginMfa);

// Permitidas antes do MFA: fazem parte do primeiro acesso / da configuração do segundo fator
router.put('/atualizar-senha', verificarTokenSemMfa, atualizarSenha);
router.post('/mfa/configurar', verificarTokenSemMfa, configurarMfa);
router.post('/mfa/ativar', verificarTokenSemMfa, ativarMfa);

// Menu de perfil e troca obrigatória da senha temporária (a única rota que a sessão temporária alcança)
router.put('/senha', verificarTokenTrocaSenha, alterarSenha);

// Administração de contas: só a Reitoria
router.get('/contas', verificarToken, verificarAdmin, listarContas);
router.patch('/contas/:perfilId/ativo', verificarToken, verificarAdmin, definirAtivo);
router.post('/contas/:perfilId/senha-temporaria', verificarToken, verificarAdmin, redefinirSenha);

export default router;