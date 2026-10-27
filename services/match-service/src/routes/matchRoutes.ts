import { Router } from 'express';
import { 
  vincularInteressesUsuario, 
  vincularTemasProjeto, 
  recomendarProjetos 
} from '../controllers/matchController.js';
import { verificarToken, verificarTokenSemMfa } from '../middlewares/authMiddleware.js';
import { listarAreas, getInteressesUsuario, substituirInteressesUsuario } from '../controllers/matchController.js';

const router = Router();

// Todas as rotas protegidas por JWT
// Interesses e lista de áreas são usados no primeiro acesso, antes do MFA
router.post('/usuarios/interesses', verificarTokenSemMfa, vincularInteressesUsuario);
router.post('/projetos/temas', verificarToken, vincularTemasProjeto);
router.get('/recomendacoes/:perfilId', verificarToken, recomendarProjetos);
router.get('/areas', verificarTokenSemMfa, listarAreas);

// Menu de perfil
router.get('/usuarios/:perfilId/interesses', verificarToken, getInteressesUsuario);
router.put('/usuarios/interesses', verificarToken, substituirInteressesUsuario);

export default router;