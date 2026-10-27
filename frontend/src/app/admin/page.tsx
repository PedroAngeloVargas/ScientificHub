'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/AppHeader';
import { Alert, Button, Card, Field, Input, Select, Spinner } from '@/components/ui';

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
  const [copiada, setCopiada] = useState(false);
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

  const copiarSenha = async () => {
    await navigator.clipboard.writeText(senhaGerada);
    setCopiada(true);
    setTimeout(() => setCopiada(false), 2000);
  };

  const registarUtilizador = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    setMensagem('');
    setSenhaGerada('');

    // Bloqueia a inserção se o CPF for inválido
    if (!isCpfValido(cpf)) {
      setMensagem('Erro: CPF inválido. Confira os números e tente de novo.');
      setCarregando(false);
      return;
    }

    setMensagem('Cadastrando usuário...');
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

      setMensagem('Usuário cadastrado com sucesso!');
      setSenhaGerada(senhaTemporaria);

      // Limpa o formulário
      setNome(''); setEmail(''); setCpf(''); setTelefone(''); setMatricula(''); setCurso(''); setDepartamento('Exatas');
    } catch (err: any) {
      setMensagem(`Erro: ${err.message}`);
    } finally {
      setCarregando(false);
    }
  };

  const tomMensagem = mensagem.includes('Erro') ? 'error' : mensagem.includes('sucesso') ? 'success' : 'info';

  return (
    <div className="min-h-screen">
      <AppHeader papel="ADMIN" />

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="mb-8">
          <h1 className="text-[2.25rem] font-bold leading-tight text-ink">Cadastro institucional</h1>
          <p className="mt-3 text-muted">
            Cadastre alunos, professores e administradores. O sistema gera uma senha temporária para o primeiro acesso.
          </p>
        </div>

        {senhaGerada && (
          <div className="mb-8 rounded-r-lg border border-l-4 border-line border-l-success bg-surface p-6 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold text-ink">Usuário cadastrado</p>
                <p className="mt-1 text-sm text-muted">Entregue esta senha temporária ao usuário. Ela não aparece de novo.</p>
              </div>
              <div className="flex items-center gap-2">
                <code className="bg-highlight px-3 py-1.5 font-mono text-2xl font-semibold tracking-[0.15em] text-ink">
                  {senhaGerada}
                </code>
                <Button variant="secondary" onClick={copiarSenha}>
                  {copiada ? 'Copiada ✓' : 'Copiar'}
                </Button>
              </div>
            </div>
          </div>
        )}

        <Card className="p-6 sm:p-10">
          <form onSubmit={registarUtilizador} className="space-y-8">
            <fieldset>
              <legend className="mb-5 text-lg font-bold text-ink">Dados pessoais</legend>
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Nome completo">
                  <Input type="text" required value={nome} onChange={e => setNome(e.target.value)} />
                </Field>
                <Field label="CPF">
                  <Input type="text" required value={cpf} onChange={e => setCpf(e.target.value)} placeholder="000.000.000-00" />
                </Field>
                <Field label="E-mail institucional">
                  <Input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="@uemg.br ou @discente.uemg.br" />
                </Field>
                <Field label="Telefone">
                  <Input type="text" required value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(31) 90000-0000" />
                </Field>
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-5 w-full border-t border-line pt-8 text-lg font-bold text-ink">Vínculo acadêmico</legend>
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Matrícula">
                  <Input type="text" required value={matricula} onChange={e => setMatricula(e.target.value)} />
                </Field>
                <Field label="Curso">
                  <Input type="text" required value={curso} onChange={e => setCurso(e.target.value)} placeholder="Ex: Sistemas de Informação" />
                </Field>
                <Field label="Departamento">
                  <Select value={departamento} onChange={e => setDepartamento(e.target.value)}>
                    <option value="Exatas">Ciências Exatas</option>
                    <option value="Biológicas">Ciências Biológicas</option>
                    <option value="Humanidades">Ciências Humanas</option>
                  </Select>
                </Field>
                <Field label="Tipo de usuário">
                  <Select value={tipo} onChange={e => setTipo(e.target.value)}>
                    <option value="ALUNO">Aluno (Discente)</option>
                    <option value="PROFESSOR">Professor (Docente)</option>
                    <option value="ADMIN">Administrador (Reitoria)</option>
                  </Select>
                </Field>
              </div>
            </fieldset>

            {mensagem && <Alert tone={tomMensagem}>{mensagem}</Alert>}

            <div className="flex justify-end border-t border-line pt-6">
              <Button type="submit" disabled={carregando} className="w-full sm:w-auto">
                {carregando && <Spinner />}
                {carregando ? 'Cadastrando...' : 'Cadastrar e gerar senha'}
              </Button>
            </div>
          </form>
        </Card>
      </main>
    </div>
  );
}
