'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [matricula, setMatricula] = useState('');
  const [curso, setCurso] = useState('');
  const [departamento, setDepartamento] = useState('Exatas');
  const [tipo, setTipo] = useState('ALUNO');
  
  const [mensagem, setMensagem] = useState('');
  const [senhaGerada, setSenhaGerada] = useState('');
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem('tipo_usuario');
    if (role !== 'ADMIN') router.push('/login');
  }, [router]);

  // Algoritmo de validação de CPF brasileiro
  const isCpfValido = (strCPF: string) => {
    let cpfLimpo = strCPF.replace(/[^\d]+/g, '');
    if (cpfLimpo.length !== 11 || /^(\d)\1{10}$/.test(cpfLimpo)) return false;
    
    let soma = 0;
    let resto;
    
    for (let i = 1; i <= 9; i++) soma += parseInt(cpfLimpo.substring(i - 1, i)) * (11 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpfLimpo.substring(9, 10))) return false;
    
    soma = 0;
    for (let i = 1; i <= 10; i++) soma += parseInt(cpfLimpo.substring(i - 1, i)) * (12 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpfLimpo.substring(10, 11))) return false;
    
    return true;
  };

  const gerarSenhaAutomatica = () => {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#';
    let senha = '';
    for (let i = 0; i < 8; i++) {
      senha += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    return senha;
  };

  const registarUtilizador = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    setMensagem('');
    setSenhaGerada('');

    // Bloqueia a inserção se o CPF for inválido
    if (!isCpfValido(cpf)) {
      setMensagem('Erro: O CPF introduzido não é válido. O registo foi bloqueado.');
      setCarregando(false);
      return;
    }

    setMensagem('A registar utilizador...');
    const senhaTemporaria = gerarSenhaAutomatica();

    try {
      const token = localStorage.getItem('hub_token');
      const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

      // 1. Cria no perfil-service
      const resPerfil = await fetch(`${process.env.NEXT_PUBLIC_PERFIL_URL}/usuarios`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ nome, email, cpf, telefone, matricula, tipo, curso, departamento })
      });
      
      const dataPerfil = await resPerfil.json();
      if (!resPerfil.ok) throw new Error(dataPerfil.error || 'Erro ao criar perfil. Verifique se o CPF ou E-mail já existem.');

      // 2. Cria no auth-service com a senha gerada
      const resAuth = await fetch(`${process.env.NEXT_PUBLIC_AUTH_URL}/registrar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha: senhaTemporaria, perfilId: dataPerfil.id })
      });

      if (!resAuth.ok) throw new Error('Erro ao criar credenciais de acesso no serviço de autenticação.');

      setMensagem('Utilizador registado com sucesso!');
      setSenhaGerada(senhaTemporaria);
      
      // Limpa o formulário
      setNome(''); setEmail(''); setCpf(''); setTelefone(''); setMatricula(''); setCurso(''); setDepartamento('Exatas');
    } catch (err: any) {
      setMensagem(`Erro: ${err.message}`);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 text-black p-8">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md border-t-4 border-red-600">
        <h1 className="text-2xl font-bold mb-6 text-red-700">Cadastro Institucional</h1>
        
        {mensagem && (
          <div className={`mb-6 p-4 rounded text-sm font-semibold ${mensagem.includes('Erro') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-800'}`}>
            {mensagem}
          </div>
        )}

        {senhaGerada && (
          <div className="mb-6 p-6 bg-blue-50 border border-blue-200 rounded-lg text-center">
            <p className="text-blue-800 font-medium mb-2">Utilizador criado! Copie a senha temporária de primeiro acesso:</p>
            <p className="text-3xl font-mono font-bold text-blue-900 tracking-wider bg-white py-2 px-4 inline-block rounded shadow-inner border border-blue-100">
              {senhaGerada}
            </p>
          </div>
        )}

        <form onSubmit={registarUtilizador} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700">Nome Completo</label>
              <input type="text" required value={nome} onChange={e => setNome(e.target.value)} className="mt-1 w-full border p-2 rounded focus:ring-red-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700">CPF</label>
              <input type="text" required value={cpf} onChange={e => setCpf(e.target.value)} className="mt-1 w-full border p-2 rounded focus:ring-red-500" placeholder="Apenas números ou com formatação" />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700">E-mail Institucional</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="mt-1 w-full border p-2 rounded focus:ring-red-500" placeholder="@uemg.br ou @discente.uemg.br"/>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700">Telefone</label>
              <input type="text" required value={telefone} onChange={e => setTelefone(e.target.value)} className="mt-1 w-full border p-2 rounded focus:ring-red-500" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700">Matrícula</label>
              <input type="text" required value={matricula} onChange={e => setMatricula(e.target.value)} className="mt-1 w-full border p-2 rounded focus:ring-red-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700">Curso</label>
              <input type="text" required value={curso} onChange={e => setCurso(e.target.value)} className="mt-1 w-full border p-2 rounded focus:ring-red-500" placeholder="Ex: Sistemas de Informação" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700">Departamento</label>
              <select value={departamento} onChange={e => setDepartamento(e.target.value)} className="mt-1 w-full border p-2 rounded focus:ring-red-500">
                <option value="Exatas">Ciências Exatas</option>
                <option value="Biológicas">Ciências Biológicas</option>
                <option value="Humanidades">Ciências Humanidades</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700">Tipo de Utilizador</label>
              <select value={tipo} onChange={e => setTipo(e.target.value)} className="mt-1 w-full border p-2 rounded focus:ring-red-500">
                <option value="ALUNO">Aluno (Discente)</option>
                <option value="PROFESSOR">Professor (Docente)</option>
                <option value="ADMIN">Administrador (Reitoria)</option>
              </select>
            </div>
          </div>

          <button type="submit" disabled={carregando} className="w-full bg-red-600 text-white font-bold py-3 rounded-md hover:bg-red-700 mt-4 disabled:opacity-50">
            {carregando ? 'A processar...' : 'Gerar Registo Institucional e Senha'}
          </button>
        </form>

        <button onClick={() => { localStorage.clear(); router.push('/login'); }} className="mt-8 text-sm text-gray-500 font-semibold hover:underline">
          &larr; Encerrar Sessão de Administrador
        </button>
      </div>
    </div>
  );
}