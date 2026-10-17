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

export const atualizarUsuario = async (req: Request, res: Response) => {
  const id = req.params.id as string; 
  const { telefone, endereco } = req.body;
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