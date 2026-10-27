import type { Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { prisma } from '../lib/prisma.js';
import type { AuthRequest } from '../middlewares/authMiddleware.js';

const CATEGORIAS = ['GERAL', 'EVENTO', 'OPORTUNIDADE', 'DUVIDA', 'CONQUISTA'] as const;
const MAX_POSTAGEM = 2000;
const MAX_COMENTARIO = 500;
const POR_PAGINA = 15;

// A Reitoria pode moderar (apagar) qualquer conteúdo
const isAdmin = (req: AuthRequest) => req.usuario.email === 'admin@uemg.br';

// Apaga do disco a imagem enviada (usado em erros e na exclusão da postagem)
const apagarImagem = async (imagemUrl: string | null | undefined) => {
  if (!imagemUrl) return;
  await fs.unlink(path.join(process.cwd(), imagemUrl)).catch(() => {});
};

export const getPostagens = async (req: AuthRequest, res: Response) => {
  const perfilId = req.usuario.perfilId;
  const { categoria, cursor } = req.query as { categoria?: string; cursor?: string };

  try {
    const postagens = await prisma.postagem.findMany({
      where: CATEGORIAS.includes(categoria as any) ? { categoria: categoria as any } : {},
      orderBy: [{ criadoEm: 'desc' }, { id: 'desc' }],
      take: POR_PAGINA + 1, // Busca uma a mais para saber se há próxima página
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      include: {
        _count: { select: { curtidas: true, comentarios: true } },
        curtidas: { where: { usuarioId: perfilId }, select: { usuarioId: true } },
      },
    });

    const temMais = postagens.length > POR_PAGINA;
    const pagina = postagens.slice(0, POR_PAGINA);

    res.json({
      postagens: pagina.map(({ _count, curtidas, ...p }) => ({
        ...p,
        totalCurtidas: _count.curtidas,
        totalComentarios: _count.comentarios,
        curtidoPorMim: curtidas.length > 0,
      })),
      proximoCursor: temMais ? pagina[pagina.length - 1]!.id : null,
    });
  } catch (error) {
    console.error('ERRO DO PRISMA:', error);
    res.status(500).json({ error: 'Erro ao carregar o feed da comunidade.' });
  }
};

export const createPostagem = async (req: AuthRequest, res: Response): Promise<void> => {
  const conteudo = String(req.body.conteudo ?? '').trim();
  const categoria = req.body.categoria ?? 'GERAL';
  const imagemUrl = req.file ? `/uploads/${req.file.filename}` : null;

  if (!conteudo || conteudo.length > MAX_POSTAGEM) {
    await apagarImagem(imagemUrl);
    res.status(400).json({ error: `A postagem deve ter entre 1 e ${MAX_POSTAGEM} caracteres.` });
    return;
  }
  if (!CATEGORIAS.includes(categoria)) {
    await apagarImagem(imagemUrl);
    res.status(400).json({ error: 'Categoria inválida.' });
    return;
  }

  try {
    const nova = await prisma.postagem.create({
      // O autor vem sempre do token, nunca do corpo da requisição
      data: { autorId: req.usuario.perfilId, conteudo, categoria, imagemUrl },
    });
    res.status(201).json({ ...nova, totalCurtidas: 0, totalComentarios: 0, curtidoPorMim: false });
  } catch (error) {
    console.error('ERRO DO PRISMA:', error);
    await apagarImagem(imagemUrl);
    res.status(500).json({ error: 'Erro ao publicar a postagem.' });
  }
};

export const deletePostagem = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;
  try {
    const postagem = await prisma.postagem.findUnique({ where: { id } });
    if (!postagem) {
      res.status(404).json({ error: 'Postagem não encontrada.' });
      return;
    }
    if (postagem.autorId !== req.usuario.perfilId && !isAdmin(req)) {
      res.status(403).json({ error: 'Só pode apagar as suas próprias postagens.' });
      return;
    }

    // Curtidas e comentários são removidos em cascata
    await prisma.postagem.delete({ where: { id } });
    await apagarImagem(postagem.imagemUrl);
    res.status(204).end();
  } catch (error) {
    console.error('ERRO DO PRISMA:', error);
    res.status(500).json({ error: 'Erro ao apagar a postagem.' });
  }
};

// Alterna a curtida do utilizador (curte / descurte)
export const alternarCurtida = async (req: AuthRequest, res: Response): Promise<void> => {
  const postagemId = req.params.id as string;
  const usuarioId = req.usuario.perfilId;

  try {
    const chave = { postagemId_usuarioId: { postagemId, usuarioId } };
    const existente = await prisma.curtida.findUnique({ where: chave });

    if (existente) {
      await prisma.curtida.delete({ where: chave });
    } else {
      await prisma.curtida.create({ data: { postagemId, usuarioId } });
    }

    const totalCurtidas = await prisma.curtida.count({ where: { postagemId } });
    res.json({ curtidoPorMim: !existente, totalCurtidas });
  } catch (error: any) {
    // P2003: a postagem não existe (chave estrangeira)
    if (error?.code === 'P2003') {
      res.status(404).json({ error: 'Postagem não encontrada.' });
      return;
    }
    console.error('ERRO DO PRISMA:', error);
    res.status(500).json({ error: 'Erro ao curtir a postagem.' });
  }
};

export const getComentarios = async (req: AuthRequest, res: Response) => {
  try {
    const comentarios = await prisma.comentario.findMany({
      where: { postagemId: req.params.id as string },
      orderBy: { criadoEm: 'asc' },
    });
    res.json(comentarios);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar os comentários.' });
  }
};

export const createComentario = async (req: AuthRequest, res: Response): Promise<void> => {
  const postagemId = req.params.id as string;
  const conteudo = String(req.body.conteudo ?? '').trim();

  if (!conteudo || conteudo.length > MAX_COMENTARIO) {
    res.status(400).json({ error: `O comentário deve ter entre 1 e ${MAX_COMENTARIO} caracteres.` });
    return;
  }

  try {
    const novo = await prisma.comentario.create({
      data: { postagemId, autorId: req.usuario.perfilId, conteudo },
    });
    res.status(201).json(novo);
  } catch (error: any) {
    if (error?.code === 'P2003') {
      res.status(404).json({ error: 'Postagem não encontrada.' });
      return;
    }
    console.error('ERRO DO PRISMA:', error);
    res.status(500).json({ error: 'Erro ao publicar o comentário.' });
  }
};

export const deleteComentario = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id, comentarioId } = req.params as { id: string; comentarioId: string };
  try {
    const comentario = await prisma.comentario.findUnique({ where: { id: comentarioId } });
    if (!comentario || comentario.postagemId !== id) {
      res.status(404).json({ error: 'Comentário não encontrado.' });
      return;
    }
    if (comentario.autorId !== req.usuario.perfilId && !isAdmin(req)) {
      res.status(403).json({ error: 'Só pode apagar os seus próprios comentários.' });
      return;
    }

    await prisma.comentario.delete({ where: { id: comentarioId } });
    res.status(204).end();
  } catch (error) {
    console.error('ERRO DO PRISMA:', error);
    res.status(500).json({ error: 'Erro ao apagar o comentário.' });
  }
};
