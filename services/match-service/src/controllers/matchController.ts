import type { Request, Response } from 'express';
import { getSession } from '../lib/neo4j.js';

// 1. Vincular interesses a um usuário (Aluno/Professor)
export const vincularInteressesUsuario = async (req: Request, res: Response) => {
  const { perfilId, nome, interesses } = req.body; // interesses: array de strings ex: ["IA", "Grafos"]
  const session = getSession();

  try {
    await session.run(
      `
      MERGE (u:Usuario {id: $perfilId})
      SET u.nome = $nome
      WITH u
      UNWIND $interesses AS areaNome
      MERGE (a:Area {nome: toUpper(trim(areaNome))})
      MERGE (u)-[:TEM_INTERESSE]->(a)
      `,
      { perfilId, nome, interesses }
    );

    res.status(200).json({ mensagem: 'Interesses vinculados no grafo com sucesso!' });
  } catch (error) {
    console.error('Erro no Neo4j (Usuário):', error);
    res.status(500).json({ error: 'Erro ao vincular interesses do usuário.' });
  } finally {
    await session.close();
  }
};

// 2. Vincular áreas/temas a um Projeto ou Publicação
export const vincularTemasProjeto = async (req: Request, res: Response) => {
  const { projetoId, titulo, areas } = req.body; // areas: array de strings ex: ["IA", "Cloud"]
  const session = getSession();

  try {
    await session.run(
      `
      MERGE (p:Projeto {id: $projetoId})
      SET p.titulo = $titulo
      WITH p
      UNWIND $areas AS areaNome
      MERGE (a:Area {nome: toUpper(trim(areaNome))})
      MERGE (p)-[:ABORDA]->(a)
      `,
      { projetoId, titulo, areas }
    );

    res.status(200).json({ mensagem: 'Temas do projeto vinculados no grafo com sucesso!' });
  } catch (error) {
    console.error('Erro no Neo4j (Projeto):', error);
    res.status(500).json({ error: 'Erro ao vincular temas ao projeto.' });
  } finally {
    await session.close();
  }
};

// 3. Recomendação: Descobrir quais projetos dão "Match" com o usuário
export const recomendarProjetos = async (req: Request, res: Response) => {
  const { perfilId } = req.params;
  const session = getSession();

  try {
    const result = await session.run(
      `
      MATCH (u:Usuario {id: $perfilId})-[:TEM_INTERESSE]->(a:Area)<-[:ABORDA]-(p:Projeto)
      RETURN p.id AS projetoId, 
             p.titulo AS titulo, 
             collect(a.nome) AS areasEmComum, 
             count(a) AS scoreRelevancia
      ORDER BY scoreRelevancia DESC
      `,
      { perfilId }
    );

    const recomendacoes = result.records.map(record => ({
      projetoId: record.get('projetoId'),
      titulo: record.get('titulo'),
      areasEmComum: record.get('areasEmComum'),
      scoreRelevancia: record.get('scoreRelevancia').toNumber() // Converte Int do Neo4j para Number do JS
    }));

    res.json(recomendacoes);
  } catch (error) {
    console.error('Erro ao buscar recomendações:', error);
    res.status(500).json({ error: 'Erro ao gerar recomendações no grafo.' });
  } finally {
    await session.close();
  }
};