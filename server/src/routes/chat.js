import { Router } from 'express'
import Groq from 'groq-sdk'

const router = Router()
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

router.post('/', async (req, res) => {
  const { message } = req.body

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message is required' })
  }

  try {
    const completion = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages: [
        { role: 'system', content: 'You are a helpful, concise assistant.' },
        { role: 'user', content: message },
      ],
    })

    const reply = completion.choices[0]?.message?.content ?? ''
    res.json({ reply })
  } catch (err) {
    console.error('Groq error:', err)
    res.status(500).json({ error: 'AI request failed' })
  }
})

export default router