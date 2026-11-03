'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Card, Field, Input, Logo, Spinner } from '@/components/ui';
import { lerSessao, paginaInicial } from '@/lib/sessao';

// Tela obrigatória depois de entrar com a senha temporária gerada pela Reitoria.
export default function TrocarSenha() {
  const router = useRouter();
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const sessao = lerSessao();
    if (!sessao) {
      router.replace('/login');
      return;
    }
    // O MFA vem antes: sem ele o servidor não aceita a troca
    if (!sessao.mfa) {
      router.replace('/configurar-mfa');
      return;
    }
    // Quem não tem senha temporária não precisa estar aqui
    if (!sessao.trocarSenha) router.replace(paginaInicial(localStorage.getItem('tipo_usuario')));
  }, [router]);

  const trocar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    if (novaSenha !== confirmar) {
      setErro('As senhas não coincidem.');
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_AUTH_URL}/senha`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('hub_token')}` },
        body: JSON.stringify({ senhaAtual, novaSenha }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Não foi possível trocar a senha.');

      // Sessão nova, sem a restrição da senha temporária
      localStorage.setItem('hub_token', data.token);
      setSucesso('Senha alterada. Abrindo o Hub...');
      setTimeout(() => router.push(paginaInicial(localStorage.getItem('tipo_usuario'))), 1200);
    } catch (err) {
      setErro(err instanceof Error && err.message !== 'Failed to fetch' ? err.message : 'Não foi possível conectar. Verifique sua conexão e tente de novo.');
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-lg">
        <div className="mb-10"><Logo /></div>

        <div className="mb-8">
          <h1 className="text-[2.25rem] font-bold leading-tight text-ink">Crie uma nova senha</h1>
          <p className="mt-3 text-muted">
            Você entrou com uma senha temporária, gerada pela Reitoria. Por segurança, escolha agora uma senha só sua.
          </p>
        </div>

        <Card className="p-6 sm:p-8">
          <form onSubmit={trocar} className="space-y-5">
            <Field label="Senha temporária">
              <Input type="password" required value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)} autoComplete="current-password" autoFocus />
            </Field>
            <Field label="Nova senha" hint="Mínimo 8 caracteres">
              <Input type="password" required minLength={8} value={novaSenha} onChange={e => setNovaSenha(e.target.value)} autoComplete="new-password" />
            </Field>
            <Field label="Confirmar nova senha">
              <Input type="password" required minLength={8} value={confirmar} onChange={e => setConfirmar(e.target.value)} autoComplete="new-password" />
            </Field>

            {erro && <Alert tone="error">{erro}</Alert>}
            {sucesso && <Alert tone="success">{sucesso}</Alert>}

            <Button type="submit" disabled={enviando || !!sucesso} className="w-full py-3">
              {enviando && <Spinner />}
              Salvar nova senha
            </Button>
          </form>
        </Card>

        <button
          onClick={() => { localStorage.clear(); router.push('/login'); }}
          className="mt-6 cursor-pointer text-sm font-medium text-muted transition-colors hover:text-ink"
        >
          Sair e trocar depois
        </button>
      </div>
    </div>
  );
}
