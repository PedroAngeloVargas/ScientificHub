import { Router } from 'express';
import { 
  vincularInteressesUsuario, 
  vincularTemasProjeto, 
  recomendarProjetos 
} from '../controllers/matchController.js';
import { verificarToken } from '../middlewares/authMiddleware.js';
import { listarAreas } from '../controllers/matchController.js';

const router = Router();

// Todas as rotas protegidas por JWT
router.post('/usuarios/interesses', verificarToken, vincularInteressesUsuario);
router.post('/projetos/temas', verificarToken, vincularTemasProjeto);
router.get('/recomendacoes/:perfilId', verificarToken, recomendarProjetos);
router.get('/areas', verificarToken, listarAreas);

export default router;