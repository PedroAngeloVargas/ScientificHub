'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Alert, Badge, Button, Field, Input, Spinner } from './ui';
import { formatarArea } from '@/lib/formato';

export interface UsuarioPerfil {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  telefone: string | null;
  endereco: string | null;
  matricula: string;
  tipo: string;
  curso: string;
  departamento: string;
}

type Mensagem = { tom: 'success' | 'error'; texto: string } | null;

const rotulosPapel: Record<string, string> = {
  ALUNO: 'Discente',
  PROFESSOR: 'Docente',
  ADMIN: 'Reitoria',
};

const authHeaders = (json = false): Record<string, string> => ({
  'Authorization': `Bearer ${localStorage.getItem('hub_token')}`,
  ...(json && { 'Content-Type': 'application/json' }),
});

// Mostra só os 2 últimos dígitos do CPF
const mascararCpf = (cpf: string) => `•••.•••.•••-${cpf.replace(/\D/g, '').slice(-2)}`;

export function iniciais(nome?: string) {
  return (nome ?? '?').split(' ').filter(Boolean).slice(0, 2).map(p => p[0]!.toUpperCase()).join('');
}

function Secao({ titulo, descricao, children }: { titulo: string; descricao?: string; children: ReactNode }) {
  return (
    <section className="border-t border-line px-6 py-6">
      <h3 className="text-lg font-bold text-ink">{titulo}</h3>
      {descricao && <p className="mt-0.5 text-xs leading-relaxed text-muted">{descricao}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Dado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <dt className="text-muted">{rotulo}</dt>
      <dd className="text-right font-medium text-ink">{valor}</dd>
    </div>
  );
}

// ---------- Contactos (perfil-service) ----------

function FormContactos({ usuario, aoSalvar }: { usuario: UsuarioPerfil; aoSalvar: (u: UsuarioPerfil) => void }) {
  const [telefone, setTelefone] = useState(usuario.telefone ?? '');
  const [endereco, setEndereco] = useState(usuario.endereco ?? '');
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState<Mensagem>(null);

  const alterado = telefone !== (usuario.telefone ?? '') || endereco !== (usuario.endereco ?? '');

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setMensagem(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_PERFIL_URL}/usuarios/${usuario.id}`, {
        method: 'PUT',
        headers: authHeaders(true),
        body: JSON.stringify({ telefone, endereco }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar');
      aoSalvar(data);
      setMensagem({ tom: 'success', texto: 'Contatos salvos.' });
    } catch (err: any) {
      setMensagem({ tom: 'error', texto: err.message });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={salvar} className="space-y-4">
      <Field label="Telefone">
        <Input type="tel" value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(31) 99999-9999" />
      </Field>
      <Field label="Endereço">
        <Input value={endereco} onChange={e => setEndereco(e.target.value)} placeholder="Rua, número, bairro, cidade" />
      </Field>
      {mensagem && <Alert tone={mensagem.tom}>{mensagem.texto}</Alert>}
      <Button type="submit" variant="secondary" disabled={enviando || !alterado}>
        {enviando && <Spinner />}
        Salvar contatos
      </Button>
    </form>
  );
}

// ---------- Áreas de interesse (match-service / Neo4j) ----------

function FormInteresses({ usuario }: { usuario: UsuarioPerfil }) {
  const [disponiveis, setDisponiveis] = useState<string[]>([]);
  const [selecionadas, setSelecionadas] = useState<string[]>([]);
  const [originais, setOriginais] = useState<string[]>([]);
  const [nova, setNova] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState<Mensagem>(null);

  useEffect(() => {
    Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_MATCH_URL}/areas`, { headers: authHeaders() }).then(r => (r.ok ? r.json() : [])),
      fetch(`${process.env.NEXT_PUBLIC_MATCH_URL}/usuarios/${usuario.id}/interesses`, { headers: authHeaders() }).then(r => (r.ok ? r.json() : [])),
    ])
      .then(([areas, meus]: [string[], string[]]) => {
        setDisponiveis(Array.from(new Set([...areas, ...meus])).sort());
        setSelecionadas(meus);
        setOriginais(meus);
      })
      .catch(() => setMensagem({ tom: 'error', texto: 'Não foi possível carregar as áreas.' }))
      .finally(() => setCarregando(false));
  }, [usuario.id]);

  const alternar = (area: string) =>
    setSelecionadas(lista => (lista.includes(area) ? lista.filter(a => a !== area) : [...lista, area]));

  const adicionar = () => {
    const area = nova.trim().toUpperCase();
    if (!area) return;
    if (!disponiveis.includes(area)) setDisponiveis(lista => [...lista, area].sort());
    if (!selecionadas.includes(area)) setSelecionadas(lista => [...lista, area]);
    setNova('');
  };

  const alterado = selecionadas.length !== originais.length || selecionadas.some(a => !originais.includes(a));

  const salvar = async () => {
    setEnviando(true);
    setMensagem(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_MATCH_URL}/usuarios/interesses`, {
        method: 'PUT',
        headers: authHeaders(true),
        body: JSON.stringify({ nome: usuario.nome, interesses: selecionadas }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar');
      setOriginais(selecionadas);
      setMensagem({ tom: 'success', texto: 'Interesses salvos. Suas recomendações já foram atualizadas.' });
    } catch (err: any) {
      setMensagem({ tom: 'error', texto: err.message });
    } finally {
      setEnviando(false);
    }
  };

  if (carregando) return <div className="flex justify-center py-4 text-muted"><Spinner /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {disponiveis.map(area => {
          const ativa = selecionadas.includes(area);
          return (
            <button
              key={area}
              type="button"
              onClick={() => alternar(area)}
              aria-pressed={ativa}
              className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                ativa ? 'border-ink bg-highlight text-ink' : 'border-line text-muted hover:border-accent hover:text-ink'
              }`}
            >
              {formatarArea(area)}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2">
        <Input
          value={nova}
          onChange={e => setNova(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); adicionar(); } }}
          placeholder="Adicionar nova área..."
        />
        <Button type="button" variant="ghost" onClick={adicionar} disabled={!nova.trim()}>Adicionar</Button>
      </div>

      {mensagem && <Alert tone={mensagem.tom}>{mensagem.texto}</Alert>}
      <Button type="button" variant="secondary" onClick={salvar} disabled={enviando || !alterado || selecionadas.length === 0}>
        {enviando && <Spinner />}
        Salvar interesses
      </Button>
    </div>
  );
}

// ---------- Segurança (auth-service) ----------

function FormSenha() {
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState<Mensagem>(null);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensagem(null);
    if (novaSenha !== confirmar) {
      setMensagem({ tom: 'error', texto: 'As senhas não coincidem.' });
      return;
    }
    setEnviando(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_AUTH_URL}/senha`, {
        method: 'PUT',
        headers: authHeaders(true),
        body: JSON.stringify({ senhaAtual, novaSenha }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao alterar a senha');
      setMensagem({ tom: 'success', texto: data.mensagem });
      setSenhaAtual(''); setNovaSenha(''); setConfirmar('');
    } catch (err: any) {
      setMensagem({ tom: 'error', texto: err.message });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={salvar} className="space-y-4">
      <Field label="Senha atual">
        <Input type="password" required value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)} autoComplete="current-password" />
      </Field>
      <Field label="Nova senha" hint="Mínimo 8 caracteres">
        <Input type="password" required minLength={8} value={novaSenha} onChange={e => setNovaSenha(e.target.value)} autoComplete="new-password" />
      </Field>
      <Field label="Confirmar nova senha">
        <Input type="password" required minLength={8} value={confirmar} onChange={e => setConfirmar(e.target.value)} autoComplete="new-password" />
      </Field>
      {mensagem && <Alert tone={mensagem.tom}>{mensagem.texto}</Alert>}
      <Button type="submit" variant="secondary" disabled={enviando}>
        {enviando && <Spinner />}
        Alterar senha
      </Button>
    </form>
  );
}

// ---------- Painel ----------

export function PerfilDrawer({
  usuario,
  aberto,
  aoFechar,
  aoAtualizar,
  aoSair,
}: {
  usuario: UsuarioPerfil | null;
  aberto: boolean;
  aoFechar: () => void;
  aoAtualizar: (u: UsuarioPerfil) => void;
  aoSair: () => void;
}) {
  // Fecha com Esc e bloqueia o scroll da página por trás
  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e: KeyboardEvent) => { if (e.key === 'Escape') aoFechar(); };
    document.addEventListener('keydown', aoTeclar);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = '';
    };
  }, [aberto, aoFechar]);

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Meu perfil">
      <div className="animate-fade-in absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={aoFechar} />

      <aside className="animate-slide-in-right absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <p className="font-bold text-ink">Meu perfil</p>
          <button
            onClick={aoFechar}
            className="cursor-pointer rounded-lg p-1.5 text-muted transition-colors hover:bg-ink/5 hover:text-ink"
            aria-label="Fechar"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!usuario ? (
          <div className="flex flex-1 items-center justify-center text-muted"><Spinner /></div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Cartão de identidade */}
            <div className="flex items-center gap-4 px-6 py-6">
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-accent text-xl font-bold text-white">
                {iniciais(usuario.nome)}
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-2xl font-bold text-ink">{usuario.nome}</h2>
                <p className="truncate text-sm text-muted">{usuario.email}</p>
                <Badge className="mt-2 bg-highlight text-ink">{rotulosPapel[usuario.tipo] ?? usuario.tipo}</Badge>
              </div>
            </div>

            <Secao titulo="Dados institucionais" descricao="Cadastrados pela Reitoria. Para corrigir, fale com a secretaria do seu curso.">
              <dl className="divide-y divide-line">
                <Dado rotulo="Matrícula" valor={usuario.matricula} />
                <Dado rotulo="Curso" valor={usuario.curso} />
                <Dado rotulo="Departamento" valor={usuario.departamento} />
                <Dado rotulo="CPF" valor={mascararCpf(usuario.cpf)} />
              </dl>
            </Secao>

            <Secao titulo="Contatos">
              <FormContactos usuario={usuario} aoSalvar={aoAtualizar} />
            </Secao>

            {usuario.tipo !== 'ADMIN' && (
              <Secao titulo="Áreas de interesse" descricao="Usadas pelo motor de recomendações para sugerir projetos.">
                <FormInteresses usuario={usuario} />
              </Secao>
            )}

            <Secao titulo="Segurança">
              <div className="mb-5 flex items-center gap-2 rounded-md bg-success-soft px-3 py-2 text-sm font-semibold text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                Verificação em duas etapas ativa
              </div>
              <FormSenha />
            </Secao>
          </div>
        )}

        <div className="border-t border-line px-6 py-4">
          <Button variant="ghost" onClick={aoSair} className="w-full">Sair</Button>
        </div>
      </aside>
    </div>
  );
}
