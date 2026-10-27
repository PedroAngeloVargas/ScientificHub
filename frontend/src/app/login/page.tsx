'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Field, Input, Logo, Spinner } from '@/components/ui';
import { paginaInicial } from '@/lib/sessao';
import { GrafoInteresses } from '@/components/GrafoInteresses';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const router = useRouter();

  // 2ª etapa (MFA): preenchido quando a senha está certa e falta o código do aplicativo
  const [tokenMfa, setTokenMfa] = useState('');
  const [codigo, setCodigo] = useState('');

  // Guarda a sessão e decide para onde ir
  const concluirLogin = (data: { token: string; perfilId: string; primeiroAcesso: boolean; mfaAtivo: boolean }, role: string) => {
    localStorage.setItem('hub_token', data.token);
    localStorage.setItem('perfil_id', data.perfilId);
    localStorage.setItem('tipo_usuario', role);

    // Ordem obrigatória: primeiro acesso -> configuração do MFA -> Hub
    if (data.primeiroAcesso && role !== 'ADMIN') {
      router.push('/primeiro-acesso');
    } else if (!data.mfaAtivo) {
      router.push('/configurar-mfa');
    } else {
      router.push(paginaInicial(role));
    }
  };

  const papelDoEmail = (emailTratado: string) => {
    if (emailTratado === 'admin@uemg.br') return 'ADMIN';
    if (emailTratado.endsWith('@discente.uemg.br')) return 'ALUNO';
    return 'PROFESSOR';
  };

  const validarCodigo = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_AUTH_URL}/login/mfa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenMfa, codigo }),
      });
      const data = await res.json();

      if (!res.ok) {
        // Token intermediário expirado ou tentativas esgotadas: volta para a senha
        if (res.status === 429 || data.error?.includes('senha novamente')) {
          setTokenMfa('');
          setSenha('');
        }
        setCodigo('');
        throw new Error(data.error || 'Código inválido');
      }

      concluirLogin(data, papelDoEmail(email.toLowerCase().trim()));
    } catch (err: any) {
      setErro(err.message);
      setCarregando(false);
    }
  };

  const fazerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    const emailTratado = email.toLowerCase().trim();

    // Validação de Domínio e Admin
    const isAdmin = emailTratado === 'admin@uemg.br';
    const isAluno = emailTratado.endsWith('@discente.uemg.br');
    const isProfessor = emailTratado.endsWith('@uemg.br') && !isAluno && !isAdmin;

    if (!isAluno && !isProfessor && !isAdmin) {
      setErro('Use um e-mail @uemg.br ou @discente.uemg.br.');
      return;
    }

    setCarregando(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_AUTH_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailTratado, senha }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Erro ao fazer login');

      // Senha certa, mas a conta tem MFA: pede o código do aplicativo
      if (data.mfaObrigatorio) {
        setTokenMfa(data.tokenMfa);
        setCarregando(false);
        return;
      }

      concluirLogin(data, papelDoEmail(emailTratado));
    } catch (err: any) {
      setErro(err.message);
      setCarregando(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      {/* Folha pautada com o grafo de interesses: a ideia central do Hub */}
      <aside className="papel-pautado relative hidden border-r border-line lg:flex lg:flex-col lg:justify-between lg:py-10 lg:pl-24 lg:pr-12 lg:[background-position:0_0,0_100%]">
        <Logo />

        <GrafoInteresses />

        <div className="max-w-md pb-[30px]">
          <h1 className="text-[2.75rem] font-extrabold leading-[1.05] text-ink">
            Encontre quem pesquisa o mesmo que você.
          </h1>
          <p className="mt-4 text-[17px] leading-8 text-muted">
            Publique seu TCC ou artigo, encontre um orientador e descubra projetos ligados aos seus interesses.
          </p>
        </div>
      </aside>

      {/* Formulário */}
      <main className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-12 lg:hidden">
            <Logo />
          </div>

          {tokenMfa ? (
            <>
              <h2 className="text-[1.75rem] font-bold leading-tight text-ink">Código de verificação</h2>
              <p className="mt-2 text-[15px] text-muted">
                Abra o aplicativo autenticador e digite o código de 6 dígitos da conta ScientificHub UEMG.
              </p>

              <form onSubmit={validarCodigo} className="mt-8 space-y-5">
                {erro && <Alert tone="error">{erro}</Alert>}

                <Field label="Código">
                  <Input
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    autoFocus
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="\d{6}"
                    placeholder="000000"
                    className="text-center font-mono text-2xl tracking-[0.4em]"
                  />
                </Field>

                <Button type="submit" disabled={carregando || codigo.length !== 6} className="w-full py-3">
                  {carregando && <Spinner />}
                  {carregando ? 'Verificando...' : 'Verificar e entrar'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => { setTokenMfa(''); setCodigo(''); setSenha(''); setErro(''); }}
                  className="w-full"
                >
                  Usar outra conta
                </Button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-[1.75rem] font-bold leading-tight text-ink">Entrar</h2>
              <p className="mt-2 text-[15px] text-muted">Use seu e-mail institucional da UEMG.</p>

              <form onSubmit={fazerLogin} className="mt-8 space-y-5">
                {erro && <Alert tone="error">{erro}</Alert>}

                <Field label="E-mail institucional">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="nome@discente.uemg.br"
                  />
                </Field>

                <Field label="Senha">
                  <Input
                    type="password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </Field>

                <Button type="submit" disabled={carregando} className="w-full py-3">
                  {carregando && <Spinner />}
                  {carregando ? 'Entrando...' : 'Entrar'}
                </Button>
              </form>
            </>
          )}

          <p className="mt-10 border-t border-line pt-5 text-sm leading-relaxed text-muted">
            Ainda não tem conta? As contas são criadas pela Reitoria. Fale com a secretaria do seu curso.
          </p>
        </div>
      </main>
    </div>
  );
}
