'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/AppHeader';
import { Alert, Badge, Button, Card, Spinner, Textarea } from '@/components/ui';

type Status = 'PENDENTE' | 'APROVADA' | 'REJEITADA';

interface Publicacao {
  id: string;
  titulo: string;
  resumo: string;
  categoria: string;
  arquivoUrl: string | null;
  autorPrincipalId: string;
  status: Status;
  parecer: string | null;
  avaliadoEm: string | null;
  criadoEm: string;
}

interface Autor {
  id: string;
  nome: string;
  email: string;
  curso: string;
}

const rotulosCategoria: Record<string, string> = {
  ARTIGO: 'Artigo',
  TCC: 'TCC',
  DISSERTACAO: 'Dissertação',
  TESE: 'Tese',
  RELATORIO_TECNICO: 'Relatório Técnico',
};

const estilosStatus: Record<Status, { rotulo: string; classe: string }> = {
  PENDENTE: { rotulo: 'Pendente', classe: 'bg-highlight text-ink' },
  APROVADA: { rotulo: 'Aprovada', classe: 'bg-success-soft text-success' },
  REJEITADA: { rotulo: 'Rejeitada', classe: 'bg-danger-soft text-danger' },
};

// Os PDFs são servidos na raiz do academico-service (/uploads), fora do prefixo /api
const origemAcademico = new URL(process.env.NEXT_PUBLIC_ACADEMICO_URL ?? 'http://localhost:3002').origin;

const formatarData = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

export default function Avaliacoes() {
  const router = useRouter();
  const [publicacoes, setPublicacoes] = useState<Publicacao[]>([]);
  const [autores, setAutores] = useState<Record<string, Autor>>({});
  const [aba, setAba] = useState<'pendentes' | 'avaliadas'>('pendentes');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  // Avaliação em curso (apenas um cartão aberto de cada vez)
  const [emAvaliacao, setEmAvaliacao] = useState<{ id: string; decisao: 'APROVADA' | 'REJEITADA' } | null>(null);
  const [parecer, setParecer] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tom: 'success' | 'error'; texto: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('hub_token');
    if (!token) {
      router.push('/login');
      return;
    }
    if (localStorage.getItem('tipo_usuario') !== 'PROFESSOR') {
      router.push('/feed');
      return;
    }

    const carregarDados = async () => {
      try {
        const headers = { 'Authorization': `Bearer ${token}` };

        // Publicações orientadas (academico-service) + nomes dos autores (perfil-service)
        const [resPub, resUsuarios] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_ACADEMICO_URL}/publicacoes/orientacoes`, { headers }),
          fetch(`${process.env.NEXT_PUBLIC_PERFIL_URL}/usuarios`, { headers }),
        ]);

        if (!resPub.ok) throw new Error('Não foi possível carregar as publicações.');
        setPublicacoes(await resPub.json());

        if (resUsuarios.ok) {
          const usuarios: Autor[] = await resUsuarios.json();
          setAutores(Object.fromEntries(usuarios.map(u => [u.id, u])));
        }
      } catch (err: any) {
        setErro(err.message);
      } finally {
        setCarregando(false);
      }
    };

    carregarDados();
  }, [router]);

  const abrirAvaliacao = (id: string, decisao: 'APROVADA' | 'REJEITADA') => {
    setEmAvaliacao({ id, decisao });
    setParecer('');
    setMensagem(null);
  };

  const enviarAvaliacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emAvaliacao) return;

    setEnviando(true);
    try {
      const token = localStorage.getItem('hub_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_ACADEMICO_URL}/publicacoes/${emAvaliacao.id}/avaliacao`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: emAvaliacao.decisao, parecer }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar avaliação');

      setPublicacoes(lista => lista.map(p => (p.id === data.id ? data : p)));
      setMensagem({
        tom: 'success',
        texto: emAvaliacao.decisao === 'APROVADA'
          ? `"${data.titulo}" foi aprovada e já aparece no feed.`
          : `"${data.titulo}" foi devolvida ao autor com o seu parecer.`,
      });
      setEmAvaliacao(null);
    } catch (err: any) {
      setMensagem({ tom: 'error', texto: err.message });
    } finally {
      setEnviando(false);
    }
  };

  const pendentes = publicacoes.filter(p => p.status === 'PENDENTE');
  const avaliadas = publicacoes.filter(p => p.status !== 'PENDENTE');
  const visiveis = aba === 'pendentes' ? pendentes : avaliadas;

  return (
    <div className="min-h-screen">
      <AppHeader papel="PROFESSOR" />

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <button
          onClick={() => router.push('/feed')}
          className="mb-6 cursor-pointer text-sm font-medium text-muted transition-colors hover:text-ink"
        >
          Voltar ao painel
        </button>

        <div className="mb-8">
          <h1 className="text-[2.25rem] font-bold leading-tight text-ink">Aprovação de publicações</h1>
          <p className="mt-3 text-muted">
            Os trabalhos dos seus orientandos só aparecem no painel da comunidade depois que você aprova.
          </p>
        </div>

        {/* Abas */}
        <div className="mb-6 flex gap-1 border-b border-line">
          {([
            ['pendentes', 'Pendentes', pendentes.length],
            ['avaliadas', 'Avaliadas', avaliadas.length],
          ] as const).map(([valor, rotulo, total]) => (
            <button
              key={valor}
              onClick={() => { setAba(valor); setEmAvaliacao(null); }}
              className={`-mb-px cursor-pointer border-b-2 px-3 py-2 text-sm font-semibold transition-colors ${
                aba === valor ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              {rotulo}
              <span className="ml-1.5 text-xs font-normal tabular-nums text-muted">({total})</span>
            </button>
          ))}
        </div>

        {mensagem && <div className="mb-6"><Alert tone={mensagem.tom}>{mensagem.texto}</Alert></div>}
        {erro && <Alert tone="error">{erro}</Alert>}

        {carregando ? (
          <div className="space-y-3">
            {[0, 1].map(i => <div key={i} className="h-44 animate-pulse rounded-lg bg-line/60" />)}
          </div>
        ) : !erro && visiveis.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line px-6 py-12 text-center text-sm text-muted">
            {aba === 'pendentes' ? 'Nenhum trabalho aguardando sua avaliação.' : 'Você ainda não avaliou nenhum trabalho.'}
          </div>
        ) : (
          <div className="space-y-4">
            {visiveis.map(pub => {
              const autor = autores[pub.autorPrincipalId];
              const aberta = emAvaliacao?.id === pub.id;

              return (
                <Card key={pub.id} className="p-6 sm:p-8">
                  <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <Badge>{rotulosCategoria[pub.categoria] ?? pub.categoria}</Badge>
                    <Badge className={estilosStatus[pub.status].classe}>{estilosStatus[pub.status].rotulo}</Badge>
                    <span>Submetida em {formatarData(pub.criadoEm)}</span>
                  </div>

                  <h2 className="text-xl font-bold leading-snug text-ink">{pub.titulo}</h2>
                  <p className="mt-1 text-sm text-muted">
                    {autor ? <>Por <span className="font-semibold text-ink">{autor.nome}</span> ({autor.email})</> : 'Autor não encontrado'}
                  </p>

                  <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-text">{pub.resumo}</p>

                  {pub.arquivoUrl && (
                    <a
                      href={`${origemAcademico}${pub.arquivoUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent underline decoration-accent/40 decoration-2 underline-offset-4 hover:decoration-accent"
                    >
                      Abrir PDF
                    </a>
                  )}

                  {/* Parecer já registado */}
                  {pub.status !== 'PENDENTE' && (
                    <div className={`mt-5 border-l-[3px] py-1 pl-4 text-sm ${pub.status === 'REJEITADA' ? 'border-danger' : 'border-success'}`}>
                      <p className="text-xs text-muted">
                        {estilosStatus[pub.status].rotulo} em {pub.avaliadoEm && formatarData(pub.avaliadoEm)}{pub.parecer ? ', com o seu parecer:' : ''}
                      </p>
                      {pub.parecer && <p className={`mt-1 leading-relaxed ${pub.status === 'REJEITADA' ? 'text-danger' : 'text-text'}`}>{pub.parecer}</p>}
                    </div>
                  )}

                  {/* Ações de avaliação */}
                  {pub.status === 'PENDENTE' && !aberta && (
                    <div className="mt-6 flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:justify-end">
                      <Button variant="secondary" onClick={() => abrirAvaliacao(pub.id, 'REJEITADA')}>
                        Rejeitar
                      </Button>
                      <Button onClick={() => abrirAvaliacao(pub.id, 'APROVADA')}>
                        Aprovar
                      </Button>
                    </div>
                  )}

                  {aberta && (
                    <form onSubmit={enviarAvaliacao} className="mt-6 space-y-4 border-t border-line pt-5">
                      <label className="block">
                        <span className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-ink">
                          {emAvaliacao.decisao === 'APROVADA' ? 'Comentário para o autor' : 'Motivo da rejeição'}
                          <span className="text-xs font-normal text-muted">
                            {emAvaliacao.decisao === 'APROVADA' ? 'Opcional' : 'Obrigatório'}
                          </span>
                        </span>
                        <Textarea
                          autoFocus
                          rows={3}
                          value={parecer}
                          onChange={e => setParecer(e.target.value)}
                          required={emAvaliacao.decisao === 'REJEITADA'}
                          placeholder={emAvaliacao.decisao === 'APROVADA'
                            ? 'Ex: Excelente trabalho, parabéns.'
                            : 'Ex: Revise a metodologia e as referências antes de submeter novamente.'}
                        />
                      </label>
                      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <Button type="button" variant="ghost" onClick={() => setEmAvaliacao(null)}>
                          Cancelar
                        </Button>
                        <Button type="submit" variant={emAvaliacao.decisao === 'REJEITADA' ? 'danger' : 'primary'} disabled={enviando}>
                          {enviando && <Spinner />}
                          {emAvaliacao.decisao === 'APROVADA' ? 'Confirmar aprovação' : 'Confirmar rejeição'}
                        </Button>
                      </div>
                    </form>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
