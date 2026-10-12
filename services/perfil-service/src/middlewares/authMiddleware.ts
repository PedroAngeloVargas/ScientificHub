import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  usuario?: any;
}

export const verificarToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
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

  try {
    const secret = process.env.JWT_SECRET as string;
    const payload = jwt.verify(token, secret);
    
    // Anexamos os dados do token (ex: id do utilizador) à requisição
    req.usuario = payload; 
    
    next(); // Passa o controlo para o controlador (a rota pode prosseguir)
  } catch (error) {
    res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
};