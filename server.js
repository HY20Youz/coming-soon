import 'dotenv/config'
import express from 'express'
import mongoose from 'mongoose'
import helmet from 'helmet'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import preregisterRoute from './routes/preregister.js'

const app = express()

// ✅ CORS أولاً
const allowedOrigins = new Set([
  'https://1cryptox.com',
  'https://www.1cryptox.com',
  // إذا عندك نطاقات أخرى للواجهة، أضِفها هنا
  'http://localhost:5173'
])

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true)                 // أدوات مثل curl/Postman
    if (allowedOrigins.has(origin)) return cb(null, true)
    return cb(new Error('Not allowed by CORS'))
  },
  credentials: false, // اجعلها true فقط إذا تستخدم Cookies/Session عبر المتصفح
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With'],
  optionsSuccessStatus: 204
}
app.use(cors(corsOptions))
app.options('*', cors(corsOptions))

// ثم الباقي
app.use(helmet())
app.use(express.json())
app.use('/api/', rateLimit({ windowMs: 60_000, max: 60 }))
app.use('/api/preregister', preregisterRoute)

const PORT = process.env.PORT || 4000
const MONGO_URI = process.env.MONGO_URI

mongoose.connect(MONGO_URI).then(() => {
  console.log('Mongo connected')
  app.listen(PORT, () => console.log(`Server running on :${PORT}`))
}).catch((err) => {
  console.error('Mongo connection error', err)
  process.exit(1)
})
