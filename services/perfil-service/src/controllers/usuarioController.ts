import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export const getUsuarios = async (req: Request, res: Response) => {
  try {
    const usuarios = await prisma.usuario.findMany();
    res.json(usuarios);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao procurar utilizadores' });
  }
};

export const createUsuario = async (req: Request, res: Response) => {
  const { nome, email, matricula, tipo, curso, departamento } = req.body;
  try {
    const novoUsuario = await prisma.usuario.create({
      data: { nome, email, matricula, tipo, curso, departamento },
    });
    res.status(201).json(novoUsuario);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar utilizador' });
  }
};