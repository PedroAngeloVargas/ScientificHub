import type { Response } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import type { AuthRequest } from '../middlewares/authMiddleware.js';

const LIMITE_LISTA = 30;
const JANELA_DIAS = 30;

// O que este usuário pode ver: o que é dele e os avisos gerais, dos últimos 30 dias
const visiveisPara = (perfilId: string): Prisma.NotificacaoWhereInput => ({
  criadoEm: { gte: new Date(Date.now() - JANELA_DIAS * 24 * 60 * 60 * 1000) },
  OR: [
    { destinatarioId: perfilId },
    { destinatarioId: null, NOT: { ocultarPara: { has: perfilId } } },
  ],
});

const contarNaoLidas = (perfilId: string) =>
  prisma.notificacao.count({
    where: { ...visiveisPara(perfilId), leituras: { none: { usuarioId: perfilId } } },
  });

export const getNotificacoes = async (req: AuthRequest, res: Response) => {
  const perfilId = req.usuario.perfilId;
  try {
    const [notificacoes, naoLidas] = await Promise.all([
      prisma.notificacao.findMany({
        where: visiveisPara(perfilId),
        orderBy: { criadoEm: 'desc' },
        take: LIMITE_LISTA,
        include: { leituras: { where: { usuarioId: perfilId }, select: { usuarioId: true } } },
      }),
      contarNaoLidas(perfilId),
    ]);

    res.json({
      naoLidas,
      notificacoes: notificacoes.map(({ leituras, destinatarioId, ocultarPara, ...n }) => ({
        ...n,
        lida: leituras.length > 0,
      })),
    });
  } catch (error) {
    console.error('ERRO DO PRISMA:', error);
    res.status(500).json({ error: 'Erro ao carregar as notificações.' });
  }
};

// Consulta leve, feita periodicamente pelo sino do cabeçalho
export const getContagem = async (req: AuthRequest, res: Response) => {
  try {
    res.json({ naoLidas: await contarNaoLidas(req.usuario.perfilId) });
  } catch (error) {
    console.error('ERRO DO PRISMA:', error);
    res.status(500).json({ error: 'Erro ao contar as notificações.' });
  }
};

export const marcarComoLida = async (req: AuthRequest, res: Response): Promise<void> => {
  const perfilId = req.usuario.perfilId;
  const id = req.params.id as string;
  try {
    const notificacao = await prisma.notificacao.findFirst({ where: { id, ...visiveisPara(perfilId) }, select: { id: true } });
    if (!notificacao) {
      res.status(404).json({ error: 'Notificação não encontrada.' });
      return;
    }

    await prisma.notificacaoLeitura.createMany({
      data: [{ notificacaoId: id, usuarioId: perfilId }],
      skipDuplicates: true,
    });
    res.status(204).end();
  } catch (error) {
    console.error('ERRO DO PRISMA:', error);
    res.status(500).json({ error: 'Erro ao marcar a notificação como lida.' });
  }
};

export const marcarTodasComoLidas = async (req: AuthRequest, res: Response) => {
  const perfilId = req.usuario.perfilId;
  try {
    const naoLidas = await prisma.notificacao.findMany({
      where: { ...visiveisPara(perfilId), leituras: { none: { usuarioId: perfilId } } },
      select: { id: true },
    });

    await prisma.notificacaoLeitura.createMany({
      data: naoLidas.map(n => ({ notificacaoId: n.id, usuarioId: perfilId })),
      skipDuplicates: true,
    });
    res.status(204).end();
  } catch (error) {
    console.error('ERRO DO PRISMA:', error);
    res.status(500).json({ error: 'Erro ao marcar as notificações como lidas.' });
  }
};
