import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import chatRoutes from './routes/chat.js'
import conversationRoutes from './routes/conversations.js'

const app = express()

app.use(cors())
app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/chat', chatRoutes)
app.use('/api/conversations', conversationRoutes)

const PORT = process.env.PORT || 4000
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})