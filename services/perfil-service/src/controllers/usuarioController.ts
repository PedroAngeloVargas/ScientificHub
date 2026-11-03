import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import type { AuthRequest } from '../middlewares/authMiddleware.js';

const EMAIL_REITORIA = 'admin@uemg.br';
const isAdmin = (req: Request) => (req as AuthRequest).usuario?.email === EMAIL_REITORIA;

export const getUsuarios = async (req: Request, res: Response) => {
  try {
    // A Reitoria vê tudo. Os demais só o necessário para mostrar nomes (autores, orientadores):
    // CPF, telefone, endereço e matrícula dos outros não saem daqui.
    const usuarios = isAdmin(req)
      ? await prisma.usuario.findMany({ orderBy: { nome: 'asc' } })
      : await prisma.usuario.findMany({
          select: { id: true, nome: true, email: true, tipo: true, curso: true },
          orderBy: { nome: 'asc' },
        });
    res.json(usuarios);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao procurar utilizadores' });
  }
};

export const getUsuario = async (req: Request, res: Response): Promise<void> => {
  // O perfil completo é só do próprio usuário (e da Reitoria)
  if (!isAdmin(req) && (req as AuthRequest).usuario?.perfilId !== req.params.id) {
    res.status(403).json({ error: 'Só pode ver o seu próprio perfil.' });
    return;
  }
  try {
    const usuario = await prisma.usuario.findUnique({ where: { id: req.params.id as string } });
    if (!usuario) {
      res.status(404).json({ error: 'Utilizador não encontrado.' });
      return;
    }
    res.json(usuario);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao procurar utilizador' });
  }
};

export const createUsuario = async (req: Request, res: Response) => {
  // 1. Extraia também o cpf, telefone e endereco do req.body
  const { nome, email, matricula, tipo, curso, departamento, cpf, telefone, endereco } = req.body;
  
  try {
    const novoUsuario = await prisma.usuario.create({
      data: {
        nome,
        email,
        matricula,
        tipo,
        curso,
        departamento,
        cpf,        
        telefone,   
        endereco   
      }
    });
    
    res.status(201).json(novoUsuario);
  } catch (error) {
    console.error("Erro ao criar utilizador:", error);
    res.status(500).json({ error: 'Erro ao criar utilizador' });
  }
};

export const atualizarUsuario = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string; 
  const { telefone, endereco } = req.body;

  // Cada utilizador só pode alterar o próprio perfil
  if ((req as AuthRequest).usuario.perfilId !== id) {
    res.status(403).json({ error: 'Só pode alterar o seu próprio perfil.' });
    return;
  }

  try {
    const atualizado = await prisma.usuario.update({
      where: { id },
      data: { telefone, endereco }
    });
    res.json(atualizado);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar perfil.' });
  }
};