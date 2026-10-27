'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Card, Field, Input, Logo, Spinner } from '@/components/ui';
import { formatarArea } from '@/lib/formato';

function Etapa({ numero, titulo, descricao, children }: { numero: number; titulo: string; descricao: string; children: ReactNode }) {
  return (
    <section className="grid gap-6 border-t border-line py-8 first:border-t-0 first:pt-0 md:grid-cols-[220px_1fr]">
      <div>
        <span className="mb-3 grid h-8 w-8 place-items-center rounded-full bg-accent text-sm font-bold text-white">
          {numero}
        </span>
        <h3 className="text-lg font-bold text-ink">{titulo}</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted">{descricao}</p>
      </div>
      <div>{children}</div>
    </section>
  );
}

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

      setMensagem('Perfil salvo com sucesso. Agora, ative a verificação em duas etapas.');
      // Próximo passo obrigatório: configurar o MFA
      setTimeout(() => router.push('/configurar-mfa'), 2000);
    } catch (err) {
      setMensagem('Erro: não foi possível salvar. Verifique sua conexão e tente de novo.');
      setCarregando(false);
    }
  };

  const tomMensagem = mensagem.includes('Erro') ? 'error' : mensagem.includes('sucesso') ? 'success' : 'info';

  return (
    <div className="min-h-screen px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-4xl">
        <div className="mb-10 flex items-center justify-between">
          <Logo />
          <span className="text-sm text-muted">Primeiro acesso</span>
        </div>

        <div className="mb-10">
          <h1 className="text-[2.25rem] font-bold leading-tight text-ink">Bem-vindo(a) ao ScientificHub</h1>
          <p className="mt-3 max-w-2xl leading-relaxed text-muted">
            Antes de começar, troque sua senha e conte quais temas você pesquisa. Com isso, o Hub sugere os projetos
            e orientadores certos para você.
          </p>
        </div>

        <Card className="p-6 sm:p-10">
          <form onSubmit={concluirConfiguracao}>
            <Etapa numero={1} titulo="Segurança" descricao="Substitua a senha temporária recebida da Reitoria.">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nova senha">
                  <Input type="password" required value={novaSenha} onChange={e => setNovaSenha(e.target.value)} autoComplete="new-password" />
                </Field>
                <Field label="Confirmar nova senha">
                  <Input type="password" required value={confirmarSenha} onChange={e => setConfirmarSenha(e.target.value)} autoComplete="new-password" />
                </Field>
              </div>
            </Etapa>

            <Etapa numero={2} titulo="Contato" descricao="Informações opcionais para facilitar a comunicação.">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Telefone" hint="Opcional">
                  <Input type="text" value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(31) 90000-0000" />
                </Field>
                <Field label="Endereço" hint="Opcional">
                  <Input type="text" value={endereco} onChange={e => setEndereco(e.target.value)} />
                </Field>
              </div>
            </Etapa>

            <Etapa numero={3} titulo="Áreas de interesse" descricao="Temas que deseja pesquisar ou orientar. Usados nas recomendações.">
              {areasDisponiveis.length === 0 ? (
                <p className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
                  Nenhuma área cadastrada ainda.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {areasDisponiveis.map(area => {
                    const ativa = areasSelecionadas.includes(area);
                    return (
                      <button
                        type="button"
                        key={area}
                        onClick={() => toggleArea(area)}
                        aria-pressed={ativa}
                        className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                          ativa
                            ? 'border-ink bg-highlight text-ink'
                            : 'border-line bg-surface text-text hover:border-accent'
                        }`}
                      >
                        {ativa && <span className="mr-1.5">✓</span>}
                        {formatarArea(area)}
                      </button>
                    );
                  })}
                </div>
              )}
              <p className="mt-3 text-xs text-muted">
                {areasSelecionadas.length} {areasSelecionadas.length === 1 ? 'área selecionada' : 'áreas selecionadas'}
              </p>
            </Etapa>

            <div className="space-y-4 border-t border-line pt-8">
              {mensagem && <Alert tone={tomMensagem}>{mensagem}</Alert>}
              <div className="flex justify-end">
                <Button type="submit" disabled={carregando} className="w-full sm:w-auto">
                  {carregando && <Spinner />}
                  {carregando ? 'Salvando...' : 'Salvar e continuar'}
                </Button>
              </div>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
