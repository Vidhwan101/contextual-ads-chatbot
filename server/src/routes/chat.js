import { Router } from 'express'
import Groq from 'groq-sdk'
import { prisma } from '../lib/prisma.js'
import { getCandidates, rankAds } from '../services/adMatch.js'

const router = Router()
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

router.post('/', async (req, res) => {
  const { message, conversationId } = req.body

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message is required' })
  }
  if (!conversationId) {
    return res.status(400).json({ error: 'conversationId is required' })
  }

  const messageCount = await prisma.message.count({ where: { conversationId } })

  await prisma.message.create({
    data: { conversationId, role: 'user', content: message },
  })

  if (messageCount === 0) {
    const title = message.length > 40 ? message.slice(0, 40).trim() + '…' : message
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { title },
    })
  }

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders?.()
  res.socket?.setNoDelay(true)

  const STREAM_DELAY_MS = Number(process.env.STREAM_DELAY_MS ?? 15)

  // Load history and fetch ad candidates in parallel
  const [history, candidates] = await Promise.all([
    prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 20,
      select: { role: true, content: true },
    }),
    getCandidates(message, 30).catch((err) => {
      console.error('[ads] candidate fetch failed:', err.message)
      return []
    }),
  ])

  let fullReply = ''

  try {
    const stream = await groq.chat.completions.create({
      model: 'qwen/qwen3.8-27b',
      stream: true,
      max_tokens: 800,
      messages: [
        { role: 'system', content: 'You are a helpful, concise assistant.' },
        ...history.map((m) => ({ role: m.role, content: m.content })),
      ],
    })

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content
      if (text) {
        fullReply += text
        res.write(`data: ${JSON.stringify({ text })}\n\n`)
        if (STREAM_DELAY_MS > 0) {
          await new Promise((r) => setTimeout(r, STREAM_DELAY_MS))
        }
      }
    }

    const assistantMsg = await prisma.message.create({
      data: { conversationId, role: 'assistant', content: fullReply },
    })

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    })

    // Stage 2: rank ads against the finished answer
let chosenAds = []
let placements = []
if (candidates.length > 0) {
  try {
    chosenAds = await rankAds({
      query: message,
      answer: fullReply,
      candidates,
      maxAds: 2,
    })

    if (chosenAds.length > 0) {
      placements = await prisma.$transaction(
        chosenAds.map((ad, i) =>
          prisma.messageAd.create({
            data: {
              messageId: assistantMsg.id,
              adId: ad.id,
              position: i,
              score: ad.score,
              qSim: ad.query_sim,
              aSim: ad.answer_sim,
            },
          })
        )
      )
      console.log(
        `[ads] matched ${chosenAds.length} for query "${message.slice(0, 40)}":`,
        chosenAds.map((a) => `${a.advertiser} (${a.score.toFixed(2)})`).join(', ')
      )
    }
  } catch (err) {
    console.error('[ads] ranking failed:', err.message)
  }
}

    res.write(
  `data: ${JSON.stringify({
    ads: chosenAds.map((a, i) => ({
      id: a.id,
      messageAdId: placements[i]?.id,
      advertiser: a.advertiser,
      title: a.title,
      body: a.body,
      url: a.url,
    })),
  })}\n\n`
)

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (err) {
    console.error('Groq error:', err)
    res.write(`data: ${JSON.stringify({ error: 'AI request failed' })}\n\n`)
    res.end()
  }
})

export default router
