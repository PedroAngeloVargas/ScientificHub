import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export const getPublicacoes = async (req: Request, res: Response) => {
  try {
    const publicacoes = await prisma.publicacao.findMany();
    res.json(publicacoes);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar publicações' });
  }
};

export const createPublicacao = async (req: Request, res: Response) => {
  const { titulo, resumo, categoria, arquivoUrl, autorPrincipalId, dataPublicacao } = req.body;
  try {
    const nova = await prisma.publicacao.create({
      data: { titulo, resumo, categoria, arquivoUrl, autorPrincipalId, dataPublicacao: new Date(dataPublicacao) },
    });
    res.status(201).json(nova);
  } catch (error) {
    console.error("ERRO DO PRISMA:", error);
    res.status(500).json({ error: 'Erro ao criar publicação' });
  }
};