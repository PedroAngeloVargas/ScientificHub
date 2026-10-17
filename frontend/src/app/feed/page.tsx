'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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

        // Dispara as duas chamadas ao mesmo tempo para o ecrã carregar mais rápido
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

  const fazerLogout = () => {
    localStorage.clear();
    router.push('/login');
  };

  if (carregando) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-black">A carregar o Hub...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 text-black">
      {/* Navbar Mínima */}
      <nav className="bg-blue-700 text-white p-4 shadow-md flex justify-between items-center">
        <h1 className="text-xl font-bold">ScientificHub UEMG</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm bg-blue-800 px-3 py-1 rounded-full border border-blue-600">
            Acesso: {tipoUsuario}
          </span>
          <button onClick={fazerLogout} className="text-sm hover:underline font-semibold">
            Sair
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-6 space-y-10">
        
        {/* Painel de Ações Específicas por Tipo */}
        <div className="bg-white p-4 rounded-lg shadow flex justify-between items-center border-l-4 border-blue-500">
          <p className="text-gray-700">Bem-vindo(a) ao seu painel académico.</p>
          {tipoUsuario === 'PROFESSOR' ? (
            <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow text-sm font-bold">
              + Avaliar Projetos Pendentes
            </button>
          ) : (
            <button onClick={() => router.push('/publication')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow text-sm font-bold">
              + Submeter TCC / Artigo
            </button>
          )}
        </div>

        {/* Seção 1: Inteligência (Neo4j) */}
        <section>
          <h2 className="text-2xl font-extrabold text-gray-800 mb-4 flex items-center gap-2">
            ✨ Recomendados para si <span className="text-sm font-normal text-gray-500">(via Neo4j)</span>
          </h2>
          
          {recomendacoes.length === 0 ? (
            <p className="text-gray-500 italic">Ainda não temos recomendações baseadas no seu perfil.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recomendacoes.map((rec) => (
                <div key={rec.projetoId} className="bg-gradient-to-br from-blue-50 to-white p-5 rounded-lg border border-blue-200 shadow-sm">
                  <h3 className="font-bold text-lg text-blue-900">{rec.titulo}</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {rec.areasEmComum.map((area) => (
                      <span key={area} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                        {area}
                      </span>
                    ))}
                  </div>
                  <p className="mt-3 text-xs font-semibold text-green-700">
                    Score de Afinidade: {rec.scoreRelevancia}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Seção 2: Feed Geral (PostgreSQL) */}
        <section>
          <h2 className="text-2xl font-extrabold text-gray-800 mb-4">Feed de Publicações Recentes</h2>
          <div className="space-y-4">
            {publicacoes.length === 0 ? (
              <p className="text-gray-500 italic">Nenhuma publicação encontrada.</p>
            ) : (
              publicacoes.map((pub) => (
                <div key={pub.id} className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-lg text-gray-900">{pub.titulo}</h3>
                    <span className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded font-mono">
                      {pub.categoria}
                    </span>
                  </div>
                  <p className="text-gray-600 mt-2 text-sm">{pub.resumo}</p>
                  <p className="text-gray-400 text-xs mt-4">
                    Publicado em: {new Date(pub.dataPublicacao).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

      </main>
    </div>
  );
}