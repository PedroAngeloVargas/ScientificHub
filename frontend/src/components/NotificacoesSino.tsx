'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from './ui';
import { tempoRelativo } from '@/lib/formato';

type TipoNotificacao = 'NOVA_POSTAGEM' | 'NOVA_PUBLICACAO' | 'SUBMISSAO_RECEBIDA' | 'PUBLICACAO_APROVADA' | 'PUBLICACAO_REJEITADA';

interface Notificacao {
  id: string;
  tipo: TipoNotificacao;
  atorId: string;
  resumo: string;
  detalhe: string | null;
  criadoEm: string;
  lida: boolean;
}

// O que cada tipo diz e para onde leva. A rejeição não tem destino: o parecer já está na própria notificação.
const tipos: Record<TipoNotificacao, { frase: string; destino: string | null }> = {
  NOVA_POSTAGEM: { frase: 'publicou na comunidade', destino: '/comunidade' },
  NOVA_PUBLICACAO: { frase: 'publicou um novo trabalho', destino: '/feed' },
  SUBMISSAO_RECEBIDA: { frase: 'enviou um trabalho para sua avaliação', destino: '/avaliacoes' },
  PUBLICACAO_APROVADA: { frase: 'aprovou seu trabalho', destino: '/feed' },
  PUBLICACAO_REJEITADA: { frase: 'rejeitou seu trabalho', destino: null },
};

const API = `${process.env.NEXT_PUBLIC_ACADEMICO_URL}/notificacoes`;
const INTERVALO_CONSULTA = 30_000;

const authHeaders = (): Record<string, string> => ({ 'Authorization': `Bearer ${localStorage.getItem('hub_token')}` });

export function NotificacoesSino() {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [naoLidas, setNaoLidas] = useState(0);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [nomes, setNomes] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const raiz = useRef<HTMLDivElement>(null);

  const atualizarContagem = useCallback(async () => {
    try {
      const res = await fetch(`${API}/contagem`, { headers: authHeaders() });
      if (res.ok) setNaoLidas((await res.json()).naoLidas);
    } catch {
      // Sem rede: tenta de novo na próxima consulta
    }
  }, []);

  // Consulta periódica, só com a aba visível; ao voltar para a aba, atualiza na hora
  useEffect(() => {
    const consultar = () => { if (!document.hidden) atualizarContagem(); };
    consultar();
    const intervalo = setInterval(consultar, INTERVALO_CONSULTA);
    document.addEventListener('visibilitychange', consultar);
    return () => {
      clearInterval(intervalo);
      document.removeEventListener('visibilitychange', consultar);
    };
  }, [atualizarContagem]);

  // Fecha com Esc ou clicando fora
  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(false); };
    const aoClicar = (e: MouseEvent) => { if (!raiz.current?.contains(e.target as Node)) setAberto(false); };
    document.addEventListener('keydown', aoTeclar);
    document.addEventListener('mousedown', aoClicar);
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.removeEventListener('mousedown', aoClicar);
    };
  }, [aberto]);

  // Ao abrir, busca a lista e os nomes de quem causou cada evento
  useEffect(() => {
    if (!aberto) return;
    const carregar = async () => {
      setCarregando(true);
      setErro('');
      try {
        const [resLista, resUsuarios] = await Promise.all([
          fetch(API, { headers: authHeaders() }),
          fetch(`${process.env.NEXT_PUBLIC_PERFIL_URL}/usuarios`, { headers: authHeaders() }),
        ]);
        if (!resLista.ok) throw new Error();
        const dados = await resLista.json();
        setNotificacoes(dados.notificacoes);
        setNaoLidas(dados.naoLidas);
        if (resUsuarios.ok) {
          const usuarios: { id: string; nome: string }[] = await resUsuarios.json();
          setNomes(Object.fromEntries(usuarios.map(u => [u.id, u.nome])));
        }
      } catch {
        setErro('Não foi possível carregar as notificações. Verifique sua conexão e tente de novo.');
      } finally {
        setCarregando(false);
      }
    };
    carregar();
  }, [aberto]);

  const abrirNotificacao = (n: Notificacao) => {
    if (!n.lida) {
      setNotificacoes(lista => lista.map(x => (x.id === n.id ? { ...x, lida: true } : x)));
      setNaoLidas(total => Math.max(0, total - 1));
      fetch(`${API}/${n.id}/lida`, { method: 'POST', headers: authHeaders() }).catch(() => {});
    }
    const destino = tipos[n.tipo].destino;
    if (destino) {
      setAberto(false);
      router.push(destino);
    }
  };

  const marcarTodas = async () => {
    setNotificacoes(lista => lista.map(x => ({ ...x, lida: true })));
    setNaoLidas(0);
    try {
      const res = await fetch(`${API}/lidas`, { method: 'POST', headers: authHeaders() });
      if (!res.ok) throw new Error();
    } catch {
      atualizarContagem();
    }
  };

  return (
    <div ref={raiz} className="relative">
      <button
        onClick={() => setAberto(a => !a)}
        className="relative grid h-10 w-10 cursor-pointer place-items-center rounded-full text-muted transition-colors hover:bg-accent-soft hover:text-ink"
        aria-label={naoLidas > 0 ? `Notificações: ${naoLidas} não lidas` : 'Notificações'}
        aria-expanded={aberto}
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
        </svg>
        {naoLidas > 0 && (
          <span className="absolute right-0.5 top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-highlight px-1 text-[11px] font-bold tabular-nums text-ink ring-2 ring-paper">
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div className="fixed inset-x-4 top-[6.25rem] z-30 flex max-h-[75vh] flex-col rounded-lg border border-line bg-surface shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <h2 className="font-bold text-ink">Notificações</h2>
            {naoLidas > 0 && (
              <button onClick={marcarTodas} className="cursor-pointer text-sm font-semibold text-accent hover:text-accent-strong">
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div className="overflow-y-auto">
            {carregando && notificacoes.length === 0 ? (
              <div className="flex justify-center py-10 text-muted"><Spinner /></div>
            ) : erro ? (
              <p className="px-4 py-8 text-center text-sm text-danger">{erro}</p>
            ) : notificacoes.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted">
                Nenhuma notificação. Novas postagens e avaliações de trabalhos aparecem aqui.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {notificacoes.map(n => (
                  <li key={n.id}>
                    <button
                      onClick={() => abrirNotificacao(n)}
                      className={`flex w-full cursor-pointer gap-3 px-4 py-3 text-left transition-colors hover:bg-accent-soft ${n.lida ? '' : 'bg-accent-soft/50'}`}
                    >
                      <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${n.lida ? 'bg-transparent' : 'bg-accent'}`} aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        {!n.lida && <span className="sr-only">Não lida: </span>}
                        <span className="block text-sm leading-snug text-text">
                          <span className="font-semibold text-ink">{nomes[n.atorId] ?? 'Alguém'}</span> {tipos[n.tipo].frase}
                        </span>
                        <span className="mt-0.5 block break-words text-sm leading-snug text-muted">{n.resumo}</span>
                        {n.detalhe && (
                          <span className={`mt-1.5 block break-words border-l-[3px] pl-2 text-sm leading-snug ${
                            n.tipo === 'PUBLICACAO_REJEITADA' ? 'border-danger text-danger' : 'border-success text-text'
                          }`}>
                            {n.detalhe}
                          </span>
                        )}
                        <span className="mt-1 block text-xs text-muted">{tempoRelativo(n.criadoEm)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
