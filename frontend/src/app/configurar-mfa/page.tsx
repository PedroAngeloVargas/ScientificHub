'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Card, Field, Input, Logo, Spinner } from '@/components/ui';
import { lerSessao, paginaInicial } from '@/lib/sessao';

interface Configuracao {
  qrCode: string;
  segredo: string;
}

function Passo({ numero, titulo, children }: { numero: number; titulo: string; children: ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent text-sm font-bold text-white">
        {numero}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="font-bold text-ink">{titulo}</h3>
        <div className="mt-1 text-sm leading-relaxed text-muted">{children}</div>
      </div>
    </li>
  );
}

export default function ConfigurarMfa() {
  const router = useRouter();
  const [config, setConfig] = useState<Configuracao | null>(null);
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    const sessao = lerSessao();
    if (!sessao) {
      router.push('/login');
      return;
    }
    const papel = localStorage.getItem('tipo_usuario');
    // Sessão já validada com MFA: nada a configurar
    if (sessao.mfa) {
      router.replace(paginaInicial(papel));
      return;
    }

    const gerarQrCode = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_AUTH_URL}/mfa/configurar`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('hub_token')}` },
        });
        const data = await res.json();

        // MFA já ativo noutra sessão: é preciso entrar de novo para validar o código
        if (res.status === 409) {
          localStorage.clear();
          router.replace('/login');
          return;
        }
        if (res.status === 401) {
          router.replace('/login');
          return;
        }
        if (!res.ok) throw new Error(data.error || 'Erro ao gerar o QR Code');

        setConfig(data);
      } catch (err: any) {
        setErro(err.message);
      }
    };

    gerarQrCode();
  }, [router]);

  const copiarSegredo = async () => {
    if (!config) return;
    await navigator.clipboard.writeText(config.segredo);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const ativar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_AUTH_URL}/mfa/ativar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('hub_token')}` },
        body: JSON.stringify({ codigo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Código inválido');

      // Troca o token limitado por um com o segundo fator validado
      localStorage.setItem('hub_token', data.token);
      setSucesso('Verificação em duas etapas ativada. Abrindo o Hub...');
      setTimeout(() => router.push(paginaInicial(localStorage.getItem('tipo_usuario'))), 1500);
    } catch (err: any) {
      setErro(err.message);
      setCodigo('');
      setEnviando(false);
    }
  };

  // Segredo em blocos de 4 para facilitar a digitação manual
  const segredoFormatado = config?.segredo.match(/.{1,4}/g)?.join(' ');

  return (
    <div className="min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10"><Logo /></div>

        <div className="mb-8">
          <h1 className="text-[2.25rem] font-bold leading-tight text-ink">Ative a verificação em duas etapas</h1>
          <p className="mt-3 text-muted">
            Além da senha, o Hub vai pedir um código temporário gerado no seu celular. Todas as contas da UEMG
            precisam dessa proteção.
          </p>
        </div>

        <Card className="p-6 sm:p-10">
          <div className="grid gap-10 md:grid-cols-[1fr_auto]">
            <ol className="space-y-6">
              <Passo numero={1} titulo="Instale um aplicativo autenticador">
                Por exemplo: <span className="text-ink">Google Authenticator</span>, <span className="text-ink">Microsoft Authenticator</span> ou{' '}
                <span className="text-ink">Authy</span> (Android e iOS).
              </Passo>
              <Passo numero={2} titulo="Leia o QR Code">
                No aplicativo, toque em adicionar conta e aponte a câmera para o código.
                {segredoFormatado && (
                  <span className="mt-3 block">
                    Não consegue ler o código? Digite esta chave no aplicativo:
                    <span className="mt-2 flex items-center gap-2">
                      <code className="break-all rounded-md bg-paper px-3 py-2 font-mono text-sm text-ink ring-1 ring-line">{segredoFormatado}</code>
                      <button
                        type="button"
                        onClick={copiarSegredo}
                        className="shrink-0 cursor-pointer rounded-lg px-2.5 py-2 text-xs font-medium text-muted hover:bg-ink/5 hover:text-ink"
                      >
                        {copiado ? 'Copiado!' : 'Copiar'}
                      </button>
                    </span>
                  </span>
                )}
              </Passo>
              <Passo numero={3} titulo="Confirme com o código gerado">
                <form onSubmit={ativar} className="mt-3 space-y-4">
                  <Field label="Código de 6 dígitos">
                    <Input
                      value={codigo}
                      onChange={e => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      required
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="\d{6}"
                      placeholder="000000"
                      disabled={!config || !!sucesso}
                      className="max-w-56 text-center font-mono text-2xl tracking-[0.5em]"
                    />
                  </Field>

                  {erro && <Alert tone="error">{erro}</Alert>}
                  {sucesso && <Alert tone="success">{sucesso}</Alert>}

                  <Button type="submit" disabled={!config || enviando || codigo.length !== 6 || !!sucesso}>
                    {enviando && <Spinner />}
                    Ativar e entrar no Hub
                  </Button>
                </form>
              </Passo>
            </ol>

            <div className="flex justify-center md:block">
              {config ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={config.qrCode}
                  alt="QR Code para configurar o aplicativo autenticador"
                  width={240}
                  height={240}
                  className="rounded-md bg-white p-3 ring-1 ring-line"
                />
              ) : (
                <div className="grid h-[264px] w-[264px] place-items-center rounded-md bg-line/60 text-muted">
                  {!erro && <Spinner />}
                </div>
              )}
            </div>
          </div>
        </Card>

        <button
          onClick={() => { localStorage.clear(); router.push('/login'); }}
          className="mt-6 cursor-pointer text-sm font-medium text-muted transition-colors hover:text-ink"
        >
          Sair e configurar no próximo acesso
        </button>
      </div>
    </div>
  );
}
