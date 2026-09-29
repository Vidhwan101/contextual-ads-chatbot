import { Router } from 'express'
import { prisma } from '../lib/prisma.js'

const router = Router()

// Track a click on a sponsored placement
router.post('/:messageAdId/click', async (req, res) => {
  try {
    const placement = await prisma.messageAd.update({
      where: { id: req.params.messageAdId },
      data: { clicked: true },
      include: { ad: { select: { url: true } } },
    })
    res.json({ url: placement.ad.url })
  } catch {
    res.status(404).json({ error: 'Not found' })
  }
})

export default router