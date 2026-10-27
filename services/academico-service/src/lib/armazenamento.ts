import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import type { Response } from 'express';
import { Storage } from '@google-cloud/storage';

// Onde ficam os PDFs e as imagens enviados:
//   - GCS_BUCKET definido (produção, no GKE): bucket privado do Cloud Storage. As credenciais vêm da
//     Workload Identity do pod, sem chave JSON.
//   - Sem GCS_BUCKET (desenvolvimento local): pasta uploads/ do serviço, como antes.
// Em ambos os casos o caminho gravado no banco é "/uploads/<nome>" e o próprio serviço entrega o arquivo,
// por isso o frontend e os registos existentes não mudam.

const bucketNome = process.env.GCS_BUCKET;
const bucket = bucketNome ? new Storage().bucket(bucketNome) : null;
const PASTA_LOCAL = path.join(process.cwd(), 'uploads');

const EXTENSOES: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

// Nome aleatório: não expõe o nome original do ficheiro e evita colisões
const gerarNome = (prefixo: string, mimetype: string) => `${prefixo}-${Date.now()}-${randomUUID()}${EXTENSOES[mimetype] ?? ''}`;

// Só aceita nomes gerados por nós (impede "../" e caminhos arbitrários)
const NOME_VALIDO = /^[a-z]+-\d+-[0-9a-f-]{36}\.[a-z]+$/;

export async function salvarArquivo(arquivo: Express.Multer.File, prefixo: string): Promise<string> {
  const nome = gerarNome(prefixo, arquivo.mimetype);
  if (bucket) {
    await bucket.file(nome).save(arquivo.buffer, { contentType: arquivo.mimetype, resumable: false });
  } else {
    await fs.mkdir(PASTA_LOCAL, { recursive: true });
    await fs.writeFile(path.join(PASTA_LOCAL, nome), arquivo.buffer);
  }
  return `/uploads/${nome}`;
}

export async function apagarArquivo(caminho: string | null | undefined) {
  if (!caminho) return;
  const nome = path.basename(caminho);
  if (bucket) {
    await bucket.file(nome).delete({ ignoreNotFound: true }).catch(() => {});
  } else {
    await fs.unlink(path.join(PASTA_LOCAL, nome)).catch(() => {});
  }
}

// Entrega um ficheiro de /uploads/:nome
export async function enviarArquivo(nome: string, res: Response) {
  // Ficheiros antigos (antes desta mudança) usavam "<timestamp>-<nome original>"; só os servimos localmente
  const nomeSeguro = path.basename(nome);
  if (nomeSeguro !== nome || (bucket && !NOME_VALIDO.test(nome))) {
    res.status(404).json({ error: 'Arquivo não encontrado.' });
    return;
  }

  if (!bucket) {
    res.sendFile(path.join(PASTA_LOCAL, nomeSeguro), err => {
      if (err && !res.headersSent) res.status(404).json({ error: 'Arquivo não encontrado.' });
    });
    return;
  }

  try {
    const arquivo = bucket.file(nomeSeguro);
    const [metadados] = await arquivo.getMetadata();
    res.setHeader('Content-Type', metadados.contentType ?? 'application/octet-stream');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    arquivo
      .createReadStream()
      .on('error', () => {
        if (!res.headersSent) res.status(500).json({ error: 'Erro ao ler o arquivo.' });
        else res.end();
      })
      .pipe(res);
  } catch (error: any) {
    if (error?.code === 404) {
      res.status(404).json({ error: 'Arquivo não encontrado.' });
      return;
    }
    console.error('ERRO NO CLOUD STORAGE:', error);
    res.status(500).json({ error: 'Erro ao ler o arquivo.' });
  }
}
