import type { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { prisma } from '../lib/prisma.js';

// Aceita o código anterior/seguinte (±30s) para tolerar relógios ligeiramente desacertados
authenticator.options = { window: 1 };

const MAX_TENTATIVAS_MFA = 5;
// Tentativas falhadas por token intermediário (em memória: suficiente para uma instância)
const tentativasMfa = new Map<string, number>();

// Token de acesso real; mfa indica se a sessão passou pelo segundo fator
const emitirToken = (perfilId: string, email: string, mfa: boolean) =>
  jwt.sign({ perfilId, email, mfa }, process.env.JWT_SECRET as string, { expiresIn: '8h' });

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

    // Com MFA ativo, a senha sozinha não chega: devolvemos um token intermediário de 5 minutos
    if (credencial.mfaAtivo) {
      const tokenMfa = jwt.sign(
        { perfilId: credencial.perfilId, etapa: 'mfa', jti: randomUUID() },
        process.env.JWT_SECRET as string,
        { expiresIn: '5m' }
      );
      res.json({ mfaObrigatorio: true, tokenMfa });
      return;
    }

    // Sem MFA configurado: token limitado ao primeiro acesso e à configuração do MFA
    res.json({
      token: emitirToken(credencial.perfilId, credencial.email, false),
      perfilId: credencial.perfilId,
      primeiroAcesso: credencial.primeiroAcesso,
      mfaAtivo: false,
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
// 2ª etapa do login: valida o código do aplicativo autenticador
export const loginMfa = async (req: Request, res: Response): Promise<void> => {
  const { tokenMfa, codigo } = req.body;

  let payload: any;
  try {
    payload = jwt.verify(tokenMfa, process.env.JWT_SECRET as string);
    if (payload.etapa !== 'mfa') throw new Error();
  } catch {
    res.status(401).json({ error: 'Sessão de login expirada. Introduza a senha novamente.' });
    return;
  }

  const tentativas = tentativasMfa.get(payload.jti) ?? 0;
  if (tentativas >= MAX_TENTATIVAS_MFA) {
    res.status(429).json({ error: 'Demasiadas tentativas. Introduza a senha novamente.' });
    return;
  }

  try {
    const credencial = await prisma.credencial.findUnique({ where: { perfilId: payload.perfilId } });
    if (!credencial?.mfaAtivo || !credencial.mfaSecret) {
      res.status(401).json({ error: 'Sessão de login inválida. Introduza a senha novamente.' });
      return;
    }

    if (!authenticator.check(String(codigo ?? '').replace(/\s/g, ''), credencial.mfaSecret)) {
      tentativasMfa.set(payload.jti, tentativas + 1);
      // O token intermediário expira em 5 min; depois disso a entrada já não serve para nada
      setTimeout(() => tentativasMfa.delete(payload.jti), 5 * 60 * 1000).unref();
      res.status(401).json({ error: 'Código inválido. Verifique o aplicativo autenticador.' });
      return;
    }

    tentativasMfa.delete(payload.jti);
    res.json({
      token: emitirToken(credencial.perfilId, credencial.email, true),
      perfilId: credencial.perfilId,
      primeiroAcesso: credencial.primeiroAcesso,
      mfaAtivo: true,
    });
  } catch (error) {
    console.error("ERRO NO LOGIN MFA:", error);
    res.status(500).json({ error: 'Erro ao validar o código.' });
  }
};

// Gera um novo segredo TOTP e o QR Code para o aplicativo autenticador
export const configurarMfa = async (req: any, res: Response): Promise<void> => {
  const perfilId = req.usuario.perfilId;
  try {
    const credencial = await prisma.credencial.findUnique({ where: { perfilId } });
    if (!credencial) {
      res.status(404).json({ error: 'Credencial não encontrada.' });
      return;
    }
    if (credencial.mfaAtivo) {
      res.status(409).json({ error: 'A autenticação em dois fatores já está ativa.' });
      return;
    }

    // Reaproveita o segredo pendente (se existir) para que pedidos repetidos mostrem sempre o mesmo QR Code
    await prisma.credencial.updateMany({
      where: { perfilId, mfaSecret: null },
      data: { mfaSecret: authenticator.generateSecret() },
    });
    const { mfaSecret: segredo } = await prisma.credencial.findUniqueOrThrow({ where: { perfilId } });

    const otpauthUrl = authenticator.keyuri(credencial.email, 'ScientificHub UEMG', segredo!);
    const qrCode = await QRCode.toDataURL(otpauthUrl, { margin: 1, width: 240 });

    res.json({ qrCode, segredo, otpauthUrl });
  } catch (error) {
    console.error("ERRO AO CONFIGURAR MFA:", error);
    res.status(500).json({ error: 'Erro ao configurar a autenticação em dois fatores.' });
  }
};

// Confirma o primeiro código do aplicativo e ativa o MFA
export const ativarMfa = async (req: any, res: Response): Promise<void> => {
  const perfilId = req.usuario.perfilId;
  const codigo = String(req.body.codigo ?? '').replace(/\s/g, '');
  try {
    const credencial = await prisma.credencial.findUnique({ where: { perfilId } });
    if (!credencial?.mfaSecret) {
      res.status(400).json({ error: 'Gere o QR Code antes de ativar.' });
      return;
    }
    if (credencial.mfaAtivo) {
      res.status(409).json({ error: 'A autenticação em dois fatores já está ativa.' });
      return;
    }
    if (!authenticator.check(codigo, credencial.mfaSecret)) {
      res.status(400).json({ error: 'Código inválido. Confira se o aplicativo leu o QR Code mais recente.' });
      return;
    }

    await prisma.credencial.update({ where: { perfilId }, data: { mfaAtivo: true } });

    // Nova sessão já com o segundo fator validado
    res.json({ token: emitirToken(perfilId, credencial.email, true), mensagem: 'Autenticação em dois fatores ativada!' });
  } catch (error) {
    console.error("ERRO AO ATIVAR MFA:", error);
    res.status(500).json({ error: 'Erro ao ativar a autenticação em dois fatores.' });
  }
};

// Troca de senha pelo próprio utilizador (menu de perfil): exige a senha atual
export const alterarSenha = async (req: any, res: Response): Promise<void> => {
  const { senhaAtual, novaSenha } = req.body;
  const perfilId = req.usuario.perfilId;

  if (typeof novaSenha !== 'string' || novaSenha.length < 8) {
    res.status(400).json({ error: 'A nova senha deve ter pelo menos 8 caracteres.' });
    return;
  }

  try {
    const credencial = await prisma.credencial.findUnique({ where: { perfilId } });
    if (!credencial || !(await bcrypt.compare(String(senhaAtual ?? ''), credencial.senha))) {
      res.status(400).json({ error: 'A senha atual está incorreta.' });
      return;
    }
    if (await bcrypt.compare(novaSenha, credencial.senha)) {
      res.status(400).json({ error: 'A nova senha deve ser diferente da atual.' });
      return;
    }

    await prisma.credencial.update({ where: { perfilId }, data: { senha: await bcrypt.hash(novaSenha, 10) } });
    res.json({ mensagem: 'Senha alterada com sucesso!' });
  } catch (error) {
    console.error("ERRO AO ALTERAR SENHA:", error);
    res.status(500).json({ error: 'Erro ao alterar a senha.' });
  }
};
