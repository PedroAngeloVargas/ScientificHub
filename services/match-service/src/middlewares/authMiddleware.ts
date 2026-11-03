import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  usuario?: any;
}

// ---------- Estado da conta ----------
// O token vale 8h, então desativar uma conta não bastaria para tirar quem já está logado.
// Cada serviço pergunta ao auth-service se a conta continua ativa (resposta guardada por 30s).
const TTL_CONTA_MS = 30_000;
const MAX_CONTAS_EM_CACHE = 5_000;
const cacheContas = new Map<string, { ativa: boolean; expira: number }>();

// Chamado pelo auth-service quando a Reitoria desativa/reativa uma conta, para valer na hora nele
export const esquecerConta = (perfilId: string) => cacheContas.delete(perfilId);

async function contaAtiva(perfilId: string): Promise<boolean> {
  const agora = Date.now();
  const emCache = cacheContas.get(perfilId);
  if (emCache && emCache.expira > agora) return emCache.ativa;

  const base = process.env.AUTH_INTERNAL_URL || 'http://localhost:3000';
  try {
    const res = await fetch(`${base}/interno/contas/${encodeURIComponent(perfilId)}/ativa`, {
      signal: AbortSignal.timeout(2000),
    });
    const corpo = await res.json().catch(() => ({})) as { ativa?: boolean; codigo?: string };
    // Só bloqueia quando o auth-service afirma que a conta não existe. Um 404 sem esse código é de um
    // auth-service antigo (ainda sem esta rota, durante um deploy): trata como indisponível e não bloqueia ninguém.
    const inexistente = res.status === 404 && corpo.codigo === 'CONTA_INEXISTENTE';
    if (res.status !== 200 && !inexistente) throw new Error(`HTTP ${res.status}`);
    const ativa = res.status === 200 && corpo.ativa === true;

    if (cacheContas.size >= MAX_CONTAS_EM_CACHE) cacheContas.clear();
    cacheContas.set(perfilId, { ativa, expira: agora + TTL_CONTA_MS });
    return ativa;
  } catch (error) {
    // Auth-service fora do ar: não derruba o resto do site. O token segue valendo até expirar.
    console.warn('Não foi possível confirmar o estado da conta:', (error as Error).message);
    return true;
  }
}

// exigirMfa = false só nas rotas do primeiro acesso e da configuração do MFA
// permitirSenhaTemporaria = true só onde o usuário precisa chegar para trocar a senha temporária
const validarToken = (exigirMfa: boolean, permitirSenhaTemporaria: boolean) =>
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({ error: 'Token não fornecido. Acesso negado.' });
      return;
    }

    const [, token] = authHeader.split(' ');

    if (!token) {
      res.status(401).json({ error: 'Formato de token inválido. Use: Bearer <token>' });
      return;
    }

    let payload: any;
    try {
      const secret = process.env.JWT_SECRET as string;
      payload = jwt.verify(token, secret);
    } catch (error) {
      res.status(401).json({ error: 'Token inválido ou expirado.' });
      return;
    }

    // Token intermediário do login (senha correta, código MFA ainda por validar) não dá acesso a nada
    if (payload.etapa === 'mfa') {
      res.status(401).json({ error: 'Validação em dois fatores pendente.' });
      return;
    }

    if (exigirMfa && payload.mfa !== true) {
      res.status(403).json({ error: 'Configure a autenticação em dois fatores para continuar.', codigo: 'MFA_PENDENTE' });
      return;
    }

    // Entrou com a senha temporária da Reitoria: só chega até a troca de senha
    if (payload.trocarSenha === true && !permitirSenhaTemporaria) {
      res.status(403).json({ error: 'Troque a senha temporária para continuar.', codigo: 'SENHA_TEMPORARIA' });
      return;
    }

    if (!(await contaAtiva(payload.perfilId))) {
      res.status(403).json({ error: 'Conta desativada. Procure a Reitoria.', codigo: 'CONTA_DESATIVADA' });
      return;
    }

    // Anexamos os dados do token (ex: id do utilizador) à requisição
    req.usuario = payload;
    next();
  };

export const verificarToken = validarToken(true, false);
export const verificarTokenSemMfa = validarToken(false, true);
export const verificarTokenTrocaSenha = validarToken(true, true);

// Depois do verificarToken: só a Reitoria (admin@uemg.br) passa
export const verificarAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.usuario?.email !== 'admin@uemg.br') {
    res.status(403).json({ error: 'Apenas a Reitoria pode realizar esta ação.' });
    return;
  }
  next();
};
