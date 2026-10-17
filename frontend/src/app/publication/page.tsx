'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NovaPublicacao() {
  const router = useRouter();
  const [titulo, setTitulo] = useState('');
  const [resumo, setResumo] = useState('');
  const [categoria, setCategoria] = useState('ARTIGO');
  const [areasInput, setAreasInput] = useState(''); 
  const [orientadorId, setOrientadorId] = useState(''); // Novo campo
  const [arquivo, setArquivo] = useState<File | null>(null); // Novo campo
  
  const [professores, setProfessores] = useState<any[]>([]); // Lista do banco
  const [mensagem, setMensagem] = useState('');
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('hub_token');
    if (!token) {
      router.push('/login');
      return;
    }

    // Busca os utilizadores e filtra apenas os Professores para o Dropdown
    const carregarProfessores = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_PERFIL_URL}/usuarios`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const dados = await res.json();
          const listaProfessores = dados.filter((u: any) => u.tipo === 'PROFESSOR');
          setProfessores(listaProfessores);
        }
      } catch (error) {
        console.error('Erro ao carregar orientadores:', error);
      }
    };

    carregarProfessores();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!arquivo) {
      setMensagem('Por favor, selecione o arquivo PDF do projeto.');
      return;
    }

    setCarregando(true);
    setMensagem('A enviar PDF e a gravar no banco relacional...');

    try {
      const token = localStorage.getItem('hub_token');
      const perfilId = localStorage.getItem('perfil_id');

      // 1. Usa FormData em vez de JSON para suportar o ficheiro PDF
      const formData = new FormData();
      formData.append('titulo', titulo);
      formData.append('resumo', resumo);
      formData.append('categoria', categoria);
      formData.append('autorPrincipalId', String(perfilId));
      formData.append('dataPublicacao', new Date().toISOString());
      
      // Anexa o ficheiro e o orientador (se foi selecionado)
      formData.append('arquivo', arquivo);
      if (orientadorId) {
        formData.append('orientadorId', orientadorId);
      }

      // 2. Salva no PostgreSQL via academico-service
      // Nota: Não enviamos 'Content-Type', o fetch define automaticamente como 'multipart/form-data'
      const resPub = await fetch(`${process.env.NEXT_PUBLIC_ACADEMICO_URL}/publicacoes`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const dataPub = await resPub.json();
      if (!resPub.ok) throw new Error(dataPub.error || 'Erro ao salvar a publicação');

      setMensagem('PDF salvo! A processar inteligência no Neo4j...');

      // 3. Salva as Áreas no Grafo Neo4j (match-service) mantendo o envio em JSON
      const areas = areasInput.split(',').map(area => area.trim()).filter(area => area !== '');
      if (areas.length > 0) {
        const resMatch = await fetch(`${process.env.NEXT_PUBLIC_MATCH_URL}/projetos/temas`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify({
            projetoId: dataPub.id,
            titulo,
            areas
          })
        });

        if (!resMatch.ok) throw new Error('Publicação criada, mas falhou ao gerar grafo no Neo4j.');
      }

      setMensagem('Projeto submetido com sucesso! A redirecionar...');
      setTimeout(() => router.push('/feed'), 2000);

    } catch (err: any) {
      setMensagem(`Erro: ${err.message}`);
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8 text-black">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow border-t-4 border-blue-600">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Submeter Novo Projeto Académico</h2>
        
        {mensagem && (
          <div className={`p-4 rounded mb-6 text-sm font-semibold ${mensagem.includes('Erro') ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
            {mensagem}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700">Título do Projeto</label>
            <input type="text" required value={titulo} onChange={e => setTitulo(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded p-2" placeholder="Ex: Análise de Dados com Node.js" />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700">Resumo (Abstract)</label>
            <textarea required value={resumo} onChange={e => setResumo(e.target.value)} rows={4} className="mt-1 block w-full border border-gray-300 rounded p-2" placeholder="Descreva brevemente o seu projeto..."></textarea>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700">Categoria</label>
              <select value={categoria} onChange={e => setCategoria(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded p-2">
                <option value="ARTIGO">Artigo Científico</option>
                <option value="TCC">TCC (Trabalho de Conclusão)</option>
                <option value="DISSERTACAO">Dissertação</option>
                <option value="RELATORIO_TECNICO">Relatório Técnico</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-700">Professor Orientador (Opcional)</label>
              <select value={orientadorId} onChange={e => setOrientadorId(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded p-2">
                <option value="">Nenhum / Não se aplica</option>
                {professores.map(prof => (
                  <option key={prof.id} value={prof.id}>
                    {prof.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700">Áreas de Conhecimento (Grafo Neo4j)</label>
              <input type="text" required value={areasInput} onChange={e => setAreasInput(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded p-2" placeholder="Ex: Cloud, React, Grafos" />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700">Arquivo do Trabalho (.PDF)</label>
              <input 
                type="file" 
                accept=".pdf" 
                required 
                onChange={e => setArquivo(e.target.files ? e.target.files[0] : null)} 
                className="mt-1 block w-full border border-gray-300 rounded p-1 file:mr-4 file:py-1 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
              />
            </div>
          </div>

          <div className="flex justify-end gap-4 mt-8">
            <button type="button" onClick={() => router.push('/feed')} className="px-4 py-2 text-gray-600 bg-gray-200 hover:bg-gray-300 rounded font-bold">
              Cancelar
            </button>
            <button type="submit" disabled={carregando} className="px-6 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 disabled:opacity-50">
              {carregando ? 'A enviar ficheiro e a publicar...' : 'Publicar Projeto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}