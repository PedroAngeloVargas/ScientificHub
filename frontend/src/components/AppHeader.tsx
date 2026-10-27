'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Logo } from './ui';
import { PerfilDrawer, iniciais, type UsuarioPerfil } from './PerfilDrawer';
import { lerSessao } from '@/lib/sessao';

const rotulosPapel: Record<string, string> = {
  ALUNO: 'Discente',
  PROFESSOR: 'Docente',
  ADMIN: 'Reitoria',
};

// Links de navegação visíveis para cada papel
const linksPorPapel: Record<string, { href: string; rotulo: string }[]> = {
  ALUNO: [
    { href: '/feed', rotulo: 'Painel' },
    { href: '/comunidade', rotulo: 'Comunidade' },
  ],
  PROFESSOR: [
    { href: '/feed', rotulo: 'Painel' },
    { href: '/comunidade', rotulo: 'Comunidade' },
    { href: '/avaliacoes', rotulo: 'Avaliações' },
  ],
  ADMIN: [
    { href: '/admin', rotulo: 'Gestão' },
    { href: '/comunidade', rotulo: 'Comunidade' },
  ],
};

export function AppHeader({ papel }: { papel?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const links = linksPorPapel[papel ?? ''] ?? [];

  const [usuario, setUsuario] = useState<UsuarioPerfil | null>(null);
  const [perfilAberto, setPerfilAberto] = useState(false);

  useEffect(() => {
    const sessao = lerSessao();
    // Sessões sem o segundo fator (ex: tokens antigos) são levadas para a configuração do MFA
    if (sessao && !sessao.mfa) {
      router.replace('/configurar-mfa');
      return;
    }
    if (!sessao) return;

    // Dados do usuário para o avatar e o menu de perfil
    fetch(`${process.env.NEXT_PUBLIC_PERFIL_URL}/usuarios/${sessao.perfilId}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('hub_token')}` },
    })
      .then(res => (res.ok ? res.json() : null))
      .then(setUsuario)
      .catch(() => {});
  }, [router]);

  const fazerLogout = () => {
    localStorage.clear();
    router.push('/login');
  };

  const fecharPerfil = useCallback(() => setPerfilAberto(false), [setPerfilAberto]);

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line bg-paper/85 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between px-4 py-2 sm:h-16 sm:flex-nowrap sm:px-6 sm:py-0">
          <button onClick={() => router.push(papel === 'ADMIN' ? '/admin' : '/feed')} className="cursor-pointer">
            <Logo />
          </button>

          {links.length > 0 && (
            <nav className="order-last -mx-2.5 flex w-full items-center gap-0.5 overflow-x-auto sm:order-none sm:mx-0 sm:w-auto">
              {links.map(link => (
                <button
                  key={link.href}
                  onClick={() => router.push(link.href)}
                  className={`cursor-pointer rounded-lg px-2.5 py-2 text-sm font-medium transition-colors sm:px-3 ${
                    pathname === link.href ? 'text-ink' : 'text-muted hover:bg-accent-soft hover:text-ink'
                  }`}
                  aria-current={pathname === link.href ? 'page' : undefined}
                >
                  <span className={pathname === link.href ? 'grifo' : undefined}>{link.rotulo}</span>
                </button>
              ))}
            </nav>
          )}

          {/* Avatar: abre o menu lateral de perfil */}
          <button
            onClick={() => setPerfilAberto(true)}
            className="flex cursor-pointer items-center gap-2.5 rounded-full py-1 pl-1 pr-1 transition-colors hover:bg-accent-soft sm:pr-3"
            aria-label="Abrir meu perfil"
            aria-haspopup="dialog"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-accent text-sm font-semibold text-white">
              {usuario ? iniciais(usuario.nome) : ''}
            </span>
            <span className="hidden text-left leading-tight sm:block">
              <span className="block max-w-36 truncate text-sm font-medium text-ink">{usuario?.nome.split(' ')[0] ?? ' '}</span>
              {papel && <span className="block text-xs text-muted">{rotulosPapel[papel] ?? papel}</span>}
            </span>
          </button>
        </div>
      </header>

      <PerfilDrawer
        usuario={usuario}
        aberto={perfilAberto}
        aoFechar={fecharPerfil}
        aoAtualizar={setUsuario}
        aoSair={fazerLogout}
      />
    </>
  );
}
