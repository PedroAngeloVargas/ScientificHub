'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/AppHeader';
import { Alert, Badge, Button, Card, Spinner, Textarea } from '@/components/ui';

type Categoria = 'GERAL' | 'EVENTO' | 'OPORTUNIDADE' | 'DUVIDA' | 'CONQUISTA';

interface Postagem {
  id: string;
  autorId: string;
  conteudo: string;
  categoria: Categoria;
  imagemUrl: string | null;
  criadoEm: string;
  totalCurtidas: number;
  totalComentarios: number;
  curtidoPorMim: boolean;
}

interface Comentario {
  id: string;
  autorId: string;
  conteudo: string;
  criadoEm: string;
}

interface Usuario {
  id: string;
  nome: string;
  tipo: string;
  curso: string;
}

const categorias: Record<Categoria, { rotulo: string; classe: string }> = {
  GERAL: { rotulo: 'Geral', classe: 'bg-line/70 text-ink' },
  EVENTO: { rotulo: 'Evento', classe: 'bg-accent-soft text-accent-strong' },
  OPORTUNIDADE: { rotulo: 'Oportunidade', classe: 'bg-success-soft text-success' },
  DUVIDA: { rotulo: 'Dúvida', classe: 'bg-danger-soft text-danger' },
  CONQUISTA: { rotulo: 'Conquista', classe: 'bg-highlight text-ink' },
};

const rotulosPapel: Record<string, string> = {
  ALUNO: 'Discente',
  PROFESSOR: 'Docente',
  ADMIN: 'Reitoria',
};

const MAX_POSTAGEM = 2000;

// As imagens são servidas na raiz do academico-service (/uploads), fora do prefixo /api
const origemAcademico = new URL(process.env.NEXT_PUBLIC_ACADEMICO_URL ?? 'http://localhost:3002').origin;
const API = `${process.env.NEXT_PUBLIC_ACADEMICO_URL}/postagens`;

const authHeaders = (): Record<string, string> => ({ 'Authorization': `Bearer ${localStorage.getItem('hub_token')}` });

function tempoRelativo(iso: string) {
  const segundos = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (segundos < 60) return 'agora';
  if (segundos < 3600) return `há ${Math.floor(segundos / 60)} min`;
  if (segundos < 86400) return `há ${Math.floor(segundos / 3600)} h`;
  if (segundos < 604800) return `há ${Math.floor(segundos / 86400)} d`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function Avatar({ nome, pequeno = false }: { nome?: string; pequeno?: boolean }) {
  const iniciais = (nome ?? '?').split(' ').filter(Boolean).slice(0, 2).map(p => p[0]!.toUpperCase()).join('');
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full bg-accent font-semibold text-white ${
        pequeno ? 'h-8 w-8 text-xs' : 'h-11 w-11 text-sm'
      }`}
    >
      {iniciais}
    </span>
  );
}

// ---------- Caixa de nova postagem ----------

function NovaPostagem({ usuario, aoPublicar }: { usuario?: Usuario; aoPublicar: (p: Postagem) => void }) {
  const [conteudo, setConteudo] = useState('');
  const [categoria, setCategoria] = useState<Categoria>('GERAL');
  const [imagem, setImagem] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const inputImagem = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!imagem) return setPreview('');
    const url = URL.createObjectURL(imagem);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imagem]);

  const publicar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conteudo.trim()) return;

    setEnviando(true);
    setErro('');
    try {
      const formData = new FormData();
      formData.append('conteudo', conteudo);
      formData.append('categoria', categoria);
      if (imagem) formData.append('imagem', imagem);

      const res = await fetch(API, { method: 'POST', headers: authHeaders(), body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao publicar');

      aoPublicar(data);
      setConteudo('');
      setCategoria('GERAL');
      setImagem(null);
    } catch (err: any) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Card className="p-5 sm:p-6">
      <form onSubmit={publicar}>
        <div className="flex gap-3">
          <Avatar nome={usuario?.nome} />
          <Textarea
            value={conteudo}
            onChange={e => setConteudo(e.target.value)}
            rows={3}
            maxLength={MAX_POSTAGEM}
            placeholder="Compartilhe um evento, uma oportunidade, uma dúvida ou uma conquista"
            className="border-transparent bg-paper focus:bg-surface"
          />
        </div>

        {preview && (
          <div className="relative mt-4 ml-14">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Pré-visualização da imagem anexada" className="max-h-72 rounded-md border border-line object-cover" />
            <button
              type="button"
              onClick={() => setImagem(null)}
              className="absolute right-2 top-2 cursor-pointer rounded-md bg-ink/85 px-2.5 py-1 text-xs font-semibold text-white hover:bg-ink"
            >
              Remover
            </button>
          </div>
        )}

        {erro && <div className="mt-4 ml-14"><Alert tone="error">{erro}</Alert></div>}

        <div className="mt-4 space-y-3 border-t border-line pt-4 sm:ml-14">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Categoria da postagem">
            {(Object.keys(categorias) as Categoria[]).map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setCategoria(c)}
                className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  categoria === c ? 'border-ink bg-highlight text-ink' : 'border-line text-muted hover:border-accent hover:text-ink'
                }`}
              >
                {categorias[c].rotulo}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2">
            <input
              ref={inputImagem}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              onChange={e => { setImagem(e.target.files?.[0] ?? null); e.target.value = ''; }}
            />
            <Button type="button" variant="ghost" onClick={() => inputImagem.current?.click()} className="-ml-3 px-3">
              <svg className="h-5 w-5" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Zm10.5-11.25h.008v.008h-.008V9.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
              {imagem ? 'Trocar imagem' : 'Anexar imagem'}
            </Button>
            <Button type="submit" disabled={enviando || !conteudo.trim()}>
              {enviando && <Spinner />}
              Publicar
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}

// ---------- Cartão de uma postagem ----------

function CartaoPostagem({
  postagem,
  usuarios,
  perfilId,
  podeModerar,
  aoAtualizar,
  aoApagar,
}: {
  postagem: Postagem;
  usuarios: Record<string, Usuario>;
  perfilId: string;
  podeModerar: boolean;
  aoAtualizar: (p: Postagem) => void;
  aoApagar: (id: string) => void;
}) {
  const autor = usuarios[postagem.autorId];
  const [comentarios, setComentarios] = useState<Comentario[] | null>(null);
  const [abertos, setAbertos] = useState(false);
  const [novoComentario, setNovoComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  const podeApagar = postagem.autorId === perfilId || podeModerar;

  const curtir = async () => {
    // Atualização otimista: o coração muda na hora e reverte se falhar
    const anterior = postagem;
    aoAtualizar({
      ...postagem,
      curtidoPorMim: !postagem.curtidoPorMim,
      totalCurtidas: postagem.totalCurtidas + (postagem.curtidoPorMim ? -1 : 1),
    });
    try {
      const res = await fetch(`${API}/${postagem.id}/curtida`, { method: 'POST', headers: authHeaders() });
      if (!res.ok) throw new Error();
      const data = await res.json();
      aoAtualizar({ ...anterior, ...data });
    } catch {
      aoAtualizar(anterior);
    }
  };

  const alternarComentarios = async () => {
    setAbertos(!abertos);
    if (comentarios !== null) return;
    try {
      const res = await fetch(`${API}/${postagem.id}/comentarios`, { headers: authHeaders() });
      if (!res.ok) throw new Error();
      setComentarios(await res.json());
    } catch {
      setErro('Não foi possível carregar os comentários.');
      setComentarios([]);
    }
  };

  const comentar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoComentario.trim()) return;
    setEnviando(true);
    setErro('');
    try {
      const res = await fetch(`${API}/${postagem.id}/comentarios`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ conteudo: novoComentario }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao comentar');
      setComentarios(lista => [...(lista ?? []), data]);
      aoAtualizar({ ...postagem, totalComentarios: postagem.totalComentarios + 1 });
      setNovoComentario('');
    } catch (err: any) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  };

  const apagarComentario = async (id: string) => {
    if (!confirm('Excluir este comentário?')) return;
    const res = await fetch(`${API}/${postagem.id}/comentarios/${id}`, { method: 'DELETE', headers: authHeaders() });
    if (res.ok) {
      setComentarios(lista => (lista ?? []).filter(c => c.id !== id));
      aoAtualizar({ ...postagem, totalComentarios: postagem.totalComentarios - 1 });
    }
  };

  const apagarPostagem = async () => {
    if (!confirm('Excluir esta postagem? Não dá para desfazer.')) return;
    const res = await fetch(`${API}/${postagem.id}`, { method: 'DELETE', headers: authHeaders() });
    if (res.ok) aoApagar(postagem.id);
  };

  return (
    <Card className="">
      <article className="p-5 sm:p-6">
        <header className="flex items-start gap-3">
          <Avatar nome={autor?.nome} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-semibold text-ink">{autor?.nome ?? 'Membro da comunidade'}</span>
              {autor && <span className="text-xs text-muted">{rotulosPapel[autor.tipo] ?? autor.tipo} de {autor.curso}</span>}
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
              <time dateTime={postagem.criadoEm} title={new Date(postagem.criadoEm).toLocaleString('pt-BR')}>
                {tempoRelativo(postagem.criadoEm)}
              </time>
              <Badge className={categorias[postagem.categoria].classe}>{categorias[postagem.categoria].rotulo}</Badge>
            </div>
          </div>
          {podeApagar && (
            <button
              onClick={apagarPostagem}
              className="cursor-pointer rounded-lg px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-danger-soft hover:text-danger"
            >
              Excluir
            </button>
          )}
        </header>

        <p className="mt-4 whitespace-pre-line break-words text-[15px] leading-relaxed text-text">{postagem.conteudo}</p>

        {postagem.imagemUrl && (
          <a href={`${origemAcademico}${postagem.imagemUrl}`} target="_blank" rel="noopener noreferrer" className="mt-4 block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${origemAcademico}${postagem.imagemUrl}`}
              alt=""
              loading="lazy"
              className="max-h-[28rem] w-full rounded-md border border-line object-cover"
            />
          </a>
        )}

        <footer className="mt-4 flex items-center gap-1 border-t border-line pt-3">
          <button
            onClick={curtir}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors hover:bg-ink/5 ${
              postagem.curtidoPorMim ? 'text-danger' : 'text-muted hover:text-ink'
            }`}
            aria-pressed={postagem.curtidoPorMim}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill={postagem.curtidoPorMim ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
            </svg>
            {postagem.totalCurtidas > 0 && postagem.totalCurtidas}
            <span className="sr-only">curtidas</span>
          </button>
          <button
            onClick={alternarComentarios}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-ink/5 hover:text-ink"
            aria-expanded={abertos}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z" />
            </svg>
            {postagem.totalComentarios > 0 ? postagem.totalComentarios : 'Comentar'}
          </button>
        </footer>
      </article>

      {abertos && (
        <div className="border-t border-line bg-paper/60 px-5 py-4 sm:px-6">
          {comentarios === null ? (
            <div className="flex justify-center py-2 text-muted"><Spinner /></div>
          ) : (
            <ul className="space-y-3">
              {comentarios.map(c => {
                const autorComentario = usuarios[c.autorId];
                return (
                  <li key={c.id} className="group flex gap-2.5">
                    <Avatar nome={autorComentario?.nome} pequeno />
                    <div className="min-w-0 flex-1 rounded-md bg-surface px-3.5 py-2.5 ring-1 ring-line">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-semibold text-ink">{autorComentario?.nome ?? 'Membro da comunidade'}</span>
                        <span className="shrink-0 text-xs text-muted">{tempoRelativo(c.criadoEm)}</span>
                      </div>
                      <p className="mt-0.5 whitespace-pre-line break-words text-sm leading-relaxed text-text">{c.conteudo}</p>
                      {(c.autorId === perfilId || podeModerar) && (
                        <button
                          onClick={() => apagarComentario(c.id)}
                          className="mt-1 cursor-pointer text-xs text-muted hover:text-danger"
                        >
                          Excluir
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {erro && <div className="mt-3"><Alert tone="error">{erro}</Alert></div>}

          <form onSubmit={comentar} className="mt-4 flex gap-2">
            <input
              value={novoComentario}
              onChange={e => setNovoComentario(e.target.value)}
              maxLength={500}
              placeholder="Escreva um comentário..."
              className="block w-full rounded-full border border-line bg-surface px-4 py-2 text-sm text-text placeholder:text-muted/60 focus:border-ink/40 focus:outline-none focus:ring-4 focus:ring-ink/5"
            />
            <Button type="submit" disabled={enviando || !novoComentario.trim()} className="rounded-full px-4">
              {enviando ? <Spinner /> : 'Enviar'}
            </Button>
          </form>
        </div>
      )}
    </Card>
  );
}

// ---------- Página ----------

export default function Comunidade() {
  const router = useRouter();
  const [tipoUsuario, setTipoUsuario] = useState('');
  const [perfilId, setPerfilId] = useState('');
  const [usuarios, setUsuarios] = useState<Record<string, Usuario>>({});
  const [postagens, setPostagens] = useState<Postagem[]>([]);
  const [filtro, setFiltro] = useState<Categoria | ''>('');
  const [proximoCursor, setProximoCursor] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erro, setErro] = useState('');

  const buscarPostagens = async (cursor?: string) => {
    const params = new URLSearchParams();
    if (filtro) params.set('categoria', filtro);
    if (cursor) params.set('cursor', cursor);
    const res = await fetch(`${API}?${params}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Não foi possível carregar o feed da comunidade.');
    return res.json() as Promise<{ postagens: Postagem[]; proximoCursor: string | null }>;
  };

  // Autenticação + lista de usuários (nomes e papéis dos autores)
  useEffect(() => {
    const token = localStorage.getItem('hub_token');
    const id = localStorage.getItem('perfil_id');
    if (!token || !id) {
      router.push('/login');
      return;
    }
    setPerfilId(id);
    setTipoUsuario(localStorage.getItem('tipo_usuario') || '');

    fetch(`${process.env.NEXT_PUBLIC_PERFIL_URL}/usuarios`, { headers: authHeaders() })
      .then(res => (res.ok ? res.json() : []))
      .then((lista: Usuario[]) => setUsuarios(Object.fromEntries(lista.map(u => [u.id, u]))))
      .catch(() => {});
  }, [router]);

  // Recarrega o feed sempre que o filtro muda
  useEffect(() => {
    if (!localStorage.getItem('hub_token')) return;
    setCarregando(true);
    setErro('');
    buscarPostagens()
      .then(data => {
        setPostagens(data.postagens);
        setProximoCursor(data.proximoCursor);
      })
      .catch(err => setErro(err.message))
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtro]);

  const carregarMais = async () => {
    if (!proximoCursor) return;
    setCarregandoMais(true);
    try {
      const data = await buscarPostagens(proximoCursor);
      setPostagens(lista => [...lista, ...data.postagens]);
      setProximoCursor(data.proximoCursor);
    } catch (err: any) {
      setErro(err.message);
    } finally {
      setCarregandoMais(false);
    }
  };

  const atualizarPostagem = (p: Postagem) => setPostagens(lista => lista.map(x => (x.id === p.id ? p : x)));
  const removerPostagem = (id: string) => setPostagens(lista => lista.filter(x => x.id !== id));
  const adicionarPostagem = (p: Postagem) => {
    // Só entra no topo se for visível no filtro atual
    if (!filtro || filtro === p.categoria) setPostagens(lista => [p, ...lista]);
  };

  return (
    <div className="min-h-screen">
      <AppHeader papel={tipoUsuario} />

      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="mb-8">
          <h1 className="text-[2.25rem] font-bold leading-tight text-ink">Divulgações</h1>
          <p className="mt-3 text-muted">
            Eventos, oportunidades, dúvidas e conquistas de alunos e professores da UEMG.
          </p>
        </div>

        <NovaPostagem usuario={usuarios[perfilId]} aoPublicar={adicionarPostagem} />

        {/* Filtros por categoria */}
        <div className="z-10 -mx-4 mt-8 mb-5 sm:sticky sm:top-16 flex gap-1.5 overflow-x-auto bg-paper/85 px-4 py-3 backdrop-blur sm:mx-0 sm:px-0">
          {([['', 'Tudo'], ...(Object.keys(categorias) as Categoria[]).map(c => [c, categorias[c].rotulo])] as [Categoria | '', string][]).map(([valor, rotulo]) => (
            <button
              key={valor || 'todas'}
              onClick={() => setFiltro(valor)}
              className={`shrink-0 cursor-pointer rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                filtro === valor ? 'bg-highlight text-ink' : 'text-muted hover:bg-accent-soft hover:text-ink'
              }`}
            >
              {rotulo}
            </button>
          ))}
        </div>

        {erro && <div className="mb-4"><Alert tone="error">{erro}</Alert></div>}

        {carregando ? (
          <div className="space-y-4">
            {[0, 1, 2].map(i => <div key={i} className="h-48 animate-pulse rounded-lg bg-line/60" />)}
          </div>
        ) : postagens.length === 0 && !erro ? (
          <div className="rounded-lg border border-dashed border-line px-6 py-12 text-center text-sm text-muted">
            {filtro ? `Ainda não há postagens em "${categorias[filtro].rotulo}".` : 'Nenhuma postagem ainda. Publique a primeira no campo acima.'}
          </div>
        ) : (
          <div className="space-y-4">
            {postagens.map(p => (
              <CartaoPostagem
                key={p.id}
                postagem={p}
                usuarios={usuarios}
                perfilId={perfilId}
                podeModerar={tipoUsuario === 'ADMIN'}
                aoAtualizar={atualizarPostagem}
                aoApagar={removerPostagem}
              />
            ))}

            {proximoCursor && (
              <div className="flex justify-center pt-2">
                <Button variant="secondary" onClick={carregarMais} disabled={carregandoMais}>
                  {carregandoMais && <Spinner />}
                  Carregar mais
                </Button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
