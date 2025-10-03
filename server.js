import 'dotenv/config'
import express from 'express'
import mongoose from 'mongoose'
import helmet from 'helmet'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import preregisterRoute from './routes/preregister.js'
import gameRoute from './routes/game.js'

const app = express()

// CORS واضح وصارم
const allowedOrigins = new Set([
  'https://1cryptox.com',           // مثال: https://1cryptox.com
  'https://www.1cryptox.com',       // مثال: 
  'http://localhost:5173'              // للتطوير
].filter(Boolean))

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true) // curl/Postman
    if (allowedOrigins.size === 0) return cb(null, true) // سماح للجميع إن لم تُحدِّد
    if (allowedOrigins.has(origin)) return cb(null, true)
    return cb(new Error('Not allowed by CORS'))
  },
  credentials: false,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With'],
  optionsSuccessStatus: 204
}
app.use(cors(corsOptions))
app.options('*', cors(corsOptions))

app.use(helmet())
app.use(express.json())

// تحديد معدّل الطلبات
app.use('/api/', rateLimit({ windowMs: 60_000, max: 120 }))

// الراوتس
app.use('/api/preregister', preregisterRoute)
app.use('/api/game', gameRoute)

// صحّة الخادم
app.get('/api/health', (_req, res) => res.json({ ok: true }))

// اتصال قاعدة البيانات
const MONGO_URI = process.env.MONGO_URI || ''
if (!MONGO_URI) {
  console.warn('⚠️ MONGO_URI is not set; please set it in your environment.')
}
mongoose.connect(MONGO_URI, { autoIndex: true }).then(() => {
  const PORT = process.env.PORT || 4000
  console.log('Mongo connected')
  app.listen(PORT, () => console.log(`Server running on :${PORT}`))
}).catch((err) => {
  console.error('Mongo connection error', err)
  process.exit(1)
})
