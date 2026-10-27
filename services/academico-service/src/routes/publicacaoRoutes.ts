import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { getPublicacoes, createPublicacao, getOrientacoes, avaliarPublicacao } from '../controllers/publicacaoController.js';
import { verificarToken } from '../middlewares/authMiddleware.js';

// O ficheiro fica em memória; o controller grava-o no Cloud Storage (ou em uploads/ localmente)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (req, file, cb) => {
    // Bloqueia qualquer coisa que não seja PDF
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos PDF são permitidos.'));
    }
  }
});

// Devolve os erros do Multer como JSON amigável em vez da página de erro do Express
const uploadPdf = (req: Request, res: Response, next: NextFunction) => {
  upload.single('arquivo')(req, res, (err: unknown) => {
    if (!err) return next();
    const mensagem = err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE'
      ? 'O PDF deve ter no máximo 20 MB.'
      : (err as Error).message;
    res.status(400).json({ error: mensagem });
  });
};

const router = Router();

router.get('/', getPublicacoes);

// Injeta o upload.single('arquivo') ANTES de chamar o controller
router.post('/', verificarToken, uploadPdf, createPublicacao);

// Aprovação pelo professor orientador
router.get('/orientacoes', verificarToken, getOrientacoes);
router.patch('/:id/avaliacao', verificarToken, avaliarPublicacao);

export default router;