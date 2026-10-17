import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export const createPublicacao = async (req: Request, res: Response): Promise<void> => {
  // Quando usamos multer, os campos de texto vêm em req.body e o ficheiro em req.file
  const { titulo, resumo, categoria, autorPrincipalId, orientadorId, dataPublicacao } = req.body;
  
  // Captura o caminho do ficheiro salvo pelo multer (se existir)
  const arquivoUrl = req.file ? `/uploads/${req.file.filename}` : null;

  if (!req.file) {
    res.status(400).json({ error: 'O upload do arquivo PDF é obrigatório.' });
    return;
  }

  try {
    const nova = await prisma.publicacao.create({
      data: { 
        titulo, 
        resumo, 
        categoria, 
        arquivoUrl, 
        autorPrincipalId, 
        orientadorId, // <-- NOVO
        dataPublicacao: new Date(dataPublicacao) 
      },
    });
    res.status(201).json(nova);
  } catch (error) {
    console.error("ERRO DO PRISMA:", error);
    res.status(500).json({ error: 'Erro ao criar publicação' });
  }
};

export const getPublicacoes = async (req: Request, res: Response) => {
  try {
    const publicacoes = await prisma.publicacao.findMany({
      orderBy: { criadoEm: 'desc' }
    });
    res.json(publicacoes);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar publicações' });
  }
};