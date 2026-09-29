import { Router } from 'express'
import { prisma } from '../lib/prisma.js'

const router = Router()

// List all conversations for a session
router.get('/', async (req, res) => {
  const { sessionId } = req.query
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' })

  const conversations = await prisma.conversation.findMany({
    where: { sessionId },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, title: true, updatedAt: true },
  })
  res.json(conversations)
})

// Create a new conversation
router.post('/', async (req, res) => {
  const { sessionId } = req.body
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' })

  const conversation = await prisma.conversation.create({
    data: { sessionId, title: 'New chat' },
  })
  res.status(201).json(conversation)
})

// Get messages for a conversation
router.get('/:id', async (req, res) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: req.params.id },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          role: true,
          content: true,
          createdAt: true,
          ads: {
            orderBy: { position: 'asc' },
            select: {
              id: true,
              clicked: true,
              ad: {
                select: {
                  id: true,
                  advertiser: true,
                  title: true,
                  body: true,
                  url: true,
                },
              },
            },
          },
        },
      },
    },
  })
  if (!conversation) return res.status(404).json({ error: 'Not found' })
  res.json(conversation)
})

// Delete a conversation
router.delete('/:id', async (req, res) => {
  await prisma.conversation.delete({ where: { id: req.params.id } }).catch(() => null)
  res.status(204).end()
})

export default router