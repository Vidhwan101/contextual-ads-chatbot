import { Router } from 'express'
import Groq from 'groq-sdk'

const router = Router()
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

router.post('/', async (req, res) => {
  const { message } = req.body

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message is required' })
  }

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders?.()
  res.socket?.setNoDelay(true)

  const STREAM_DELAY_MS = Number(process.env.STREAM_DELAY_MS ?? 15)

  try {
    const stream = await groq.chat.completions.create({
      model: 'qwen/qwen3.8-27b',
      stream: true,
      max_tokens: 512,
      messages: [
        { role: 'system', content: 'You are a helpful, concise assistant.' },
        { role: 'user', content: message },
      ],
    })

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`)
        if (STREAM_DELAY_MS > 0) {
          await new Promise((r) => setTimeout(r, STREAM_DELAY_MS))
        }
      }
    }

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (err) {
    console.error('Groq error:', err)
    res.write(`data: ${JSON.stringify({ error: 'AI request failed' })}\n\n`)
    res.end()
  }
})

export default router