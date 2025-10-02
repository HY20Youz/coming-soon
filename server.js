import 'dotenv/config'
import express from 'express'
import mongoose from 'mongoose'
import helmet from 'helmet'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import preregisterRoute from './routes/preregister.js'

const app = express()
app.use(helmet())
app.use(cors({ origin: true, credentials: true }))
app.use(express.json())

// Basic API rate limit
app.use('/api/', rateLimit({ windowMs: 60_000, max: 60 }))

app.use('/api/preregister', preregisterRoute)

const PORT = process.env.PORT || 4000
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://hass:Youzghadli%40123@cluster0.fhefpqk.mongodb.net/'

mongoose.connect(MONGO_URI).then(() => {
  console.log('Mongo connected')
  app.listen(PORT, () => console.log(`Server running on :${PORT}`))
}).catch((err) => {
  console.error('Mongo connection error', err)
  process.exit(1)
})
