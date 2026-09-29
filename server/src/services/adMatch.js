import { prisma } from '../lib/prisma.js'
import { embed } from '../lib/embeddings.js'

// Thresholds calibrated for MiniLM 384-dim embeddings.
const GATE_QUERY_SIM = 0.22
const GATE_ANSWER_SIM = 0.28

/**
 * Stage 1: fast candidate retrieval against the query alone.
 * Runs in parallel with LLM streaming, so it adds no latency.
 */
export async function getCandidates(query, limit = 30) {
  const queryVec = await embed(query)
  const vecLiteral = `[${queryVec.join(',')}]`

  const rows = await prisma.$queryRawUnsafe(
    `
    SELECT id, advertiser, title, body, url, "bidCpc", "qualityScore",
           1 - (embedding <=> $1::vector) AS query_sim
    FROM "Ad"
    WHERE active = true
    ORDER BY embedding <=> $1::vector
    LIMIT $2
    `,
    vecLiteral,
    limit
  )
  return rows
}

/**
 * Stage 2: re-rank candidates against query AND the generated answer.
 * Relevance is a GATE, not a weight.
 */
export async function rankAds({ query, answer, candidates, maxAds = 2 }) {
  if (!candidates.length) return []

  const [queryVec, answerVec] = await Promise.all([embed(query), embed(answer)])
  const queryVecLiteral = `[${queryVec.join(',')}]`
  const answerVecLiteral = `[${answerVec.join(',')}]`
  const ids = candidates.map((c) => c.id)

  const scored = await prisma.$queryRawUnsafe(
    `
    SELECT id, advertiser, title, body, url, "bidCpc", "qualityScore",
           1 - (embedding <=> $1::vector) AS query_sim,
           1 - (embedding <=> $2::vector) AS answer_sim
    FROM "Ad"
    WHERE id = ANY($3::text[]) AND active = true
    `,
    queryVecLiteral,
    answerVecLiteral,
    ids
  )

  return scored
    .filter(
      (a) =>
        Number(a.query_sim) > GATE_QUERY_SIM &&
        Number(a.answer_sim) > GATE_ANSWER_SIM
    )
    .map((a) => {
      const normalizedBid = Math.min(Number(a.bidCpc) / 2.5, 1)
      const score =
        0.45 * Number(a.answer_sim) +
        0.35 * Number(a.query_sim) +
        0.10 * normalizedBid +
        0.10 * Number(a.qualityScore)
      return { ...a, score, query_sim: Number(a.query_sim), answer_sim: Number(a.answer_sim) }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, maxAds)
}