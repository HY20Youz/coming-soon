import 'dotenv/config'
import express from 'express'
import mongoose from 'mongoose'
import helmet from 'helmet'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import preregisterRoute from './routes/preregister.js'

const app = express()

/* --------------------- CORS CONFIG (fix) --------------------- */
const allowedOrigins = new Set([
  'https://1cryptox.com',
  'https://www.1cryptox.com',
  // أضِف أي نطاقات يتم منها الطلب (مثلاً المعاينة على Firebase إن وجِدت):
  'https://cryptox-exchange.web.app',
  'https://cryptox-exchange.firebaseapp.com',
  'http://localhost:5173'
])

const corsOptions = {
  origin: (origin, cb) => {
    // السماح بالأدوات غير المتصفّح (Postman/Health checks) بلا Origin
    if (!origin) return cb(null, true)
    if (allowedOrigins.has(origin)) return cb(null, true)
    return cb(new Error('Not allowed by CORS'))
  },
  // لا تحتاج Credentials إن كنت لا تستخدم كوكيز/جلسات:
  credentials: false,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 204
}
// فعّل CORS مبكراً جداً
app.use(cors(corsOptions))
// فعّل الرد على كل الـ preflight requests
app.options('*', cors(corsOptions))
/* ------------------------------------------------------------ */

app.use(helmet())
app.use(express.json())

// Basic API rate limit (اجعله بعد CORS)
app.use('/api/', rateLimit({ windowMs: 60_000, max: 60 }))

app.use('/api/preregister', preregisterRoute)

const PORT = process.env.PORT || 4000
const MONGO_URI = process.env.MONGO_URI || 'YOUR_MONGO_URI'

mongoose.connect(MONGO_URI).then(() => {
  console.log('Mongo connected')
  app.listen(PORT, () => console.log(`Server running on :${PORT}`))
}).catch((err) => {
  console.error('Mongo connection error', err)
  process.exit(1)
})
