import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import {
  getPostagens,
  createPostagem,
  deletePostagem,
  alternarCurtida,
  getComentarios,
  createComentario,
  deleteComentario,
} from '../controllers/postagemController.js';
import { verificarToken } from '../middlewares/authMiddleware.js';

const TIPOS_IMAGEM = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// Configuração do Multer para imagens das postagens (mesma pasta dos PDFs)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    // Nome aleatório + extensão original, para não expor o nome do ficheiro do utilizador
    cb(null, `post-${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname).toLowerCase()}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (TIPOS_IMAGEM.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Apenas imagens JPG, PNG, WEBP ou GIF são permitidas.'));
    }
  }
});

// Devolve os erros do Multer como JSON amigável em vez da página de erro do Express
const uploadImagem = (req: Request, res: Response, next: NextFunction) => {
  upload.single('imagem')(req, res, (err: unknown) => {
    if (!err) return next();
    const mensagem = err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE'
      ? 'A imagem deve ter no máximo 5 MB.'
      : (err as Error).message;
    res.status(400).json({ error: mensagem });
  });
};

const router = Router();

// Todas as rotas da comunidade exigem utilizador autenticado
router.use(verificarToken);

router.get('/', getPostagens);
router.post('/', uploadImagem, createPostagem);
router.delete('/:id', deletePostagem);

router.post('/:id/curtida', alternarCurtida);

router.get('/:id/comentarios', getComentarios);
router.post('/:id/comentarios', createComentario);
router.delete('/:id/comentarios/:comentarioId', deleteComentario);

export default router;
