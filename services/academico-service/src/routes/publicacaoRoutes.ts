import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { getPublicacoes, createPublicacao } from '../controllers/publicacaoController.js';
import { verificarToken } from '../middlewares/authMiddleware.js';

// Configuração do Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Pasta onde salva
  },
  filename: (req, file, cb) => {
    // Renomeia o arquivo para evitar nomes duplicados: timestamp-nomeoriginal.pdf
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    // Bloqueia qualquer coisa que não seja PDF
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos PDF são permitidos.'));
    }
  }
});

const router = Router();

router.get('/', getPublicacoes);

// Injeta o upload.single('arquivo') ANTES de chamar o controller
router.post('/', verificarToken, upload.single('arquivo'), createPublicacao);

export default router;