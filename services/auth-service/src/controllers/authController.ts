import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';

export const registrar = async (req: Request, res: Response) => {
  const { email, senha, perfilId } = req.body;
  try {
    const saltRounds = 10;
    const senhaHash = await bcrypt.hash(senha, saltRounds);

    const novaCredencial = await prisma.credencial.create({
      data: { email, senha: senhaHash, perfilId },
    });

    res.status(201).json({ mensagem: 'Credencial criada com sucesso!' });
  } catch (error) {
    console.error("ERRO NO LOGIN:", error);
    res.status(500).json({ error: 'Erro ao registrar credencial.' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, senha } = req.body;
  try {
    const credencial = await prisma.credencial.findUnique({ where: { email } });
    if (!credencial) {
      res.status(401).json({ error: 'Email ou senha incorretos.' });
      return;
    }

    const senhaValida = await bcrypt.compare(senha, credencial.senha);
    if (!senhaValida) {
      res.status(401).json({ error: 'Email ou senha incorretos.' });
      return;
    }

    // Se a senha estiver correta, geramos o Token
    const secret = process.env.JWT_SECRET as string;
    const token = jwt.sign(
      { perfilId: credencial.perfilId, email: credencial.email }, // Payload
      secret,
      { expiresIn: '8h' } // Tempo de expiração
    );

  res.json({ 
      token, 
      perfilId: credencial.perfilId,
      primeiroAcesso: credencial.primeiroAcesso // <-- ADICIONAR ISTO
    });
  } catch (error) {
    console.error("ERRO NO LOGIN:", error);
    res.status(500).json({ error: 'Erro ao fazer login.' });
  }
};

export const atualizarSenha = async (req: any, res: Response) => {
  const { novaSenha } = req.body;
  const perfilId = req.usuario.perfilId; // Vem do token JWT
  try {
    const senhaHash = await bcrypt.hash(novaSenha, 10);
    await prisma.credencial.update({
      where: { perfilId },
      data: { senha: senhaHash, primeiroAcesso: false }
    });
    res.json({ mensagem: 'Senha atualizada e primeiro acesso concluído!' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar senha.' });
  }
};