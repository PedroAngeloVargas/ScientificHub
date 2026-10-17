'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PrimeiroAcesso() {
  const router = useRouter();
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [telefone, setTelefone] = useState('');
  const [endereco, setEndereco] = useState('');
  
  const [areasDisponiveis, setAreasDisponiveis] = useState<string[]>([]);
  const [areasSelecionadas, setAreasSelecionadas] = useState<string[]>([]);
  
  const [mensagem, setMensagem] = useState('');
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    const carregarAreas = async () => {
      const token = localStorage.getItem('hub_token');
      if (!token) {
        router.push('/login');
        return;
      }
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_MATCH_URL}/areas`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) setAreasDisponiveis(await res.json());
      } catch (error) {
        console.error('Erro ao carregar áreas', error);
      }
    };
    carregarAreas();
  }, [router]);

  const toggleArea = (area: string) => {
    setAreasSelecionadas(prev => 
      prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
    );
  };

  const concluirConfiguracao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (novaSenha !== confirmarSenha) {
      setMensagem('Erro: As senhas não coincidem.');
      return;
    }
    if (areasSelecionadas.length === 0) {
      setMensagem('Erro: Selecione pelo menos uma área de interesse.');
      return;
    }

    setCarregando(true);
    setMensagem('A configurar o seu perfil e o motor de inteligência...');

    try {
      const token = localStorage.getItem('hub_token');
      const perfilId = localStorage.getItem('perfil_id');
      const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

      // 1. Atualizar Senha (auth-service)
      const reqAuth = fetch(`${process.env.NEXT_PUBLIC_AUTH_URL}/atualizar-senha`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ novaSenha })
      });

      // 2. Atualizar Perfil (perfil-service)
      const reqPerfil = fetch(`${process.env.NEXT_PUBLIC_PERFIL_URL}/usuarios/${perfilId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ telefone, endereco })
      });

      // 3. Vincular Interesses (match-service - Neo4j)
      const reqMatch = fetch(`${process.env.NEXT_PUBLIC_MATCH_URL}/usuarios/interesses`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ perfilId, nome: "Usuário", interesses: areasSelecionadas })
      });

      // Aguarda todos os microsserviços processarem
      await Promise.all([reqAuth, reqPerfil, reqMatch]);

      setMensagem('Perfil configurado com sucesso! A redirecionar para o Hub...');
      setTimeout(() => router.push('/feed'), 2000);
    } catch (err) {
      setMensagem('Ocorreu um erro ao guardar as configurações.');
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-3xl w-full bg-white rounded-lg shadow-lg border-t-4 border-blue-600 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Bem-vindo(a) ao ScientificHub!</h1>
        <p className="text-gray-600 mb-6">Como este é o seu primeiro acesso, precisamos de configurar a sua segurança e o seu perfil para o motor de recomendações.</p>

        {mensagem && (
          <div className={`p-4 rounded mb-6 text-sm font-semibold ${mensagem.includes('Erro') ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
            {mensagem}
          </div>
        )}

        <form onSubmit={concluirConfiguracao} className="space-y-6 text-black">
          <div className="bg-gray-100 p-4 rounded border border-gray-200">
            <h3 className="font-bold text-lg mb-4">1. Segurança</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700">Nova Senha</label>
                <input type="password" required value={novaSenha} onChange={e => setNovaSenha(e.target.value)} className="mt-1 w-full border p-2 rounded" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700">Confirmar Nova Senha</label>
                <input type="password" required value={confirmarSenha} onChange={e => setConfirmarSenha(e.target.value)} className="mt-1 w-full border p-2 rounded" />
              </div>
            </div>
          </div>

          <div className="bg-gray-100 p-4 rounded border border-gray-200">
            <h3 className="font-bold text-lg mb-4">2. Dados de Contacto</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700">Telefone (Opcional)</label>
                <input type="text" value={telefone} onChange={e => setTelefone(e.target.value)} className="mt-1 w-full border p-2 rounded" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700">Endereço (Opcional)</label>
                <input type="text" value={endereco} onChange={e => setEndereco(e.target.value)} className="mt-1 w-full border p-2 rounded" />
              </div>
            </div>
          </div>

          <div className="bg-gray-100 p-4 rounded border border-gray-200">
            <h3 className="font-bold text-lg mb-2">3. Áreas de Interesse (Para Recomendações)</h3>
            <p className="text-sm text-gray-500 mb-4">Selecione os temas sobre os quais tem interesse em pesquisar ou orientar projetos.</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {areasDisponiveis.map(area => (
                <label key={area} className="flex items-center space-x-2 cursor-pointer bg-white p-2 rounded border hover:bg-blue-50 transition-colors">
                  <input type="checkbox" checked={areasSelecionadas.includes(area)} onChange={() => toggleArea(area)} className="w-4 h-4 text-blue-600 rounded" />
                  <span className="text-sm font-medium">{area}</span>
                </label>
              ))}
            </div>
          </div>

          <button type="submit" disabled={carregando} className="w-full py-3 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 disabled:opacity-50">
            {carregando ? 'A configurar...' : 'Concluir Configuração e Aceder ao Hub'}
          </button>
        </form>
      </div>
    </div>
  );
}