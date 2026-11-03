import type { TipoNotificacao } from '@prisma/client';
import { prisma } from './prisma.js';

const TAMANHO_RESUMO = 140;

interface NovaNotificacao {
  tipo: TipoNotificacao;
  atorId: string;
  referenciaId: string;
  resumo: string;
  destinatarioId?: string; // Sem destinatário = para todos os usuários
  ocultarPara?: string[];
  detalhe?: string | null;
}

// Uma falha ao notificar nunca derruba a ação principal (publicar, aprovar...): só fica no log
export async function notificar({ tipo, atorId, referenciaId, resumo, destinatarioId, ocultarPara, detalhe }: NovaNotificacao) {
  const texto = resumo.length > TAMANHO_RESUMO ? `${resumo.slice(0, TAMANHO_RESUMO).trimEnd()}...` : resumo;
  try {
    await prisma.notificacao.create({
      data: {
        tipo,
        atorId,
        referenciaId,
        resumo: texto,
        destinatarioId: destinatarioId ?? null,
        ocultarPara: ocultarPara ?? [],
        detalhe: detalhe ?? null,
      },
    });
  } catch (error) {
    console.error('ERRO AO CRIAR NOTIFICAÇÃO:', error);
  }
}

// Quando a postagem é apagada, o aviso sobre ela deixa de fazer sentido
export async function removerNotificacoes(referenciaId: string) {
  try {
    await prisma.notificacao.deleteMany({ where: { referenciaId } });
  } catch (error) {
    console.error('ERRO AO REMOVER NOTIFICAÇÕES:', error);
  }
}
