import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { apagarArquivo, salvarArquivo } from '../lib/armazenamento.js';
import type { AuthRequest } from '../middlewares/authMiddleware.js';

export const createPublicacao = async (req: Request, res: Response): Promise<void> => {
  // Quando usamos multer, os campos de texto vêm em req.body e o ficheiro em req.file
  const { titulo, resumo, categoria, autorPrincipalId, orientadorId, dataPublicacao } = req.body;
  
  if (!req.file) {
    res.status(400).json({ error: 'O upload do arquivo PDF é obrigatório.' });
    return;
  }

  let arquivoUrl: string | null = null;
  try {
    arquivoUrl = await salvarArquivo(req.file, 'pdf');
    const nova = await prisma.publicacao.create({
      data: { 
        titulo, 
        resumo, 
        categoria, 
        arquivoUrl, 
        autorPrincipalId, 
        orientadorId, // <-- NOVO
        // Com orientador, a publicação só aparece no feed depois de aprovada
        status: orientadorId ? 'PENDENTE' : 'APROVADA',
        dataPublicacao: new Date(dataPublicacao)
      },
    });
    res.status(201).json(nova);
  } catch (error) {
    console.error("ERRO DO PRISMA:", error);
    await apagarArquivo(arquivoUrl); // Não deixa o PDF órfão se o registo falhar
    res.status(500).json({ error: 'Erro ao criar publicação' });
  }
};

export const getPublicacoes = async (req: Request, res: Response) => {
  try {
    // O feed público só mostra o que já foi aprovado
    const publicacoes = await prisma.publicacao.findMany({
      where: { status: 'APROVADA' },
      orderBy: { criadoEm: 'desc' }
    });
    res.json(publicacoes);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar publicações' });
  }
};

// Publicações em que o professor autenticado é o orientador (todas as situações)
export const getOrientacoes = async (req: AuthRequest, res: Response) => {
  const perfilId = req.usuario.perfilId;
  try {
    const publicacoes = await prisma.publicacao.findMany({
      where: { orientadorId: perfilId },
      orderBy: { criadoEm: 'desc' }
    });
    res.json(publicacoes);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar orientações' });
  }
};

export const avaliarPublicacao = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const { status, parecer } = req.body;
  const perfilId = req.usuario.perfilId;

  if (status !== 'APROVADA' && status !== 'REJEITADA') {
    res.status(400).json({ error: 'Status inválido. Use APROVADA ou REJEITADA.' });
    return;
  }
  if (status === 'REJEITADA' && !parecer?.trim()) {
    res.status(400).json({ error: 'Informe um parecer ao rejeitar a publicação.' });
    return;
  }

  try {
    const publicacao = await prisma.publicacao.findUnique({ where: { id } });
    if (!publicacao) {
      res.status(404).json({ error: 'Publicação não encontrada.' });
      return;
    }
    if (publicacao.orientadorId !== perfilId) {
      res.status(403).json({ error: 'Apenas o orientador pode avaliar esta publicação.' });
      return;
    }
    if (publicacao.status !== 'PENDENTE') {
      res.status(409).json({ error: 'Esta publicação já foi avaliada.' });
      return;
    }

    const avaliada = await prisma.publicacao.update({
      where: { id },
      data: { status, parecer: parecer?.trim() || null, avaliadoEm: new Date() }
    });
    res.json(avaliada);
  } catch (error) {
    console.error("ERRO DO PRISMA:", error);
    res.status(500).json({ error: 'Erro ao avaliar publicação' });
  }
};