import { Router } from 'express'
import Groq from 'groq-sdk'
import { prisma } from '../lib/prisma.js'

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

  // Check if this is the first message in the conversation
  const messageCount = await prisma.message.count({
  where: { conversationId },
  })

  // Save user message to DB
  await prisma.message.create({
  data: { conversationId, role: 'user', content: message },
  })

  // If this was the first message, use it as the conversation title
  if (messageCount === 0) {
  const title = message.length > 40 ? message.slice(0, 40).trim() + '…' : message
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { title },
  })
  }

  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders?.()
  res.socket?.setNoDelay(true)

  const STREAM_DELAY_MS = Number(process.env.STREAM_DELAY_MS ?? 15)

  // Load prior messages for context
  const history = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    take: 20,
    select: { role: true, content: true },
  })

  let fullReply = ''

  try {
    const stream = await groq.chat.completions.create({
      model: 'qwen/qwen3.8-27b',
      stream: true,
      max_tokens: 512,
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

    // Save assistant message to DB
    await prisma.message.create({
      data: { conversationId, role: 'assistant', content: fullReply },
    })

    // Bump conversation updatedAt
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    })

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (err) {
    console.error('Groq error:', err)
    res.write(`data: ${JSON.stringify({ error: 'AI request failed' })}\n\n`)
    res.end()
  }
})

export default router