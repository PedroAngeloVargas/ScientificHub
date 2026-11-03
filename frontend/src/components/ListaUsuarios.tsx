'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Input, Spinner } from './ui';
import { iniciais } from './PerfilDrawer';

interface Perfil {
  id: string;
  nome: string;
  email: string;
  tipo: string;
  curso: string;
  matricula: string;
}

interface Conta {
  perfilId: string;
  ativo: boolean;
  primeiroAcesso: boolean;
  senhaTemporaria: boolean;
  mfaAtivo: boolean;
}

type Usuario = Perfil & Partial<Omit<Conta, 'perfilId'>>;
type Filtro = 'TODOS' | 'ALUNO' | 'PROFESSOR' | 'DESATIVADOS';

const rotulosPapel: Record<string, string> = {
  ALUNO: 'Discente',
  PROFESSOR: 'Docente',
  ADMIN: 'Reitoria',
};

const filtros: { valor: Filtro; rotulo: string }[] = [
  { valor: 'TODOS', rotulo: 'Todos' },
  { valor: 'ALUNO', rotulo: 'Discentes' },
  { valor: 'PROFESSOR', rotulo: 'Docentes' },
  { valor: 'DESATIVADOS', rotulo: 'Desativados' },
];

const authHeaders = (json = false): Record<string, string> => ({
  'Authorization': `Bearer ${localStorage.getItem('hub_token')}`,
  ...(json && { 'Content-Type': 'application/json' }),
});

// Sem acento e em minúsculas, para a busca achar "joao" em "João"
const normalizar = (texto: string) => texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

export function ListaUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('TODOS');

  // Uma ação por vez em cada usuário
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ tom: 'success' | 'error'; texto: string } | null>(null);
  const [senhaGerada, setSenhaGerada] = useState<{ nome: string; senha: string } | null>(null);
  const [copiada, setCopiada] = useState(false);

  const carregar = useCallback(async () => {
    try {
      // O perfil (nome, curso...) vem do perfil-service e o estado da conta do auth-service
      const [resPerfis, resContas] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_PERFIL_URL}/usuarios`, { headers: authHeaders() }),
        fetch(`${process.env.NEXT_PUBLIC_AUTH_URL}/contas`, { headers: authHeaders() }),
      ]);
      if (!resPerfis.ok || !resContas.ok) throw new Error();

      const perfis: Perfil[] = await resPerfis.json();
      const contas: Conta[] = await resContas.json();
      const porPerfil = new Map(contas.map(c => [c.perfilId, c]));
      setUsuarios(perfis.map(p => ({ ...p, ...porPerfil.get(p.id) })));
    } catch {
      setErro('Não foi possível carregar os usuários. Verifique sua conexão e tente de novo.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const visiveis = useMemo(() => {
    const termo = normalizar(busca.trim());
    return usuarios.filter(u => {
      if (filtro === 'DESATIVADOS' ? u.ativo !== false : filtro !== 'TODOS' && u.tipo !== filtro) return false;
      if (!termo) return true;
      return normalizar(`${u.nome} ${u.email} ${u.matricula} ${u.curso}`).includes(termo);
    });
  }, [usuarios, busca, filtro]);

  const totalDesativados = usuarios.filter(u => u.ativo === false).length;

  const alterarAtivo = async (u: Usuario, ativo: boolean) => {
    const pergunta = ativo
      ? `Reativar a conta de ${u.nome}? Ela volta a poder entrar com a senha atual.`
      : `Desativar a conta de ${u.nome}?\n\nA pessoa perde o acesso em até 30 segundos. As postagens, os comentários e os trabalhos dela continuam publicados.`;
    if (!confirm(pergunta)) return;

    setOcupado(u.id);
    setAviso(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_AUTH_URL}/contas/${u.id}/ativo`, {
        method: 'PATCH',
        headers: authHeaders(true),
        body: JSON.stringify({ ativo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao atualizar a conta.');

      setUsuarios(lista => lista.map(x => (x.id === u.id ? { ...x, ativo } : x)));
      setAviso({ tom: 'success', texto: ativo ? `Conta de ${u.nome} reativada.` : `Conta de ${u.nome} desativada.` });
    } catch (err) {
      setAviso({ tom: 'error', texto: err instanceof Error ? err.message : 'Erro ao atualizar a conta.' });
    } finally {
      setOcupado(null);
    }
  };

  const redefinirSenha = async (u: Usuario) => {
    if (!confirm(`Gerar uma senha temporária para ${u.nome}?\n\nA senha atual deixa de funcionar. No próximo acesso, a pessoa vai precisar criar uma senha nova.`)) return;

    setOcupado(u.id);
    setAviso(null);
    setSenhaGerada(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_AUTH_URL}/contas/${u.id}/senha-temporaria`, {
        method: 'POST',
        headers: authHeaders(true),
        body: '{}',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao gerar a senha temporária.');

      setUsuarios(lista => lista.map(x => (x.id === u.id ? { ...x, senhaTemporaria: true } : x)));
      setSenhaGerada({ nome: u.nome, senha: data.senhaTemporaria });
    } catch (err) {
      setAviso({ tom: 'error', texto: err instanceof Error ? err.message : 'Erro ao gerar a senha temporária.' });
    } finally {
      setOcupado(null);
    }
  };

  const copiarSenha = async () => {
    if (!senhaGerada) return;
    await navigator.clipboard.writeText(senhaGerada.senha);
    setCopiada(true);
    setTimeout(() => setCopiada(false), 2000);
  };

  return (
    <div>
      {senhaGerada && (
        <div className="mb-6 rounded-r-lg border border-l-4 border-line border-l-success bg-surface p-6" role="status">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-bold text-ink">Senha temporária de {senhaGerada.nome}</p>
              <p className="mt-1 text-sm text-muted">
                Entregue à pessoa. Ela não aparece de novo e precisa ser trocada no próximo acesso.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <code className="bg-highlight px-3 py-1.5 font-mono text-xl font-semibold tracking-[0.12em] text-ink">{senhaGerada.senha}</code>
              <Button variant="secondary" onClick={copiarSenha}>{copiada ? 'Copiada' : 'Copiar'}</Button>
              <Button variant="ghost" onClick={() => setSenhaGerada(null)} aria-label="Fechar aviso da senha">Fechar</Button>
            </div>
          </div>
        </div>
      )}

      {aviso && <div className="mb-6"><Alert tone={aviso.tom}>{aviso.texto}</Alert></div>}

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar usuários">
          {filtros.map(f => (
            <button
              key={f.valor}
              onClick={() => setFiltro(f.valor)}
              aria-pressed={filtro === f.valor}
              className={`cursor-pointer rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                filtro === f.valor ? 'bg-highlight text-ink' : 'text-muted hover:bg-accent-soft hover:text-ink'
              }`}
            >
              {f.rotulo}
              {f.valor === 'DESATIVADOS' && totalDesativados > 0 && <span className="ml-1.5 tabular-nums">({totalDesativados})</span>}
            </button>
          ))}
        </div>
        <Input
          type="search"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por nome, e-mail ou matrícula"
          aria-label="Buscar usuários"
          className="sm:max-w-xs"
        />
      </div>

      {carregando ? (
        <div className="space-y-3">{[0, 1, 2].map(i => <div key={i} className="h-20 animate-pulse rounded-lg bg-line/60" />)}</div>
      ) : erro ? (
        <div className="space-y-3">
          <Alert tone="error">{erro}</Alert>
          <Button variant="secondary" onClick={() => { setErro(''); setCarregando(true); carregar(); }}>Tentar de novo</Button>
        </div>
      ) : visiveis.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line px-6 py-12 text-center text-sm text-muted">
          {usuarios.length === 0 ? 'Nenhum usuário cadastrado ainda. Use a aba Cadastrar usuário.' : 'Nenhum usuário encontrado com esses filtros.'}
        </div>
      ) : (
        <>
          <p className="mb-2 text-sm text-muted" aria-live="polite">
            {visiveis.length} {visiveis.length === 1 ? 'usuário' : 'usuários'}
          </p>
          <Card className="divide-y divide-line">
            {visiveis.map(u => {
              const reitoria = u.tipo === 'ADMIN';
              const desativado = u.ativo === false;
              return (
                <div key={u.id} className={`flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between ${desativado ? 'bg-paper' : ''}`}>
                  <div className="flex min-w-0 items-start gap-3">
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-semibold text-white ${desativado ? 'bg-muted' : 'bg-accent'}`} aria-hidden="true">
                      {iniciais(u.nome)}
                    </span>
                    <div className="min-w-0">
                      <p className={`truncate font-semibold ${desativado ? 'text-muted' : 'text-ink'}`}>{u.nome}</p>
                      <p className="truncate text-sm text-muted">{u.email}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <Badge>{rotulosPapel[u.tipo] ?? u.tipo}</Badge>
                        <span className="text-xs text-muted">Matrícula {u.matricula}, {u.curso}</span>
                        {desativado && <Badge className="bg-danger-soft text-danger">Desativada</Badge>}
                        {!desativado && u.senhaTemporaria && <Badge className="bg-highlight text-ink">Senha temporária</Badge>}
                        {!desativado && !reitoria && !u.senhaTemporaria && u.primeiroAcesso && <Badge className="bg-highlight text-ink">Primeiro acesso pendente</Badge>}
                        {u.mfaAtivo === false && <Badge className="bg-line/70 text-muted">Sem MFA</Badge>}
                      </div>
                    </div>
                  </div>

                  {/* A conta da Reitoria não pode ser desativada nem ter a senha redefinida aqui */}
                  {!reitoria && u.ativo !== undefined && (
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      {ocupado === u.id && <Spinner />}
                      {!desativado && (
                        <Button variant="secondary" disabled={ocupado === u.id} onClick={() => redefinirSenha(u)} aria-label={`Redefinir a senha de ${u.nome}`}>
                          Redefinir senha
                        </Button>
                      )}
                      {desativado ? (
                        <Button variant="secondary" disabled={ocupado === u.id} onClick={() => alterarAtivo(u, true)} aria-label={`Reativar a conta de ${u.nome}`}>
                          Reativar
                        </Button>
                      ) : (
                        <Button variant="ghost" disabled={ocupado === u.id} onClick={() => alterarAtivo(u, false)} className="text-danger hover:bg-danger-soft hover:text-danger" aria-label={`Desativar a conta de ${u.nome}`}>
                          Desativar
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </Card>
        </>
      )}
    </div>
  );
}
