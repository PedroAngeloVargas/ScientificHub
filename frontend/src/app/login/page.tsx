'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const router = useRouter();

  const fazerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    const emailTratado = email.toLowerCase().trim();

    // Validação de Domínio e Admin
    const isAdmin = emailTratado === 'admin@uemg.br';
    const isAluno = emailTratado.endsWith('@discente.uemg.br');
    const isProfessor = emailTratado.endsWith('@uemg.br') && !isAluno && !isAdmin; 

    if (!isAluno && !isProfessor && !isAdmin) {
      setErro('Acesso restrito à comunidade UEMG.');
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_AUTH_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailTratado, senha }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Erro ao fazer login');

      // Define a Role (Papel)
      let role = 'PROFESSOR';
      if (isAluno) role = 'ALUNO';
      if (isAdmin) role = 'ADMIN';

      localStorage.setItem('hub_token', data.token);
      localStorage.setItem('perfil_id', data.perfilId);
      localStorage.setItem('tipo_usuario', role);

      // Redirecionamento Inteligente
      if (isAdmin) {
              router.push('/admin');
            } else if (data.primeiroAcesso) {
              router.push('/primeiro-acesso'); // <-- ROTA NOVA
            } else {
              router.push('/feed');
            }
    } catch (err: any) {
      setErro(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 border-t-4 border-blue-600">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-gray-900">ScientificHub</h2>
          <p className="mt-2 text-sm text-gray-600">Acesso exclusivo UEMG</p>
        </div>
        
        {erro && <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded mb-6 text-sm">{erro}</div>}

        <form onSubmit={fazerLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">E-mail Institucional</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md p-3 text-black focus:ring-blue-500"
              placeholder="nome@discente.uemg.br"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Senha</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md p-3 text-black focus:ring-blue-500"
            />
          </div>

          <button type="submit" className="w-full py-3 px-4 rounded-md font-bold text-white bg-blue-600 hover:bg-blue-700">
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}