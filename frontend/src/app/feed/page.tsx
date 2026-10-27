'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/AppHeader';
import { Badge, Button, Card, SectionHeading } from '@/components/ui';
import { formatarArea } from '@/lib/formato';

// Interfaces para o TypeScript saber o formato dos dados
interface Publicacao {
  id: string;
  titulo: string;
  resumo: string;
  categoria: string;
  dataPublicacao: string;
}

interface Recomendacao {
  projetoId: string;
  titulo: string;
  areasEmComum: string[];
  scoreRelevancia: number;
}

const rotulosCategoria: Record<string, string> = {
  ARTIGO: 'Artigo',
  TCC: 'TCC',
  DISSERTACAO: 'Dissertação',
  RELATORIO_TECNICO: 'Relatório Técnico',
};

function EstadoVazio({ texto }: { texto: string }) {
  return (
    <div className="rounded-lg border border-dashed border-line px-6 py-12 text-center text-sm text-muted">
      {texto}
    </div>
  );
}

export default function Feed() {
  const router = useRouter();
  const [tipoUsuario, setTipoUsuario] = useState('');
  const [publicacoes, setPublicacoes] = useState<Publicacao[]>([]);
  const [recomendacoes, setRecomendacoes] = useState<Recomendacao[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('hub_token');
    const perfilId = localStorage.getItem('perfil_id');
    const tipo = localStorage.getItem('tipo_usuario');

    // Se não tiver token, expulsa para o login
    if (!token || !perfilId) {
      router.push('/login');
      return;
    }

    setTipoUsuario(tipo || '');

    // Função para buscar os dados em paralelo
    const carregarDados = async () => {
      try {
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        };

        // 1. Busca Recomendações (Neo4j - Porta 3003)
        const reqRecomendacoes = fetch(`${process.env.NEXT_PUBLIC_MATCH_URL}/recomendacoes/${perfilId}`, { headers });

        // 2. Busca Todas as Publicações (Postgres - Porta 3002)
        const reqPublicacoes = fetch(`${process.env.NEXT_PUBLIC_ACADEMICO_URL}/publicacoes`, { headers });

        // Dispara as duas chamadas ao mesmo tempo para a tela carregar mais rápido
        const [resRec, resPub] = await Promise.all([reqRecomendacoes, reqPublicacoes]);

        if (resRec.ok) setRecomendacoes(await resRec.json());
        if (resPub.ok) setPublicacoes(await resPub.json());

      } catch (error) {
        console.error("Erro ao carregar o feed:", error);
      } finally {
        setCarregando(false);
      }
    };

    carregarDados();
  }, [router]);

  // Normaliza o score para desenhar a barra de afinidade relativa ao melhor resultado
  const maiorScore = Math.max(1, ...recomendacoes.map(r => r.scoreRelevancia));

  return (
    <div className="min-h-screen">
      <AppHeader papel={tipoUsuario} />

      <main className="mx-auto max-w-6xl space-y-12 px-4 py-10 sm:px-6">
        {/* Cabeçalho + ação principal de cada papel */}
        <section className="flex flex-col gap-5 border-b border-line pb-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <h1 className="text-[2.25rem] font-bold leading-tight text-ink">Seu painel</h1>
            <p className="mt-2 text-pretty text-muted">
              Projetos ligados aos seus interesses e os trabalhos mais recentes publicados na UEMG.
            </p>
          </div>
          {tipoUsuario === 'PROFESSOR' ? (
            <Button onClick={() => router.push('/avaliacoes')} className="shrink-0">
              Avaliar trabalhos pendentes
            </Button>
          ) : (
            <Button onClick={() => router.push('/publication')} className="shrink-0">
              Publicar trabalho
            </Button>
          )}
        </section>

        {/* Seção 1: Inteligência (Neo4j) */}
        <section>
          <SectionHeading eyebrow="Projetos que tratam das suas áreas de interesse" title="Recomendados para você" />

          {carregando ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[0, 1].map(i => <div key={i} className="h-40 animate-pulse rounded-lg bg-line/60" />)}
            </div>
          ) : recomendacoes.length === 0 ? (
            <EstadoVazio texto="Nenhuma recomendação ainda. Escolha suas áreas de interesse no menu do seu perfil (canto superior direito) para receber sugestões." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {recomendacoes.map((rec) => (
                <Card key={rec.projetoId} className="flex flex-col p-6">
                  <h3 className="text-lg font-bold leading-snug text-ink">{rec.titulo}</h3>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {rec.areasEmComum.map((area) => (
                      <Badge key={area}>{formatarArea(area)}</Badge>
                    ))}
                  </div>
                  <div className="mt-auto pt-6">
                    <div className="mb-1.5 flex justify-between text-xs text-muted">
                      <span>Afinidade</span>
                      <span className="font-semibold tabular-nums text-ink">{rec.scoreRelevancia} {rec.scoreRelevancia === 1 ? 'área' : 'áreas'} em comum</span>
                    </div>
                    <div className="h-1 overflow-hidden rounded-full bg-line">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${(rec.scoreRelevancia / maiorScore) * 100}%` }} />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Seção 2: Feed Geral (PostgreSQL) */}
        <section>
          <SectionHeading
            eyebrow="Trabalhos aprovados da comunidade UEMG"
            title="Publicações recentes"
            aside={!carregando && <span className="text-sm text-muted">{publicacoes.length} {publicacoes.length === 1 ? 'publicação' : 'publicações'}</span>}
          />

          {carregando ? (
            <div className="space-y-3">
              {[0, 1, 2].map(i => <div key={i} className="h-32 animate-pulse rounded-lg bg-line/60" />)}
            </div>
          ) : publicacoes.length === 0 ? (
            <EstadoVazio texto="Nenhuma publicação aprovada ainda." />
          ) : (
            <Card className="divide-y divide-line">
              {publicacoes.map((pub) => (
                <article key={pub.id} className="px-6 py-6 sm:px-8">
                  <div className="mb-2 flex items-center gap-3 text-xs text-muted">
                    <Badge>{rotulosCategoria[pub.categoria] ?? pub.categoria}</Badge>
                    <time dateTime={pub.dataPublicacao}>
                      {new Date(pub.dataPublicacao).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </time>
                  </div>
                  <h3 className="text-xl font-bold leading-snug text-ink">{pub.titulo}</h3>
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">{pub.resumo}</p>
                </article>
              ))}
            </Card>
          )}
        </section>
      </main>
    </div>
  );
}
