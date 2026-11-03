// Lê o payload do JWT guardado (sem validar a assinatura: serve só para decisões de navegação;
// quem garante a segurança é o backend)
export function lerSessao(): { perfilId: string; email: string; mfa?: boolean; trocarSenha?: boolean } | null {
  const token = localStorage.getItem('hub_token');
  if (!token) return null;
  try {
    const payload = token.split('.')[1]!.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

// Página inicial de cada papel depois de o login estar completo
export const paginaInicial = (papel: string | null) => (papel === 'ADMIN' ? '/admin' : '/feed');

// Aviso mostrado uma vez na tela de login (ex: conta desativada enquanto o usuário estava logado)
const CHAVE_AVISO_LOGIN = 'aviso_login';
export const guardarAvisoLogin = (texto: string) => sessionStorage.setItem(CHAVE_AVISO_LOGIN, texto);
export function lerAvisoLogin() {
  const texto = sessionStorage.getItem(CHAVE_AVISO_LOGIN);
  if (texto) sessionStorage.removeItem(CHAVE_AVISO_LOGIN);
  return texto ?? '';
}
