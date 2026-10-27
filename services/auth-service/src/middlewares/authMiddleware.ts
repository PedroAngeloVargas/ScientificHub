import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  usuario?: any;
}

// exigirMfa = false só nas rotas do primeiro acesso e da configuração do MFA
const validarToken = (exigirMfa: boolean) => (req: AuthRequest, res: Response, next: NextFunction): void => {
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

  // Anexamos os dados do token (ex: id do utilizador) à requisição
  req.usuario = payload;
  next();
};

export const verificarToken = validarToken(true);
export const verificarTokenSemMfa = validarToken(false);
