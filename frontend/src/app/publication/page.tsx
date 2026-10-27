'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/AppHeader';
import { Alert, Button, Card, Field, Input, Select, Spinner, Textarea } from '@/components/ui';

export default function NovaPublicacao() {
  const router = useRouter();
  const [titulo, setTitulo] = useState('');
  const [resumo, setResumo] = useState('');
  const [categoria, setCategoria] = useState('ARTIGO');
  const [areasInput, setAreasInput] = useState('');
  const [orientadorId, setOrientadorId] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);

  const [professores, setProfessores] = useState<any[]>([]); // Lista do banco
  const [tipoUsuario, setTipoUsuario] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('hub_token');
    if (!token) {
      router.push('/login');
      return;
    }
    setTipoUsuario(localStorage.getItem('tipo_usuario') || '');

    // Busca os utilizadores e filtra apenas os Professores para o Dropdown
    const carregarProfessores = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_PERFIL_URL}/usuarios`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const dados = await res.json();
          const listaProfessores = dados.filter((u: any) => u.tipo === 'PROFESSOR');
          setProfessores(listaProfessores);
        }
      } catch (error) {
        console.error('Erro ao carregar orientadores:', error);
      }
    };

    carregarProfessores();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!arquivo) {
      setMensagem('Erro: Por favor, selecione o arquivo PDF do projeto.');
      return;
    }

    setCarregando(true);
    setMensagem('Enviando o PDF...');

    try {
      const token = localStorage.getItem('hub_token');
      const perfilId = localStorage.getItem('perfil_id');

      // 1. Usa FormData em vez de JSON para suportar o ficheiro PDF
      const formData = new FormData();
      formData.append('titulo', titulo);
      formData.append('resumo', resumo);
      formData.append('categoria', categoria);
      formData.append('autorPrincipalId', String(perfilId));
      formData.append('dataPublicacao', new Date().toISOString());

      // Anexa o ficheiro e o orientador (se foi selecionado)
      formData.append('arquivo', arquivo);
      if (orientadorId) {
        formData.append('orientadorId', orientadorId);
      }

      // 2. Salva no PostgreSQL via academico-service
      // Nota: Não enviamos 'Content-Type', o fetch define automaticamente como 'multipart/form-data'
      const resPub = await fetch(`${process.env.NEXT_PUBLIC_ACADEMICO_URL}/publicacoes`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const dataPub = await resPub.json();
      if (!resPub.ok) throw new Error(dataPub.error || 'Erro ao salvar a publicação');

      setMensagem('PDF enviado. Registrando as áreas do trabalho...');

      // 3. Salva as Áreas no Grafo Neo4j (match-service) mantendo o envio em JSON
      const areas = areasInput.split(',').map(area => area.trim()).filter(area => area !== '');
      if (areas.length > 0) {
        const resMatch = await fetch(`${process.env.NEXT_PUBLIC_MATCH_URL}/projetos/temas`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            projetoId: dataPub.id,
            titulo,
            areas
          })
        });

        if (!resMatch.ok) throw new Error('O trabalho foi publicado, mas as áreas de conhecimento não foram salvas.');
      }

      setMensagem(orientadorId
        ? 'Trabalho enviado com sucesso. Ele aparece no painel depois que o orientador aprovar.'
        : 'Trabalho publicado com sucesso.');
      setTimeout(() => router.push('/feed'), 1500);

    } catch (err: any) {
      setMensagem(`Erro: ${err.message}`);
      setCarregando(false);
    }
  };

  const tomMensagem = mensagem.includes('Erro') ? 'error' : mensagem.includes('sucesso') ? 'success' : 'info';
  const areasPreview = areasInput.split(',').map(a => a.trim()).filter(Boolean);

  return (
    <div className="min-h-screen">
      <AppHeader papel={tipoUsuario} />

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <button
          onClick={() => router.push('/feed')}
          className="mb-6 cursor-pointer text-sm font-medium text-muted transition-colors hover:text-ink"
        >
          Voltar ao painel
        </button>

        <div className="mb-8">
          <h1 className="text-[2.25rem] font-bold leading-tight text-ink">Publicar trabalho</h1>
          <p className="mt-3 text-muted">Seu trabalho fica visível para a comunidade da UEMG. As áreas que você indicar ajudam a recomendá-lo a quem pesquisa o mesmo tema.</p>
        </div>

        <Card className="p-6 sm:p-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Field label="Título">
              <Input type="text" required value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex: Análise de Dados com Node.js" />
            </Field>

            <Field label="Resumo" hint="Abstract">
              <Textarea required value={resumo} onChange={e => setResumo(e.target.value)} rows={5} placeholder="Descreva o trabalho em poucas linhas" />
            </Field>

            <div className="grid gap-6 sm:grid-cols-2">
              <Field label="Categoria">
                <Select value={categoria} onChange={e => setCategoria(e.target.value)}>
                  <option value="ARTIGO">Artigo Científico</option>
                  <option value="TCC">TCC (Trabalho de Conclusão)</option>
                  <option value="DISSERTACAO">Dissertação</option>
                  <option value="RELATORIO_TECNICO">Relatório Técnico</option>
                </Select>
              </Field>

              <Field label="Professor orientador" hint="Opcional">
                <Select value={orientadorId} onChange={e => setOrientadorId(e.target.value)}>
                  <option value="">Nenhum / Não se aplica</option>
                  {professores.map(prof => (
                    <option key={prof.id} value={prof.id}>
                      {prof.nome}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field label="Áreas de conhecimento" hint="Separadas por vírgula">
              <Input type="text" required value={areasInput} onChange={e => setAreasInput(e.target.value)} placeholder="Ex: Cloud, React, Grafos" />
            </Field>
            {areasPreview.length > 0 && (
              <div className="-mt-3 flex flex-wrap gap-1.5">
                {areasPreview.map(area => (
                  <span key={area} className="rounded-sm bg-accent-soft px-1.5 py-px text-xs font-semibold text-accent-strong">{area}</span>
                ))}
              </div>
            )}

            <div>
              <span className="mb-1.5 block text-sm font-medium text-ink">Arquivo do trabalho</span>
              <label
                className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors ${
                  arquivo ? 'border-accent bg-accent-soft' : 'border-line hover:border-accent'
                }`}
              >
                <svg className="mb-3 h-8 w-8 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12-3-3m0 0-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
                {arquivo ? (
                  <>
                    <span className="text-sm font-medium text-ink">{arquivo.name}</span>
                    <span className="mt-1 text-xs text-muted">{(arquivo.size / 1024 / 1024).toFixed(2)} MB. Clique para trocar.</span>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-medium text-ink">Clique para selecionar o PDF</span>
                    <span className="mt-1 text-xs text-muted">Somente arquivos .pdf</span>
                  </>
                )}
                <input
                  type="file"
                  accept=".pdf"
                  required
                  onChange={e => setArquivo(e.target.files ? e.target.files[0] : null)}
                  className="sr-only"
                />
              </label>
            </div>

            {mensagem && <Alert tone={tomMensagem}>{mensagem}</Alert>}

            <div className="flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" onClick={() => router.push('/feed')}>
                Cancelar
              </Button>
              <Button type="submit" disabled={carregando}>
                {carregando && <Spinner />}
                {carregando ? 'Publicando...' : 'Publicar trabalho'}
              </Button>
            </div>
          </form>
        </Card>
      </main>
    </div>
  );
}
